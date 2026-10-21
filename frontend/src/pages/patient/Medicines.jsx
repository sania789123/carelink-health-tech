import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Medicines() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [meds, setMeds] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  // Quick-add form state
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTimes, setNewTimes] = useState('08:00');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const d = await api.get('/medicines/' + user.id);
      setMeds(d.medicines || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, [user.id]);

  const normalize = (s) => String(s || '').trim().toLowerCase();

  const mark = async (med, time, status) => {
    const key = med.id + ':' + time;
    setBusyId(key);
    setMsg(''); setErr('');
    try {
      await api.post('/medicines/' + user.id + '/' + med.id + '/take', {
        scheduled_time: time,
        status
      });
      const label = status === 'taken' ? 'taken' : status === 'missed' ? 'missed' : 'skipped';
      setMsg((med.name || 'Medicine') + ' marked as ' + label + ' at ' + time);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId('');
    }
  };

  // ---- Smart delete: delete ALL medicines with the same name ----
  const deleteMedByName = async (med) => {
    const targetName = normalize(med.name);
    if (!targetName) return;

    // Find all duplicate entries with same name (from FULL list, not filtered)
    const duplicates = (meds || []).filter(m => normalize(m.name) === targetName);
    const count = duplicates.length;

    const displayName = med.name || 'Unnamed Medicine';
    const confirmMsg = count > 1
      ? `Delete "${displayName}"? Found ${count} entries with this name — all will be removed. This cannot be undone.`
      : `Delete "${displayName}" permanently? This cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    setDeletingId(med.id);
    setErr(''); setMsg('');

    try {
      // Delete every duplicate by ID
      for (const dup of duplicates) {
        await api.del('/medicines/' + user.id + '/' + dup.id);
      }

      // Immediately remove from local state (so the UI updates even before refresh)
      setMeds(prev => (prev || []).filter(m => normalize(m.name) !== targetName));
      setMsg(`Deleted ${count} entr${count > 1 ? 'ies' : 'y'} of ${displayName}`);

      // Then refresh from server to be safe
      await load();
    } catch (e) {
      setErr(e.message);
      // Still refresh so user sees the true state
      await load();
    } finally {
      setDeletingId('');
    }
  };

  const addMedicine = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!newName.trim()) return setErr('Please enter a medicine name.');
    setSaving(true);
    try {
      const timesArr = newTimes.split(',').map(s => s.trim()).filter(Boolean);
      if (timesArr.length === 0) timesArr.push('08:00');
      await api.post('/medicines/' + user.id, {
        name: newName.trim(),
        dosage: newDosage.trim() || null,
        frequency: null,
        times: timesArr,
        duration_days: null,
        start_date: null,
        instructions: null,
        confirmed: true
      });
      setMsg('Medicine added: ' + newName.trim());
      setNewName(''); setNewDosage(''); setNewTimes('08:00');
      setShowAdd(false);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (err && !meds) return <div className="error">{err}</div>;
  if (!meds) return <Loading />;

  const validMeds = meds.filter(m =>
    m.confirmed &&
    m.name &&
    m.name.trim() &&
    m.name.toLowerCase() !== 'unnamed medicine'
  );

  // Deduplicate by name — merge times from all copies
  const byName = new Map();
  for (const m of validMeds) {
    const key = normalize(m.name);
    if (!byName.has(key)) {
      byName.set(key, { ...m, times: [...m.times] });
    } else {
      const existing = byName.get(key);
      const mergedTimes = Array.from(new Set([...existing.times, ...m.times]));
      existing.times = mergedTimes;
      if (!existing.dosage && m.dosage) existing.dosage = m.dosage;
      if (!existing.frequency && m.frequency) existing.frequency = m.frequency;
      if (!existing.instructions && m.instructions) existing.instructions = m.instructions;
    }
  }
  const uniqueMeds = Array.from(byName.values());

  const q = search.trim().toLowerCase();
  const filteredMeds = q
    ? uniqueMeds.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.dosage || '').toLowerCase().includes(q)
      )
    : uniqueMeds;

  const groupsByTime = {};
  for (const m of filteredMeds) {
    for (const time of m.times) {
      if (!groupsByTime[time]) groupsByTime[time] = [];
      groupsByTime[time].push(m);
    }
  }
  const times = Object.keys(groupsByTime).sort();

  const fmtTime = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>{t('medicines') || 'Medicines'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn-primary" to="/patient/medicines/upload">
            {t('upload_prescription') || 'Upload Prescription'}
          </Link>
          <Link className="btn-outline" to="/patient/medicines/history">
            {t('medicine_history') || 'Medicine History'}
          </Link>
        </div>
      </div>

      {msg && <div className="success">{msg}</div>}
      {err && <div className="error">{err}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Today's Schedule</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 260 }}>
          <input
            type="search"
            placeholder="🔍 Search medicine..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '2px solid #dde3ec',
              borderRadius: 8,
              fontSize: '1em',
              minWidth: 200,
              flex: '1 1 200px',
              maxWidth: 320
            }}
          />
          <button
            className={showAdd ? 'btn-outline' : 'btn-primary'}
            onClick={() => setShowAdd(v => !v)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {showAdd ? '✕ Cancel' : '➕ Add Medicine'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form className="card" onSubmit={addMedicine} style={{ marginTop: 12, background: '#f8fafd' }}>
          <h3 style={{ marginTop: 0 }}>Add a Medicine</h3>

          <div className="grid grid-2">
            <div className="field">
              <label>Medicine Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Metformin"
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label>Dosage (optional)</label>
              <input
                value={newDosage}
                onChange={e => setNewDosage(e.target.value)}
                placeholder="e.g. 500 mg"
              />
            </div>
          </div>

          <div className="field">
            <label>Times (comma separated, 24-hour)</label>
            <input
              value={newTimes}
              onChange={e => setNewTimes(e.target.value)}
              placeholder="e.g. 08:00, 20:00"
            />
            <small style={{ color: '#5b6478' }}>
              Use 24-hour format. Multiple times: <code>08:00, 14:00, 20:00</code>
            </small>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : '💊 Add Medicine'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {times.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}>
          {uniqueMeds.length === 0
            ? <>No medicines yet. <Link to="/patient/medicines/upload">Upload a prescription</Link> or click <strong>➕ Add Medicine</strong> to add one.</>
            : 'No medicines match your search.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {times.map(time => {
            const medsAtTime = groupsByTime[time];
            return (
              <div
                key={time}
                className="card"
                style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}
              >
                <div
                  style={{
                    background: '#0d6efd',
                    color: 'white',
                    padding: '20px 16px',
                    minWidth: 110,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontWeight: 700
                  }}
                >
                  <div style={{ fontSize: '1.4em', lineHeight: 1.1 }}>{fmtTime(time).split(' ')[0]}</div>
                  <div style={{ fontSize: '0.85em', opacity: 0.9 }}>{fmtTime(time).split(' ')[1]}</div>
                </div>

                <div style={{ flex: 1, padding: '12px 16px' }}>
                  {medsAtTime.map((m, idx) => {
                    const key = m.id + ':' + time;
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: idx < medsAtTime.length - 1 ? '1px solid #eef2f7' : 'none',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: '1.05em' }}>💊 {m.name}</div>
                          <div style={{ color: '#5b6478', fontSize: '0.9em' }}>
                            {m.dosage ? m.dosage : ''}
                            {m.frequency ? ' • ' + m.frequency : ''}
                            {m.instructions ? ' • ' + m.instructions : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-primary"
                            onClick={() => mark(m, time, 'taken')}
                            disabled={busyId === key}
                            style={{ padding: '8px 14px' }}
                          >
                            ✓ {busyId === key ? '…' : 'Taken'}
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => mark(m, time, 'missed')}
                            disabled={busyId === key}
                            style={{ borderColor: '#dc3545', color: '#dc3545', padding: '8px 14px' }}
                          >
                            ✕ Missed
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => deleteMedByName(m)}
                            disabled={deletingId === m.id}
                            title="Delete this medicine (and all its copies)"
                            style={{ padding: '8px 12px', fontWeight: 700, minWidth: 36, background: '#842029' }}
                          >
                            {deletingId === m.id ? '…' : '✕'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>All Medicines ({uniqueMeds.length})</h2>
      {uniqueMeds.length === 0 ? (
        <div className="empty">{t('no_data') || 'No medicines yet.'}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Times</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uniqueMeds.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.dosage || '—'}</td>
                  <td>{m.frequency || '—'}</td>
                  <td>{m.times.join(', ') || '—'}</td>
                  <td>
                    {m.confirmed
                      ? <span className="badge confirmed">Confirmed</span>
                      : <span className="badge pending">Needs Confirmation</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-danger"
                      onClick={() => deleteMedByName(m)}
                      disabled={deletingId === m.id}
                      title="Delete this medicine (and all its copies)"
                      style={{ padding: '6px 10px', fontWeight: 700, minWidth: 36, background: '#842029' }}
                    >
                      {deletingId === m.id ? '…' : '✕'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}