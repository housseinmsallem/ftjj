import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import api from "../services/api";
import { getAgeDivisionLabel } from "../utils/formOptions";

interface ModerationData {
  name: string;
  date: string;
  ageDivisions: string[];
  signups: any[];
  matches: any[];
  mats: any[];
  isClosed?: boolean;
}

export default function BracketModeration(): React.ReactElement {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [data, setData] = useState<ModerationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [bracketData, setBracketData] = useState<any>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [matchGenLoading, setMatchGenLoading] = useState<string | null>(null);
  const [categoryMatches, setCategoryMatches] = useState<Record<string, any[]>>({});
  const [editMode, setEditMode] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<{ matchId: string; side: 'red' | 'blue' } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    if (!competitionId || !token) return;
    const interval = setInterval(async () => {
      try {
        const r = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
        const d = r.data?.data || r.data;
        setData(d);
        if (d.brackets) setBracketData(d.brackets);
        if (d.categoryMatches) setCategoryMatches(d.categoryMatches);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [competitionId, token]);

  useEffect(() => {
    if (!competitionId || !token) {
      setError("Lien invalide");
      setLoading(false);
      return;
    }
    api
      .get(`/competitions/${competitionId}/moderate`, { params: { token } })
      .then((r) => {
        const d = r.data?.data || r.data;
        setData(d);
        // Use brackets and categoryMatches from the backend response
        if (d.brackets) {
          setBracketData(d.brackets);
        }
        if (d.categoryMatches) {
          setCategoryMatches(d.categoryMatches);
        }
      })
      .catch((e) => { setError(e.response?.data?.message || "Accès refusé"); })
      .finally(() => setLoading(false));
  }, [competitionId, token]);

  const updateWeight = useCallback(
    async (signupId: string) => {
      const w = parseFloat(weights[signupId]);
      if (isNaN(w)) return;
      try {
        await api.patch(`/competitions/moderate/${competitionId}/signups/${signupId}/weight?token=${token}`, { weight: w });
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            signups: prev.signups.map((s: any) =>
              s.id === signupId || s._id === signupId ? { ...s, weight: w } : s,
            ),
          };
        });
      } catch {
        alert("Erreur lors de la mise à jour du poids");
      }
    },
    [weights],
  );

  const handleWeightChange = useCallback(
    (signupId: string, value: string) => {
      setWeights((prev) => ({ ...prev, [signupId]: value }));
    },
    [],
  );

  async function handleGenBrackets() {
    setGenLoading(true);
    try {
      await api.post(`/competitions/moderate/${competitionId}/generate-brackets?token=${token}`);
      // Refresh data to get updated brackets
      const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      const d = refresh.data?.data || refresh.data;
      setData(d);
      if (d.brackets) setBracketData(d.brackets);
      if (d.categoryMatches) setCategoryMatches(d.categoryMatches);
    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
    finally { setGenLoading(false); }
  }

  async function handleGenMatches(athleteIds: string[], categoryName: string) {
    setMatchGenLoading(categoryName);
    try {
      await api.post(`/competitions/moderate/${competitionId}/generate-matches?token=${token}`, { athleteIds });
      // Refresh data
      const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      const d = refresh.data?.data || refresh.data;
      setData(d);
      if (d.brackets) setBracketData(d.brackets);
      if (d.categoryMatches) setCategoryMatches(d.categoryMatches);
    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
    finally { setMatchGenLoading(null); }
  }

  async function handleGenAll() {
    setGenLoading(true);
    try {
      await api.post(`/competitions/moderate/${competitionId}/generate-brackets?token=${token}`);
      // Get brackets
      const bracketRes = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      const bd = bracketRes.data?.data || bracketRes.data;
      if (bd?.brackets?.categories) {
        for (const cat of bd.brackets.categories) {
          try {
            await api.post(`/competitions/moderate/${competitionId}/generate-matches?token=${token}`, { athleteIds: cat.athletes });
          } catch { /* skip */ }
        }
      }
      // Final refresh
      const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      const d = refresh.data?.data || refresh.data;
      setData(d);
      if (d.brackets) setBracketData(d.brackets);
      if (d.categoryMatches) setCategoryMatches(d.categoryMatches);
    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
    finally { setGenLoading(false); }
  }

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page { size: A3 landscape; margin: 12mm; }
      body { background: #fff !important; color: #000 !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    `,
  });

  async function handleGenNextRound() {
    if (!bracketData?.categories) return;
    setMatchGenLoading("next-round");
    try {
      // Find the highest round number across all categories
      let maxRound = 1;
      for (const catMatches of Object.values(categoryMatches)) {
        for (const m of catMatches as any[]) {
          if (m.round > maxRound) maxRound = m.round;
        }
      }
      await api.post(`/competitions/moderate/${competitionId}/next-round?token=${token}`, { currentRound: maxRound });
      const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      const d = refresh.data?.data || refresh.data;
      setData(d);
      if (d.brackets) setBracketData(d.brackets);
      if (d.categoryMatches) setCategoryMatches(d.categoryMatches);
    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
    finally { setMatchGenLoading(null); }
  }

  async function handleReplaceAthlete(matchId: string, side: 'red' | 'blue', newPersonId: string) {
    try {
      await api.patch(`/competitions/moderate/${competitionId}/matches/${matchId}/replace?token=${token}`, { side, newPersonId });
      setReplaceTarget(null);
      const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      const d = refresh.data?.data || refresh.data;
      setData(d);
      if (d.brackets) setBracketData(d.brackets);
      if (d.categoryMatches) setCategoryMatches(d.categoryMatches);
    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
  }

  async function handleToggleClose() {
    try {
      await api.post(`/competitions/moderate/${competitionId}/toggle-close?token=${token}`);
      const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
      setData(refresh.data?.data || refresh.data);
    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
  }

  if (loading)
    return (
      <div style={pageBg}>
        <div style={{ ...styles.container, textAlign: "center" }}>
          Chargement...
        </div>
      </div>
    );
  if (error)
    return (
      <div style={pageBg}>
        <div style={{ ...styles.container, textAlign: "center", color: "#d51332" }}>
          {error}
        </div>
      </div>
    );
  if (!data) return <div style={pageBg} />;

  const signups = data.signups || [];
  const matches = data.matches || [];
  const mats = data.mats || [];

  // Group signups by age division → gender → weight
  const byAgeDiv: Record<string, any[]> = {};
  for (const s of signups) {
    if (s.type !== "ATHLETE") continue;
    const birthYear = s.person?.dateOfBirth
      ? new Date(s.person.dateOfBirth).getFullYear()
      : 2000;
    const age = 2026 - birthYear;
    let div = "ADULTS";
    if (age <= 5) div = "U6";
    else if (age <= 7) div = "U8";
    else if (age <= 9) div = "U10";
    else if (age <= 11) div = "U12";
    else if (age <= 13) div = "U14";
    else if (age <= 15) div = "U16";
    else if (age <= 17) div = "U18";
    else if (age <= 20) div = "U21";
    else if (age <= 34) div = "ADULTS";
    else if (age <= 39) div = "MASTERS_1";
    else if (age <= 44) div = "MASTERS_2";
    else if (age <= 49) div = "MASTERS_3";
    else div = "MASTERS_4";
    if (!byAgeDiv[div]) byAgeDiv[div] = [];
    byAgeDiv[div].push(s);
  }

  return (
    <div style={pageBg}>
      <div style={styles.container}>
        <h1 style={styles.title}>{data.name}</h1>
        <p style={styles.subtitle}>
          {new Date(data.date).toLocaleDateString("fr-FR")} ·{" "}
          {(data.ageDivisions || [])
            .map((d: string) => getAgeDivisionLabel(d))
            .join(", ")}{" "}
          · {signups.length} inscrits · {matches.length} matchs
        </p>

        {/* Mats */}
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#e4c328" }}>🏁 Tapis</h3>
            <button style={{ ...styles.btn, padding: "6px 14px", fontSize: "0.8rem" }}
              disabled={data?.isClosed}
              onClick={async () => {
                const n = (mats.length || 0) + 1;
                try {
                  await api.post(`/competitions/moderate/${competitionId}/mats?token=${token}`, { name: `Tapis ${n}`, number: n });
                  // Refresh data
                  const r = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
                  setData(r.data?.data || r.data);
                } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
              }}>
              + Ajouter un tapis
            </button>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {mats.map((m: any) => (
              <div key={m.id} style={{ padding: "8px 16px", background: "#222", borderRadius: 8, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 10 }}>
                <span>{m.name} ({m._count?.matches || 0} matchs)</span>
                <button style={{ ...styles.btn, background: "#d51332", padding: "2px 8px", fontSize: "0.7rem" }}
                  disabled={data?.isClosed}
                  onClick={async () => {
                    if (!confirm(`Supprimer ${m.name} ?`)) return;
                    try {
                      await api.delete(`/competitions/moderate/${competitionId}/mats/${m.id}?token=${token}`);
                      const r = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
                      setData(r.data?.data || r.data);
                    } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
                  }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Brackets Section */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#e4c328" }}>🏆 Catégories & Brackets</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem", background: editMode ? "#22c55e" : "#e4c328" }}
              onClick={() => { setEditMode(!editMode); setReplaceTarget(null); }}
              disabled={data?.isClosed}>
              {editMode ? "✓ Quitter édition" : "✏️ Mode édition"}
            </button>
            <button style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem", background: "#22c55e" }} onClick={handleGenAll} disabled={genLoading || data?.isClosed}>
              {genLoading ? "⏳..." : "⚡ Générer tout (brackets + matchs)"}
            </button>
            <button style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem", background: "#64748b" }}
              onClick={() => handlePrint()}>
              📥 Exporter PDF
            </button>
            <button style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem" }} onClick={handleGenBrackets} disabled={genLoading || data?.isClosed}>
              {genLoading ? "..." : bracketData ? "🔄 Régénérer brackets" : "Générer brackets"}
            </button>
            <button style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem", background: "#d51332" }}
              disabled={data?.isClosed}
              onClick={async () => {
                if (!confirm("Supprimer TOUS les matchs de cette compétition ? Cette action est irréversible.")) return;
                try {
                  await api.delete(`/competitions/moderate/${competitionId}/matches/reset?token=${token}`);
                  setBracketData(null);
                  setCategoryMatches({});
                  const refresh = await api.get(`/competitions/${competitionId}/moderate`, { params: { token } });
                  setData(refresh.data?.data || refresh.data);
                } catch (e: any) { alert(e?.response?.data?.message || "Erreur"); }
              }}>
              🗑️ Reset tous les matchs
            </button>
          </div>
        </div>

        {bracketData?.categories && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: "#888", fontSize: "0.85rem", margin: "0 0 12px" }}>
              {bracketData.categories.length} catégorie(s) · {bracketData.totalAthletes} athlètes
            </p>
            {bracketData?.promotedAthletes > 0 && (
              <p style={{ color: "#e4c328", fontSize: "0.8rem", margin: "-8px 0 16px", fontStyle: "italic" }}>
                ℹ️ {bracketData.promotedAthletes} athlète(s) promu(s) vers une catégorie supérieure (seul(s) dans leur catégorie d'origine)
              </p>
            )}
            {bracketData.categories.filter((cat: any) => cat.athletes.length > 0).map((cat: any, i: number) => {
              const catMatches = categoryMatches[cat.name] || [];
              const loading = matchGenLoading === cat.name;
              // Group matches by round
              const byRound: Record<number, any[]> = {};
              for (const m of catMatches) {
                const r = m.round || 1;
                if (!byRound[r]) byRound[r] = [];
                byRound[r].push(m);
              }
              const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

              return (
                <div key={i} style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid #333" }}>
                  {/* Category header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #333" }}>
                    <div>
                      <span style={{ color: "#e4c328", fontWeight: 700, fontSize: "1rem" }}>{cat.name}</span>
                      <span style={{ color: "#888", marginLeft: 10, fontSize: "0.8rem" }}>{cat.athletes.length} athlètes · {catMatches.length} matchs</span>
                      {loading && <span style={{ color: "#3b82f6", marginLeft: 8, fontSize: "0.75rem" }}>⏳ Génération...</span>}
                    </div>
                    <button style={{ ...styles.btn, padding: "6px 14px", fontSize: "0.8rem" }}
                      onClick={() => handleGenMatches(cat.athletes, cat.name)}
                      disabled={!!loading || data?.isClosed}>
                      {catMatches.length > 0 ? "🔄 Régénérer" : "Générer les matchs"}
                    </button>
                  </div>

                  {/* Bracket Tree - absolute positioned */}
                  {catMatches.length > 0 ? (
                    <>
                    <div style={{ position: "relative", overflowX: "auto" }}>
                      {(() => {
                        const CARD_W = 240, CARD_H = 88, ROUND_GAP = 110, FIRST_ROUND_VGAP = 28, ROUND_LABEL_H = 28;
                        const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};
                        let totalH = 0;

                        for (let ri = 0; ri < rounds.length; ri++) {
                          const round = rounds[ri];
                          const rMatches = byRound[round].sort((a: any, b: any) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                          const x = ri * (CARD_W + ROUND_GAP);
                          if (ri === 0) {
                            for (let j = 0; j < rMatches.length; j++) {
                              const y = ROUND_LABEL_H + j * (CARD_H + FIRST_ROUND_VGAP);
                              positions[rMatches[j].id || rMatches[j]._id || `r${round}j${j}`] = { x, y, w: CARD_W, h: CARD_H };
                            }
                            totalH = ROUND_LABEL_H + rMatches.length * (CARD_H + FIRST_ROUND_VGAP) - FIRST_ROUND_VGAP;
                          } else {
                            const prevMatches = byRound[rounds[ri - 1]].sort((a: any, b: any) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                            for (let j = 0; j < rMatches.length; j++) {
                              const prevA = positions[prevMatches[j * 2]?.id || prevMatches[j * 2]?._id || `r${rounds[ri-1]}j${j*2}`];
                              const prevB = prevMatches[j * 2 + 1] ? positions[prevMatches[j * 2 + 1]?.id || prevMatches[j * 2 + 1]?._id || `r${rounds[ri-1]}j${j*2+1}`] : null;
                              const yCenter = prevB ? (prevA.y + CARD_H / 2 + prevB.y + CARD_H / 2) / 2 : prevA.y + CARD_H / 2;
                              positions[rMatches[j].id || rMatches[j]._id || `r${round}j${j}`] = { x, y: yCenter - CARD_H / 2, w: CARD_W, h: CARD_H };
                            }
                          }
                        }

                        const connectors: { x1: number; y1: number; x2: number; y2: number }[] = [];
                        for (let ri = 1; ri < rounds.length; ri++) {
                          const prevMatches = byRound[rounds[ri - 1]].sort((a: any, b: any) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                          const currMatches = byRound[rounds[ri]].sort((a: any, b: any) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                          for (let j = 0; j < currMatches.length; j++) {
                            const prevA = positions[prevMatches[j * 2]?.id || prevMatches[j * 2]?._id || `r${rounds[ri-1]}j${j*2}`];
                            const prevB = prevMatches[j * 2 + 1] ? positions[prevMatches[j * 2 + 1]?.id || prevMatches[j * 2 + 1]?._id || `r${rounds[ri-1]}j${j*2+1}`] : null;
                            const curr = positions[currMatches[j]?.id || currMatches[j]?._id || `r${rounds[ri]}j${j}`];
                            if (!curr) continue;
                            const cx = prevA.x + CARD_W + (curr.x - prevA.x - CARD_W) / 2;
                            connectors.push({ x1: prevA.x + CARD_W, y1: prevA.y + CARD_H / 2, x2: cx, y2: prevA.y + CARD_H / 2 });
                            if (prevB) {
                              connectors.push({ x1: prevB.x + CARD_W, y1: prevB.y + CARD_H / 2, x2: cx, y2: prevB.y + CARD_H / 2 });
                              connectors.push({ x1: cx, y1: prevA.y + CARD_H / 2, x2: cx, y2: prevB.y + CARD_H / 2 });
                            }
                            connectors.push({ x1: cx, y1: curr.y + CARD_H / 2, x2: curr.x, y2: curr.y + CARD_H / 2 });
                          }
                        }

                        const svgW = rounds.length * (CARD_W + ROUND_GAP) - ROUND_GAP;
                        return (
                          <div style={{ position: "relative", width: svgW, height: totalH + 20, minHeight: 200 }}>
                            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "visible" }}>
                              {connectors.map((c, ci) => (
                                <line key={ci} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#555" strokeWidth="1.5" />
                              ))}
                            </svg>
                            {rounds.map((round, ri) => (
                              <div key={round} style={{ position: "absolute", top: 0, left: ri * (CARD_W + ROUND_GAP), width: CARD_W, color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", fontWeight: 700, height: ROUND_LABEL_H, lineHeight: `${ROUND_LABEL_H}px` }}>
                                {round === 1 ? "Premier tour" : round === 2 ? "Demi-finales" : round === 3 ? "Finale" : `Round ${round}`}
                              </div>
                            ))}
                            {catMatches.map((m: any) => {
                              const posKey = m.id || m._id || `r${m.round}j${(m.bracketPosition || 1) - 1}`;
                              const pos = positions[posKey];
                              if (!pos) return null;
                              return (
                                <div key={m.id || m._id || posKey} style={{ position: "absolute", left: pos.x, top: pos.y, width: pos.w, zIndex: 1, background: m.status === "LIVE" ? "rgba(213,19,50,0.12)" : m.status === "FINISHED" ? "rgba(34,197,94,0.08)" : "#1a1a1a", border: `1px solid ${m.status === "LIVE" ? "#d51332" : m.status === "FINISHED" ? "#22c55e" : "#333"}`, borderRadius: 10, padding: "10px 12px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                    {editMode && !data?.isClosed ? (
                                      <span style={{ cursor: "pointer", fontWeight: m.winnerSide === "red" ? 700 : 400, color: m.winnerSide === "red" ? "#d51332" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dashed #888" }}
                                        onClick={(e) => { e.stopPropagation(); setReplaceTarget({ matchId: m.id || m._id, side: 'red' }); }}>
                                        {m.redCorner ? `${m.redCorner.firstName || ""} ${m.redCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                      </span>
                                    ) : (
                                      <span style={{ fontWeight: m.winnerSide === "red" ? 700 : 400, color: m.winnerSide === "red" ? "#d51332" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {m.redCorner ? `${m.redCorner.firstName || ""} ${m.redCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                      </span>
                                    )}
                                    <span style={{ color: "#d51332", fontWeight: 700, fontSize: "0.85rem" }}>{m.redScore ?? 0}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    {editMode && !data?.isClosed ? (
                                      <span style={{ cursor: "pointer", fontWeight: m.winnerSide === "blue" ? 700 : 400, color: m.winnerSide === "blue" ? "#3b82f6" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dashed #888" }}
                                        onClick={(e) => { e.stopPropagation(); setReplaceTarget({ matchId: m.id || m._id, side: 'blue' }); }}>
                                        {m.blueCorner ? `${m.blueCorner.firstName || ""} ${m.blueCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                      </span>
                                    ) : (
                                      <span style={{ fontWeight: m.winnerSide === "blue" ? 700 : 400, color: m.winnerSide === "blue" ? "#3b82f6" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {m.blueCorner ? `${m.blueCorner.firstName || ""} ${m.blueCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                      </span>
                                    )}
                                    <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: "0.85rem" }}>{m.blueScore ?? 0}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 4, borderTop: "1px solid #2a2a2a", fontSize: "0.6rem" }}>
                                    <span style={{ color: "#666" }}>{m.mat?.name || "—"}</span>
                                    <span style={{ color: m.status === "LIVE" ? "#d51332" : m.status === "FINISHED" ? "#22c55e" : "#666", fontWeight: 600 }}>
                                      {m.status === "LIVE" ? "LIVE" : m.status === "FINISHED" ? "TERMINÉ" : "À VENIR"}
                                    </span>
                                    <button style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: "0.6rem", cursor: "pointer", fontWeight: 600 }}
                                      onClick={() => {
                                        const redName = m.redCorner ? `${m.redCorner.firstName || ""} ${m.redCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer";
                                        const blueName = m.blueCorner ? `${m.blueCorner.firstName || ""} ${m.blueCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer";
                                        window.open(`/scoring?red=${encodeURIComponent(redName)}&blue=${encodeURIComponent(blueName)}&matchId=${m.id || m._id || ""}&competitionId=${competitionId}&token=${encodeURIComponent(token)}`, "_blank", "width=1400,height=900");
                                      }}>
                                      🎮
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Next Round Button */}
                    {(() => {
                      const allFinished = rounds.length > 0 && byRound[rounds[rounds.length - 1]]?.every((m: any) => m.status === 'FINISHED');
                      const hasWinners = rounds.length > 0 && byRound[rounds[rounds.length - 1]]?.some((m: any) => m.winnerSide);
                      if (allFinished && hasWinners) {
                        return (
                          <div style={{ textAlign: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #333" }}>
                            <button style={{ ...styles.btn, background: "#8b5cf6", padding: "10px 24px", fontSize: "0.9rem" }}
                              onClick={handleGenNextRound}
                              disabled={matchGenLoading === "next-round"}>
                              {matchGenLoading === "next-round" ? "⏳..." : `🏆 Générer ${rounds[rounds.length - 1] + 1 === 2 ? "les Demi-finales" : rounds[rounds.length - 1] + 1 === 3 ? "la Finale" : `le Round ${rounds[rounds.length - 1] + 1}`}`}
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Podium / Medals for this category */}
                    {(() => {
                      const medals = computeMedals(catMatches);
                      const hasAnyMedal = medals.gold || medals.silver || medals.bronze.length > 0;
                      if (!hasAnyMedal) return null;
                      return (
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px solid #e4c328" }}>
                          <div style={{ color: "#e4c328", fontWeight: 700, fontSize: "0.85rem", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>🏅 Podium</div>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {/* Gold */}
                            <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #3d2e00, #5a4500)", border: "1px solid #e4c328", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                              <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥇</div>
                              <div style={{ color: "#e4c328", fontWeight: 800, fontSize: "0.85rem" }}>{medals.gold?.athleteName || "—"}</div>
                              {medals.gold?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.gold.clubName}</div>}
                            </div>
                            {/* Silver */}
                            <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #2a2a2a, #3a3a3a)", border: "1px solid #aaa", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                              <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥈</div>
                              <div style={{ color: "#ddd", fontWeight: 800, fontSize: "0.85rem" }}>{medals.silver?.athleteName || "—"}</div>
                              {medals.silver?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.silver.clubName}</div>}
                            </div>
                            {/* Bronze (2 slots) */}
                            <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #2a1a0a, #3a2510)", border: "1px solid #cd7f32", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                              <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥉</div>
                              <div style={{ color: "#cd7f32", fontWeight: 800, fontSize: "0.85rem" }}>{medals.bronze[0]?.athleteName || "—"}</div>
                              {medals.bronze[0]?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.bronze[0].clubName}</div>}
                            </div>
                            <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #2a1a0a, #3a2510)", border: "1px solid #cd7f32", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                              <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥉</div>
                              <div style={{ color: "#cd7f32", fontWeight: 800, fontSize: "0.85rem" }}>{medals.bronze[1]?.athleteName || "—"}</div>
                              {medals.bronze[1]?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.bronze[1].clubName}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    </>

                  ) : (
                    <p style={{ color: "#888", textAlign: "center", padding: 20 }}>Aucun match généré. Cliquez sur "Générer les matchs" ou utilisez "Générer tout".</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!bracketData && (
          <p style={{ color: "#888", fontSize: "0.85rem", margin: "12px 0 0" }}>Cliquez sur "Générer les brackets" pour regrouper les athlètes par âge, poids et ceinture.</p>
        )}
      </div>

        {/* Signups grouped by age division */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>
            📋 Athlètes inscrits ({signups.filter((s: any) => s.type === "ATHLETE").length})
          </h3>
          {Object.keys(byAgeDiv).length === 0 && (
            <p style={{ color: "#888", fontSize: "0.85rem" }}>Aucun athlète.</p>
          )}
          {Object.entries(byAgeDiv).map(([div, athletes]) => (
            <div key={div} style={{ marginBottom: 20 }}>
              <h4 style={styles.divisionTitle}>
                {getAgeDivisionLabel(div)} ({athletes.length})
              </h4>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nom</th>
                    <th style={styles.th}>Club</th>
                    <th style={styles.th}>Genre</th>
                    <th style={styles.th}>Grade</th>
                    <th style={styles.th}>Poids (kg)</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a: any) => {
                    const sid = a.id || a._id || "";
                    const w = weights[sid] !== undefined ? weights[sid] : (a.weight ?? a.person?.athleteDetails?.weight ?? "");
                    return (
                      <tr key={sid}>
                        <td style={styles.td}>
                          {a.person?.firstName} {a.person?.lastName}
                        </td>
                        <td style={styles.td}>
                          {a.person?.club?.name || "—"}
                        </td>
                        <td style={styles.td}>
                          {a.person?.gender === "MALE" ? "H" : "F"}
                        </td>
                        <td style={styles.td}>
                          {a.person?.athleteDetails?.grade || "—"}
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            step="0.1"
                            min="20"
                            max="200"
                            value={w}
                            disabled={data?.isClosed}
                            onChange={(e) =>
                              handleWeightChange(sid, e.target.value)
                            }
                            style={styles.input}
                          />
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.btn}
                            disabled={data?.isClosed}
                            onClick={() => updateWeight(sid)}
                          >
                            ✓
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Tournament Bracket Graph */}
        {bracketData?.categories && bracketData.categories.length > 0 && (
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", color: "#e4c328" }}>🏆 Tableau du tournoi</h3>
              <button style={{ ...styles.btn, padding: "6px 14px", fontSize: "0.8rem", background: "#64748b" }}
                onClick={() => handlePrint()}>
                📥 Exporter PDF
              </button>
            </div>
            <div ref={printRef}>
            {bracketData.categories.filter((cat: any) => cat.athletes.length > 0).map((cat: any, catIdx: number) => {
                const catMatches = categoryMatches[cat.name] || [];
                if (cat.athletes.length === 0) return null;

                // Group matches by round
                const byRound: Record<number, any[]> = {};
                for (const m of catMatches) {
                  const r = m.round || 1;
                  if (!byRound[r]) byRound[r] = [];
                  byRound[r].push(m);
                }
                const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

                // Layout constants
                const CARD_W = 240;
                const CARD_H = 88;
                const ROUND_GAP = 110; // horizontal gap between rounds (includes connector space)
                const FIRST_ROUND_VGAP = 28; // vertical gap between matches in round 1
                const ROUND_LABEL_H = 28; // height for round labels

                // Calculate positions
                const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};
                let totalH = 0;

                for (let ri = 0; ri < rounds.length; ri++) {
                  const round = rounds[ri];
                  const matches = byRound[round].sort((a, b) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                  const x = ri * (CARD_W + ROUND_GAP);

                  if (ri === 0) {
                    // Round 1: evenly spaced
                    for (let j = 0; j < matches.length; j++) {
                      const y = ROUND_LABEL_H + j * (CARD_H + FIRST_ROUND_VGAP);
                      positions[matches[j].id || matches[j]._id || `r${round}j${j}`] = { x, y, w: CARD_W, h: CARD_H };
                    }
                    totalH = ROUND_LABEL_H + matches.length * (CARD_H + FIRST_ROUND_VGAP) - FIRST_ROUND_VGAP;
                  } else {
                    // Later rounds: centered between two previous round matches
                    const prevMatches = byRound[rounds[ri - 1]].sort((a, b) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                    for (let j = 0; j < matches.length; j++) {
                      const prevIdx = j * 2;
                      const prevA = positions[prevMatches[prevIdx]?.id || prevMatches[prevIdx]?._id || `r${rounds[ri-1]}j${prevIdx}`];
                      const prevB = prevMatches[prevIdx + 1] ? positions[prevMatches[prevIdx + 1]?.id || prevMatches[prevIdx + 1]?._id || `r${rounds[ri-1]}j${prevIdx + 1}`] : null;
                      const yCenter = prevB ? (prevA.y + prevA.h / 2 + prevB.y + prevB.h / 2) / 2 : prevA.y + prevA.h / 2;
                      const y = yCenter - CARD_H / 2;
                      positions[matches[j].id || matches[j]._id || `r${round}j${j}`] = { x, y, w: CARD_W, h: CARD_H };
                    }
                  }
                }

                // SVG connectors
                const connectors: { x1: number; y1: number; x2: number; y2: number; cx: number }[] = [];
                for (let ri = 1; ri < rounds.length; ri++) {
                  const prevMatches = byRound[rounds[ri - 1]].sort((a, b) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                  const currMatches = byRound[rounds[ri]].sort((a, b) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                  for (let j = 0; j < currMatches.length; j++) {
                    const prevIdx = j * 2;
                    const prevA = positions[prevMatches[prevIdx]?.id || prevMatches[prevIdx]?._id || `r${rounds[ri-1]}j${prevIdx}`];
                    const prevB = prevMatches[prevIdx + 1] ? positions[prevMatches[prevIdx + 1]?.id || prevMatches[prevIdx + 1]?._id || `r${rounds[ri-1]}j${prevIdx + 1}`] : null;
                    const curr = positions[currMatches[j]?.id || currMatches[j]?._id || `r${rounds[ri]}j${j}`];
                    if (!curr) continue;

                    const cx = prevA.x + prevA.w + (curr.x - prevA.x - prevA.w) / 2;

                    // Line from prevA right edge to connector column
                    connectors.push({ x1: prevA.x + prevA.w, y1: prevA.y + prevA.h / 2, x2: cx, y2: prevA.y + prevA.h / 2, cx });
                    if (prevB) {
                      connectors.push({ x1: prevB.x + prevB.w, y1: prevB.y + prevB.h / 2, x2: cx, y2: prevB.y + prevB.h / 2, cx });
                    }
                    // Vertical merge line (only if there are two feeders)
                    if (prevB) {
                      connectors.push({ x1: cx, y1: prevA.y + prevA.h / 2, x2: cx, y2: prevB.y + prevB.h / 2, cx: 0 });
                    }
                    // Line from connector column to curr left edge
                    connectors.push({ x1: cx, y1: curr.y + curr.h / 2, x2: curr.x, y2: curr.y + curr.h / 2, cx: 0 });
                  }
                }

                const svgW = rounds.length * (CARD_W + ROUND_GAP) - ROUND_GAP;
                const svgH = totalH + 20;

                return (
                  <div key={catIdx} style={{ marginBottom: 32, borderBottom: catIdx < bracketData.categories.length - 1 ? "1px solid #333" : "none", paddingBottom: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ color: "#e4c328", fontWeight: 700, fontSize: "0.95rem" }}>{cat.name}</span>
                      <span style={{ color: "#888", marginLeft: 10, fontSize: "0.8rem" }}>{cat.athletes.length} athlètes · {catMatches.length} matchs</span>
                    </div>

                    {/* Bracket area */}
                    <div style={{ position: "relative", overflowX: "auto" }}>
                      <div style={{ position: "relative", width: svgW, height: svgH, minHeight: 200 }}>
                        {/* SVG connectors */}
                        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "visible" }}>
                          {connectors.map((c, ci) => (
                            <line key={ci} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#555" strokeWidth="1.5" />
                          ))}
                        </svg>

                        {/* Round labels */}
                        {rounds.map((round, ri) => (
                          <div key={round} style={{
                            position: "absolute", top: 0, left: ri * (CARD_W + ROUND_GAP), width: CARD_W,
                            color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em",
                            textAlign: "center", fontWeight: 700, height: ROUND_LABEL_H, lineHeight: `${ROUND_LABEL_H}px`,
                          }}>
                            {round === 1 ? "Premier tour" : round === 2 ? "Demi-finales" : round === 3 ? "Finale" : `Round ${round}`}
                          </div>
                        ))}

                        {/* Match cards */}
                        {catMatches.map((m: any) => {
                          const posKey = m.id || m._id || `r${m.round}j${(m.bracketPosition || 1) - 1}`;
                          const pos = positions[posKey];
                          if (!pos) return null;

                          return (
                            <div key={m.id || m._id || posKey} style={{
                              position: "absolute", left: pos.x, top: pos.y, width: pos.w, zIndex: 1,
                              background: m.status === "LIVE" ? "rgba(213,19,50,0.12)" : m.status === "FINISHED" ? "rgba(34,197,94,0.08)" : "#1a1a1a",
                              border: `1px solid ${m.status === "LIVE" ? "#d51332" : m.status === "FINISHED" ? "#22c55e" : "#333"}`,
                              borderRadius: 10, padding: "10px 12px",
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                {editMode && !data?.isClosed ? (
                                  <span style={{ cursor: "pointer", fontWeight: m.winnerSide === "red" ? 700 : 400, color: m.winnerSide === "red" ? "#d51332" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dashed #888" }}
                                    onClick={(e) => { e.stopPropagation(); setReplaceTarget({ matchId: m.id || m._id, side: 'red' }); }}>
                                    {m.redCorner ? `${m.redCorner.firstName || ""} ${m.redCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: m.winnerSide === "red" ? 700 : 400, color: m.winnerSide === "red" ? "#d51332" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.redCorner ? `${m.redCorner.firstName || ""} ${m.redCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                  </span>
                                )}
                                <span style={{ color: "#d51332", fontWeight: 700, fontSize: "0.85rem" }}>{m.redScore ?? 0}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                {editMode && !data?.isClosed ? (
                                  <span style={{ cursor: "pointer", fontWeight: m.winnerSide === "blue" ? 700 : 400, color: m.winnerSide === "blue" ? "#3b82f6" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: "1px dashed #888" }}
                                    onClick={(e) => { e.stopPropagation(); setReplaceTarget({ matchId: m.id || m._id, side: 'blue' }); }}>
                                    {m.blueCorner ? `${m.blueCorner.firstName || ""} ${m.blueCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: m.winnerSide === "blue" ? 700 : 400, color: m.winnerSide === "blue" ? "#3b82f6" : "#ddd", fontSize: "0.8rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.blueCorner ? `${m.blueCorner.firstName || ""} ${m.blueCorner.lastName || ""}`.trim() || "À déterminer" : "À déterminer"}
                                  </span>
                                )}
                                <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: "0.85rem" }}>{m.blueScore ?? 0}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 4, borderTop: "1px solid #2a2a2a", fontSize: "0.6rem" }}>
                                <span style={{ color: "#666" }}>{m.mat?.name || "—"}</span>
                                <span style={{ color: m.status === "LIVE" ? "#d51332" : m.status === "FINISHED" ? "#22c55e" : "#666", fontWeight: 600 }}>
                                  {m.status === "LIVE" ? "LIVE" : m.status === "FINISHED" ? "TERMINÉ" : "À VENIR"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🏅 Medals Summary */}
        {bracketData?.categories && bracketData.categories.length > 0 && (() => {
          const allMedals: { catName: string; gold: string | null; silver: string | null; bronze: string[] }[] = [];
          for (const cat of bracketData.categories) {
            const catMatches = categoryMatches[cat.name] || [];
            const medals = computeMedals(catMatches);
            if (medals.gold || medals.silver || medals.bronze.length > 0) {
              allMedals.push({
                catName: cat.name,
                gold: medals.gold?.athleteName || null,
                silver: medals.silver?.athleteName || null,
                bronze: medals.bronze.map(b => b.athleteName).filter(Boolean) as string[],
              });
            }
          }
          if (allMedals.length === 0) return null;
          return (
            <div style={{ ...styles.card, marginTop: 24 }}>
              <h3 style={{ margin: "0 0 20px", fontSize: "1rem", color: "#e4c328" }}>🏅 Résumé des médailles</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allMedals.map((m, idx) => (
                  <div key={idx} style={{ background: "#1a1a1a", borderRadius: 10, padding: "14px 18px", border: "1px solid #333" }}>
                    <div style={{ color: "#e4c328", fontWeight: 700, fontSize: "0.9rem", marginBottom: 10 }}>{m.catName}</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.8rem" }}>
                      <span>🥇 <strong style={{ color: "#e4c328" }}>{m.gold || "—"}</strong></span>
                      <span>🥈 <strong style={{ color: "#ddd" }}>{m.silver || "—"}</strong></span>
                      {m.bronze.map((name, bi) => (
                        <span key={bi}>🥉 <strong style={{ color: "#cd7f32" }}>{name || "—"}</strong></span>
                      ))}
                      {m.bronze.length === 0 && <span>🥉 <strong style={{ color: "#cd7f32" }}>—</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Replace Athlete Modal */}
      {replaceTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setReplaceTarget(null)}>
          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, maxWidth: 400, width: "90%", border: "1px solid #333", maxHeight: "70vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#e4c328", margin: "0 0 12px", fontSize: "0.95rem" }}>Remplacer l'athlète</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data?.signups?.filter((s: any) => s.type === "ATHLETE").map((s: any) => (
                <button key={s.id || s._id} style={{ padding: "10px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: 8, cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }}
                  onClick={() => {
                    const sid = s.personId || s.person?.id || s.person?._id;
                    if (sid) handleReplaceAthlete(replaceTarget.matchId, replaceTarget.side, sid);
                  }}>
                  {s.person?.firstName} {s.person?.lastName} {s.person?.club?.name ? `(${s.person.club.name})` : ""}
                </button>
              ))}
            </div>
            <button style={{ marginTop: 12, padding: "8px", background: "transparent", color: "#888", border: "none", cursor: "pointer", width: "100%" }}
              onClick={() => setReplaceTarget(null)}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Close Competition Section ── */}
      <div style={{ ...styles.card, marginTop: 40, border: "2px solid #d51332", textAlign: "center" }}>
        <h3 style={{ color: "#d51332", margin: "0 0 8px", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          ⚠️ Zone de clôture
        </h3>
        <p style={{ color: "#888", fontSize: "0.85rem", margin: "0 0 16px" }}>
          {data?.isClosed
            ? "Cette compétition est clôturée. Toutes les modifications sont bloquées."
            : "Une fois la compétition clôturée, plus aucune modification ne sera possible. Cette action nécessite une confirmation."}
        </p>
        <button style={{ ...styles.btn, padding: "14px 40px", fontSize: "1rem", background: data?.isClosed ? "#22c55e" : "#d51332", fontWeight: 700 }}
          onClick={() => data?.isClosed ? handleToggleClose() : setShowCloseModal(true)}>
          {data?.isClosed ? "🔓 Rouvrir la compétition" : "🔒 Clôturer la compétition"}
        </button>
      </div>

      {/* ── Close Confirmation Modal ── */}
      {showCloseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setShowCloseModal(false)}>
          <div style={{ background: "#1a0a0a", borderRadius: 16, padding: 32, maxWidth: 650, width: "95%", border: "2px solid #d51332", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: "3rem" }}>⚠️</span>
              <h2 style={{ color: "#d51332", margin: "8px 0 16px", fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Confirmation de clôture
              </h2>
            </div>

            {/* Arabic */}
            <div style={{ marginBottom: 20, padding: "16px 20px", background: "rgba(213,19,50,0.08)", borderRadius: 10, borderLeft: "3px solid #d51332" }}>
              <p style={{ color: "#d51332", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", fontWeight: 700 }}>العربية</p>
              <p style={{ color: "#fff", fontSize: "1.1rem", lineHeight: 1.8, margin: 0, direction: "rtl", textAlign: "right" }}>
                تحذير: أنت على وشك إغلاق هذه المسابقة نهائياً. بمجرد الإغلاق، لن تتمكن من تعديل أي نتائج أو مباريات أو تغيير أي بيانات. هذا الإجراء لا يمكن التراجع عنه بسهولة. يرجى التأكد من صحة جميع النتائج والمباريات قبل المتابعة.
              </p>
            </div>

            {/* French */}
            <div style={{ marginBottom: 20, padding: "16px 20px", background: "rgba(213,19,50,0.08)", borderRadius: 10, borderLeft: "3px solid #d51332" }}>
              <p style={{ color: "#d51332", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", fontWeight: 700 }}>Français</p>
              <p style={{ color: "#fff", fontSize: "1.05rem", lineHeight: 1.7, margin: 0 }}>
                Attention : Vous êtes sur le point de clôturer définitivement cette compétition. Une fois fermée, vous ne pourrez plus modifier les résultats, les matchs ou toute autre donnée. Cette action est difficilement réversible. Veuillez vous assurer que tous les résultats et matchs sont corrects avant de continuer.
              </p>
            </div>

            {/* English */}
            <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(213,19,50,0.08)", borderRadius: 10, borderLeft: "3px solid #d51332" }}>
              <p style={{ color: "#d51332", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", fontWeight: 700 }}>English</p>
              <p style={{ color: "#fff", fontSize: "1.05rem", lineHeight: 1.7, margin: 0 }}>
                Warning: You are about to permanently close this competition. Once closed, you will no longer be able to modify any results, matches, or data. This action is difficult to reverse. Please ensure all results and matches are correct before proceeding.
              </p>
            </div>

            {/* Confirmation buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button style={{ padding: "12px 32px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}
                onClick={() => setShowCloseModal(false)}>
                Annuler
              </button>
              <button style={{ padding: "12px 32px", background: "#d51332", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}
                onClick={() => { setShowCloseModal(false); handleToggleClose(); }}>
                Je confirme — Clôturer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const pageBg: React.CSSProperties = {
  background: "#0a0a0a",
  color: "#fff",
  minHeight: "100vh",
  fontFamily: "sans-serif",
};

const styles = {
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
  } as React.CSSProperties,
  title: {
    fontSize: "1.5rem",
    margin: "0 0 4px",
    color: "#d51332",
  } as React.CSSProperties,
  subtitle: {
    color: "#888",
    margin: "0 0 24px",
    fontSize: "0.9rem",
  } as React.CSSProperties,
  card: {
    background: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    border: "1px solid #333",
  } as React.CSSProperties,
  sectionTitle: {
    margin: "0 0 16px",
    fontSize: "1rem",
    color: "#e4c328",
  } as React.CSSProperties,
  divisionTitle: {
    color: "#d51332",
    fontSize: "0.9rem",
    margin: "0 0 8px",
  } as React.CSSProperties,
  matBadge: {
    padding: "8px 16px",
    background: "#222",
    borderRadius: 8,
    fontSize: "0.85rem",
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.85rem",
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    borderBottom: "1px solid #333",
    color: "#888",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    fontWeight: 600,
  } as React.CSSProperties,
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #222",
  } as React.CSSProperties,
  input: {
    background: "#222",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: "0.85rem",
    width: 70,
  } as React.CSSProperties,
  btn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.75rem",
    background: "#d51332",
    color: "#fff",
  } as React.CSSProperties,
};

// ── Helper: compute medals (gold, silver, bronze) for a category ──
function computeMedals(catMatches: any[]): { gold: { athleteName: string; clubName: string } | null; silver: { athleteName: string; clubName: string } | null; bronze: { athleteName: string; clubName: string }[] } {
  if (!catMatches || catMatches.length === 0) return { gold: null, silver: null, bronze: [] };

  // Find the highest round (the final)
  const maxRound = Math.max(...catMatches.map(m => m.round || 1));
  const finalMatch = catMatches.find(m => (m.round || 1) === maxRound);

  const getName = (corner: any) => corner ? `${corner.firstName || ""} ${corner.lastName || ""}`.trim() || null : null;
  const getClub = (corner: any) => corner?.club?.name || null;

  let gold: { athleteName: string; clubName: string } | null = null;
  let silver: { athleteName: string; clubName: string } | null = null;
  const bronze: { athleteName: string; clubName: string }[] = [];

  if (finalMatch) {
    if (finalMatch.status === 'FINISHED' && finalMatch.winnerSide) {
      const winner = finalMatch.winnerSide === 'red' ? finalMatch.redCorner : finalMatch.blueCorner;
      const loser = finalMatch.winnerSide === 'red' ? finalMatch.blueCorner : finalMatch.redCorner;
      const wn = getName(winner);
      const ln = getName(loser);
      gold = wn ? { athleteName: wn, clubName: getClub(winner) } : null;
      silver = ln ? { athleteName: ln, clubName: getClub(loser) } : null;
    }
  }

  // If only 2 athletes total (1 match = the final), no bronze
  if (maxRound <= 1) return { gold, silver, bronze };

  // Semi-final matches are at maxRound - 1
  const semiMatches = catMatches.filter(m => (m.round || 1) === maxRound - 1);
  for (const sm of semiMatches) {
    if (sm.status === 'FINISHED' && sm.winnerSide) {
      const loser = sm.winnerSide === 'red' ? sm.blueCorner : sm.redCorner;
      const ln = getName(loser);
      if (ln) bronze.push({ athleteName: ln, clubName: getClub(loser) });
    }
  }

  return { gold, silver, bronze };
}
