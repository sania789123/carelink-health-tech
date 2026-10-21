import { db } from '../config/database.js';

/**
 * Generates a plain-English summary of a report or a whole patient's data.
 * NEVER diagnoses. Uses simple, warm language that elderly users can understand.
 */

const FRIENDLY = {
  hemoglobin: { label: 'Hemoglobin (oxygen in your blood)', unit: 'g/dL' },
  haemoglobin: { label: 'Hemoglobin (oxygen in your blood)', unit: 'g/dL' },
  'blood sugar': { label: 'Blood sugar', unit: 'mg/dL' },
  glucose: { label: 'Blood sugar', unit: 'mg/dL' },
  'total cholesterol': { label: 'Total cholesterol', unit: 'mg/dL' },
  cholesterol: { label: 'Cholesterol', unit: 'mg/dL' },
  ldl: { label: 'LDL (bad cholesterol)', unit: 'mg/dL' },
  hdl: { label: 'HDL (good cholesterol)', unit: 'mg/dL' },
  triglyceride: { label: 'Triglycerides (blood fat)', unit: 'mg/dL' },
  creatinine: { label: 'Creatinine (kidney function)', unit: 'mg/dL' },
  urea: { label: 'Urea (kidney waste)', unit: 'mg/dL' },
  tsh: { label: 'Thyroid hormone (TSH)', unit: 'mIU/L' },
  t3: { label: 'Thyroid hormone (T3)', unit: 'ng/dL' },
  t4: { label: 'Thyroid hormone (T4)', unit: 'µg/dL' },
  sgpt: { label: 'Liver enzyme SGPT', unit: 'U/L' },
  sgot: { label: 'Liver enzyme SGOT', unit: 'U/L' },
  alt: { label: 'Liver enzyme ALT', unit: 'U/L' },
  ast: { label: 'Liver enzyme AST', unit: 'U/L' },
  bilirubin: { label: 'Bilirubin (liver)', unit: 'mg/dL' },
  platelet: { label: 'Platelets (blood clotting)', unit: 'lakh/µL' },
  wbc: { label: 'White blood cells (immunity)', unit: '/µL' },
  rbc: { label: 'Red blood cells', unit: 'million/µL' },
  'vitamin d': { label: 'Vitamin D', unit: 'ng/mL' },
  calcium: { label: 'Calcium (bones)', unit: 'mg/dL' },
  'uric acid': { label: 'Uric acid (gout)', unit: 'mg/dL' }
};

function findFriendly(testName) {
  const lower = String(testName || '').toLowerCase();
  for (const [key, val] of Object.entries(FRIENDLY)) {
    if (lower.includes(key)) return val;
  }
  return { label: testName, unit: '' };
}

function rangeStatus(value, reference) {
  if (value == null || !reference) return 'unknown';
  const val = Number(value);
  if (!isFinite(val)) return 'unknown';
  const r = String(reference).trim();

  const lt = r.match(/^<\s*([\d.]+)/);
  if (lt) return val < Number(lt[1]) ? 'normal' : 'high';

  const gt = r.match(/^>\s*([\d.]+)/);
  if (gt) return val > Number(gt[1]) ? 'normal' : 'low';

  const dash = r.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (dash) {
    const lo = Number(dash[1]), hi = Number(dash[2]);
    if (val < lo) return 'low';
    if (val > hi) return 'high';
    return 'normal';
  }
  return 'unknown';
}

function friendlyLine(test) {
  const { label } = findFriendly(test.test_name);
  const status = rangeStatus(test.value, test.reference_range);
  const valueStr = test.value != null ? `${test.value} ${test.unit || ''}`.trim() : '(not recorded)';
  const rangeStr = test.reference_range ? `normal is ${test.reference_range}` : '';

  if (status === 'normal') {
    return `✅ Your ${label} is normal (${valueStr}).`;
  }
  if (status === 'high') {
    return `⚠️ Your ${label} is a bit high — it is ${valueStr}, while the healthy range is ${test.reference_range}.`;
  }
  if (status === 'low') {
    return `⚠️ Your ${label} is a bit low — it is ${valueStr}, while the healthy range is ${test.reference_range}.`;
  }
  return `ℹ️ ${label}: ${valueStr}${rangeStr ? ' (' + rangeStr + ')' : ''}.`;
}

