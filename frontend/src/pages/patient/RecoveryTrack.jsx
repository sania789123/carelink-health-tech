import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function RecoveryTrack() {
  const { user } = useAuth();
  const { t, speak } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [checkins, setCheckins] = useState([]);

  // Add task form state
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const [form, setForm] = useState({
    check_date: new Date().toISOString().slice(0, 10),
    symptoms: '',
    adherence: 'yes',
    measurements: '',
    notes: ''
  });
  const [submitMsg, setSubmitMsg] = useState('');

  const loadAll = async () => {
    try {
      const [p, ts, ci] = await Promise.all([
        api.get('/carecircle/' + user.id + '/plans'),
        api.get('/carecircle/' + user.id + '/tasks'),
        api.get('/recoverytrack/' + user.id + '/checkins')
      ]);
      setPlans(p.plans || []);
      setTasks(ts.tasks || []);
      setCheckins(ci.checkins || []);
    } catch (e) {
      setError(e.message || 'Failed to load recovery data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [user.id]);

  const addTask = async (e) => {
    e.preventDefault();
    setError(''); setSubmitMsg('');
    if (!newTitle.trim()) return setError('Please enter a task title.');
    setSaving(true);
    try {
      await api.post('/carecircle/' + user.id + '/tasks', {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        task_type: 'general',
        due_date: newDue || null,
        assigned_to: user.id
      });
      setSubmitMsg('Task added: ' + newTitle.trim());
      setNewTitle(''); setNewDesc(''); setNewDue('');
      setShowAdd(false);
      loadAll();
    } catch (e) {
      setError(e.message || 'Could not add task');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (task) => {
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setDeletingId(task.id);
    setError(''); setSubmitMsg('');
    try {
      await api.del('/carecircle/' + user.id + '/tasks/' + task.id);
      setSubmitMsg('Task deleted: ' + task.title);
      // Update local state immediately
      setTasks(prev => prev.filter(tk => tk.id !== task.id));
      await loadAll();
    } catch (e) {
      setError(e.message || 'Could not delete task');
    } finally {
      setDeletingId('');
    }
  };

  const submitCheckin = async (e) => {
    e.preventDefault();
    setSubmitMsg('');
    try {
      const activePlan = plans.find(p => p.status === 'active');
      await api.post('/recoverytrack/' + user.id + '/checkins', {
        care_plan_id: activePlan ? activePlan.id : null,
        check_date: form.check_date,
        symptoms: form.symptoms.split(',').map(s => s.trim()).filter(Boolean),
        adherence: form.adherence,
        measurements: form.measurements ? { notes: form.measurements } : {},
        notes: form.notes
      });
      setSubmitMsg('Check-in saved successfully.');
      setForm({ ...form, symptoms: '', measurements: '', notes: '' });
      loadAll();
    } catch (err) {
      setSubmitMsg('Error: ' + (err.message || 'Could not save check-in'));
    }
  };

  const markTaskDone = async (task) => {
    try {
      await api.put('/carecircle/' + user.id + '/tasks/' + task.id, { status: 'completed' });
      loadAll();
    } catch (err) {
      setError(err.message || 'Failed to update task');
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return <Loading />;

  const activePlan = plans.find(p => p.status === 'active') || plans[0];
  const openTasks = tasks.filter(tk => tk.status === 'pending' || tk.status === 'in_progress');
  const doneTasks = tasks.filter(tk => tk.status === 'completed');

  return (
    <div>
      <h1>{t('recovery_track') || 'Recovery Track'}</h1>

      {error && <div className="error">{error}</div>}
      {submitMsg && <div className={submitMsg.startsWith('Error') ? 'error' : 'success'}>{submitMsg}</div>}

      {/* Today's Care Plan */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Today's Care Plan</h2>
        {!activePlan ? (
          <div className="empty">No doctor-approved care plan yet.</div>
        ) : (
          <>
            <p><strong>{activePlan.title}</strong></p>
            <p>{activePlan.description}</p>
            <p style={{ color: '#5b6478', fontSize: '0.9em' }}>
              By {activePlan.doctor_name || 'your doctor'}
              {activePlan.start_date ? ' • from ' + activePlan.start_date : ''}
              {activePlan.end_date ? ' to ' + activePlan.end_date : ''}
            </p>
            <button
              type="button"
              className="btn-outline"
              onClick={() => speak(`${activePlan.title}. ${activePlan.description}`)}
            >
              🔊 Read Aloud
            </button>
          </>
        )}
      </section>

      {/* Pending Tasks */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Pending Tasks ({openTasks.length})</h2>
          <button
            className={showAdd ? 'btn-outline' : 'btn-primary'}
            onClick={() => setShowAdd(v => !v)}
          >
            {showAdd ? '✕ Cancel' : '➕ Add Task'}
          </button>
        </div>

        {/* Add task form */}
        {showAdd && (
          <form onSubmit={addTask} style={{ marginTop: 16, background: '#f8fafd', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>New Task</h3>

            <div className="field">
              <label>Task Title *</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Morning walk"
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label>Description (optional)</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="e.g. 20 minutes around the park"
              />
            </div>

            <div className="field">
              <label>Due Date</label>
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : '✓ Create Task'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Task list */}
        <div style={{ marginTop: 16 }}>
          {openTasks.length === 0 ? (
            <div className="empty">No pending tasks. Click "➕ Add Task" to create one.</div>
          ) : (
            openTasks.map(tk => (
              <div key={tk.id} className="report-row" style={{ alignItems: 'center' }}>
                <div>
                  <strong>{tk.title}</strong>
                  <br />
                  <small>
                    {tk.task_type} • due {tk.due_date || 'N/A'}
                    {tk.description ? ' • ' + tk.description : ''}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-outline" onClick={() => speak(tk.title)}>🔊</button>
                  <button type="button" className="btn-primary" onClick={() => markTaskDone(tk)}>
                    Mark Done
                  </button>
                  <button
                    type="button"
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
        </div>
      </section>

      {/* Completed Tasks */}
      {doneTasks.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Completed ({doneTasks.length})</h2>
          {doneTasks.map(tk => (
            <div key={tk.id} className="report-row" style={{ alignItems: 'center' }}>
              <div>
                <strong>{tk.title}</strong>
                <br />
                <small>completed {tk.completed_at ? new Date(tk.completed_at).toLocaleString() : ''}</small>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge confirmed">completed</span>
                <button
                  type="button"
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
        </section>
      )}

      {/* Daily Check-in Form */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Daily Check-in</h2>
        <form onSubmit={submitCheckin}>
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.check_date} onChange={set('check_date')} required />
          </div>
          <div className="field">
            <label>Symptoms (separate with commas)</label>
            <input
              value={form.symptoms}
              onChange={set('symptoms')}
              placeholder="e.g. fatigue, headache"
            />
          </div>
          <div className="field">
            <label>Took medicines today?</label>
            <select value={form.adherence} onChange={set('adherence')}>
              <option value="yes">Yes</option>
              <option value="partial">Partially</option>
              <option value="no">No</option>
            </select>
          </div>
          <div className="field">
            <label>Measurements / Notes</label>
            <input
              value={form.measurements}
              onChange={set('measurements')}
              placeholder="e.g. BP 120/80, sugar 110"
            />
          </div>
          <div className="field">
            <label>Additional Notes</label>
            <textarea value={form.notes} onChange={set('notes')} />
          </div>
          <button className="btn-primary" type="submit">Save Check-in</button>
        </form>
      </section>

      {/* History */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Previous Check-ins</h2>
        {checkins.length === 0 ? (
          <div className="empty">No check-ins yet.</div>
        ) : (
          checkins.slice(0, 10).map(c => (
            <div key={c.id} className="report-row">
              <div>
                <strong>{c.check_date}</strong>
                <br />
                <small>
                  Symptoms: {(c.symptoms && c.symptoms.join(', ')) || 'none'}
                  {c.adherence ? ' • Adherence: ' + c.adherence : ''}
                </small>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}