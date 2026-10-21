import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Loading from '../../components/Loading.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/patients/' + user.id + '/profile').then(d => setP(d.profile)); }, [user.id]);
  if (!p) return <Loading />;

  const save = async (e) => {
    e.preventDefault();
    await api.put('/patients/' + user.id + '/profile', {
      phone: p.phone, language: p.language, senior_mode: p.senior_mode,
      date_of_birth: p.date_of_birth, blood_group: p.blood_group,
      address: p.address, emergency_contact: p.emergency_contact
    });
    setMsg('Profile updated');
  };

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  return (
    <div>
      <h1>Profile</h1>
      {msg && <div className="success">{msg}</div>}
      <form className="card" onSubmit={save}>
        <div className="field"><label>Full Name</label><input value={p.full_name} disabled /></div>
        <div className="field"><label>Email</label><input value={p.email} disabled /></div>
        <div className="field"><label>Phone</label><input value={p.phone||''} onChange={set('phone')} /></div>
        <div className="field"><label>Date of Birth</label><input type="date" value={p.date_of_birth||''} onChange={set('date_of_birth')} /></div>
        <div className="field"><label>Blood Group</label><input value={p.blood_group||''} onChange={set('blood_group')} /></div>
        <div className="field"><label>Address</label><textarea value={p.address||''} onChange={set('address')} /></div>
        <div className="field"><label>Emergency Contact</label><input value={p.emergency_contact||''} onChange={set('emergency_contact')} /></div>
        <button className="btn-primary">Save</button>
      </form>
    </div>
  );
}
