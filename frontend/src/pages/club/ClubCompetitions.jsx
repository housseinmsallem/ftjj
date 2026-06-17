import React, { useEffect, useState } from 'react';
import api from '../../services/api';
export default function ClubCompetitions(){ const [rows,setRows]=useState([]); useEffect(()=>{ api.get('/competitions').then(r=>setRows(r.data)); },[]); return <section className="panel"><h1>Competitions club</h1>{rows.map(c=><article key={c._id} className="card"><h2>{c.title}</h2><p>{c.location} - {c.registrationStatus}</p></article>)}</section>; }
