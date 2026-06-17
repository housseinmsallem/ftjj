import { Link } from 'react-router-dom';
import logo from '../../assets/images/logo-footer.png';
import { contactDetails } from '../../data/publicContent';

export default function Footer() {
  return (
    <footer className="public-site-footer">
      <div className="section-inner">
        <div className="public-footer-callout">
          <div>
            <p className="eyebrow">Plateforme FTJJ</p>
            <h3>Un portail plus premium pour le public et les espaces prives</h3>
            <p>
              Affiliation, annuaires, rankings, live scoring et dashboards metier
              reunis dans une seule experience plus claire.
            </p>
          </div>
          <div className="public-actions compact">
            <Link className="public-btn primary" to="/espace-licencie">Acceder aux espaces</Link>
            <Link className="public-btn ghost" to="/affiliation">Demander une affiliation</Link>
          </div>
        </div>
      </div>

      <div className="section-inner public-footer-grid">
        <div className="public-footer-brand">
          <img src={logo} alt="FTJJ" />
          <div>
            <strong>FTJJ</strong>
            <small>Federation Tunisienne de Jiu-Jitsu</small>
            <p>
              Portail officiel de la federation: site public, annuaires, competitions,
              live scoring et services prives pour les profils federaux.
            </p>
          </div>
        </div>

        <div className="public-footer-column">
          <h4>Navigation</h4>
          <Link to="/federation">La Federation</Link>
          <Link to="/competitions">Competitions</Link>
          <Link to="/ranking">Ranking</Link>
          <Link to="/actualites">Actualites</Link>
        </div>

        <div className="public-footer-column">
          <h4>Annuaires</h4>
          <Link to="/clubs">Clubs</Link>
          <Link to="/athletes">Athletes</Link>
          <Link to="/coaches">Coachs</Link>
          <Link to="/referees">Arbitres</Link>
        </div>

        <div className="public-footer-column">
          <h4>Services</h4>
          <Link to="/affiliation">Affiliation</Link>
          <Link to="/en-direct">Live scoring</Link>
          <Link to="/espace-licencie">Espace licencie</Link>
          <Link to="/contact">Contact</Link>
        </div>

        <div className="public-footer-column">
          <h4>Contact</h4>
          <span>{contactDetails.address}</span>
          <a href={`tel:${contactDetails.phone.replace(/\s+/g, '')}`}>{contactDetails.phone}</a>
          <a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a>
        </div>
      </div>

      <div className="public-footer-bottom">
        <span>Copyright 2026 Federation Tunisienne de Jiu-Jitsu</span>
        <span>JJIF</span>
        <span>UNJA</span>
        <span>Tunisie</span>
      </div>
    </footer>
  );
}
