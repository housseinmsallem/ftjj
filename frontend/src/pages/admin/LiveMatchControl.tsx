import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import type { Match, Competition } from "../../types";

// ──────────────────────────────────────
// WebSocket
// ──────────────────────────────────────

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

let globalSocket: Socket | null = null;
function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL);
  }
  return globalSocket;
}

// ──────────────────────────────────────
// Styles partagés
// ──────────────────────────────────────

const selectStyle: React.CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: "0.9rem",
};

const scoreBtnStyle: React.CSSProperties = {
  minWidth: 40,
  minHeight: 40,
  fontSize: "1.2rem",
  fontWeight: 700,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "#ffffff10",
  color: "var(--text)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const filterPillStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 16px",
  borderRadius: 20,
  cursor: "pointer",
  fontWeight: active ? 700 : 500,
  background: active ? "var(--red)" : "transparent",
  color: active ? "#fff" : "var(--text)",
  border: `1px solid ${active ? "var(--red)" : "var(--border)"}`,
  fontSize: "0.85rem",
});

// ──────────────────────────────────────
// Types internes
// ──────────────────────────────────────

type StatusFilter = "ALL" | "UPCOMING" | "LIVE" | "FINISHED";

interface ScoreState {
  redScore: number;
  blueScore: number;
  warningsRed: number;
  penaltiesRed: number;
  warningsBlue: number;
  penaltiesBlue: number;
}

interface FinishForm {
  winnerSide: "RED" | "BLUE" | "DRAW";
  winMethod: string;
}

// ──────────────────────────────────────
// Composant principal
// ──────────────────────────────────────

