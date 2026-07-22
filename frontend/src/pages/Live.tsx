import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../services/api";
import { getAgeDivisionLabel } from "../utils/formOptions";

interface CompItem {
  id: string; _id?: string;
  name: string; date: string; location?: string;
  type?: string; ageDivisions?: string[];
  posterUrl?: string; isClosed?: boolean;
  isRegistrationOpen?: boolean;
  _count?: { signups?: number; matches?: number };
}

export default function Live(): React.ReactElement {
  const [competitions, setCompetitions] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    publicApi.competitions()
      .then((res: any) => {
        const list = res?.data || res || [];
        setCompetitions(Array.isArray(list) ? list : []);
      })
      .catch(() => setCompetitions([]))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = competitions.filter(c => !c.isClosed && new Date(c.date) >= now);
  const finished = competitions.filter(c => c.isClosed || new Date(c.date) < now);

  const renderCard = (c: CompItem) => (
    <article key={c.id || c._id} className="surface-card competition-card"
      onClick={() => navigate(`/en-direct/${c.id || c._id}`)}
      style={{ cursor: "pointer" }}>
      {c.posterUrl && <img src={c.posterUrl} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12, marginBottom: 12 }} />}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="feature-chip">{c.type || "Open"}</span>
        {(c.ageDivisions || []).slice(0, 2).map((d: string) => (
          <span key={d} className="feature-chip">{getAgeDivisionLabel(d)}</span>
        ))}
      </div>
      <h3>{c.name}</h3>
      <p>{c.location || "Lieu à confirmer"}</p>
      <div className="story-meta">
        <span>{new Date(c.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
        <span>{c._count?.signups || 0} inscrits · {c._count?.matches || 0} matchs</span>
      </div>
    </article>
  );

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-live">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">En direct</p>
            <h1>Compétitions, brackets et scores en temps réel</h1>
            <p className="hero-copy">Suivez les compétitions en cours, consultez les brackets et regardez les matchs en direct.</p>
          </div>
        </div>
      </section>
      <section className="public-section">
        <div className="section-inner">
          {loading && <p style={{ textAlign: "center", padding: "3rem" }}>Chargement...</p>}
          {!loading && (
            <>
              {upcoming.length > 0 && (
                <div style={{ marginBottom: 40 }}>
                  <div className="section-lead"><p className="eyebrow">🔴 En cours / À venir</p><h2>Compétitions actives</h2></div>
                  <div className="feature-grid competitions-grid">{upcoming.map(renderCard)}</div>
                </div>
              )}
              {finished.length > 0 && (
                <div>
                  <div className="section-lead"><p className="eyebrow">✅ Terminées</p><h2>Compétitions passées</h2></div>
                  <div className="feature-grid competitions-grid">{finished.map(renderCard)}</div>
                </div>
              )}
              {competitions.length === 0 && (
                <div className="surface-card" style={{ textAlign: "center", padding: "3rem" }}>
                  <h2>Aucune compétition disponible</h2><p>Revenez bientôt.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
