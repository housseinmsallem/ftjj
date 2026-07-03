import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomeContentSlider from "../components/content/HomeContentSlider";
import {
  fallbackEvents,
  fallbackNews,
  fallbackStats,
  portalCards,
} from "../data/publicContent";
import { publicApi } from "../services/api";

const fallbackRanking = [
  { name: "Yassine Ghazouani", club: "Club Sousse Jiu-Jitsu", points: 2450 },
  { name: "Mohamed Amine Jlassi", club: "Club Tunis Jiu-Jitsu", points: 2320 },
  { name: "Anis Ben Said", club: "Club Bizerte Jiu-Jitsu", points: 2150 },
  { name: "Omar Hammami", club: "Club Ariana Jiu-Jitsu", points: 1980 },
  { name: "Ahmed Trabelsi", club: "Club Sfax Jiu-Jitsu", points: 1870 },
];

function athleteName(athlete) {
  if (!athlete) return "Athlete FTJJ";
  const fullName =
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim();
  return fullName || athlete.name || "Athlete FTJJ";
}

function formatDateRange(start, end) {
  if (!start && !end) return "Date a confirmer";
  const startDate = start ? new Date(start) : new Date(end);
  const endDate = end ? new Date(end) : null;
  const startLabel = startDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (!endDate || startDate.toDateString() === endDate.toDateString())
    return startLabel;
  const endLabel = endDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

function formatShortDate(value) {
  if (!value) return { day: "--", month: "---" };
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("fr-FR", { day: "2-digit" }),
    month: date.toLocaleDateString("fr-FR", { month: "short" }),
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function Home() {
  const [home, setHome] = useState({ events: [], settings: null });
  const [rankings, setRankings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [athletes, setAthletes] = useState([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      publicApi.home().catch(() => ({ events: [], settings: null })),
      publicApi.rankings().catch(() => []),
      publicApi.live().catch(() => []),
      publicApi.clubs().catch(() => []),
      publicApi.athletes().catch(() => []),
    ]).then(([homeData, rankingData, liveData, clubData, athleteData]) => {
      if (!active) return;
      setHome(homeData || { events: [], settings: null });
      setRankings(Array.isArray(rankingData) ? rankingData : []);
      setMatches(Array.isArray(liveData) ? liveData : []);
      setClubs(Array.isArray(clubData) ? clubData : []);
      setAthletes(Array.isArray(athleteData) ? athleteData : []);
    });

    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(() => {
    const dynamic = (home.events || [])
      .filter((item) => ["EVENT", "STAGE", "CHAMPIONSHIP"].includes(item.type))
      .map((item) => ({
        id: item._id,
        title: item.title,
        location: item.location || "Tunisie",
        city: item.location || "Tunisie",
        startDate: item.startDate,
        endDate: item.endDate,
        badge:
          item.type === "STAGE"
            ? "Stage federal"
            : item.type === "CHAMPIONSHIP"
              ? "Championnat"
              : "Competition",
        ctaLabel: item.ctaLabel || "Voir la competition",
      }));
    return dynamic.length ? dynamic : fallbackEvents;
  }, [home.events]);

  const news = useMemo(() => {
    const dynamic = (home.events || [])
      .filter((item) => ["NEWS", "ANNOUNCEMENT"].includes(item.type))
      .map((item) => ({
        id: item._id,
        category:
          item.type === "ANNOUNCEMENT"
            ? "Communique officiel"
            : "Actualite FTJJ",
        title: item.title,
        excerpt:
          item.subtitle ||
          item.description ||
          "Publication officielle de la Federation.",
        publishedAt: item.startDate || item.createdAt,
      }));
    return dynamic.length ? dynamic : fallbackNews;
  }, [home.events]);

  const rankingBoard = useMemo(() => {
    if (!rankings.length) return fallbackRanking;
    return [...rankings]
      .sort(
        (left, right) => (right.rankingPoints || 0) - (left.rankingPoints || 0),
      )
      .slice(0, 5)
      .map((athlete) => ({
        name: athleteName(athlete),
        club: athlete.club?.name || "Club FTJJ",
        points: athlete.rankingPoints || 0,
      }));
  }, [rankings]);

  const liveMatch = useMemo(
    () => matches.find((item) => item.status === "live") || matches[0] || null,
    [matches],
  );
  const featuredEvent = events[0];
  const featuredNews = news[0];
  const secondaryNews = news.slice(1, 3);

  const stats = useMemo(
    () => [
      {
        ...fallbackStats[0],
        value: athletes.length
          ? formatNumber(athletes.length)
          : fallbackStats[0].value,
      },
      {
        ...fallbackStats[1],
        value: clubs.length
          ? formatNumber(clubs.length)
          : fallbackStats[1].value,
      },
      {
        ...fallbackStats[2],
        value: events.length
          ? formatNumber(events.length)
          : fallbackStats[2].value,
      },
      fallbackStats[3],
      fallbackStats[4],
    ],
    [athletes.length, clubs.length, events.length],
  );

  const quickAccessCards = useMemo(
    () => [
      {
        tag: "Club onboarding",
        title: "Affiliation et gestion club",
        text: "Demande en ligne, validation federale, documents et activation du compte club.",
        to: "/affiliation",
        cta: "Demarrer",
      },
      {
        tag: "Annuaire public",
        title: "Athletes, coachs et arbitres",
        text: `${athletes.length ? formatNumber(athletes.length) : "De nombreux"} profils consultables avec des filtres plus lisibles.`,
        to: "/athletes",
        cta: "Explorer",
      },
      {
        tag: "Performance",
        title: "Ranking et saison sportive",
        text: `${events.length ? formatNumber(events.length) : "Plusieurs"} rendez-vous federaux pour piloter la saison et le classement national.`,
        to: "/ranking",
        cta: "Voir le ranking",
      },
      {
        tag: "Competition live",
        title: "Scores, tatamis et combats",
        text: liveMatch
          ? `${liveMatch.mat || "Tatami 1"} en cours avec timer et scores synchronises.`
          : "Le centre live permet de suivre scores, timers et combats sans quitter le portail.",
        to: "/en-direct",
        cta: "Suivre le live",
      },
    ],
    [athletes.length, events.length, liveMatch],
  );

  return (
    <div className="public-page-shell">
      <section className="home-hero">
        <div className="section-inner home-hero-grid">
          <div className="home-hero-copy">
            <div className="hero-kicker-row">
              <span className="hero-kicker-chip">JJIF</span>
              <span className="hero-kicker-chip">Affiliation digitale</span>
              <span className="hero-kicker-chip">Jiu-Jitsu + Newaza</span>
            </div>
            <p className="eyebrow">
              Plateforme officielle de la Federation Tunisienne de Jiu-Jitsu
            </p>
            <h1>
              Une home plus forte,
              <span>plus sportive et plus premium</span>
            </h1>
            <p className="hero-copy">
              {home.settings?.homepage?.heroSubtitle ||
                "Affiliation club, annuaires, live scoring, dashboards metier et gestion des grades Jiu-Jitsu / Newaza reunis dans une seule experience visuelle plus impactante."}
            </p>
            <div className="home-hero-points">
              <span>Image hero officielle restauree</span>
              <span>Grades Jiu-Jitsu et Newaza separes</span>
              <span>Navigation publique repensee</span>
            </div>
            <div className="home-hero-mini-metrics">
              <div>
                <strong>
                  {clubs.length ? formatNumber(clubs.length) : "152"}
                </strong>
                <span>clubs actifs</span>
              </div>
              <div>
                <strong>
                  {athletes.length ? formatNumber(athletes.length) : "12,458"}
                </strong>
                <span>athletes licencies</span>
              </div>
              <div>
                <strong>
                  {matches.length ? formatNumber(matches.length) : "24"}
                </strong>
                <span>modules live</span>
              </div>
            </div>
            <div className="public-actions">
              <Link className="public-btn primary" to="/federation">
                Decouvrir la Federation
              </Link>
              <Link className="public-btn ghost" to="/competitions">
                Voir les competitions
              </Link>
            </div>
          </div>

          <div className="home-hero-aside">
            <article className="surface-card home-hero-visual">
              <div className="home-hero-visual-art">
                <span className="home-hero-visual-tag">
                  Visuel officiel FTJJ
                </span>
                <div className="home-hero-visual-copy">
                  <h2>Le retour de l'image historique</h2>
                  <p>
                    Une entree plus spectaculaire, inspiree d'un vrai portail
                    evenementiel international.
                  </p>
                </div>
              </div>
            </article>

            <article className="surface-card home-program-card">
              <div className="home-program-top">
                <span className="feature-chip">{featuredEvent.badge}</span>
                <span className="home-program-status">Saison active</span>
              </div>
              <h2>{featuredEvent.title}</h2>
              <p>
                {formatDateRange(
                  featuredEvent.startDate,
                  featuredEvent.endDate,
                )}
              </p>
              <p>{featuredEvent.location}</p>

              <div className="home-program-metrics">
                <div>
                  <span>Clubs</span>
                  <strong>
                    {clubs.length ? formatNumber(clubs.length) : "152"}
                  </strong>
                </div>
                <div>
                  <span>Athletes</span>
                  <strong>
                    {athletes.length ? formatNumber(athletes.length) : "12k+"}
                  </strong>
                </div>
                <div>
                  <span>Live</span>
                  <strong>
                    {matches.length ? formatNumber(matches.length) : "24/7"}
                  </strong>
                </div>
              </div>

              <div className="home-program-list">
                <div className="home-program-line">
                  <span>Affiliation</span>
                  <strong>Workflow admin + club</strong>
                </div>
                <div className="home-program-line">
                  <span>Grades</span>
                  <strong>Jiu-Jitsu et Newaza distincts</strong>
                </div>
                <div className="home-program-line">
                  <span>Competition</span>
                  <strong>Live scoring et ranking centralises</strong>
                </div>
              </div>

              <div className="public-actions compact">
                <Link
                  className="public-btn primary full-width"
                  to="/competitions"
                >
                  {featuredEvent.ctaLabel}
                </Link>
                <Link className="public-btn ghost full-width" to="/affiliation">
                  Demander une affiliation
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="public-section tight-surface">
        <div className="section-inner">
          <div className="home-command-grid">
            {quickAccessCards.map((card) => (
              <article
                className="surface-card home-command-card"
                key={card.title}
              >
                <span className="feature-chip">{card.tag}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <Link className="public-btn ghost" to={card.to}>
                  {card.cta}
                </Link>
              </article>
            ))}
          </div>

          <div className="metric-strip">
            {stats.map((item) => (
              <article className="metric-card" key={item.label}>
                <span>{item.icon}</span>
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </article>
            ))}
          </div>

          <article className="live-highlight">
            <div>
              <p className="eyebrow">Live scoring</p>
              <h2>Centre de suivi en direct</h2>
              <p>
                {liveMatch
                  ? `${liveMatch.mat || "Tatami 1"} | ${liveMatch.category || "Combat officiel"}`
                  : "Open National 2026 | Tatami 1"}
              </p>
            </div>

            <div className="live-scoreboard">
              <div className="live-fighter">
                <strong>
                  {liveMatch
                    ? athleteName(liveMatch.redAthlete)
                    : "Y. Ghazouani"}
                </strong>
                <small>
                  {liveMatch?.redAthlete?.club?.name || "Club Sousse JJ"}
                </small>
              </div>
              <span className="score-pill red">{liveMatch?.redScore ?? 4}</span>
              <div className="live-timer">
                <strong>{liveMatch?.remainingSeconds ?? 165}s</strong>
                <small>{liveMatch?.timerState || "running"}</small>
              </div>
              <span className="score-pill blue">
                {liveMatch?.blueScore ?? 2}
              </span>
              <div className="live-fighter align-right">
                <strong>
                  {liveMatch ? athleteName(liveMatch.blueAthlete) : "M. Jlassi"}
                </strong>
                <small>
                  {liveMatch?.blueAthlete?.club?.name || "Club Tunis JJ"}
                </small>
              </div>
            </div>

            <Link className="public-btn ghost" to="/en-direct">
              Voir tous les combats
            </Link>
          </article>

          <div className="editorial-grid">
            <article className="surface-card editorial-panel">
              <div className="panel-headline">
                <h3>Prochains evenements</h3>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background:
                      (home.events || []).filter((item) =>
                        ["EVENT", "STAGE", "CHAMPIONSHIP"].includes(item.type),
                      ).length > 0
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(234,179,8,0.15)",
                    color:
                      (home.events || []).filter((item) =>
                        ["EVENT", "STAGE", "CHAMPIONSHIP"].includes(item.type),
                      ).length > 0
                        ? "#4ade80"
                        : "#facc15",
                    fontWeight: 600,
                  }}
                >
                  {(home.events || []).filter((item) =>
                    ["EVENT", "STAGE", "CHAMPIONSHIP"].includes(item.type),
                  ).length > 0
                    ? "✓ Données réelles"
                    : "⚠ Démo"}
                </span>
                <Link to="/competitions">Voir tout</Link>
              </div>
              {events.slice(0, 3).map((event) => {
                const date = formatShortDate(event.startDate);
                return (
                  <div className="editorial-row" key={event.id || event.title}>
                    <div className="row-thumb" />
                    <div className="row-date">
                      {date.day}
                      <small>{date.month}</small>
                    </div>
                    <div>
                      <b>{event.title}</b>
                      <p>{event.city}</p>
                    </div>
                  </div>
                );
              })}
            </article>

            <article className="surface-card editorial-panel editorial-panel-wide">
              <div className="panel-headline">
                <h3>Actualites</h3>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background:
                      (home.events || []).filter((item) =>
                        ["NEWS", "ANNOUNCEMENT"].includes(item.type),
                      ).length > 0
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(234,179,8,0.15)",
                    color:
                      (home.events || []).filter((item) =>
                        ["NEWS", "ANNOUNCEMENT"].includes(item.type),
                      ).length > 0
                        ? "#4ade80"
                        : "#facc15",
                    fontWeight: 600,
                  }}
                >
                  {(home.events || []).filter((item) =>
                    ["NEWS", "ANNOUNCEMENT"].includes(item.type),
                  ).length > 0
                    ? "✓ Données réelles"
                    : "⚠ Démo"}
                </span>
                <Link to="/actualites">Voir tout</Link>
              </div>
              {featuredNews && (
                <div className="news-spotlight">
                  <span>{featuredNews.category}</span>
                  <h3>{featuredNews.title}</h3>
                  <p>{featuredNews.excerpt}</p>
                </div>
              )}
              {secondaryNews.map((item) => (
                <div
                  className="editorial-row compact"
                  key={item.id || item.title}
                >
                  <div className="row-thumb muted" />
                  <div>
                    <b>{item.title}</b>
                    <p>{item.excerpt}</p>
                  </div>
                </div>
              ))}
            </article>

            <article className="surface-card editorial-panel">
              <div className="panel-headline">
                <h3>Classement national</h3>
                <Link to="/ranking">Voir tout</Link>
              </div>
              <ul className="ranking-list">
                {rankingBoard.map((athlete, index) => (
                  <li key={`${athlete.name}-${index}`}>
                    <b>{index + 1}</b>
                    <span className="ranking-avatar" />
                    <div>
                      <strong>{athlete.name}</strong>
                      <small>{athlete.club}</small>
                    </div>
                    <em>{formatNumber(athlete.points)} pts</em>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="section-lead home-portal-lead">
            <p className="eyebrow">Espaces SaaS FTJJ</p>
            <h2>Un point d'entree clair pour chaque profil</h2>
            <p>
              Le portail public presente maintenant mieux les parcours clubs,
              athletes, coachs et arbitres avant la connexion ou la demande
              d'affiliation.
            </p>
          </div>

          <div className="feature-grid portal-grid">
            {portalCards.map((portal) => (
              <article
                className="surface-card feature-card portal-card"
                key={portal.title}
              >
                <span className="feature-chip">{portal.role}</span>
                <h3>{portal.title}</h3>
                <p>{portal.text}</p>
                <div className="public-actions compact">
                  {portal.actions.map((action) => (
                    <Link
                      className="public-btn ghost"
                      key={action.label}
                      to={action.to}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="cta-ribbon">
            <div className="cta-ribbon-block">
              <h3>Rejoignez la famille du Jiu-Jitsu tunisien</h3>
              <p>
                Trouvez un club, consultez les annuaires et suivez l'ecosysteme
                FTJJ.
              </p>
              <Link className="public-btn ghost" to="/clubs">
                Trouver un club
              </Link>
            </div>
            <div className="cta-ribbon-block accent">
              <h3>Acces licencie et services prives</h3>
              <p>
                Portails clubs, athletes, coachs et arbitres avec parcours
                d'entree clarifie.
              </p>
              <Link className="public-btn primary" to="/espace-licencie">
                Prendre ma licence
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section alt-surface">
        <div className="section-inner">
          <div className="section-lead">
            <p className="eyebrow">Temps forts federaux</p>
            <h2>Le constructeur de contenu reste bien integre</h2>
            <p>
              Les contenus publies depuis le backoffice continuent a alimenter
              le site public sans casser l'identite visuelle de la page
              d'accueil.
            </p>
          </div>
          <HomeContentSlider />
        </div>
      </section>
    </div>
  );
}
