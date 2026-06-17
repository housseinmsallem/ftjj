import { Link } from 'react-router-dom';
import { contactDetails, federationPillars, federationServices, federationTimeline } from '../data/publicContent';

export default function FederationPage() {
  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-federation">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Institution officielle</p>
            <h1>La Federation Tunisienne de Jiu-Jitsu</h1>
            <p className="hero-copy">
              La FTJJ structure la pratique nationale du Jiu-Jitsu, coordonne les clubs affilies
              et centralise les services sportifs, administratifs et digitaux de la federation.
            </p>
            <div className="public-actions">
              <Link className="public-btn primary" to="/affiliation">Affilier mon club</Link>
              <Link className="public-btn ghost" to="/espace-licencie">Decouvrir les espaces prives</Link>
            </div>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">Coordonnees</p>
            <h2>Un point d'entree unique pour la vie federale</h2>
            <ul className="hero-meta-list">
              <li>{contactDetails.address}</li>
              <li>{contactDetails.phone}</li>
              <li>{contactDetails.email}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="section-lead">
            <p className="eyebrow">Vision</p>
            <h2>Une plateforme qui relie gestion federale et experience publique</h2>
            <p>
              L'objectif est de proposer un portail premium pour le grand public tout en gardant
              un socle solide pour l'administration, les clubs et les officiels.
            </p>
          </div>

          <div className="feature-grid editorial-three">
            {federationPillars.map((pillar) => (
              <article className="surface-card feature-card" key={pillar.title}>
                <span className="feature-chip">FTJJ</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section alt-surface">
        <div className="section-inner">
          <div className="section-lead">
            <p className="eyebrow">Parcours</p>
            <h2>Du club a la competition</h2>
          </div>

          <div className="timeline-grid">
            {federationTimeline.map((step, index) => (
              <article className="surface-card timeline-card" key={step.title}>
                <div className="timeline-step">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner split-callout">
          <div>
            <p className="eyebrow">Services federaux</p>
            <h2>Ce que la plateforme couvre deja</h2>
            <ul className="service-list">
              {federationServices.map((service) => <li key={service}>{service}</li>)}
            </ul>
          </div>
          <div className="surface-card cta-panel">
            <h3>Besoin d'acces rapidement ?</h3>
            <p>
              Les clubs peuvent lancer leur affiliation en ligne, et les licencies retrouvent
              ensuite leur espace prive pour suivre licences, classements et competitions.
            </p>
            <div className="public-actions compact">
              <Link className="public-btn primary" to="/affiliation">Demarrer maintenant</Link>
              <Link className="public-btn ghost" to="/contact">Contacter la FTJJ</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
