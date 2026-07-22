import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { getAgeDivisionLabel } from "../utils/formOptions";

function computeMedals(catMatches: any[]): { gold: { athleteName: string; clubName: string } | null; silver: { athleteName: string; clubName: string } | null; bronze: { athleteName: string; clubName: string }[] } {
  if (!catMatches || catMatches.length === 0) return { gold: null, silver: null, bronze: [] };
  const maxRound = Math.max(...catMatches.map(m => m.round || 1));
  const finalMatch = catMatches.find(m => (m.round || 1) === maxRound);
  const getName = (corner: any) => corner ? `${corner.firstName || ""} ${corner.lastName || ""}`.trim() || null : null;
  const getClub = (corner: any) => corner?.club?.name || null;
  let gold: { athleteName: string; clubName: string } | null = null;
  let silver: { athleteName: string; clubName: string } | null = null;
  const bronze: { athleteName: string; clubName: string }[] = [];
  if (finalMatch && finalMatch.status === 'FINISHED' && finalMatch.winnerSide) {
    const winner = finalMatch.winnerSide === 'red' ? finalMatch.redCorner : finalMatch.blueCorner;
    const loser = finalMatch.winnerSide === 'red' ? finalMatch.blueCorner : finalMatch.redCorner;
    gold = { athleteName: getName(winner), clubName: getClub(winner) };
    silver = { athleteName: getName(loser), clubName: getClub(loser) };
  }
  if (maxRound > 1) {
    const semiMatches = catMatches.filter(m => (m.round || 1) === maxRound - 1);
    for (const sm of semiMatches) {
      if (sm.status === 'FINISHED' && sm.winnerSide) {
        const loser = sm.winnerSide === 'red' ? sm.blueCorner : sm.redCorner;
        bronze.push({ athleteName: getName(loser), clubName: getClub(loser) });
      }
    }
  }
  return { gold, silver, bronze };
}

