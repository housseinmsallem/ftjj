import React, { useEffect, useState } from "react";
import api from "../services/api";

interface CmsDocument {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

interface FeaturedMediaItem {
  id: string;
  title?: string;
  description?: string;
  imageUrl: string;
  competition?: { id: string; name: string };
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  RULESET: "Règlements",
  FEES: "Frais et tarifs",
  CODE_OF_CONDUCT: "Code de conduite",
  LICENSE_DOCS: "Documents de licence",
  OTHER: "Autre",
};

const CATEGORY_ORDER = ["RULESET", "FEES", "CODE_OF_CONDUCT", "LICENSE_DOCS", "OTHER"];

export default function MediaPage(): React.ReactElement {
  const [documents, setDocuments] = useState<CmsDocument[]>([]);
  const [featured, setFeatured] = useState<FeaturedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [docsRes, mediaRes] = await Promise.allSettled([
          api.get("/cms/documents"),
          api.get("/cms/featured-media"),
        ]);

        if (docsRes.status === "fulfilled") {
          const d = docsRes.value.data?.data || docsRes.value.data || [];
          setDocuments(Array.isArray(d) ? d : []);
        }
        if (mediaRes.status === "fulfilled") {
          const m = mediaRes.value.data?.data || mediaRes.value.data || [];
          setFeatured(Array.isArray(m) ? m : []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Group docs by category
  const groupedDocs: Record<string, CmsDocument[]> = {};
  for (const cat of CATEGORY_ORDER) {
    groupedDocs[cat] = [];
  }
  for (const doc of documents) {
    if (!groupedDocs[doc.category]) groupedDocs[doc.category] = [];
    groupedDocs[doc.category].push(doc);
  }

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-media-page">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Médias FTJJ</p>
            <h1>Valoriser les compétitions, la fédération et ses talents</h1>
            <p className="hero-copy">
              Retrouvez ici tous les documents officiels de la fédération, les
              règlements, les formulaires, et les galeries photos des
              compétitions.
            </p>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">À venir</p>
            <h2>Un espace média prêt pour évoluer</h2>
            <p>
              La base publique est maintenant prête à accueillir des galeries,
              assets et relais de communication sans casser le socle de la
              plateforme.
            </p>
          </div>
        </div>
      </section>

      {/* Featured images */}
      {!loading && featured.length > 0 && (
        <section className="public-section">
          <div className="section-inner">
            <div className="section-lead">
              <p className="eyebrow">Galerie</p>
              <h2>Images à la une</h2>
            </div>
            <div className="feature-grid editorial-three">
              {featured.map((item) => (
                <article className="surface-card media-card" key={item.id}>
                  <img
                    src={item.imageUrl}
                    alt={item.title || ""}
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      marginBottom: "0.75rem",
                    }}
                  />
                  {item.title && <h3>{item.title}</h3>}
                  {item.description && <p>{item.description}</p>}
                  {item.competition?.name && (
                    <p className="muted">🏆 {item.competition.name}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Documents grouped by category */}
      <section className="public-section">
        <div className="section-inner">
          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem 0" }}>
              Chargement...
            </p>
          ) : documents.length === 0 && featured.length === 0 ? (
            <div className="surface-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <span className="feature-chip">Information</span>
              <h2 style={{ marginTop: "1rem" }}>Aucun document disponible pour le moment</h2>
              <p>
                Les documents officiels de la FTJJ seront publiés ici. Revenez
                bientôt.
              </p>
            </div>
          ) : (
            <div className="section-lead">
              <p className="eyebrow">Documents</p>
              <h2>Documents officiels et téléchargements</h2>
              <p>
                Téléchargez les règlements, formulaires et documents nécessaires
                pour les clubs et les licenciés.
              </p>
            </div>
          )}

          {!loading &&
            CATEGORY_ORDER.map((cat) => {
              const docs = groupedDocs[cat] || [];
              if (docs.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 32 }}>
                  <h3
                    style={{
                      color: "var(--text)",
                      fontSize: "1.2rem",
                      marginBottom: 16,
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: 8,
                    }}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </h3>
                  <div className="feature-grid editorial-three">
                    {docs.map((doc) => (
                      <article className="surface-card media-card" key={doc.id}>
                        <div
                          style={{
                            width: "100%",
                            height: "120px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--bg)",
                            borderRadius: "8px",
                            marginBottom: "0.75rem",
                            fontSize: "3rem",
                          }}
                        >
                          📄
                        </div>
                        <h3>{doc.title}</h3>
                        <p className="muted">
                          {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="public-btn primary"
                          style={{ marginTop: 8, display: "inline-block", textDecoration: "none" }}
                        >
                          Télécharger
                        </a>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
