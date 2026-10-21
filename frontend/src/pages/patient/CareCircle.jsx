import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const PERMISSIONS = [
  { key: 'view_reports', labelKey: 'perm_view_reports', label: 'View medical reports', icon: '📄' },
  { key: 'view_medicines', labelKey: 'perm_view_medicines', label: 'View medicines', icon: '💊' },
  { key: 'upload_reports', labelKey: 'perm_upload_reports', label: 'Upload reports', icon: '⬆️' },
  { key: 'checkins', labelKey: 'perm_checkins', label: 'Help with check-ins', icon: '✅' }
];

const TASK_TYPES = [
  { value: 'general', labelKey: 'task_type_general', label: 'General' },
  { value: 'measurement', labelKey: 'task_type_measurement', label: 'Measurement' },
  { value: 'upload', labelKey: 'task_type_upload', label: 'Upload' },
  { value: 'medicine', labelKey: 'task_type_medicine', label: 'Medicine' },
  { value: 'appointment', labelKey: 'task_type_appointment', label: 'Appointment' }
];

function statusBadgeClass(status) {
  if (status === 'accepted') return 'badge confirmed';
  if (status === 'pending') return 'badge pending';
  return 'badge revoked';
}

export default function CareCircle() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePerms, setInvitePerms] = useState(['view_reports', 'view_medicines', 'checkins']);
  const [inviteHours, setInviteHours] = useState(72);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('general');
  const [taskDue, setTaskDue] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState('');

  const loadAll = async () => {
    try {
      const [p, ts, cgs, invs] = await Promise.all([
        api.get('/carecircle/' + user.id + '/plans'),
        api.get('/carecircle/' + user.id + '/tasks'),
        api.get('/patients/' + user.id + '/caregivers'),
        api.get('/patients/' + user.id + '/caregivers/invitations')
      ]);
      setPlans(p.plans || []);
      setTasks(ts.tasks || []);
      setCaregivers(cgs.caregivers || []);
      setInvitations(invs.invitations || []);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [user.id]);

  const togglePerm = (key) => {
    setInvitePerms(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const createTask = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!taskTitle.trim()) return setError('Please enter a task title.');
    setCreatingTask(true);
    try {
      await api.post('/carecircle/' + user.id + '/tasks', {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        task_type: taskType,
        due_date: taskDue || null,
        assigned_to: taskAssignedTo || user.id
      });
      setSuccess('Task created successfully.');
      setTaskTitle('');
      setTaskDesc('');
      setTaskType('general');
      setTaskDue('');
      setTaskAssignedTo('');
      setShowAddTask(false);
      loadAll();
    } catch (e) {
      setError(e.message || 'Could not create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const deleteTask = async (task) => {
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setDeletingTaskId(task.id);
    setError(''); setSuccess('');
    try {
      await api.del('/carecircle/' + user.id + '/tasks/' + task.id);
      setSuccess('Task deleted.');
      loadAll();
    } catch (e) {
      setError(e.message || 'Could not delete task');
    } finally {
      setDeletingTaskId('');
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setCreatedInvite(null); setCopied(false);
    if (!inviteEmail.trim()) return setError('Please enter the caregiver email');
    try {
      const res = await api.post(
        '/patients/' + user.id + '/caregivers/invitations',
        {
          email: inviteEmail.trim(),
          name: inviteName.trim() || null,
          permissions: invitePerms,
          expiresInHours: Number(inviteHours) || 72
        }
      );
      setCreatedInvite(res);
      setSuccess('Invitation created. Share the link below with your caregiver.');
      setInviteEmail('');
      setInviteName('');
      loadAll();
    } catch (e) {
      setError(e.message || 'Could not create invitation');
    }
  };

  const copyLink = async () => {
    if (!createdInvite) return;
    try {
      await navigator.clipboard.writeText(createdInvite.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Copy failed — please select the link manually.');
    }
  };

  const cancelInvite = async (id) => {
    if (!confirm('Cancel this invitation?')) return;
    try {
      await api.post('/patients/' + user.id + '/caregivers/invitations/' + id + '/cancel');
      loadAll();
    } catch (e) { setError(e.message); }
  };

  const resendInvite = async (id) => {
    try {
      const r = await api.post('/patients/' + user.id + '/caregivers/invitations/' + id + '/resend');
      setCreatedInvite({ inviteUrl: r.inviteUrl, expiresAt: r.expiresAt });
      setSuccess('Invitation renewed. New link generated below.');
      loadAll();
    } catch (e) { setError(e.message); }
  };

  const revokeCaregiver = async (linkId) => {
    if (!confirm('Revoke this caregiver\'s access?')) return;
    try {
      await api.del('/patients/' + user.id + '/caregivers/' + linkId);
      loadAll();
    } catch (e) { setError(e.message); }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.put('/carecircle/' + user.id + '/tasks/' + taskId, { status });
      loadAll();
    } catch (e) { setError(e.message); }
  };

  if (loading) return <div className="loading">{t('loading') || 'Loading...'}</div>;

  return (
    <div>
      <h1>{t('care_circle') || 'Care Circle'}</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* ---------------- Care Plans ---------------- */}
      <h2>{t('care_plans') || 'Care Plans'}</h2>
      {plans.length === 0 ? (
        <div className="empty">{t('no_care_plans') || 'No care plans yet.'}</div>
      ) : plans.map(p => (
        <div key={p.id} className="card">
          <strong>{p.title}</strong>
          <p>{p.description}</p>
          <small>
            {t('by') || 'By'} {p.doctor_name || t('your_doctor') || 'your doctor'}
            {p.start_date ? ' • ' + p.start_date : ''}
            {p.end_date ? ' ' + (t('to') || 'to') + ' ' + p.end_date : ''}
          </small>
        </div>
      ))}

      {/* ---------------- Tasks ---------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{t('tasks') || 'Tasks'} ({tasks.length})</h2>
        <button
          className={showAddTask ? 'btn-outline' : 'btn-primary'}
          onClick={() => setShowAddTask(v => !v)}
        >
          {showAddTask ? `✕ ${t('cancel') || 'Cancel'}` : `➕ ${t('add_task') || 'Add Task'}`}
        </button>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <form className="card" style={{ marginTop: 12, background: '#f8fafd' }} onSubmit={createTask}>
          <h3 style={{ marginTop: 0 }}>{t('new_task') || 'New Task'}</h3>

          <div className="field">
            <label>{t('task_title') || 'Task Title'} *</label>
            <input
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder={t('task_title_placeholder') || 'e.g. Take morning walk'}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label>{t('description_optional') || 'Description (optional)'}</label>
            <input
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              placeholder={t('task_desc_placeholder') || 'e.g. 20 minutes around the park'}
            />
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label>{t('task_type') || 'Task Type'}</label>
              <select value={taskType} onChange={e => setTaskType(e.target.value)}>
                {TASK_TYPES.map(tt => (
                  <option key={tt.value} value={tt.value}>{t(tt.labelKey) || tt.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>{t('due_date') || 'Due Date'}</label>
              <input
                type="date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>{t('assign_to') || 'Assign To'}</label>
            <select value={taskAssignedTo} onChange={e => setTaskAssignedTo(e.target.value)}>
              <option value="">{t('myself') || 'Myself'}</option>
              {caregivers.filter(c => c.status === 'active').map(cg => (
                <option key={cg.id} value={cg.caregiver_id}>{cg.full_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit" disabled={creatingTask}>
              {creatingTask ? (t('creating') || 'Creating…') : (t('create_task') || 'Create Task')}
            </button>
            <button type="button" className="btn-outline" onClick={() => setShowAddTask(false)}>
              {t('cancel') || 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Tasks list */}
      <div style={{ marginTop: 12 }}>
        {tasks.length === 0 ? (
          <div className="empty">{t('no_tasks') || 'No tasks yet. Click "➕ Add Task" to create one.'}</div>
        ) : tasks.map(tk => (
          <div key={tk.id} className="report-row">
            <div>
              <strong>{tk.title}</strong>
              <br />
              <small>
                {t('task_type_' + tk.task_type) || tk.task_type} • {t('due') || 'due'} {tk.due_date || (t('na') || 'N/A')}
                {tk.assignee_name ? ' • ' + (t('assigned_to') || 'assigned to') + ' ' + tk.assignee_name : ''}
                {tk.creator_name ? ' • ' + (t('by') || 'by') + ' ' + tk.creator_name : ''}
              </small>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={statusBadgeClass(tk.status === 'completed' ? 'accepted' : tk.status === 'pending' ? 'pending' : 'revoked')}>
                {t('status_' + tk.status) || tk.status}
              </span>
              {tk.status !== 'completed' && (
                <button className="btn-outline" onClick={() => updateTaskStatus(tk.id, 'completed')}>
                  {t('mark_done') || 'Mark Done'}
                </button>
              )}
              <button
                className="btn-danger"
                onClick={() => deleteTask(tk)}
                disabled={deletingTaskId === tk.id}
                title={t('delete') || 'Delete'}
                style={{ padding: '8px 12px', fontWeight: 700, minWidth: 40, background: '#842029' }}
              >
                {deletingTaskId === tk.id ? '…' : '✕'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- Invite Caregiver ---------------- */}
      <h2 style={{ marginTop: 32 }}>{t('invite_caregiver') || 'Invite a Caregiver'}</h2>

      <form className="card" onSubmit={sendInvite}>
        <div className="field">
          <label>{t('caregiver_email') || 'Caregiver Email'} *</label>
          <input
            type="email"
            placeholder="their-email@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>{t('their_name') || 'Their Name'} ({t('optional') || 'optional'})</label>
          <input
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            placeholder="e.g. Priya"
          />
        </div>

        <div className="field">
          <label>{t('permissions') || 'Permissions'}</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginTop: 6
            }}
          >
            {PERMISSIONS.map(p => {
              const checked = invitePerms.includes(p.key);
              return (
                <label
                  key={p.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    border: '2px solid',
                    borderColor: checked ? 'var(--primary)' : '#dde3ec',
                    background: checked ? '#eef4ff' : '#fff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePerm(p.key)}
                    style={{ width: 20, height: 20, margin: 0, cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '1.1em' }} aria-hidden="true">{p.icon}</span>
                  <span style={{ flex: 1 }}>{t(p.labelKey) || p.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label>{t('link_expires') || 'Link expires in (hours)'}</label>
          <input
            type="number"
            min="1"
            max="720"
            value={inviteHours}
            onChange={e => setInviteHours(e.target.value)}
          />
        </div>

        <button className="btn-primary" type="submit">
          {t('create_invitation') || 'Create Invitation'}
        </button>
      </form>

      {/* Created Link Box */}
      {createdInvite && (
        <div className="card" style={{ background: '#e7f5ee', borderColor: '#198754' }}>
          <h3 style={{ marginTop: 0 }}>✅ {t('invitation_generated') || 'Invitation Link Generated'}</h3>
          <p style={{ margin: '8px 0' }}>
            <strong>{t('email_not_configured') || 'Email delivery is not configured.'}</strong>{' '}
            {t('copy_link_hint') || 'Copy this link and send it to your caregiver via WhatsApp, SMS, or email.'}
          </p>
          <div
            style={{
              background: '#fff',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #dde3ec',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.9em',
              marginBottom: 12
            }}
          >
            {createdInvite.inviteUrl}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={copyLink}>
              {copied ? ('✓ ' + (t('copied') || 'Copied!')) : (t('copy_link') || 'Copy Link')}
            </button>
            <a
              className="btn-outline"
              href={createdInvite.inviteUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('preview_invite') || 'Preview Invite Page'}
            </a>
          </div>
          <p style={{ marginTop: 12, fontSize: '0.85em', color: '#5b6478' }}>
            {t('expires') || 'Expires'}: {new Date(createdInvite.expiresAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* ---------------- Invitations List ---------------- */}
      <h2 style={{ marginTop: 32 }}>{t('invitations') || 'Invitations'}</h2>
      {invitations.length === 0 ? (
        <div className="empty">{t('no_invitations') || 'No invitations sent yet.'}</div>
      ) : invitations.map(inv => (
        <div key={inv.id} className="report-row">
          <div>
            <strong>{inv.invited_name || inv.invited_email}</strong>
            {inv.invited_name ? <small style={{ marginLeft: 6 }}>({inv.invited_email})</small> : null}
            <br />
            <small>
              {t('sent') || 'Sent'} {new Date(inv.created_at).toLocaleDateString()}
              {inv.status === 'pending' ? ' • ' + (t('expires') || 'expires') + ' ' + new Date(inv.expires_at).toLocaleString() : ''}
              {inv.accepted_by_name ? ' • ' + (t('accepted_by') || 'accepted by') + ' ' + inv.accepted_by_name : ''}
            </small>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={statusBadgeClass(inv.status === 'accepted' ? 'accepted' : inv.status === 'pending' ? 'pending' : 'revoked')}>
              {t('status_' + inv.status) || inv.status}
            </span>
            {(inv.status === 'pending' || inv.status === 'expired') && (
              <>
                <button className="btn-outline" onClick={() => resendInvite(inv.id)}>
                  {t('resend') || 'Resend'}
                </button>
                {inv.status === 'pending' && (
                  <button className="btn-danger" onClick={() => cancelInvite(inv.id)}>
                    {t('cancel') || 'Cancel'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      {/* ---------------- Active Caregivers ---------------- */}
      <h2 style={{ marginTop: 32 }}>{t('active_caregivers') || 'Active Caregivers'}</h2>
      {caregivers.filter(c => c.status === 'active').length === 0 ? (
        <div className="empty">{t('no_caregivers') || 'No active caregivers yet.'}</div>
      ) : caregivers.filter(c => c.status === 'active').map(cg => (
        <div key={cg.id} className="report-row">
          <div>
            <strong>{cg.full_name}</strong>
            <br />
            <small>
              {cg.email}
              {(cg.permissions || []).length ? ' • ' + cg.permissions.join(', ') : ''}
            </small>
          </div>
          <button className="btn-danger" onClick={() => revokeCaregiver(cg.id)}>
            {t('revoke_access') || 'Revoke Access'}
          </button>
        </div>
      ))}
    </div>
  );
}