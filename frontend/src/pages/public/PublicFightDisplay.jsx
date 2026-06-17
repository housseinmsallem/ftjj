import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../services/api';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api','');
export default function PublicFightDisplay() {
  const { fightId } = useParams();
  const [session, setSession] = useState(null);
  useEffect(()=>{
    api.get(`/scoring/fight/${fightId}/public`).then(({data})=>setSession(data)).catch(()=>{});
    const socket = io(SOCKET_URL);
    socket.emit('scoring:join', { fightId });
    socket.on('scoring:update', setSession);
    socket.on('scoring:validated', setSession);
    return ()=>{ socket.emit('scoring:leave', { fightId }); socket.disconnect(); };
  }, [fightId]);
  if (!session) return <main className="public-display"><h1>Combat en attente</h1></main>;
  const fight = session.fight || {};
  return <main className="public-display"><header><strong>{session.competition?.title || 'FTJJ Live'}</strong><span>{fight.category || session.discipline} - {fight.mat}</span></header><section className="public-score"><div className="red"><h2>{fight.redAthlete?.firstName} {fight.redAthlete?.lastName}</h2><small>{fight.redAthlete?.club?.name}</small><strong>{session.red?.score || 0}</strong><span>AV {session.red?.advantages || 0} / PEN {session.red?.penalties || 0}</span></div><div className="timer"><strong>{Math.floor((session.remainingSeconds || 0)/60)}:{String((session.remainingSeconds || 0)%60).padStart(2,'0')}</strong><span>{session.status}</span>{session.winnerSide && <b>Winner: {session.winnerSide}</b>}</div><div className="blue"><h2>{fight.blueAthlete?.firstName} {fight.blueAthlete?.lastName}</h2><small>{fight.blueAthlete?.club?.name}</small><strong>{session.blue?.score || 0}</strong><span>AV {session.blue?.advantages || 0} / PEN {session.blue?.penalties || 0}</span></div></section></main>;
}