export default function LiveMatchControl(): React.ReactElement {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [competitionFilter, setCompetitionFilter] = useState<string>("");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [finishTarget, setFinishTarget] = useState<Match | null>(null);
  const [finishForm, setFinishForm] = useState<FinishForm>({
    winnerSide: "RED",
    winMethod: "POINTS",
  });

  // Score states keyed by match id
  const [scoreStates, setScoreStates] = useState<Record<string, ScoreState>>(
    {},
  );

  const socket = getSocket();

  // ──────────────────────────────────────
  // Fetch data
  // ──────────────────────────────────────

  const {
    data: matchesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["matches", competitionFilter],
    queryFn: async () => {
      const params: any = {};
      if (competitionFilter) params.competitionId = competitionFilter;
      const res = await api.get("/matches", { params });
      return (((res.data as any)?.data ?? res.data) as Match[]) || [];
    },
  });

  const { data: competitionsData } = useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const res = await api.get("/competitions");
      return (((res.data as any)?.data ?? res.data) as Competition[]) || [];
    },
  });

  const matches = matchesData || [];
  const competitions = competitionsData || [];

  const filtered = matches.filter((m) => {
    if (statusFilter === "ALL") return true;
    return m.status === statusFilter;
  });

  // ──────────────────────────────────────
  // Sync score state from match data
  // ──────────────────────────────────────

  useEffect(() => {
    const map: Record<string, ScoreState> = {};
    matches.forEach((m) => {
      map[m._id || m.id || ""] = {
        redScore: m.redScore ?? 0,
        blueScore: m.blueScore ?? 0,
        warningsRed: m.warningsRed ?? 0,
        penaltiesRed: m.penaltiesRed ?? 0,
        warningsBlue: m.warningsBlue ?? 0,
        penaltiesBlue: m.penaltiesBlue ?? 0,
      };
    });
    setScoreStates((prev) => ({ ...prev, ...map }));
  }, [matches]);

  // ──────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────

  const startMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/matches/${id}/status`, { status: "LIVE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match démarré");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id, ...score }: { id: string } & ScoreState) =>
      api.patch(`/matches/${id}/score`, score),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      // Broadcast via WebSocket
      socket.emit("match:update", {
        matchId: variables.id,
        redScore: variables.redScore,
        blueScore: variables.blueScore,
        warningsRed: variables.warningsRed,
        penaltiesRed: variables.penaltiesRed,
        warningsBlue: variables.warningsBlue,
        penaltiesBlue: variables.penaltiesBlue,
      });
      toast.success("Score mis à jour");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  const finishMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & FinishForm) =>
      api.post(`/matches/${id}/finish`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match terminé");
      setFinishTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  // ──────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────

  function getMatchId(m: Match): string {
    return m._id || m.id || "";
  }

  function getAthleteName(
    person: Match["redCorner"] | Match["blueCorner"],
  ): string {
    if (!person) return "—";
    if (person.firstName && person.lastName)
      return `${person.firstName} ${person.lastName}`;
    return person.firstName || person.lastName || "—";
  }

  function getClubName(
    person: Match["redCorner"] | Match["blueCorner"],
  ): string {
    return person?.club?.name || person?.club?.shortName || "";
  }

  function getScore(matchId: string): ScoreState {
    return (
      scoreStates[matchId] || {
        redScore: 0,
        blueScore: 0,
        warningsRed: 0,
        penaltiesRed: 0,
        warningsBlue: 0,
        penaltiesBlue: 0,
      }
    );
  }

  function updateScore(matchId: string, key: keyof ScoreState, delta: number) {
    setScoreStates((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {
          redScore: 0,
          blueScore: 0,
          warningsRed: 0,
          penaltiesRed: 0,
          warningsBlue: 0,
          penaltiesBlue: 0,
        }),
        [key]: Math.max(0, (prev[matchId]?.[key] ?? 0) + delta),
      },
    }));
  }

  function openSpectatorWindow(matchId: string) {
    window.open(`/spectator/${matchId}`, "_blank", "width=1200,height=800");
  }

  function getStatusFilterLabel(f: StatusFilter): string {
    const labels: Record<StatusFilter, string> = {
      ALL: "Tous",
      UPCOMING: "À venir",
      LIVE: "En direct",
      FINISHED: "Terminés",
    };
    return labels[f];
  }

  // ──────────────────────────────────────
  // Rendu
  // ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des matchs..." />
      </div>
    );
  }

  if (isError && !matchesData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les matchs"
          }
          action={
            <button className="btn primary" onClick={() => refetch()}>
              Réessayer
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Matchs en direct"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Matchs en direct" },
        ]}
      />

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Competition filter */}
        <select
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Toutes les compétitions</option>
          {competitions.map((c) => (
            <option key={c._id || c.id} value={c._id || c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Status filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["ALL", "UPCOMING", "LIVE", "FINISHED"] as StatusFilter[]).map(
            (f) => (
              <span
                key={f}
                style={filterPillStyle(statusFilter === f)}
                onClick={() => setStatusFilter(f)}
              >
                {getStatusFilterLabel(f)}
              </span>
            ),
          )}
        </div>
      </div>

      {/* Matches table */}
      {filtered.length === 0 ? (
        <div className="table-card">
          <EmptyState
            title="Aucun match"
            description="Aucun match ne correspond aux filtres sélectionnés"
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Tatami</th>
                  <th>Rouge</th>
                  <th>Bleu</th>
                  <th>Score</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((match) => {
                  const id = getMatchId(match);
                  const isExpanded = expandedMatchId === id;
                  const isLive = match.status === "LIVE";
                  const isUpcoming = match.status === "UPCOMING";
                  const score = getScore(id);

                  return (
                    <React.Fragment key={id}>
                      <tr
                        style={{
                          cursor: isLive ? "pointer" : "default",
                          background: isLive ? "#d5133208" : undefined,
                        }}
                        onClick={() => {
                          if (isLive) {
                            setExpandedMatchId(isExpanded ? null : id);
                          }
                        }}
                      >
                        <td style={{ fontWeight: 700 }}>
                          {match.matNumber ?? "—"}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {getAthleteName(match.redCorner)}
                          </div>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>
                            {getClubName(match.redCorner)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {getAthleteName(match.blueCorner)}
                          </div>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>
                            {getClubName(match.blueCorner)}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                            {score.redScore} - {score.blueScore}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={match.status} />
                        </td>
                        <td>
                          <div className="row-actions" style={{ gap: 6 }}>
                            {isUpcoming && (
                              <button
                                className="btn primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startMutation.mutate(id);
                                }}
                                disabled={startMutation.isPending}
                              >
                                Démarrer
                              </button>
                            )}
                            {isLive && (
                              <>
                                <button
                                  className="btn"
                                  style={{
                                    background: "#d51332",
                                    color: "#fff",
                                    borderColor: "#d51332",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFinishTarget(match);
                                    setFinishForm({
                                      winnerSide: "RED",
                                      winMethod: "POINTS",
                                    });
                                  }}
                                >
                                  Terminer
                                </button>
                              </>
                            )}
                            <button
                              className="btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSpectatorWindow(id);
                              }}
                            >
                              Fenêtre spectateur
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded scoring panel */}
                      {isExpanded && isLive && (
                        <tr key={`${id}-score-panel`}>
                          <td colSpan={6} style={{ padding: "16px 20px" }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                              }}
                            >
                              {/* RED PANEL */}
                              <div
                                className="card"
                                style={{
                                  padding: 20,
                                  background: "#d5133215",
                                  border: "1px solid #d5133230",
                                  borderRadius: 12,
                                }}
                              >
                                <h4
                                  style={{
                                    margin: "0 0 16px",
                                    color: "#d51332",
                                  }}
                                >
                                  🔴 {getAthleteName(match.redCorner)}
                                </h4>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 16,
                                  }}
                                >
                                  {/* Score */}
                                  <div>
                                    <label
                                      className="muted"
                                      style={{
                                        fontSize: "0.8rem",
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Score
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "redScore", -1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span
                                        style={{
                                          fontSize: "1.6rem",
                                          fontWeight: 700,
                                          minWidth: 40,
                                          textAlign: "center",
                                        }}
                                      >
                                        {score.redScore}
                                      </span>
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "redScore", 1)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  {/* Penalties */}
                                  <div>
                                    <label
                                      className="muted"
                                      style={{
                                        fontSize: "0.8rem",
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Pénalités
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "penaltiesRed", -1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span
                                        style={{
                                          fontSize: "1.3rem",
                                          fontWeight: 700,
                                          minWidth: 40,
                                          textAlign: "center",
                                        }}
                                      >
                                        {score.penaltiesRed}
                                      </span>
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "penaltiesRed", 1)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  {/* Warnings */}
                                  <div>
                                    <label
                                      className="muted"
                                      style={{
                                        fontSize: "0.8rem",
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Avertissements
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "warningsRed", -1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span
                                        style={{
                                          fontSize: "1.3rem",
                                          fontWeight: 700,
                                          minWidth: 40,
                                          textAlign: "center",
                                        }}
                                      >
                                        {score.warningsRed}
                                      </span>
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "warningsRed", 1)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* BLUE PANEL */}
                              <div
                                className="card"
                                style={{
                                  padding: 20,
                                  background: "#2563eb15",
                                  border: "1px solid #2563eb30",
                                  borderRadius: 12,
                                }}
                              >
                                <h4
                                  style={{
                                    margin: "0 0 16px",
                                    color: "#2563eb",
                                  }}
                                >
                                  🔵 {getAthleteName(match.blueCorner)}
                                </h4>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 16,
                                  }}
                                >
                                  {/* Score */}
                                  <div>
                                    <label
                                      className="muted"
                                      style={{
                                        fontSize: "0.8rem",
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Score
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "blueScore", -1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span
                                        style={{
                                          fontSize: "1.6rem",
                                          fontWeight: 700,
                                          minWidth: 40,
                                          textAlign: "center",
                                        }}
                                      >
                                        {score.blueScore}
                                      </span>
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "blueScore", 1)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  {/* Penalties */}
                                  <div>
                                    <label
                                      className="muted"
                                      style={{
                                        fontSize: "0.8rem",
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Pénalités
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "penaltiesBlue", -1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span
                                        style={{
                                          fontSize: "1.3rem",
                                          fontWeight: 700,
                                          minWidth: 40,
                                          textAlign: "center",
                                        }}
                                      >
                                        {score.penaltiesBlue}
                                      </span>
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "penaltiesBlue", 1)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  {/* Warnings */}
                                  <div>
                                    <label
                                      className="muted"
                                      style={{
                                        fontSize: "0.8rem",
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Avertissements
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "warningsBlue", -1)
                                        }
                                      >
                                        −
                                      </button>
                                      <span
                                        style={{
                                          fontSize: "1.3rem",
                                          fontWeight: 700,
                                          minWidth: 40,
                                          textAlign: "center",
                                        }}
                                      >
                                        {score.warningsBlue}
                                      </span>
                                      <button
                                        type="button"
                                        style={scoreBtnStyle}
                                        onClick={() =>
                                          updateScore(id, "warningsBlue", 1)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Update button */}
                            <div
                              style={{
                                marginTop: 16,
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                className="btn primary"
                                onClick={() =>
                                  scoreMutation.mutate({
                                    id,
                                    ...score,
                                  })
                                }
                                disabled={scoreMutation.isPending}
                              >
                                {scoreMutation.isPending
                                  ? "Mise à jour..."
                                  : "Mettre à jour"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Finish match modal */}
      {finishTarget && (
        <div className="modal-overlay" onClick={() => setFinishTarget(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 450 }}
          >
            <h3>Terminer le match</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              {getAthleteName(finishTarget.redCorner)} vs{" "}
              {getAthleteName(finishTarget.blueCorner)}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label className="field-label">
                Vainqueur
                <select
                  value={finishForm.winnerSide}
                  onChange={(e) =>
                    setFinishForm({
                      ...finishForm,
                      winnerSide: e.target.value as FinishForm["winnerSide"],
                    })
                  }
                  style={{ ...selectStyle, width: "100%", marginTop: 4 }}
                >
                  <option value="RED">Rouge</option>
                  <option value="BLUE">Bleu</option>
                  <option value="DRAW">Égalité</option>
                </select>
              </label>

              <label className="field-label">
                Méthode de victoire
                <select
                  value={finishForm.winMethod}
                  onChange={(e) =>
                    setFinishForm({ ...finishForm, winMethod: e.target.value })
                  }
                  style={{ ...selectStyle, width: "100%", marginTop: 4 }}
                >
                  <option value="POINTS">Points</option>
                  <option value="SUBMISSION">Soumission</option>
                  <option value="DECISION">Décision</option>
                  <option value="FORFEIT">Forfait</option>
                  <option value="DISQUALIFICATION">Disqualification</option>
                </select>
              </label>
            </div>

            <div
              className="modal-actions"
              style={{
                marginTop: 20,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button className="btn" onClick={() => setFinishTarget(null)}>
                Annuler
              </button>
              <button
                className="btn primary"
                style={{
                  background: "#d51332",
                  borderColor: "#d51332",
                  color: "#fff",
                }}
                onClick={() =>
                  finishMutation.mutate({
                    id: getMatchId(finishTarget),
                    ...finishForm,
                  })
                }
                disabled={finishMutation.isPending}
              >
                {finishMutation.isPending
                  ? "Enregistrement..."
                  : "Terminer le match"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs are not needed here but keep pattern consistent */}
    </div>
  );
}
