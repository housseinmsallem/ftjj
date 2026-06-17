import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../services/api';

export default function AdminCompetitionOperations() {
  const [competitions, setCompetitions] = useState([]);
  const [competitionId, setCompetitionId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [message, setMessage] = useState('');
  async function load() { const { data } = await api.get('/competitions'); setCompetitions(data); if (!competitionId && data[0]?._id) setCompetitionId(data[0]._id); }
  async function loadDetails(id = competitionId) { if (!id) return; const [r,c,b] = await Promise.all([api.get(`/competitions/${id}/registrations`), api.get(`/competitions/${id}/categories`), api.get(`/competitions/${id}/brackets`)]); setRegistrations(r.data); setCategories(c.data); setBrackets(b.data); }
  useEffect(()=>{ load(); }, []);
  useEffect(()=>{ loadDetails(); }, [competitionId]);
  async function run(label, path, method = 'post') { try { await api[method](path); setMessage(`${label} OK`); await loadDetails(); } catch (error) { setMessage(error.response?.data?.message || `${label} impossible`); } }
  return <AdminLayout><div className="page-head"><h1>Operations competition</h1><p>Validation federale, categories, brackets et envoi live scoring.</p></div>{message && <div className="notice">{message}</div>}<section className="panel"><label className="form-row"><span>Competition</span><select value={competitionId} onChange={(e)=>setCompetitionId(e.target.value)}>{competitions.map(c=><option key={c._id} value={c._id}>{c.title || c.name}</option>)}</select></label><div className="table-row-actions"><button onClick={()=>run('Validation globale', `/competitions/${competitionId}/registrations/validate-all`)}>Validate registrations</button><button onClick={()=>run('Generation categories', `/competitions/${competitionId}/generate-categories`)}>Generate categories</button><button onClick={()=>run('Generation brackets', `/competitions/${competitionId}/generate-brackets`)}>Generate brackets</button><button onClick={()=>run('Lock brackets', `/competitions/${competitionId}/lock-brackets`, 'patch')}>Lock brackets</button><button onClick={()=>run('Publish brackets', `/competitions/${competitionId}/publish-brackets`, 'patch')}>Publish brackets</button><button onClick={()=>run('Send live', `/competitions/${competitionId}/brackets/send-to-live`)}>Envoyer au live</button></div></section><section className="grid three"><div className="panel"><h2>Inscriptions</h2><p>{registrations.length} inscriptions</p></div><div className="panel"><h2>Categories</h2><p>{categories.length} categories</p>{categories.map(c=><small key={c._id}>{c.name}<br /></small>)}</div><div className="panel"><h2>Brackets</h2><p>{brackets.length} brackets</p>{brackets.map(b=><small key={b._id}>{b.name} - {b.status} - conflits: {b.firstRoundClubConflicts}<br /></small>)}</div></section></AdminLayout>;
}
