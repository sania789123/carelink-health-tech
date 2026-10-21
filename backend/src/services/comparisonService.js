import { db } from '../config/database.js';

export function compareReports(reportAId, reportBId) {
  const a = db.prepare('SELECT * FROM reports WHERE id=?').get(reportAId);
  const b = db.prepare('SELECT * FROM reports WHERE id=?').get(reportBId);
  if (!a || !b) return null;

  const testsA = db.prepare('SELECT * FROM test_results WHERE report_id=?').all(reportAId);
  const testsB = db.prepare('SELECT * FROM test_results WHERE report_id=?').all(reportBId);

  const byName = new Map();
  for (const t of testsA) byName.set(t.test_name.toLowerCase().trim(), t);

  const comparisons = [];
  for (const tb of testsB) {
    const ta = byName.get(tb.test_name.toLowerCase().trim());
    if (!ta) { comparisons.push({ test_name: tb.test_name, status: 'new', current: tb }); continue; }
    if ((ta.unit||'').toLowerCase() !== (tb.unit||'').toLowerCase()) {
      comparisons.push({ test_name: tb.test_name, status: 'unit_mismatch', previous: ta, current: tb, note: 'Units differ.' });
      continue;
    }
    const prevVal = Number(ta.value), currVal = Number(tb.value);
    if (!isFinite(prevVal) || !isFinite(currVal)) {
      comparisons.push({ test_name: tb.test_name, status: 'non_numeric', previous: ta, current: tb });
      continue;
    }
    const abs = currVal - prevVal;
    const pct = prevVal !== 0 ? (abs / prevVal) * 100 : null;
    comparisons.push({
      test_name: tb.test_name, unit: tb.unit,
      reference_range: tb.reference_range || ta.reference_range,
      previous: prevVal, current: currVal,
      absolute_change: Number(abs.toFixed(3)),
      percent_change: pct === null ? null : Number(pct.toFixed(2)),
      direction: abs > 0 ? 'up' : abs < 0 ? 'down' : 'stable',
      status: 'compared'
    });
  }
  return {
    previous: { id: a.id, title: a.title, date: a.report_date },
    current: { id: b.id, title: b.title, date: b.report_date },
    comparisons,
    disclaimer: 'Automated comparison of extracted values only. Not a clinical interpretation.'
  };
}
