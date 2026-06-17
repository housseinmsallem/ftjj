import { Link } from 'react-router-dom';
import { mediaShowcase } from '../data/publicContent';

export default function MediaPage() {
  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-media-page">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Medias FTJJ</p>
            <h1>Valoriser les competitions, la federation et ses talents</h1>
            <p className="hero-copy">
              Cette section structure les contenus de visibilite de la federation : galeries,
              contenus live, replays et supports de communication.
            </p>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">A venir</p>
            <h2>Un espace media pret pour evoluer</h2>
            <p>
              La base publique est maintenant prete a accueillir des galeries, assets et relais
              de communication sans casser le socle de la plateforme.
            </p>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="feature-grid editorial-three">
            {mediaShowcase.map((item, index) => (
              <article className={`surface-card media-card media-card-${index + 1}`} key={item.title}>
                <span className="feature-chip">{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Link className="public-btn ghost" to={item.cta}>Explorer</Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