/**
 * Summarize a single report in plain English.
 */
export function summarizeReport(patientId, reportId) {
  const report = db.prepare('SELECT * FROM reports WHERE id=? AND patient_id=?').get(reportId, patientId);
  if (!report) return null;

  const tests = db.prepare('SELECT * FROM test_results WHERE report_id=?').all(reportId);
  const lines = [];
  let normalCount = 0, abnormalCount = 0;

  for (const t of tests) {
    const status = rangeStatus(t.value, t.reference_range);
    if (status === 'normal') normalCount++;
    else if (status === 'high' || status === 'low') abnormalCount++;
    lines.push({ text: friendlyLine(t), status });
  }

  // Overall assessment
  let overall = '';
  if (tests.length === 0) {
    overall = 'This report does not have any test values recorded yet.';
  } else if (abnormalCount === 0) {
    overall = `Good news — all ${tests.length} test value${tests.length > 1 ? 's' : ''} are within the normal range.`;
  } else if (abnormalCount <= 2) {
    overall = `Most of your results look fine. ${abnormalCount} value${abnormalCount > 1 ? 's' : ''} ${abnormalCount > 1 ? 'are' : 'is'} slightly outside the normal range — this is common and your doctor can guide you.`;
  } else {
    overall = `${abnormalCount} of your ${tests.length} results are outside the normal range. Please share this report with your doctor for proper advice.`;
  }

  return {
    reportId: report.id,
    title: report.title,
    date: report.report_date,
    hospital: report.hospital,
    doctor: report.doctor_name,
    totalTests: tests.length,
    normalCount,
    abnormalCount,
    lines,
    overall,
    disclaimer: 'This is an automated plain-language summary, not a medical diagnosis. Always consult your doctor for interpretation and next steps.'
  };
}

/**
 * Summarize a patient's entire history (used for QR doctor view).
 */
export function summarizePatient(patientId) {
  const patient = db.prepare('SELECT full_name, email FROM users WHERE id=?').get(patientId);
  if (!patient) return null;

  const reports = db.prepare('SELECT id, title, report_date, hospital, doctor_name FROM reports WHERE patient_id=? ORDER BY COALESCE(report_date, created_at) DESC LIMIT 5').all(patientId);

  const allTests = db.prepare(`
    SELECT tr.test_name, tr.value, tr.unit, tr.reference_range, r.report_date, r.title
    FROM test_results tr
    JOIN reports r ON r.id = tr.report_id
    WHERE r.patient_id = ?
    ORDER BY r.report_date DESC
  `).all(patientId);

  // Group by test name; keep the most recent value
  const byTest = new Map();
  for (const t of allTests) {
    const key = t.test_name.toLowerCase().trim();
    if (!byTest.has(key)) byTest.set(key, t);
  }

  const abnormal = [];
  const normal = [];

  for (const t of byTest.values()) {
    const status = rangeStatus(t.value, t.reference_range);
    const line = friendlyLine(t);
    if (status === 'high' || status === 'low') {
      abnormal.push({ ...t, status, friendly: line });
    } else if (status === 'normal') {
      normal.push({ ...t, status, friendly: line });
    }
  }

  // Build headline
  let headline = '';
  if (reports.length === 0) {
    headline = 'No reports uploaded yet.';
  } else if (abnormal.length === 0) {
    headline = `All ${normal.length} tracked values are within normal ranges as of the latest report.`;
  } else if (abnormal.length <= 3) {
    headline = `${abnormal.length} value${abnormal.length > 1 ? 's' : ''} may need attention.`;
  } else {
    headline = `Multiple values (${abnormal.length}) are outside normal ranges — please review.`;
  }

  return {
    patientName: patient.full_name,
    totalReports: reports.length,
    reports: reports,
    headline,
    normalValues: normal.slice(0, 6),
    abnormalValues: abnormal,
    disclaimer: 'This is an automated summary, not a medical diagnosis. Please review the original reports and consult a qualified doctor.'
  };
}