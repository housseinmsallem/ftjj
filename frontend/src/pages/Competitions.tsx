import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../services/api";
import api from "../services/api";
import {
  getAgeDivisionLabel,
  getWeightCategories,
} from "../utils/formOptions";

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "Date à confirmer";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatLongDate(value: string | null | undefined): string {
  if (!value) return "Date à confirmer";
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface CompetitionItem {
  _id: string;
  id?: string;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  type?: string;
  splitByBelt?: boolean;
  ageDivision?: string;
  posterUrl?: string;
  isRegistrationOpen?: boolean;
}

type DetailTab = "overview" | "signups" | "documents" | "matches";

export default function Competitions(): React.ReactElement {
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  useEffect(() => {
    publicApi
      .competitions()
      .then((res: any) => {
        const list = res?.data || res;
        const mapped: CompetitionItem[] = Array.isArray(list)
          ? list.map((item: any) => ({
              _id: item.id || item._id,
              id: item.id,
              title: item.name || item.title || "Compétition FTJJ",
              date: item.date,
              location: item.location || "",
              description: item.description || "",
              type: item.type || "Open",
              splitByBelt: item.splitByBelt || false,
              ageDivision: Array.isArray(item.ageDivisions) ? item.ageDivisions[0] : (item.ageDivision || "ADULTS"),
              posterUrl: item.posterUrl || "",
              isRegistrationOpen: item.isRegistrationOpen ?? (item.date ? new Date(item.date) > new Date() : true),
            }))
          : [];
        setCompetitions(mapped);
      })
      .catch(() => setCompetitions([]))
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(cid: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(cid);
    setDetail(null);
    setDetailLoading(true);
    setDetailTab("overview");
    try {
      const r = await api.get(`/competitions/${cid}`);
      setDetail(r.data?.data ?? r.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail(e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId(null);
    setDetail(null);
  }

  const isRegistrationOpen = (comp: CompetitionItem) => comp.isRegistrationOpen ?? (comp.date ? new Date(comp.date) > new Date() : true);

  const approvedSignups =
    detail?.signups?.filter((s: any) => s.status === "APPROVED") || [];
  const liveMatches =
    detail?.matches?.filter((m: any) => m.status === "LIVE") || [];
  const finishedMatches =
    detail?.matches?.filter((m: any) => m.status === "FINISHED") || [];
  const upcomingMatches =
    detail?.matches?.filter((m: any) => m.status === "UPCOMING") || [];

  const renderCard = (comp: CompetitionItem, featured: boolean = false) => {
    const cid = comp._id || comp.id || "";
    const cardClass = featured
      ? "surface-card competition-feature-card"
      : "surface-card competition-card";
    const TitleTag = featured ? "h2" as const : "h3" as const;

    return (
      <article
        className={cardClass}
        key={cid}
        onClick={(e) => openDetail(cid, e)}
        style={{ cursor: "pointer" }}
      >
        <div className="competition-card-top">
          <span className="feature-chip">{comp.type || "Open"}</span>
          <span className="feature-chip">
            {comp.splitByBelt ? "Par ceinture" : "Tous niveaux"}
          </span>
          <span className="feature-chip">
            {getAgeDivisionLabel(comp.ageDivision || "ADULTS")}
          </span>
          <span className="competition-status-pill" style={comp.isRegistrationOpen ? {} : { background: "rgba(100,116,139,0.15)", color: "#94a3b8" }}>
            {comp.isRegistrationOpen ? "✅ Inscriptions ouvertes" : "🔒 Inscriptions fermées"}
          </span>
        </div>
        {comp.posterUrl && (
          <img
            src={comp.posterUrl}
            alt=""
            style={{
              width: "100%",
              maxHeight: featured ? 200 : 140,
              objectFit: "cover",
              borderRadius: 12,
              marginBottom: 16,
            }}
          />
        )}
        <TitleTag>{comp.title}</TitleTag>
        <p>{comp.location || "Lieu à confirmer"}</p>
        {comp.description && <p className="muted">{comp.description}</p>}
        <div className="story-meta">
          <span>{formatDateFr(comp.date)}</span>
          <span>Publication FTJJ</span>
        </div>
        {featured && (
          <>
            <div className="entity-tags">
              <span>Compétition ouverte</span>
              <span>{comp.splitByBelt ? "Par ceinture" : "Tous niveaux"}</span>
            </div>
            <div className="public-actions compact">
              <Link className="public-btn primary" to="/en-direct" onClick={(e) => e.stopPropagation()}>
                Voir le live
              </Link>
              <Link className="public-btn ghost" to="/contact" onClick={(e) => e.stopPropagation()}>
                Demander des informations
              </Link>
            </div>
          </>
        )}
      </article>
    );
  };

  const featuredComp = competitions[0];
  const sideComps = competitions.slice(1, 4);

  const tabBtn = (tab: DetailTab, label: string) => (
    <button
      key={tab}
      onClick={(e) => {
        e.stopPropagation();
        setDetailTab(tab);
      }}
      style={{
        padding: "10px 20px",
        border: "none",
        background: "transparent",
        color: detailTab === tab ? "#d51332" : "#64748b",
        fontWeight: detailTab === tab ? 700 : 500,
        borderBottom:
          detailTab === tab ? "2px solid #d51332" : "2px solid transparent",
        cursor: "pointer",
        fontSize: "0.85rem",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="public-page-shell">
      {/* ===== HERO ===== */}
      <section className="public-hero-banner public-hero-competitions-page">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Calendrier officiel</p>
            <h1>Compétitions, opens et stages FTJJ</h1>
            <p className="hero-copy">
              Consultez les compétitions à venir, les inscriptions en cours, et
              les résultats. Cliquez sur une compétition pour voir tous les
              détails.
            </p>
            <div className="public-actions">
              <Link className="public-btn primary" to="/en-direct">
                Suivre le live
              </Link>
              <Link className="public-btn ghost" to="/contact">
                Contacter la fédération
              </Link>
            </div>
          </div>
          <div className="surface-card hero-aside competition-hero-card">
            <p className="eyebrow">Vue compétition</p>
            <h2>
              {loading
                ? "Chargement..."
                : `${competitions.length} rendez-vous visible${competitions.length !== 1 ? "s" : ""}`}
            </h2>
            <p>
              Cliquez sur une compétition pour consulter les athlètes inscrits,
              les catégories de poids, les documents officiels et les matchs.
            </p>
          </div>
        </div>
      </section>

      {/* ===== LIST ===== */}
      <section className="public-section tight-surface">
        <div className="section-inner">
          {/* KPI cards */}
          <div className="competition-command-grid">
            {[
              { title: "Calendrier fédéral", text: "Vision claire des opens, championnats et stages sur toute la saison." },
              { title: "Inscriptions et statuts", text: "Lecture immédiate des compétitions ouvertes, confirmées ou déjà en direct." },
              { title: "Lien avec le live", text: "Les compétitions connectées au scoring restent visibles depuis le portail public." },
            ].map((card) => (
              <article className="surface-card competition-kpi-card" key={card.title}>
                <span className="feature-chip">Compétition</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          {loading && (
            <div
              className="surface-card"
              style={{ textAlign: "center", padding: "3rem 1rem" }}
            >
              <p>Chargement des compétitions...</p>
            </div>
          )}

          {!loading && competitions.length === 0 && (
            <div
              className="surface-card"
              style={{ textAlign: "center", padding: "3rem 1rem" }}
            >
              <span className="feature-chip">Information</span>
              <h2 style={{ marginTop: "1rem" }}>
                Aucune compétition programmée
              </h2>
              <p>
                Revenez bientôt pour consulter les prochains rendez-vous
                fédéraux.
              </p>
            </div>
          )}

          {!loading && featuredComp && (
            <div className="competition-stage-layout">
              {renderCard(featuredComp, true)}
              <div className="competition-side-list">
                {sideComps.map((comp) => renderCard(comp, false))}
              </div>
            </div>
          )}

          {!loading && competitions.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div className="section-lead">
                <p className="eyebrow">Toutes les compétitions</p>
              </div>
              <div className="feature-grid competitions-grid">
                {competitions.map((comp) => renderCard(comp, false))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== DETAIL MODAL ===== */}
      {selectedId && (
        <div
          className="modal-overlay"
          onClick={closeDetail}
          style={{
            zIndex: 1000,
            justifyContent: "flex-start",
            paddingTop: 40,
            display: "flex",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 900,
              width: "95%",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "white",
              color: "#1e293b",
              borderRadius: 16,
              margin: "0 auto",
            }}
          >
            {detailLoading ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <p style={{ color: "#64748b" }}>Chargement...</p>
              </div>
            ) : !detail ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <p style={{ color: "#64748b" }}>Compétition introuvable.</p>
                <button className="btn" onClick={closeDetail}>
                  Fermer
                </button>
              </div>
            ) : (
              <>
                {/* Close button */}
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px 0" }}>
                  <button
                    onClick={closeDetail}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.5rem",
                      cursor: "pointer",
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Header */}
                <div style={{ padding: "0 24px 20px" }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {detail.posterUrl && (
                      <img
                        src={detail.posterUrl}
                        alt=""
                        style={{
                          width: 140,
                          height: 180,
                          objectFit: "cover",
                          borderRadius: 12,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <h2 style={{ margin: "0 0 4px", fontSize: "1.5rem", color: "#0f172a" }}>
                        {detail.name}
                      </h2>
                      <p style={{ color: "#64748b", margin: "0 0 10px", fontSize: "0.9rem" }}>
                        {formatLongDate(detail.date)}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <span className="feature-chip">{detail.type || "Open"}</span>
                        <span className="feature-chip">
                          {getAgeDivisionLabel(detail.ageDivision || "ADULTS")}
                        </span>
                        <span className="feature-chip">
                          {detail.splitByBelt ? "Par ceinture" : "Tous niveaux"}
                        </span>
                      </div>
                      {detail.location && (
                        <p style={{ margin: "4px 0", color: "#64748b", fontSize: "0.85rem" }}>
                          📍 {detail.location}
                        </p>
                      )}
                      {detail.description && (
                        <p style={{ margin: "8px 0 0", color: "#475569", fontSize: "0.9rem", lineHeight: 1.6 }}>
                          {detail.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                      {[
                        { label: "Inscrits", value: detail.signups?.length || 0 },
                        { label: "Confirmés", value: approvedSignups.length },
                        { label: "Matchs", value: detail.matches?.length || 0 },
                      ].map((s) => (
                        <div
                          key={s.label}
                          style={{
                            textAlign: "center",
                            padding: "12px 14px",
                            background: "#f8fafc",
                            borderRadius: 10,
                            minWidth: 64,
                          }}
                        >
                          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d51332" }}>
                            {s.value}
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "#64748b" }}>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    borderBottom: "2px solid #e2e8f0",
                    padding: "0 24px",
                  }}
                >
                  {tabBtn("overview", "Aperçu")}
                  {tabBtn("signups", `Athlètes (${detail.signups?.length || 0})`)}
                  {tabBtn("documents", `Documents (${detail.documents?.length || 0})`)}
                  {tabBtn("matches", `Matchs (${detail.matches?.length || 0})`)}
                </div>

                {/* Tab content */}
                <div style={{ padding: "20px 24px 24px" }}>
                  {/* OVERVIEW */}
                  {detailTab === "overview" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {/* Weight Categories */}
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#0f172a" }}>
                          ⚖️ Catégories de poids
                        </h4>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "0.8rem", fontWeight: 600, color: "#3b82f6" }}>
                            Hommes
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                            {getWeightCategories(detail.ageDivision || "ADULTS", "MALE").map(
                              (wc: string) => (
                                <span key={wc} style={{ padding: "2px 8px", fontSize: "0.72rem", background: "#f1f5f9", borderRadius: 6, color: "#64748b" }}>
                                  {wc}
                                </span>
                              ),
                            )}
                          </div>
                          <p style={{ margin: "0 0 4px", fontSize: "0.8rem", fontWeight: 600, color: "#ec4899" }}>
                            Femmes
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {getWeightCategories(detail.ageDivision || "ADULTS", "FEMALE").map(
                              (wc: string) => (
                                <span key={wc} style={{ padding: "2px 8px", fontSize: "0.72rem", background: "#f1f5f9", borderRadius: 6, color: "#64748b" }}>
                                  {wc}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                        <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "#0f172a" }}>
                          📄 Documents & Règlements
                        </h4>
                        {!detail.documents || detail.documents.length === 0 ? (
                          <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                            Aucun document disponible.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {detail.documents.map((doc: any) => (
                              <a
                                key={doc.id}
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#d51332", textDecoration: "none" }}
                              >
                                📎 {doc.fileName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SIGNUPS */}
                  {detailTab === "signups" && (
                    <div>
                      {!detail.signups || detail.signups.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>
                          Aucun athlète inscrit.
                        </p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>Nom</th>
                              <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>Club</th>
                              <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>Ceinture</th>
                              <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>Poids</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.signups.map((s: any, i: number) => (
                              <tr key={s._id || s.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 12px", fontSize: "0.85rem", color: "#0f172a" }}>
                                  {s.person?.firstName} {s.person?.lastName}
                                </td>
                                <td style={{ padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>
                                  {s.person?.club?.name || "—"}
                                </td>
                                <td style={{ padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>
                                  {s.person?.athleteDetails?.grade || "—"}
                                </td>
                                <td style={{ padding: "8px 12px", fontSize: "0.8rem", color: "#64748b" }}>
                                  {s.person?.athleteDetails?.weight ? `${s.person.athleteDetails.weight} kg` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* DOCUMENTS */}
                  {detailTab === "documents" && (
                    <div>
                      {!detail.documents || detail.documents.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>
                          Aucun document disponible.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {detail.documents.map((doc: any) => (
                            <a
                              key={doc.id}
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 16px",
                                border: "1px solid #e2e8f0",
                                borderRadius: 10,
                                textDecoration: "none",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span style={{ fontSize: "1.3rem" }}>📄</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{doc.fileName}</div>
                                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                  {doc.createdAt ? `Ajouté le ${formatDateFr(doc.createdAt)}` : ""}
                                </div>
                              </div>
                              <span style={{ color: "#d51332", fontSize: "0.8rem" }}>
                                Télécharger →
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* MATCHES */}
                  {detailTab === "matches" && (
                    <div>
                      {!detail.matches || detail.matches.length === 0 ? (
                        <p style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>
                          Aucun match généré pour cette compétition.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {liveMatches.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "#fee2e2", color: "#d51332", marginBottom: 8 }}>
                                🔴 En direct ({liveMatches.length})
                              </span>
                              {liveMatches.map((m: any) => (
                                <div key={m._id || m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 6 }}>
                                  <span style={{ fontWeight: 600, color: "#d51332", flex: 1, textAlign: "right" }}>
                                    { m.redCorner ? `${m.redCorner.firstName || "—"} ${m.redCorner.lastName || ""}` : "À déterminer" }
                                  </span>
                                  <span style={{ margin: "0 12px", fontWeight: 800, color: "#64748b" }}>
                                    {m.redScore || 0} - {m.blueScore || 0}
                                  </span>
                                  <span style={{ fontWeight: 600, color: "#2563eb", flex: 1 }}>
                                    { m.blueCorner ? `${m.blueCorner.firstName || "—"} ${m.blueCorner.lastName || ""}` : "À déterminer" }
                                  </span>
                                  <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "#94a3b8" }}>T{m.matNumber}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {upcomingMatches.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "#dbeafe", color: "#2563eb", marginBottom: 8 }}>
                                ⏳ À venir ({upcomingMatches.length})
                              </span>
                              {upcomingMatches.map((m: any) => (
                                <div key={m._id || m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: 8, marginBottom: 4 }}>
                                  <span style={{ color: "#475569", flex: 1, textAlign: "right", fontSize: "0.85rem" }}>
                                    { m.redCorner ? `${m.redCorner.firstName || "—"} ${m.redCorner.lastName || ""}` : "À déterminer" }
                                  </span>
                                  <span style={{ margin: "0 12px", color: "#94a3b8", fontWeight: 600 }}>VS</span>
                                  <span style={{ color: "#475569", flex: 1, fontSize: "0.85rem" }}>
                                    { m.blueCorner ? `${m.blueCorner.firstName || "—"} ${m.blueCorner.lastName || ""}` : "À déterminer" }
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {finishedMatches.length > 0 && (
                            <div>
                              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: "#dcfce7", color: "#16a34a", marginBottom: 8 }}>
                                ✅ Terminés ({finishedMatches.length})
                              </span>
                              {finishedMatches.map((m: any) => (
                                <div key={m._id || m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: 8, marginBottom: 4 }}>
                                  <span style={{ color: m.winnerSide === "red" ? "#d51332" : "#475569", flex: 1, textAlign: "right", fontSize: "0.85rem", fontWeight: m.winnerSide === "red" ? 600 : 400 }}>
                                    { m.redCorner ? `${m.redCorner.firstName || "—"} ${m.redCorner.lastName || ""}` : "À déterminer" }
                                  </span>
                                  <span style={{ margin: "0 12px", color: "#94a3b8", fontSize: "0.8rem" }}>
                                    {m.redScore} - {m.blueScore}
                                  </span>
                                  <span style={{ color: m.winnerSide === "blue" ? "#2563eb" : "#475569", flex: 1, fontSize: "0.85rem", fontWeight: m.winnerSide === "blue" ? 600 : 400 }}>
                                    { m.blueCorner ? `${m.blueCorner.firstName || "—"} ${m.blueCorner.lastName || ""}` : "À déterminer" }
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
