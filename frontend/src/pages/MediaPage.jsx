import React, { useState, useEffect } from "react";

export default function MediaPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch("/api/media/public");
        if (res.ok) {
          const data = await res.json();
          setAssets(data);
        }
      } catch {
        // Silently fail, will show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-media-page">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Medias FTJJ</p>
            <h1>Valoriser les competitions, la federation et ses talents</h1>
            <p className="hero-copy">
              Cette section structure les contenus de visibilite de la
              federation : galeries, contenus live, replays et supports de
              communication.
            </p>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">A venir</p>
            <h2>Un espace media pret pour evoluer</h2>
            <p>
              La base publique est maintenant prete a accueillir des galeries,
              assets et relais de communication sans casser le socle de la
              plateforme.
            </p>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem 0" }}>
              Chargement...
            </p>
          ) : assets.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                padding: "3rem 0",
                color: "#64748b",
              }}
            >
              Aucun média disponible pour le moment.
            </p>
          ) : (
            <div className="feature-grid editorial-three">
              {assets.map((item, index) => (
                <article
                  className={`surface-card media-card media-card-${index + 1}`}
                  key={item._id}
                >
                  {item.url &&
                    (item.mimeType && item.mimeType.includes("image") ? (
                      <img
                        src={item.url}
                        alt={item.originalName || item.filename || ""}
                        style={{
                          width: "100%",
                          height: "180px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          marginBottom: "0.75rem",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "180px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#f1f5f9",
                          borderRadius: "8px",
                          marginBottom: "0.75rem",
                          fontSize: "3rem",
                        }}
                      >
                        📄
                      </div>
                    ))}
                  <span className="feature-chip">
                    {item.category || "MEDIA"}
                  </span>
                  <h3>{item.originalName || item.filename || "Sans titre"}</h3>
                  <p>
                    {item.createdAt
                      ? `Ajouté le ${new Date(item.createdAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
