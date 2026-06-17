import { Link } from 'react-router-dom';
import { portalCards } from '../data/publicContent';
import { useAuth } from '../context/AuthContext';

function dashboardPathFor(user) {
  if (!user) return '/login';
  if (user.role === 'FEDERATION_ADMIN') return '/admin';
  if (user.role === 'CLUB_ADMIN') return '/club';
  if (user.role === 'ATHLETE') return '/athlete/dashboard';
  if (user.role === 'COACH') return '/coach/dashboard';
  if (user.role === 'REFEREE') return '/referee/dashboard';
  return '/login';
}

export default function LicensedSpacePage() {
  const { user } = useAuth();

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-portal">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Espace licencie</p>
            <h1>Un acces clair pour chaque profil FTJJ</h1>
            <p className="hero-copy">
              Clubs, athletes, coachs et arbitres disposent maintenant d'un parcours public qui
              explique l'usage de chaque espace prive avant la connexion.
            </p>
            <div className="public-actions">
              <Link className="public-btn primary" to={dashboardPathFor(user)}>
                {user ? 'Acceder a mon espace' : 'Se connecter'}
              </Link>
              <Link className="public-btn ghost" to="/affiliation">Creer un acces club</Link>
            </div>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">Services inclus</p>
            <ul className="hero-meta-list">
              <li>Licences et documents</li>
              <li>Suivi des athletes et competitions</li>
              <li>Live scoring, ranking et notifications</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="feature-grid portal-grid">
            {portalCards.map((portal) => (
              <article className="surface-card feature-card portal-card" key={portal.title}>
                <span className="feature-chip">{portal.role}</span>
                <h3>{portal.title}</h3>
                <p>{portal.text}</p>
                <div className="public-actions compact">
                  {portal.actions.map((action) => (
                    <Link className="public-btn ghost" key={action.label} to={action.to}>{action.label}</Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
