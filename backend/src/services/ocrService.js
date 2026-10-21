import fs from 'fs';

/**
 * Cloud OCR via OCR.space (free tier).
 * Uses base64 upload — avoids multipart bugs and fetch failures.
 * Includes retry and graceful fallback.
 */

const OCR_API_URL = 'https://api.ocr.space/parse/image';

async function postOcr(base64DataUri, apiKey, timeoutMs = 30000) {
  const body = new URLSearchParams();
  body.append('base64Image', base64DataUri);
  body.append('language', 'eng');
  body.append('isOverlayRequired', 'false');
  body.append('OCREngine', '2');
  body.append('scale', 'true');
  body.append('detectOrientation', 'true');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function extractRawText(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  if (mimeType === 'application/pdf') {
    return { text: '', reason: 'PDF OCR not supported. Upload a PNG/JPG screenshot.' };
  }

  const stats = fs.statSync(filePath);
  console.log('[OCR] File size on disk:', stats.size, 'bytes');

  if (stats.size === 0) {
    return { text: '', reason: 'Uploaded file is empty (0 bytes).' };
  }

  const apiKey = process.env.OCR_API_KEY || 'helloworld';

  try {
    // Read the file and detect real mime type from bytes
    const buffer = fs.readFileSync(filePath);
    const first8 = buffer.slice(0, 8).toString('hex');
    console.log('[OCR] First 8 bytes (hex):', first8);

    // Detect actual image type from magic bytes
    let detectedMime = mimeType || 'image/png';
    if (first8.startsWith('89504e47')) detectedMime = 'image/png';
    else if (first8.startsWith('ffd8ff')) detectedMime = 'image/jpeg';
    else if (first8.startsWith('25504446')) detectedMime = 'application/pdf';
    console.log('[OCR] Detected mime:', detectedMime);

    // Build base64 data URI
    const base64 = buffer.toString('base64');
    const dataUri = `data:${detectedMime};base64,${base64}`;

    // Try up to 2 times
    let lastError = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[OCR] Attempt ${attempt} — sending ${buffer.length} bytes`);

        const response = await postOcr(dataUri, apiKey, 30000);

        if (!response.ok) {
          const text = await response.text();
          lastError = `HTTP ${response.status}: ${text.slice(0, 150)}`;
          console.error('[OCR]', lastError);
          if (attempt === 2) return { text: '', reason: lastError };
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        const result = await response.json();

        if (result.IsErroredOnProcessing) {
          const errMsg = Array.isArray(result.ErrorMessage)
            ? result.ErrorMessage.join(' ')
            : String(result.ErrorMessage || 'unknown');
          console.error('[OCR] API error:', errMsg);
          lastError = errMsg;
          if (attempt === 2) return { text: '', reason: 'OCR error: ' + errMsg };
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        const parsed = (result.ParsedResults || []).map(r => r.ParsedText || '').join('\n');
        console.log('[OCR] Success. Text length:', parsed.length);
        return { text: parsed, confidence: 90 };

      } catch (err) {
        lastError = err.name === 'AbortError' ? 'Request timed out' : err.message;
        console.error('[OCR] Attempt', attempt, 'failed:', lastError);
        if (attempt === 2) return { text: '', reason: 'OCR failed: ' + lastError };
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    return { text: '', reason: 'OCR failed: ' + lastError };
  } catch (e) {
    console.error('[OCR] Exception:', e.message);
    return { text: '', reason: 'OCR failed: ' + e.message };
  }
}

const KNOWN_TESTS = [
  'hemoglobin', 'haemoglobin',
  'rbc count', 'total rbc', 'rbc',
  'wbc count', 'total wbc', 'wbc',
  'platelet count', 'platelets', 'platelet',
  'mcv', 'mch', 'mchc', 'hematocrit', 'hct', 'pcv', 'rdw',
  'blood sugar (fasting)', 'blood sugar fasting', 'fasting sugar', 'fasting blood sugar',
  'blood sugar', 'blood glucose', 'glucose', 'fasting glucose', 'random sugar', 'pp sugar',
  'hba1c', 'glycated hemoglobin',
  'total cholesterol', 'cholesterol', 'ldl', 'hdl', 'vldl', 'triglycerides', 'triglyceride',
  'creatinine', 'urea', 'bun', 'uric acid', 'egfr', 'gfr',
  'tsh', 't3', 't4',
  'sgpt', 'sgot', 'alt', 'ast', 'alp', 'alkaline phosphatase',
  'bilirubin', 'albumin', 'total protein',
  'ferritin', 'iron', 'vitamin b12', 'vitamin d', 'calcium', 'phosphorus',
  'sodium', 'potassium', 'chloride',
  'esr', 'crp', 'psa'
];

function parseNumeric(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[^\d.,\-]/g, '');
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  s = s.replace(/,(?=\d{3})/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

function parseRange(str) {
  if (!str) return '';
  const s = String(str);
  let m = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
  if (m) return `<${m[1]}`;
  m = s.match(/>\s*=?\s*(\d+(?:\.\d+)?)/);
  if (m) return `>${m[1]}`;
  return '';
}

function parseUnit(str) {
  if (!str) return '';
  const m = str.match(/\b(million\/µL|million\/uL|lakh\/µL|lakh\/uL|cells\/µL|cells\/uL|K\/µL|K\/uL|M\/µL|M\/uL|thousand\/µL|thousand\/uL|mg\/dL|mg\/dl|g\/dL|g\/dl|mg\/L|g\/L|mmol\/L|umol\/L|mIU\/L|uIU\/mL|ng\/mL|pg\/mL|ng\/dL|µg\/dL|mEq\/L|IU\/L|U\/L|fL|pg|%)\b/i);
  return m ? m[1] : '';
}

function tryParseLine(line, testName) {
  const idx = line.toLowerCase().indexOf(testName);
  if (idx === -1) return null;
  let rest = line.slice(idx + testName.length).trim().replace(/^[:\-–\s]+/, '');

  const rangeMatch = rest.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  let range = '';
  if (rangeMatch) {
    range = `${rangeMatch[1]}-${rangeMatch[2]}`;
    rest = rest.replace(rangeMatch[0], ' ');
  }

  const nums = [...rest.matchAll(/(\d+(?:[.,]\d+)?)/g)];
  if (nums.length === 0) return null;

  const valueStr = nums[0][1];
  const value = parseNumeric(valueStr);
  if (value == null) return null;

  const afterValue = rest.slice(rest.indexOf(valueStr) + valueStr.length);
  const unit = parseUnit(afterValue);

  if (!range) {
    const alt = afterValue.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (alt) range = `${alt[1]}-${alt[2]}`;
  }

  return { value, unit, range };
}

function prettify(name) {
  const map = {
    'hb': 'Hemoglobin',
    'rbc': 'RBC Count', 'rbc count': 'RBC Count', 'total rbc': 'RBC Count',
    'wbc': 'WBC Count', 'wbc count': 'WBC Count', 'total wbc': 'WBC Count',
    'mcv': 'MCV', 'mch': 'MCH', 'mchc': 'MCHC',
    'hct': 'Hematocrit', 'pcv': 'Packed Cell Volume', 'rdw': 'RDW',
    'tsh': 'TSH', 't3': 'T3', 't4': 'T4',
    'sgpt': 'SGPT', 'sgot': 'SGOT', 'alt': 'ALT', 'ast': 'AST', 'alp': 'ALP',
    'bun': 'BUN', 'egfr': 'eGFR', 'gfr': 'GFR',
    'hba1c': 'HbA1c',
    'ldl': 'LDL', 'hdl': 'HDL', 'vldl': 'VLDL',
    'esr': 'ESR', 'crp': 'CRP', 'psa': 'PSA'
  };
  if (map[name]) return map[name];
  return name.split(' ')
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

function parseTestsFromText(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const tests = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    let matched = null;
    for (const k of KNOWN_TESTS) {
      if (lower.includes(k) && (!matched || k.length > matched.length)) matched = k;
    }
    if (!matched) continue;
    if (seen.has(matched)) continue;

    let extracted = tryParseLine(line, matched);
    if (!extracted) {
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const next = lines[i + j];
        if (KNOWN_TESTS.some(k => next.toLowerCase().includes(k))) break;
        extracted = tryParseLine(matched + ' ' + next, matched);
        if (extracted) break;
      }
    }

    if (extracted) {
      tests.push({
        test_name: prettify(matched),
        value: extracted.value,
        unit: extracted.unit,
        reference_range: extracted.range,
        confidence: 'medium'
      });
      seen.add(matched);
    }
  }
  return tests;
}

export async function extractFromFile(filePath, mimeType) {
  if (process.env.OCR_ENABLED !== 'true') {
    return { enabled: false, message: 'OCR disabled.', fields: {}, tests: [], confidence: 0 };
  }

  const raw = await extractRawText(filePath, mimeType);
  if (!raw || !raw.text) {
    return {
      enabled: true,
      message: raw?.reason || 'Could not read text from the file.',
      fields: {},
      tests: [],
      confidence: 0
    };
  }

  const tests = parseTestsFromText(raw.text);
  console.log('[OCR] Extracted', tests.length, 'tests');
  console.log('[OCR] Raw text (first 500 chars):\n', raw.text.slice(0, 500));

  return {
    enabled: true,
    message: tests.length > 0
      ? `Extracted ${tests.length} test value${tests.length > 1 ? 's' : ''}. Please review.`
      : 'No test values found. Add them manually.',
    fields: {},
    tests,
    confidence: raw.confidence || 0,
    rawText: raw.text.slice(0, 3000)
  };
}