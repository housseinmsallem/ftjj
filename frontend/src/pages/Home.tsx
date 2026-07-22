import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomeContentSlider from "../components/content/HomeContentSlider";
import { portalCards } from "../data/publicContent";
import { publicApi } from "../services/api";
import api from "../services/api";
import ftjjLogo from "../assets/images/logo.png";

interface RankingAthlete {
  name: string;
  club: string;
  points: number;
}

interface HomeEvent {
  id: string;
  title: string;
  location: string;
  city: string;
  startDate: string;
  endDate: string;
  badge: string;
  ctaLabel: string;
}

interface NewsItem {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

interface LiveMatch {
  _id?: string;
  mat?: string;
  category?: string;
  status?: string;
  redScore?: number;
  blueScore?: number;
  remainingSeconds?: number;
  timerState?: string;
  redAthlete?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    club?: { name?: string };
  };
  blueAthlete?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    club?: { name?: string };
  };
}

function athleteName(athlete: any): string {
  if (!athlete) return "Athlète FTJJ";
  const fullName =
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim();
  return fullName || athlete.name || "Athlète FTJJ";
}

function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return "Date à confirmer";
  const startDate = start ? new Date(start) : new Date(end!);
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

function formatShortDate(value: string | null | undefined): {
  day: string;
  month: string;
} {
  if (!value) return { day: "--", month: "---" };
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("fr-FR", { day: "2-digit" }),
    month: date.toLocaleDateString("fr-FR", { month: "short" }),
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function Home(): React.ReactElement {
  const [homeData, setHomeData] = useState<any>(null);
  const [rankings, setRankings] = useState<any[]>([]);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      publicApi.home().catch(() => null),
      publicApi.rankings().catch(() => null),
      publicApi.live().catch(() => null),
      publicApi.clubs().catch(() => null),
      publicApi.athletes().catch(() => null),
      api.get("/public/news").catch(() => null),
    ]).then(([homeRes, rankingRes, liveRes, clubRes, athleteRes, newsRes]) => {
      if (!active) return;

      // home endpoint returns { data: { stats, upcomingCompetitions } }
      if (homeRes && homeRes.data) {
        setHomeData(homeRes.data);
        setApiError(false);
      } else {
        setHomeData(null);
        setApiError(true);
      }

      // Other endpoints return { data: [...] }
      setRankings(Array.isArray(rankingRes?.data) ? rankingRes.data : []);
      setMatches(
        Array.isArray(liveRes?.data) ? (liveRes.data as LiveMatch[]) : [],
      );
      setClubs(Array.isArray(clubRes?.data) ? clubRes.data : []);
      setAthletes(Array.isArray(athleteRes?.data) ? athleteRes.data : []);
      if (newsRes?.data) {
        const n = newsRes.data?.data || newsRes.data || [];
        setNewsItems(Array.isArray(n) ? n : []);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  // --- Derived data from real backend responses ---

  const upcomingCompetitions: any[] = homeData?.upcomingCompetitions || [];

  const events: HomeEvent[] = useMemo(() => {
    return upcomingCompetitions.map((item: any) => ({
      id: item.id || item._id,
      title: item.name || item.title || "Compétition FTJJ",
      location: item.location || "Tunisie",
      city: item.location || "Tunisie",
      startDate: item.date || item.startDate,
      endDate: item.date || item.startDate,
      badge: "Compétition",
      ctaLabel: "Voir la compétition",
    }));
  }, [upcomingCompetitions]);

  const rankingBoard: RankingAthlete[] = useMemo(() => {
    if (!rankings.length) return [];
    return [...rankings]
      .sort(
        (left, right) => (right.rankingPoints || 0) - (left.rankingPoints || 0),
      )
      .slice(0, 5)
      .map((athlete: any) => ({
        name: athleteName(athlete),
        club: athlete.club?.name || "Club FTJJ",
        points: athlete.rankingPoints || 0,
      }));
  }, [rankings]);

  const liveMatch: LiveMatch | null = useMemo(
    () => matches.find((item) => item.status === "live") || matches[0] || null,
    [matches],
  );

  const featuredEvent: HomeEvent | undefined = events[0];
  const featuredNews: NewsItem | undefined = newsItems[0];
  const secondaryNews = newsItems.slice(1, 3);

  const stats = useMemo(() => {
    const s = homeData?.stats;
    return [
      {
        value: s?.athletes ? formatNumber(s.athletes) : "--",
        label: "Athlètes licenciés",
        icon: <img src={ftjjLogo} alt="FTJJ" style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.9 }} />,
      },
      {
        value: s?.clubs ? formatNumber(s.clubs) : "--",
        label: "Clubs affiliés",
        icon: <img src={ftjjLogo} alt="FTJJ" style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.9 }} />,
      },
      {
        value: s?.competitions ? formatNumber(s.competitions) : "--",
        label: "Compétitions / an",
        icon: <img src={ftjjLogo} alt="FTJJ" style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.9 }} />,
      },
      { value: "320", label: "Arbitres & coachs", icon: <img src={ftjjLogo} alt="FTJJ" style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.9 }} /> },
      { value: "Tunisie", label: "Membre de la JJIF", icon: <img src={ftjjLogo} alt="FTJJ" style={{ width: 32, height: 32, objectFit: "contain", opacity: 0.9 }} /> },
    ];
  }, [homeData]);

  const quickAccessCards = useMemo(
    () => [
      {
        tag: "Club onboarding",
        title: "Affiliation et gestion club",
        text: "Demande en ligne, validation fédérale, documents et activation du compte club.",
        to: "/affiliation",
        cta: "Démarrer",
      },
      {
        tag: "Annuaire public",
        title: "Athlètes, coachs et arbitres",
        text: athletes.length
          ? `${formatNumber(athletes.length)} profils consultables avec des filtres plus lisibles.`
          : "Profils consultables avec des filtres plus lisibles.",
        to: "/athletes",
        cta: "Explorer",
      },
      {
        tag: "Performance",
        title: "Ranking et saison sportive",
        text: events.length
          ? `${formatNumber(events.length)} rendez-vous fédéraux pour piloter la saison et le classement national.`
          : "Les rendez-vous fédéraux pour piloter la saison et le classement national.",
        to: "/ranking",
        cta: "Voir le ranking",
      },
      {
        tag: "Compétition live",
        title: "Scores, tatamis et combats",
        text: liveMatch
          ? `${liveMatch.mat || "Tatami 1"} en cours avec timer et scores synchronisés.`
          : "Le centre live permet de suivre scores, timers et combats sans quitter le portail.",
        to: "/en-direct",
        cta: "Suivre le live",
      },
    ],
    [athletes.length, events.length, liveMatch],
  );

  // --- Fallback view when the home API fails entirely ---
  if (!loading && apiError && !homeData) {
    return (
      <div className="public-page-shell">
        <section className="home-hero">
          <div className="section-inner home-hero-grid">
            <div className="home-hero-copy">
              <p className="eyebrow">
                Plateforme officielle de la Fédération Tunisienne de Jiu-Jitsu
              </p>
              <h1>Bienvenue sur le portail FTJJ</h1>
              <p className="hero-copy">
                Affiliation club, annuaires, live scoring, dashboards métier et
                gestion des grades Jiu-Jitsu / Newaza réunis dans une seule
                expérience.
              </p>
              <div className="public-actions">
                <Link className="public-btn primary" to="/federation">
                  Découvrir la Fédération
                </Link>
                <Link className="public-btn ghost" to="/competitions">
                  Voir les compétitions
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section tight-surface">
          <div className="section-inner">
            <div className="section-lead home-portal-lead">
              <p className="eyebrow">Espaces SaaS FTJJ</p>
              <h2>Un point d'entrée clair pour chaque profil</h2>
              <p>
                Le portail public présente maintenant mieux les parcours clubs,
                athlètes, coachs et arbitres avant la connexion ou la demande
                d'affiliation.
              </p>
            </div>

            <div className="feature-grid portal-grid">
              {portalCards.map((portal: any) => (
                <article
                  className="surface-card feature-card portal-card"
                  key={portal.title}
                >
                  <span className="feature-chip">{portal.role}</span>
                  <h3>{portal.title}</h3>
                  <p>{portal.text}</p>
                  <div className="public-actions compact">
                    {portal.actions.map((action: any) => (
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
          </div>
        </section>
      </div>
    );
  }

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
              Plateforme officielle de la Fédération Tunisienne de Jiu-Jitsu
            </p>
            <h1>
              Une home plus forte,
              <span>plus sportive et plus premium</span>
            </h1>
            <p className="hero-copy">
              Affiliation club, annuaires, live scoring, dashboards métier et
              gestion des grades Jiu-Jitsu / Newaza réunis dans une seule
              expérience visuelle plus impactante.
            </p>
            <div className="home-hero-points">
              <span>Image hero officielle restaurée</span>
              <span>Grades Jiu-Jitsu et Newaza séparés</span>
              <span>Navigation publique repensée</span>
            </div>
            <div className="home-hero-mini-metrics">
              <div>
                <strong>
                  {clubs.length ? formatNumber(clubs.length) : "--"}
                </strong>
                <span>clubs actifs</span>
              </div>
              <div>
                <strong>
                  {athletes.length ? formatNumber(athletes.length) : "--"}
                </strong>
                <span>athlètes licenciés</span>
              </div>
              <div>
                <strong>
                  {matches.length ? formatNumber(matches.length) : "--"}
                </strong>
                <span>modules live</span>
              </div>
            </div>
            <div className="public-actions">
              <Link className="public-btn primary" to="/federation">
                Découvrir la Fédération
              </Link>
              <Link className="public-btn ghost" to="/competitions">
                Voir les compétitions
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
                    Une entrée plus spectaculaire, inspirée d'un vrai portail
                    événementiel international.
                  </p>
                </div>
              </div>
            </article>

            {featuredEvent && (
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
                      {clubs.length ? formatNumber(clubs.length) : "--"}
                    </strong>
                  </div>
                  <div>
                    <span>Athlètes</span>
                    <strong>
                      {athletes.length ? formatNumber(athletes.length) : "--"}
                    </strong>
                  </div>
                  <div>
                    <span>Live</span>
                    <strong>
                      {matches.length ? formatNumber(matches.length) : "--"}
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
                    <span>Compétition</span>
                    <strong>Live scoring et ranking centralisés</strong>
                  </div>
                </div>

                <div className="public-actions compact">
                  <Link
                    className="public-btn primary full-width"
                    to="/competitions"
                  >
                    {featuredEvent.ctaLabel}
                  </Link>
                  <Link
                    className="public-btn ghost full-width"
                    to="/affiliation"
                  >
                    Demander une affiliation
                  </Link>
                </div>
              </article>
            )}
          </div>
        </div>
      </section>

      <section className="public-section tight-surface">
        <div className="section-inner">
{/*
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
          */}

          <div className="metric-strip">
            {stats.map((item: any) => (
              <article className="metric-card" key={item.label}>
                {item.icon}
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </article>
            ))}
          </div>

          {liveMatch && (
            <div style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              background: "linear-gradient(135deg, #090c13, #121a2a)",
              borderRadius: 16,
              color: "#fff",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}>
              <span style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 10px", borderRadius: 999,
                background: "rgba(239, 68, 68, 0.15)", color: "#ef4444",
                font: "800 10px/1 var(--public-display)", letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                LIVE
              </span>
              <span style={{ font: "700 13px/1 var(--public-display)", color: "#fff" }}>
                {athleteName(liveMatch.redAthlete)}
              </span>
              <span style={{
                display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: "1.1rem",
              }}>
                <span style={{ background: "linear-gradient(135deg, #d51332, #8a0d18)", padding: "2px 10px", borderRadius: 8, minWidth: 28, textAlign: "center" }}>
                  {liveMatch.redScore ?? 0}
                </span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>:</span>
                <span style={{ background: "linear-gradient(135deg, #124fca, #0f2f72)", padding: "2px 10px", borderRadius: 8, minWidth: 28, textAlign: "center" }}>
                  {liveMatch.blueScore ?? 0}
                </span>
              </span>
              <span style={{ font: "700 13px/1 var(--public-display)", color: "#fff" }}>
                {athleteName(liveMatch.blueAthlete)}
              </span>
              <Link to="/en-direct" style={{
                color: "rgba(255,255,255,0.6)", fontSize: "0.75rem",
                textDecoration: "none", font: "700 10px/1 var(--public-display)", letterSpacing: "0.06em", textTransform: "uppercase",
                marginLeft: "auto",
              }}>
                SUIVRE →
              </Link>
            </div>
          )}

          <div className="editorial-grid">
            <article className="surface-card editorial-panel">
              <div className="panel-headline">
                <h3>Prochains événements</h3>
                {events.length > 0 && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: "rgba(34,197,94,0.15)",
                      color: "#4ade80",
                      fontWeight: 600,
                    }}
                  >
                    Données réelles
                  </span>
                )}
                <Link to="/competitions">Voir tout</Link>
              </div>
              {events.length > 0 ? (
                events.slice(0, 3).map((event) => {
                  const date = formatShortDate(event.startDate);
                  return (
                    <div
                      className="editorial-row"
                      key={event.id || event.title}
                    >
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
                })
              ) : (
                <div className="editorial-row">
                  <div className="row-thumb muted" />
                  <div>
                    <b>Aucun événement programmé</b>
                    <p>
                      Revenez bientôt pour découvrir les prochains rendez-vous
                      fédéraux.
                    </p>
                  </div>
                </div>
              )}
            </article>

            <article className="surface-card editorial-panel editorial-panel-wide">
              <div className="panel-headline">
                <h3>Actualités</h3>
                {newsItems.length > 0 && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: "rgba(34,197,94,0.15)",
                      color: "#4ade80",
                      fontWeight: 600,
                    }}
                  >
                    Données réelles
                  </span>
                )}
                <Link to="/actualites">Voir tout</Link>
              </div>
              {featuredNews ? (
                <>
                  <div className="news-spotlight">
                    <span>{featuredNews.category}</span>
                    <h3>{featuredNews.title}</h3>
                    <p>{featuredNews.excerpt}</p>
                  </div>
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
                </>
              ) : (
                <div className="editorial-row compact">
                  <div className="row-thumb muted" />
                  <div>
                    <b>Aucune actualité pour le moment</b>
                    <p>
                      Les communiqués officiels de la FTJJ seront publiés ici.
                    </p>
                  </div>
                </div>
              )}
            </article>

            <article className="surface-card editorial-panel">
              <div className="panel-headline">
                <h3>Classement national</h3>
                <Link to="/ranking">Voir tout</Link>
              </div>
              {rankingBoard.length > 0 ? (
                <ul className="ranking-list">
                  {rankingBoard.map(
                    (athlete: RankingAthlete, index: number) => (
                      <li key={`${athlete.name}-${index}`}>
                        <b>{index + 1}</b>
                        <span className="ranking-avatar" />
                        <div>
                          <strong>{athlete.name}</strong>
                          <small>{athlete.club}</small>
                        </div>
                        <em>{formatNumber(athlete.points)} pts</em>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <div style={{ padding: "1rem", textAlign: "center" }}>
                  <p>Aucun classement disponible pour le moment.</p>
                  <p>
                    <small>
                      Le classement national sera mis à jour après les
                      prochaines compétitions.
                    </small>
                  </p>
                </div>
              )}
            </article>
          </div>

          <div className="section-lead home-portal-lead">
            <p className="eyebrow">Espaces SaaS FTJJ</p>
            <h2>Un point d'entrée clair pour chaque profil</h2>
            <p>
              Le portail public présente maintenant mieux les parcours clubs,
              athlètes, coachs et arbitres avant la connexion ou la demande
              d'affiliation.
            </p>
          </div>

          <div className="feature-grid portal-grid">
            {portalCards.map((portal: any) => (
              <article
                className="surface-card feature-card portal-card"
                key={portal.title}
              >
                <span className="feature-chip">{portal.role}</span>
                <h3>{portal.title}</h3>
                <p>{portal.text}</p>
                <div className="public-actions compact">
                  {portal.actions.map((action: any) => (
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
                Trouvez un club, consultez les annuaires et suivez l'écosystème
                FTJJ.
              </p>
              <Link className="public-btn ghost" to="/clubs">
                Trouver un club
              </Link>
            </div>
            <div className="cta-ribbon-block accent">
              <h3>Accès licencié et services privés</h3>
              <p>
                Portails clubs, athlètes, coachs et arbitres avec parcours
                d'entrée clarifié.
              </p>
              <Link className="public-btn primary" to="/espace-licencie">
                Prendre ma licence
              </Link>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
