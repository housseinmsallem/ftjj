import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import api from '../services/api';
export default function AdminNotifications() {
    const [items, setItems] = useState([]); const [form, setForm] = useState({ targetRole: 'ALL' });
    const load = () => api.get('/notifications').then(r => setItems(r.data)); 
    useEffect(() => {
        load();
    }, []);
    const create = async (e) => {
        e.preventDefault(); await api.post('/notifications', form);
        setForm({ targetRole: 'ALL' }); load()
    };
    const send = async (id) => { await api.patch(`/notifications/${id}/send`); load() };
    return <AdminLayout><div className="page-head">
        <h1>Notifications fédérales</h1>
    </div>
        <form className="quick-form" onSubmit={create}>
            <input placeholder="Titre" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Message" value={form.message || ''} onChange={e => setForm({ ...form, message: e.target.value })} />
            <select value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })}>
                <option>ALL</option>
                <option>CLUB_ADMIN</option>
                <option>COACH</option>
                <option>REFEREE</option>
                <option>ATHLETE</option>
            </select>
            <button className="btn primary">Créer</button>
        </form>
        <div className="table-card">
            <table>
                <thead>
                    <tr>
                        <th>Titre</th>
                        <th>Cible</th>
                        <th>Statut</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(n => (
                        <tr key={n._id}>
                            <td>
                                {n.title}
                                <br />
                                <small>{n.message}</small>
                            </td>
                            <td>{n.targetRole}</td>
                            <td>{n.status}</td>
                            <td>
                                {n.status === 'draft' && (
                                    <button onClick={() => send(n._id)}>Envoyer</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </AdminLayout>
}