export default function CompetitionDetail(): React.ReactElement {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"athletes" | "brackets">("brackets");

  useEffect(() => {
    if (!competitionId) return;
    api.get(`/public/competitions/${competitionId}`)
      .then(r => setData(r.data?.data || r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [competitionId]);

  if (loading) return <div className="public-page-shell"><div className="section-inner"><p style={{ textAlign: "center", padding: "3rem" }}>Chargement...</p></div></div>;
  if (!data) return <div className="public-page-shell"><div className="section-inner"><p style={{ textAlign: "center", padding: "3rem" }}>Compétition introuvable.</p></div></div>;

  const brackets = data.brackets;
  const categoryMatches = data.categoryMatches || {};

  return (
    <div className="public-page-shell">
      <section className="public-section">
        <div className="section-inner">
          <div style={{ marginBottom: 24 }}>
            {data.posterUrl && <img src={data.posterUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 16, marginBottom: 16 }} />}
            <h1 style={{ fontSize: "1.8rem", margin: "0 0 8px" }}>{data.name}</h1>
            <p style={{ color: "var(--muted)" }}>
              {new Date(data.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {data.location && ` · 📍 ${data.location}`}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <span className="feature-chip">{data.type || "Open"}</span>
              {(data.ageDivisions || []).map((d: string) => (<span key={d} className="feature-chip">{getAgeDivisionLabel(d)}</span>))}
              <span className="feature-chip">{data.splitByBelt ? "Par ceinture" : "Toutes ceintures"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
            <button onClick={() => setTab("brackets")} style={{ padding: "10px 20px", border: "none", background: "transparent", color: tab === "brackets" ? "var(--red)" : "var(--muted)", fontWeight: tab === "brackets" ? 700 : 500, borderBottom: tab === "brackets" ? "2px solid var(--red)" : "2px solid transparent", cursor: "pointer" }}>🏆 Brackets & Matchs</button>
            <button onClick={() => setTab("athletes")} style={{ padding: "10px 20px", border: "none", background: "transparent", color: tab === "athletes" ? "var(--red)" : "var(--muted)", fontWeight: tab === "athletes" ? 700 : 500, borderBottom: tab === "athletes" ? "2px solid var(--red)" : "2px solid transparent", cursor: "pointer" }}>📋 Athlètes ({data.signups?.length || 0})</button>
          </div>

          {tab === "athletes" && (
            <div className="table-wrap">
              <table className="smart-table">
                <thead><tr><th>Nom</th><th>Club</th><th>Grade</th><th>Poids</th></tr></thead>
                <tbody>{(data.signups || []).map((s: any) => (
                  <tr key={s.id}><td>{s.person?.firstName} {s.person?.lastName}</td><td>{s.person?.club?.name || "—"}</td><td>{s.person?.athleteDetails?.grade || "—"}</td><td>{s.weight ?? s.person?.athleteDetails?.weight ? `${s.weight ?? s.person?.athleteDetails?.weight} kg` : "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab === "brackets" && brackets?.categories && (
            <div>
              {brackets.promotedAthletes > 0 && (
                <p style={{ color: "#b8860b", fontSize: "0.8rem", margin: "0 0 16px", fontStyle: "italic" }}>
                  ℹ️ {brackets.promotedAthletes} athlète(s) promu(s) vers une catégorie supérieure
                </p>
              )}
              {brackets.categories.filter((cat: any) => cat.athletes.length > 0).map((cat: any, catIdx: number) => {
                const catMatches = categoryMatches[cat.name] || [];
                if (cat.athletes.length === 0 && catMatches.length === 0) return null;

                // Group matches by round
                const byRound: Record<number, any[]> = {};
                for (const m of catMatches) {
                  const r = m.round || 1;
                  if (!byRound[r]) byRound[r] = [];
                  byRound[r].push(m);
                }
                const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

                // ── Absolute positioning for bracket tree ──
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
                      const prevA = positions[prevMatches[j * 2]?.id || prevMatches[j * 2]?._id || `r${rounds[ri - 1]}j${j * 2}`];
                      const prevB = prevMatches[j * 2 + 1] ? positions[prevMatches[j * 2 + 1]?.id || prevMatches[j * 2 + 1]?._id || `r${rounds[ri - 1]}j${j * 2 + 1}`] : null;
                      const yCenter = prevB
                        ? (prevA.y + CARD_H / 2 + prevB.y + CARD_H / 2) / 2
                        : prevA.y + CARD_H / 2;
                      positions[rMatches[j].id || rMatches[j]._id || `r${round}j${j}`] = {
                        x, y: yCenter - CARD_H / 2, w: CARD_W, h: CARD_H,
                      };
                    }
                  }
                }

                // ── SVG connectors between rounds ──
                const connectors: { x1: number; y1: number; x2: number; y2: number }[] = [];
                for (let ri = 1; ri < rounds.length; ri++) {
                  const prevMatches = byRound[rounds[ri - 1]].sort((a: any, b: any) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                  const currMatches = byRound[rounds[ri]].sort((a: any, b: any) => (a.bracketPosition || 1) - (b.bracketPosition || 1));
                  for (let j = 0; j < currMatches.length; j++) {
                    const prevA = positions[prevMatches[j * 2]?.id || prevMatches[j * 2]?._id || `r${rounds[ri - 1]}j${j * 2}`];
                    const prevB = prevMatches[j * 2 + 1]
                      ? positions[prevMatches[j * 2 + 1]?.id || prevMatches[j * 2 + 1]?._id || `r${rounds[ri - 1]}j${j * 2 + 1}`]
                      : null;
                    const curr = positions[currMatches[j]?.id || currMatches[j]?._id || `r${rounds[ri]}j${j}`];
                    if (!curr) continue;
                    const cx = prevA.x + CARD_W + (curr.x - prevA.x - CARD_W) / 2;
                    // Horizontal: prevA → center
                    connectors.push({ x1: prevA.x + CARD_W, y1: prevA.y + CARD_H / 2, x2: cx, y2: prevA.y + CARD_H / 2 });
                    if (prevB) {
                      // Horizontal: prevB → center
                      connectors.push({ x1: prevB.x + CARD_W, y1: prevB.y + CARD_H / 2, x2: cx, y2: prevB.y + CARD_H / 2 });
                      // Vertical: center connecting prevA and prevB
                      connectors.push({ x1: cx, y1: prevA.y + CARD_H / 2, x2: cx, y2: prevB.y + CARD_H / 2 });
                    }
                    // Horizontal: center → curr
                    connectors.push({ x1: cx, y1: curr.y + CARD_H / 2, x2: curr.x, y2: curr.y + CARD_H / 2 });
                  }
                }

                const svgW = rounds.length * (CARD_W + ROUND_GAP) - ROUND_GAP;

                // ── Medals (read-only) ──
                const medals = computeMedals(catMatches);

                return (
                  <div key={catIdx} style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid var(--border, #e5e7eb)" }}>
                    {/* Category header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                      <div>
                        <span style={{ color: "var(--red, #d51332)", fontWeight: 700, fontSize: "1rem" }}>{cat.name}</span>
                        <span style={{ color: "var(--muted)", marginLeft: 10, fontSize: "0.85rem" }}>
                          {cat.athletes.length} athlètes · {catMatches.length} matchs
                        </span>
                      </div>
                      {catMatches.length === 0 && (
                        <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Matchs non encore générés</span>
                      )}
                    </div>

                    {/* Bracket Tree */}
                    {catMatches.length > 0 ? (
                      <div style={{ position: "relative", overflowX: "auto" }}>
                        <div style={{ position: "relative", width: svgW, height: totalH + 20, minHeight: 200 }}>
                          {/* SVG connector lines */}
                          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "visible" }}>
                            {connectors.map((c, ci) => (
                              <line key={ci} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#9ca3af" strokeWidth="1.5" />
                            ))}
                          </svg>

                          {/* Round labels */}
                          {rounds.map((round, ri) => (
                            <div key={round} style={{
                              position: "absolute", top: 0, left: ri * (CARD_W + ROUND_GAP), width: CARD_W,
                              color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase",
                              letterSpacing: "0.1em", textAlign: "center", fontWeight: 700,
                              height: ROUND_LABEL_H, lineHeight: `${ROUND_LABEL_H}px`,
                            }}>
                              {round === 1 ? "Premier tour" : round === 2 ? "Demi-finales" : round === 3 ? "Finale" : `Round ${round}`}
                            </div>
                          ))}

                          {/* Match cards */}
                          {catMatches.map((m: any) => {
                            const posKey = m.id || m._id || `r${m.round}j${(m.bracketPosition || 1) - 1}`;
                            const pos = positions[posKey];
                            if (!pos) return null;
                            const isLive = m.status === "LIVE";
                            const isFinished = m.status === "FINISHED";
                            return (
                              <div
                                key={posKey}
                                style={{
                                  position: "absolute", left: pos.x, top: pos.y, width: pos.w, zIndex: 1,
                                  background: isLive ? "rgba(213,19,50,0.06)" : isFinished ? "rgba(34,197,94,0.04)" : "var(--bg, #fff)",
                                  border: `1px solid ${isLive ? "#d51332" : isFinished ? "#22c55e" : "var(--border, #e5e7eb)"}`,
                                  borderRadius: 10, padding: "10px 12px",
                                }}
                              >
                                {/* Red corner */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                  <span style={{
                                    fontWeight: m.winnerSide === "red" ? 700 : 400,
                                    color: m.winnerSide === "red" ? "#d51332" : "var(--text)",
                                    fontSize: "0.8rem", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>
                                    {m.redCorner ? `${m.redCorner.firstName || ""} ${m.redCorner.lastName || ""}`.trim() || "—" : "À déterminer"}
                                  </span>
                                  <span style={{ color: "#d51332", fontWeight: 700, fontSize: "0.9rem" }}>{m.redScore ?? 0}</span>
                                </div>
                                {/* Blue corner */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{
                                    fontWeight: m.winnerSide === "blue" ? 700 : 400,
                                    color: m.winnerSide === "blue" ? "#3b82f6" : "var(--text)",
                                    fontSize: "0.8rem", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>
                                    {m.blueCorner ? `${m.blueCorner.firstName || ""} ${m.blueCorner.lastName || ""}`.trim() || "—" : "À déterminer"}
                                  </span>
                                  <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: "0.9rem" }}>{m.blueScore ?? 0}</span>
                                </div>
                                {/* Footer: mat + status */}
                                <div style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border, #e5e7eb)",
                                  fontSize: "0.65rem", color: "var(--muted)",
                                }}>
                                  <span>{m.mat?.name || "—"}</span>
                                  <span style={{ color: isLive ? "#d51332" : isFinished ? "#22c55e" : "var(--muted)", fontWeight: 600 }}>
                                    {isLive ? "🔴 LIVE" : isFinished ? "✅ Terminé" : "À venir"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>
                        Aucun match généré pour cette catégorie.
                      </p>
                    )}

                    {/* Podium / Medals */}
                    {(medals.gold || medals.silver || medals.bronze.length > 0) && (
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px solid #e4c328" }}>
                        <div style={{ color: "#b8860b", fontWeight: 700, fontSize: "0.85rem", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          🏅 Podium
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #fff8e1, #ffecb3)", border: "1px solid #e4c328", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥇</div>
                            <div style={{ color: "#8b6914", fontWeight: 800, fontSize: "0.85rem" }}>{medals.gold?.athleteName || "—"}</div>
                            {medals.gold?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.gold.clubName}</div>}
                          </div>
                          <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #f5f5f5, #e0e0e0)", border: "1px solid #aaa", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥈</div>
                            <div style={{ color: "#555", fontWeight: 800, fontSize: "0.85rem" }}>{medals.silver?.athleteName || "—"}</div>
                            {medals.silver?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.silver.clubName}</div>}
                          </div>
                          <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #fdf2e9, #f5cba7)", border: "1px solid #cd7f32", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥉</div>
                            <div style={{ color: "#8b5e3c", fontWeight: 800, fontSize: "0.85rem" }}>{medals.bronze[0]?.athleteName || "—"}</div>
                            {medals.bronze[0]?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.bronze[0].clubName}</div>}
                          </div>
                          <div style={{ flex: "1 1 140px", background: "linear-gradient(135deg, #fdf2e9, #f5cba7)", border: "1px solid #cd7f32", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🥉</div>
                            <div style={{ color: "#8b5e3c", fontWeight: 800, fontSize: "0.85rem" }}>{medals.bronze[1]?.athleteName || "—"}</div>
                            {medals.bronze[1]?.clubName && <div style={{ color: "#999", fontSize: "0.7rem", marginTop: 2 }}>{medals.bronze[1].clubName}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
