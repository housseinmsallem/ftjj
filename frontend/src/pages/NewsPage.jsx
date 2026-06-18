import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fallbackNews } from "../data/publicContent";
import { publicApi } from "../services/api";

function formatDateFr(value) {
  if (!value) return "Publication FTJJ";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normaliseNews(items) {
  return items
    .filter((item) => ["NEWS", "ANNOUNCEMENT"].includes(item.type))
    .map((item) => ({
      id: item._id,
      type: item.type,
      category:
        item.type === "ANNOUNCEMENT" ? "Communique officiel" : "Actualite FTJJ",
      title: item.title,
      excerpt:
        item.subtitle ||
        item.description ||
        "Mise a jour officielle de la federation.",
      publishedAt: item.startDate || item.createdAt,
    }));
}

export default function NewsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    publicApi
      .home()
      .then((data) =>
        setItems(Array.isArray(data?.events) ? normaliseNews(data.events) : []),
      )
      .catch(() => setItems([]));
  }, []);

  const news = useMemo(() => (items.length ? items : fallbackNews), [items]);
  const featured = news[0];
  const secondary = news.slice(1);

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-news">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Actualites officielles</p>
            <h1>Communiques, vie federale et temps forts sportifs</h1>
            <p className="hero-copy">
              Toutes les informations officielles de la FTJJ, du calendrier
              national aux performances de la saison, dans une presentation plus
              editoriale.
            </p>
          </div>
          {featured && (
            <article className="surface-card hero-aside">
              <span className="feature-chip">{featured.category}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <small>{formatDateFr(featured.publishedAt)}</small>
            </article>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          <div className="news-board">
            {featured && (
              <article className="surface-card featured-story">
                <div className="story-art" />
                <div className="story-copy">
                  <span className="feature-chip">{featured.category}</span>
                  <h2>{featured.title}</h2>
                  <p>{featured.excerpt}</p>
                  <div className="story-meta">
                    <span>{formatDateFr(featured.publishedAt)}</span>
                    <span>{featured.audience || "Publication officielle"}</span>
                  </div>
                  <Link className="public-btn ghost" to="/contact">
                    Recevoir les communiques
                  </Link>
                </div>
              </article>
            )}

            <div className="feature-grid editorial-three">
              {secondary.map((item) => (
                <article className="surface-card feature-card" key={item.id}>
                  <span className="feature-chip">{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <small>{formatDateFr(item.publishedAt)}</small>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
