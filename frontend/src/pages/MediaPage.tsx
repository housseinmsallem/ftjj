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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

      {/* Featured images gallery */}
      {!loading && featured.length > 0 && (
        <section className="public-section">
          <div className="section-inner">
            <div className="section-lead">
              <p className="eyebrow">Galerie</p>
              <h2>Photos des compétitions</h2>
            </div>

            {/* Main gallery container */}
            <div
              onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              style={{
                position: "relative",
                borderRadius: 16,
                overflow: "hidden",
                cursor: "pointer",
                marginBottom: 16,
                background: "#0f172a",
              }}
            >
              <img
                src={featured[0].imageUrl}
                alt={featured[0].title || ""}
                style={{ width: "100%", maxHeight: 480, objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "20px 24px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                color: "#fff",
              }}>
                <h3 style={{ margin: "0 0 4px", font: "700 20px/1.2 var(--public-display)", textTransform: "uppercase" }}>
                  {featured[0].title || "Galerie photos FTJJ"}
                </h3>
                {featured[0].competition?.name && (
                  <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>🏆 {featured[0].competition.name}</p>
                )}
              </div>
              <div style={{
                position: "absolute", top: 16, right: 16,
                padding: "6px 14px", borderRadius: 999,
                background: "rgba(0,0,0,0.6)", color: "#fff",
                font: "700 12px/1 var(--public-display)", letterSpacing: "0.05em",
              }}>
                +{featured.length - 1} photos
              </div>
            </div>

            {/* Thumbnail strip */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {featured.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                  style={{
                    flexShrink: 0, width: 90, height: 64, borderRadius: 8, overflow: "hidden",
                    cursor: "pointer", border: i === 0 ? "2px solid #d51332" : "2px solid transparent",
                    opacity: i === 0 ? 1 : 0.6, transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { if (i !== 0) (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}
                >
                  <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.95)", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: "absolute", top: 20, right: 24, zIndex: 10,
              background: "none", border: "none", color: "#fff", fontSize: "2rem",
              cursor: "pointer", opacity: 0.7,
            }}
          >
            ✕
          </button>

          {/* Counter */}
          <div style={{
            position: "absolute", top: 24, left: 24, zIndex: 10,
            color: "rgba(255,255,255,0.7)", font: "700 13px/1 var(--public-display)",
            letterSpacing: "0.05em",
          }}>
            {lightboxIndex + 1} / {featured.length}
          </div>

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "75vh", display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <img
              src={featured[lightboxIndex]?.imageUrl}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }}
            />
            {/* Info bar */}
            <div style={{ textAlign: "center", color: "#fff", marginTop: 16, maxWidth: 600 }}>
              {featured[lightboxIndex]?.title && (
                <h3 style={{ margin: "0 0 4px", font: "700 16px/1.2 var(--public-display)", textTransform: "uppercase", color: "#fff" }}>
                  {featured[lightboxIndex].title}
                </h3>
              )}
              {featured[lightboxIndex]?.description && (
                <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
                  {featured[lightboxIndex].description}
                </p>
              )}
              {featured[lightboxIndex]?.competition?.name && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  🏆 {featured[lightboxIndex].competition.name}
                </p>
              )}
            </div>
          </div>

          {/* Navigation arrows */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              style={{
                position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", fontSize: "2rem", width: 50, height: 50, borderRadius: "50%",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ‹
            </button>
          )}
          {lightboxIndex < featured.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              style={{
                position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", fontSize: "2rem", width: 50, height: 50, borderRadius: "50%",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ›
            </button>
          )}

          {/* Thumbnail strip at bottom */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 24, display: "flex", gap: 6,
              overflowX: "auto", maxWidth: "90vw", padding: "0 16px",
            }}
          >
            {featured.map((item, i) => (
              <div
                key={item.id}
                onClick={() => setLightboxIndex(i)}
                style={{
                  flexShrink: 0, width: 60, height: 44, borderRadius: 6,
                  overflow: "hidden", cursor: "pointer",
                  border: i === lightboxIndex ? "2px solid #d51332" : "2px solid rgba(255,255,255,0.2)",
                  opacity: i === lightboxIndex ? 1 : 0.5, transition: "opacity 0.2s",
                }}
              >
                <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
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
