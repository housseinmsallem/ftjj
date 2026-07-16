import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "Publication FTJJ";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl?: string;
  publishedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  REGISTRATION_OPEN: "Inscriptions ouvertes",
  STAGE_OPEN_MATS: "Stage / Open Mats",
  NEW_COMPETITION: "Nouvelle compétition",
  NEW_TOURNAMENT: "Nouveau tournoi open",
  OTHER: "Autre",
};

export default function NewsPage(): React.ReactElement {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/public/news")
      .then((res: any) => {
        const list = res.data?.data || res.data || [];
        setNews(Array.isArray(list) ? list : []);
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = news[0];
  const secondary = news.slice(1);

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-news">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Actualités officielles</p>
            <h1>Communiqués, vie fédérale et temps forts sportifs</h1>
            <p className="hero-copy">
              Toutes les informations officielles de la FTJJ, du calendrier
              national aux performances de la saison.
            </p>
          </div>
          {loading && (
            <article className="surface-card hero-aside">
              <p>Chargement des actualités...</p>
            </article>
          )}
          {!loading && featured && (
            <article className="surface-card hero-aside">
              <span className="feature-chip">{CATEGORY_LABELS[featured.category] || featured.category}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <small>{formatDateFr(featured.publishedAt)}</small>
            </article>
          )}
          {!loading && !featured && (
            <article className="surface-card hero-aside">
              <span className="feature-chip">Information</span>
              <h2>Aucune actualité pour le moment</h2>
              <p>Les communiqués et annonces officielles de la FTJJ seront publiés ici. Revenez bientôt.</p>
            </article>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="news-board">
            {!loading && featured && (
              <article className="surface-card featured-story">
                <div className="story-art" style={featured.imageUrl ? { backgroundImage: `url(${featured.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
                <div className="story-copy">
                  <span className="feature-chip">{CATEGORY_LABELS[featured.category] || featured.category}</span>
                  <h2>{featured.title}</h2>
                  <p>{featured.excerpt}</p>
                  <div className="story-meta">
                    <span>{formatDateFr(featured.publishedAt)}</span>
                    <span>Publication officielle</span>
                  </div>
                </div>
              </article>
            )}

            {!loading && !featured && (
              <article className="surface-card featured-story">
                <div className="story-art" />
                <div className="story-copy">
                  <span className="feature-chip">Information</span>
                  <h2>Aucune actualité pour le moment</h2>
                  <p>Les communiqués et annonces officielles de la FTJJ seront publiés ici dès qu'ils seront disponibles.</p>
                  <div className="story-meta">
                    <span>Publication FTJJ</span>
                    <span>Information fédérale</span>
                  </div>
                </div>
              </article>
            )}

            {!loading && secondary.length > 0 && (
              <div className="feature-grid editorial-three">
                {secondary.map((item: NewsItem) => (
                  <article className="surface-card feature-card" key={item.id}>
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12, marginBottom: 12 }} />
                    )}
                    <span className="feature-chip">{CATEGORY_LABELS[item.category] || item.category}</span>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt}</p>
                    <small>{formatDateFr(item.publishedAt)}</small>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
