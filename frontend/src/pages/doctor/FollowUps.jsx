import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function FollowUps() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [tasks, setTasks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [deletingId, setDeletingId] = useState('');
  const [busyId, setBusyId] = useState('');

  // Add task form state
  const [showAdd, setShowAdd] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('general');
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);

  const TASK_TYPES = [
    { value: 'general', label: 'General' },
    { value: 'measurement', label: 'Measurement' },
    { value: 'upload', label: 'Upload' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'appointment', label: 'Appointment' }
  ];

  const load = async () => {
    try {
      const [ts, ps] = await Promise.all([
        api.get('/doctors/me/tasks'),
        api.get('/doctors/me/patients')
      ]);
      setTasks(ts.tasks || []);
      setPatients(ps.patients || []);
      if (!newPatientId && ps.patients?.[0]) setNewPatientId(ps.patients[0].id);
    } catch (e) {
      setError(e.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (task, status) => {
    setBusyId(task.id);
    setError(''); setMsg('');
    try {
      await api.put(
        '/carecircle/' + task.patient_id + '/tasks/' + task.id,
        { status }
      );
      setMsg(`Task "${task.title}" updated to ${status}.`);
      setTasks(prev => prev.map(tk => tk.id === task.id ? { ...tk, status } : tk));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const deleteTask = async (task) => {
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setDeletingId(task.id);
    setError(''); setMsg('');
    try {
      await api.del('/carecircle/' + task.patient_id + '/tasks/' + task.id);
      setMsg(`Deleted: ${task.title}`);
      setTasks(prev => prev.filter(tk => tk.id !== task.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId('');
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!newPatientId) return setError('Please select a patient.');
    if (!newTitle.trim()) return setError('Please enter a task title.');
    setSaving(true);
    try {
      await api.post('/carecircle/' + newPatientId + '/tasks', {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        task_type: newType,
        due_date: newDue || null,
        assigned_to: newPatientId
      });
      setMsg('Task created: ' + newTitle.trim());
      setNewTitle(''); setNewDesc(''); setNewDue(''); setNewType('general');
      setShowAdd(false);
      await load();
    } catch (e) {
      setError(e.message || 'Could not create task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const openTasks = tasks.filter(tk => tk.status === 'pending' || tk.status === 'in_progress');
  const doneTasks = tasks.filter(tk => tk.status === 'completed' || tk.status === 'missed');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h1>{t('follow_ups') || 'Follow Ups'}</h1>
        <button
          className={showAdd ? 'btn-outline' : 'btn-primary'}
          onClick={() => setShowAdd(v => !v)}
        >
          {showAdd ? '✕ Cancel' : '➕ Create Task'}
        </button>
      </div>

      {msg && <div className="success">{msg}</div>}
      {error && <div className="error">{error}</div>}

      {/* Create Task Form */}
      {showAdd && (
        <form className="card" onSubmit={addTask} style={{ background: '#f8fafd' }}>
          <h3 style={{ marginTop: 0 }}>New Follow-up Task</h3>

          <div className="field">
            <label>Patient *</label>
            <select
              value={newPatientId}
              onChange={e => setNewPatientId(e.target.value)}
              required
            >
              <option value="">— Select Patient —</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            {patients.length === 0 && (
              <small style={{ color: '#842029' }}>
                No patients yet. A patient must grant you access first (QR scan).
              </small>
            )}
          </div>

          <div className="field">
            <label>Task Title *</label>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Check blood sugar next week"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label>Description (optional)</label>
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="e.g. Report fasting reading"
            />
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label>Task Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value)}>
                {TASK_TYPES.map(tt => (
                  <option key={tt.value} value={tt.value}>{tt.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Due Date</label>
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit" disabled={saving || !patients.length}>
              {saving ? 'Creating…' : '✓ Create Task'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Pending Tasks */}
      <h2 style={{ marginTop: 24 }}>Pending ({openTasks.length})</h2>
      {openTasks.length === 0 ? (
        <div className="empty">No pending tasks.</div>
      ) : (
        openTasks.map(tk => (
          <div key={tk.id} className="report-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <strong>{tk.title}</strong>
              <br />
              <small>
                {tk.patient_name || 'Patient'}
                {tk.task_type ? ' • ' + tk.task_type : ''}
                {tk.due_date ? ' • due ' + tk.due_date : ''}
                {tk.description ? ' • ' + tk.description : ''}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={tk.status}
                onChange={e => updateStatus(tk, e.target.value)}
                disabled={busyId === tk.id}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
              <button
                className="btn-danger"
                onClick={() => deleteTask(tk)}
                disabled={deletingId === tk.id}
                title="Delete this task"
                style={{ padding: '8px 12px', fontWeight: 700, minWidth: 36, background: '#842029' }}
              >
                {deletingId === tk.id ? '…' : '✕'}
              </button>
            </div>
          </div>
        ))
      )}

      {/* Completed / Missed Tasks */}
      {doneTasks.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Completed / Missed ({doneTasks.length})</h2>
          {doneTasks.map(tk => (
            <div key={tk.id} className="report-row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <strong>{tk.title}</strong>
                <br />
                <small>
                  {tk.patient_name || 'Patient'}
                  {tk.completed_at ? ' • completed ' + new Date(tk.completed_at).toLocaleDateString() : ''}
                </small>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={'badge ' + (tk.status === 'completed' ? 'confirmed' : 'revoked')}>
                  {tk.status}
                </span>
                <select
                  value={tk.status}
                  onChange={e => updateStatus(tk, e.target.value)}
                  disabled={busyId === tk.id}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                </select>
                <button
                  className="btn-danger"
                  onClick={() => deleteTask(tk)}
                  disabled={deletingId === tk.id}
                  title="Delete this task"
                  style={{ padding: '8px 12px', fontWeight: 700, minWidth: 36, background: '#842029' }}
                >
                  {deletingId === tk.id ? '…' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}