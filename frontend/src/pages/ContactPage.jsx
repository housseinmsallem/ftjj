import { Link } from 'react-router-dom';
import { contactDetails } from '../data/publicContent';

export default function ContactPage() {
  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-contact">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Contact FTJJ</p>
            <h1>Prendre contact avec la federation</h1>
            <p className="hero-copy">
              Pour les clubs, les licencies, les arbitres, les coachs et les partenaires, la
              plateforme propose maintenant un point d'entree clair vers les services FTJJ.
            </p>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">Coordonnees officielles</p>
            <ul className="hero-meta-list">
              <li>{contactDetails.address}</li>
              <li><a href={`tel:${contactDetails.phone.replace(/\s+/g, '')}`}>{contactDetails.phone}</a></li>
              <li><a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner contact-grid">
          <article className="surface-card contact-card">
            <span className="feature-chip">Clubs</span>
            <h3>Affiliation & administration</h3>
            <p>Suivi des demandes d'affiliation, pieces justificatives, licences et parcours club.</p>
            <Link className="public-btn primary" to="/affiliation">Demander une affiliation</Link>
          </article>

          <article className="surface-card contact-card">
            <span className="feature-chip">Licencies</span>
            <h3>Connexion & espaces prives</h3>
            <p>Acces aux espaces athletes, coachs, arbitres et clubs depuis un parcours plus lisible.</p>
            <Link className="public-btn ghost" to="/espace-licencie">Voir les portails</Link>
          </article>

          <article className="surface-card contact-card">
            <span className="feature-chip">Competition</span>
            <h3>Live scoring & informations sportives</h3>
            <p>Resultats en direct, tableaux, calendrier officiel et diffusion des temps forts federaux.</p>
            <Link className="public-btn ghost" to="/en-direct">Suivre le direct</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
