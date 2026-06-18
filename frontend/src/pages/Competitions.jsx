import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fallbackEvents } from "../data/publicContent";
import { publicApi } from "../services/api";

function formatDateFr(value) {
  if (!value) return "Date a confirmer";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(start, end) {
  if (!start && !end) return "Date a confirmer";
  const startDate = start ? new Date(start) : new Date(end);
  const endDate = end ? new Date(end) : null;
  const startLabel = formatDateFr(startDate);
  if (!endDate || startDate.toDateString() === endDate.toDateString())
    return startLabel;
  return `${startLabel} - ${formatDateFr(endDate)}`;
}

function normalizeType(value) {
  if (!value) return "Competition";
  return String(value).replace(/_/g, " ");
}

function normalizeStatus(value) {
  if (!value) return "Inscription ouverte";
  const map = {
    OPEN: "Inscription ouverte",
    CLOSED: "Inscription fermee",
    LIVE: "En direct",
    DRAFT: "Preparation",
  };
  return map[value] || value;
}

export default function Competitions() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    publicApi
      .competitions()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  const competitions = useMemo(() => {
    if (items.length) return items;
    return fallbackEvents.map((item) => ({
      _id: item.id,
      title: item.title,
      startDate: item.startDate,
      endDate: item.endDate,
      date: item.startDate,
      location: item.location,
      type: item.badge.toUpperCase(),
      registrationStatus: "OPEN",
      liveEnabled: true,
    }));
  }, [items]);

  const featuredCompetition = competitions[0];
  const sideCompetitions = competitions.slice(1, 4);
  const spotlightCards = [
    {
      title: "Calendrier federal",
      text: "Vision plus claire des opens, championnats et stages sur toute la saison.",
    },
    {
      title: "Inscriptions et statuts",
      text: "Lecture immediate des competitions ouvertes, confirmees ou deja en direct.",
    },
    {
      title: "Lien avec le live",
      text: "Les competitions connectees au scoring restent visibles depuis le portail public.",
    },
  ];

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-competitions-page">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Calendrier officiel</p>
            <h1>Competitions, opens et stages FTJJ</h1>
            <p className="hero-copy">
              Une page plus editoriale pour presenter les rendez-vous federaux,
              les statuts d'inscription et le lien direct avec le live scoring.
            </p>
            <div className="public-actions">
              <Link className="public-btn primary" to="/en-direct">
                Suivre le live
              </Link>
              <Link className="public-btn ghost" to="/contact">
                Contacter la federation
              </Link>
            </div>
          </div>
          <div className="surface-card hero-aside competition-hero-card">
            <p className="eyebrow">Vue competition</p>
            <h2>{competitions.length} rendez-vous visibles</h2>
            <p>
              Le calendrier public est maintenant mieux structure pour les
              visiteurs, clubs et athletes.
            </p>
            <ul className="hero-meta-list">
              <li>Competition phare en tete de page</li>
              <li>Cartes plus lisibles par evenement</li>
              <li>Passerelle vers le live scoring</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="public-section tight-surface">
        <div className="section-inner">
          <div className="competition-command-grid">
            {spotlightCards.map((card) => (
              <article
                className="surface-card competition-kpi-card"
                key={card.title}
              >
                <span className="feature-chip">Competition</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          {featuredCompetition && (
            <div className="competition-stage-layout">
              <article className="surface-card competition-feature-card">
                <div className="competition-card-top">
                  <span className="feature-chip">
                    {normalizeType(featuredCompetition.type)}
                  </span>
                  <span className="competition-status-pill">
                    {normalizeStatus(featuredCompetition.registrationStatus)}
                  </span>
                </div>
                <h2>{featuredCompetition.title}</h2>
                <p>{featuredCompetition.location || "Lieu a confirmer"}</p>
                <div className="story-meta">
                  <span>
                    {formatDateRange(
                      featuredCompetition.startDate || featuredCompetition.date,
                      featuredCompetition.endDate,
                    )}
                  </span>
                  <span>
                    {featuredCompetition.liveEnabled
                      ? "Live disponible"
                      : "Publication FTJJ"}
                  </span>
                </div>
                <div className="entity-tags">
                  <span>
                    {featuredCompetition.maxParticipants
                      ? `${featuredCompetition.maxParticipants} places`
                      : "Competition ouverte"}
                  </span>
                  <span>{featuredCompetition.category || "Tous niveaux"}</span>
                </div>
                <div className="public-actions compact">
                  <Link className="public-btn primary" to="/en-direct">
                    Voir le live
                  </Link>
                  <Link className="public-btn ghost" to="/contact">
                    Demander des informations
                  </Link>
                </div>
              </article>

              <div className="competition-side-list">
                {sideCompetitions.map((competition) => (
                  <article
                    className="surface-card competition-side-card"
                    key={competition._id}
                  >
                    <span className="feature-chip">
                      {normalizeType(competition.type)}
                    </span>
                    <h3>{competition.title}</h3>
                    <p>{competition.location || "Lieu a confirmer"}</p>
                    <div className="story-meta">
                      <span>
                        {formatDateFr(
                          competition.startDate || competition.date,
                        )}
                      </span>
                      <span>
                        {normalizeStatus(competition.registrationStatus)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="section-lead">
            <p className="eyebrow">Programme complet</p>
            <h2>
              Le calendrier garde sa logique metier, avec un rendu plus premium
            </h2>
            <p>
              Les competitions branchees au backoffice conservent leurs donnees
              reelles tout en profitant d'une presentation plus riche et plus
              claire.
            </p>
          </div>

          <div className="feature-grid competitions-grid">
            {competitions.map((competition) => (
              <article
                className="surface-card competition-card"
                key={competition._id}
              >
                <div className="competition-card-top">
                  <span className="feature-chip">
                    {normalizeType(competition.type)}
                  </span>
                  <span className="competition-status-pill">
                    {normalizeStatus(competition.registrationStatus)}
                  </span>
                </div>
                <h3>{competition.title}</h3>
                <p>{competition.location || "Lieu a confirmer"}</p>
                <div className="story-meta">
                  <span>
                    {formatDateRange(
                      competition.startDate || competition.date,
                      competition.endDate,
                    )}
                  </span>
                  <span>
                    {competition.liveEnabled
                      ? "Live disponible"
                      : "Publication FTJJ"}
                  </span>
                </div>
                <div className="entity-tags">
                  <span>
                    {competition.maxParticipants
                      ? `${competition.maxParticipants} places`
                      : "Competition ouverte"}
                  </span>
                  <span>{competition.category || "Programme FTJJ"}</span>
                </div>
                <div className="public-actions compact">
                  <Link
                    className="public-btn ghost"
                    to={competition.liveEnabled ? "/en-direct" : "/contact"}
                  >
                    {competition.liveEnabled
                      ? "Voir le live"
                      : "En savoir plus"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
