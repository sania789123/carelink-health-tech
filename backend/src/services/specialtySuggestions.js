import { db } from '../config/database.js';

/**
 * Specialty suggestion rules.
 * Each rule maps keywords / test names to a medical specialty.
 * DO NOT treat this as medical advice — always show disclaimer.
 */
const RULES = [
  {
    specialty: 'Endocrinology',
    icon: '🩺',
    description: 'Hormones, diabetes, thyroid',
    tests: ['glucose', 'blood sugar', 'fasting sugar', 'hba1c', 'tsh', 't3', 't4', 'insulin', 'cortisol'],
    keywords: ['diabetes', 'thyroid', 'hormone']
  },
  {
    specialty: 'Cardiology',
    icon: '❤️',
    description: 'Heart and blood vessels',
    tests: ['cholesterol', 'ldl', 'hdl', 'triglyceride', 'troponin', 'bnp', 'ecg'],
    keywords: ['heart', 'chest pain', 'palpitation', 'cardiac', 'blood pressure']
  },
  {
    specialty: 'Hematology',
    icon: '🩸',
    description: 'Blood and blood disorders',
    tests: ['hemoglobin', 'haemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv'],
    keywords: ['anemia', 'anaemia']
  },
  {
    specialty: 'Nephrology',
    icon: '🫘',
    description: 'Kidney function',
    tests: ['creatinine', 'urea', 'egfr', 'bun', 'uric acid'],
    keywords: ['kidney', 'renal']
  },
  {
    specialty: 'Gastroenterology',
    icon: '🫄',
    description: 'Digestive system and liver',
    tests: ['sgpt', 'sgot', 'alt (sgpt)', 'ast (sgot)', 'bilirubin', 'alkaline phosphatase', 'albumin'],
    keywords: ['liver', 'stomach', 'abdominal', 'gastric', 'hepatitis', 'jaundice']
  },
  {
    specialty: 'Dermatology',
    icon: '🧴',
    description: 'Skin, hair, and nails',
    tests: ['ige'],
    keywords: ['skin', 'rash', 'eczema', 'psoriasis', 'dermatitis', 'acne', 'lesion', 'itching']
  },
  {
    specialty: 'Pulmonology',
    icon: '🫁',
    description: 'Lungs and breathing',
    tests: ['spirometry', 'fev1', 'fvc'],
    keywords: ['asthma', 'breathing', 'cough', 'copd', 'lung', 'pneumonia']
  },
  {
    specialty: 'Orthopedics',
    icon: '🦴',
    description: 'Bones and joints',
    tests: ['vitamin d', 'calcium', 'phosphorus', 'alkaline phosphatase bone'],
    keywords: ['bone', 'joint', 'fracture', 'arthritis', 'back pain', 'knee pain']
  }
];

function isOutOfRange(test) {
  if (test.value == null || !test.reference_range) return false;
  const val = Number(test.value);
  if (!isFinite(val)) return false;

  const range = String(test.reference_range).trim();

  // "<200"
  const ltMatch = range.match(/^<\s*([\d.]+)/);
  if (ltMatch) return val >= Number(ltMatch[1]);

  // ">13"
  const gtMatch = range.match(/^>\s*([\d.]+)/);
  if (gtMatch) return val <= Number(gtMatch[1]);

  // "70-100" or "70 – 100"
  const rangeMatch = range.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    return val < lo || val > hi;
  }

  return false;
}

/**
 * Word-boundary aware match: test name must CONTAIN the phrase,
 * but the phrase must not be part of a longer unrelated word.
 * This avoids "alt" matching "Fasting".
 */
function nameMatches(testName, phrase) {
  const name = String(testName || '').toLowerCase();
  const p = String(phrase || '').toLowerCase();
  // For multi-word phrases, just do includes
  if (p.includes(' ')) return name.includes(p);
  // For single words: require word-boundary
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${esc}\\b`, 'i');
  return re.test(name);
}

export function suggestSpecialties(patientId) {
  const tests = db.prepare(`
    SELECT tr.test_name, tr.value, tr.unit, tr.reference_range, r.report_date, r.title
    FROM test_results tr
    JOIN reports r ON r.id = tr.report_id
    WHERE r.patient_id = ?
    ORDER BY r.report_date DESC
  `).all(patientId);

  const reports = db.prepare(`
    SELECT title, notes, report_type FROM reports WHERE patient_id = ?
  `).all(patientId);

  const notesText = reports
    .map(r => ((r.title || '') + ' ' + (r.notes || '')).toLowerCase())
    .join(' ');

  const specialtyHits = new Map();

  for (const rule of RULES) {
    const matched = [];

    // Match against test names — must be out of range
    for (const test of tests) {
      if (!isOutOfRange(test)) continue;
      const hit = rule.tests.some(phrase => nameMatches(test.test_name, phrase));
      if (hit) {
        matched.push({
          source: 'test',
          test_name: test.test_name,
          value: test.value,
          unit: test.unit,
          reference: test.reference_range,
          report_title: test.title,
          report_date: test.report_date
        });
      }
    }

    // Match against notes keywords — word-boundary aware
    for (const kw of rule.keywords) {
      const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${esc}\\b`, 'i');
      if (re.test(notesText)) {
        matched.push({ source: 'keyword', keyword: kw });
      }
    }

    if (matched.length > 0) {
      specialtyHits.set(rule.specialty, { rule, matched });
    }
  }

  const suggestions = [];
  for (const [specialty, { rule, matched }] of specialtyHits.entries()) {
    const testMatches = matched.filter(m => m.source === 'test');
    const keywordMatches = matched.filter(m => m.source === 'keyword');

    // Priority: only test matches count towards priority (keywords are hints)
    const priority = testMatches.length >= 3 ? 'high'
                   : testMatches.length >= 1 ? 'medium'
                   : 'low';

    const reasons = [];
    for (const t of testMatches) {
      reasons.push(`${t.test_name} was ${t.value} ${t.unit || ''} (normal: ${t.reference}) — from "${t.report_title}"`);
    }
    for (const k of keywordMatches) {
      reasons.push(`Report mentions "${k.keyword}"`);
    }

    suggestions.push({
      specialty,
      icon: rule.icon,
      description: rule.description,
      priority,
      reasons,
      evidence: testMatches
    });
  }

  // Sort: high priority first, then medium, then low; ties keep insertion order
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);

  return {
    suggestions,
    disclaimer: 'This is informational only and is not a medical diagnosis. Please consult a qualified doctor for proper evaluation and advice.'
  };
}