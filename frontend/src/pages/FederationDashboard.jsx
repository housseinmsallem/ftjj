import React, { useEffect, useState } from 'react';
import api from '../services/api';
import StatCard from '../components/ui/StatCard';
import SmartTable from '../components/ui/SmartTable';
import AdminLayout from '../components/layout/AdminLayout';
import { formatJiuJitsuGrade, formatNewazaGrade } from '../utils/grades';

export default function FederationDashboard() {
  const [stats, setStats] = useState({});
  const [clubs, setClubs] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [notice, setNotice] = useState('');

  async function load() {
    const [statsResponse, clubsResponse, athletesResponse] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/clubs'),
      api.get('/athletes')
    ]);
    setStats(statsResponse.data);
    setClubs(clubsResponse.data);
    setAthletes(athletesResponse.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function recalc() {
    const { data } = await api.post('/workflow/rankings/recalculate');
    setNotice(`Ranking recalcule : ${data.length} athletes`);
  }

  async function approve(id) {
    await api.patch(`/workflow/clubs/${id}/approve`);
    setNotice('Club approuve');
    load();
  }

  return (
    <AdminLayout>
      <div className="hero-admin">
        <div>
          <p className="eyebrow">Federation Tunisienne de Jiu-Jitsu</p>
          <h1>Centre de controle national</h1>
          <p>Suivi des affiliations, licences, documents, classements et competitions.</p>
        </div>
        <button className="primary" onClick={recalc}>Recalculer rankings</button>
      </div>

      {notice && <div className="notice">{notice}</div>}

      <div className="stats-grid">
        <StatCard label="Clubs" value={stats.clubs || 0} />
        <StatCard label="Athletes" value={stats.athletes || 0} />
        <StatCard label="Coachs" value={stats.coaches || 0} />
        <StatCard label="Arbitres" value={stats.referees || 0} />
        <StatCard label="Competitions" value={stats.competitions || 0} />
        <StatCard label="Documents en attente" value={stats.pendingDocs || 0} />
        <StatCard label="Revenus" value={`${stats.revenue || 0} TND`} />
      </div>

      <SmartTable
        title="Clubs a suivre"
        rows={clubs}
        columns={[
          { key: 'name', label: 'Club' },
          { key: 'governorate', label: 'Gouvernorat' },
          { key: 'affiliationStatus', label: 'Statut' },
          { key: 'actions', label: 'Action', render: (row) => <button onClick={() => approve(row._id)}>Approuver</button> }
        ]}
      />

      <SmartTable
        title="Top athletes"
        rows={[...athletes].sort((left, right) => (right.rankingPoints || 0) - (left.rankingPoints || 0)).slice(0, 8)}
        columns={[
          { key: 'name', label: 'Athlete', render: (row) => `${row.firstName} ${row.lastName}` },
          { key: 'category', label: 'Categorie' },
          { key: 'jiujitsuGrade', label: 'Grade Jiu-Jitsu', render: (row) => formatJiuJitsuGrade(row) },
          { key: 'newazaGrade', label: 'Grade Newaza', render: (row) => formatNewazaGrade(row) },
          { key: 'rankingPoints', label: 'Points' }
        ]}
      />
    </AdminLayout>
  );
}
