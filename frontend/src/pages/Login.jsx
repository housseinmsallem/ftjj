import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function dashboardPathForRole(role) {
  if (role === 'FEDERATION_ADMIN') return '/admin';
  if (role === 'CLUB_ADMIN') return '/club';
  if (role === 'ATHLETE') return '/athlete/dashboard';
  if (role === 'COACH') return '/coach/dashboard';
  if (role === 'REFEREE') return '/referee/dashboard';
  return '/';
}

export default function Login() {
  const [email, setEmail] = useState('admin@ftjj.tn');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      navigate(dashboardPathForRole(user.role));
    } catch (err) {
      console.error('FTJJ login failed', err);
      setError(err.response?.data?.message || err.message || 'Connexion impossible');
    }
  }

  return (
    <div className="page auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Connexion FTJJ</h2>
        <p>Compte test: admin@ftjj.tn / password123</p>
        {error && <div className="alert">{error}</div>}
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="primary" type="submit">Se connecter</button>
      </form>
    </div>
  );
}
