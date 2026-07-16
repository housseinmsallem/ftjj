import React, { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import type { ScoringSession, ScoreState } from "../../types";

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
// Styles
// ──────────────────────────────────────

const scoreBtnStyle: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
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

type SessionStatus = "ALL" | "IDLE" | "RUNNING" | "PAUSED" | "FINISHED";

// ──────────────────────────────────────
// Composant
// ──────────────────────────────────────

export default function ScoringControl(): React.ReactElement {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SessionStatus>("ALL");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  const socket = getSocket();

  const {
    data: sessionsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["scoring", "sessions"],
    queryFn: async () => {
      const res = await api.get("/scoring/sessions");
      return (((res.data as any)?.data ?? res.data) as ScoringSession[]) || [];
    },
  });

  const sessions = sessionsData || [];

  const filteredSessions =
    statusFilter === "ALL"
      ? sessions
      : sessions.filter((s) => s.status === statusFilter);

  // ─── Mutations ───

  const startMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.patch(`/scoring/sessions/${sessionId}`, { action: "start" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring", "sessions"] });
      toast.success("Session démarrée");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors du démarrage");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.patch(`/scoring/sessions/${sessionId}`, { action: "pause" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring", "sessions"] });
      toast.success("Session mise en pause");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la pause");
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.patch(`/scoring/sessions/${sessionId}`, { action: "resume" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring", "sessions"] });
      toast.success("Session reprise");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors de la reprise");
    },
  });

  const scoreActionMutation = useMutation({
    mutationFn: (params: {
      sessionId: string;
      action: {
        side: "red" | "blue";
        type: string;
        value?: number;
        reason?: string;
      };
    }) =>
      api.post(`/scoring/sessions/${params.sessionId}/score`, params.action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring", "sessions"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'action de score",
      );
    },
  });

  // ─── Socket listeners ───

  const handleSessionUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["scoring", "sessions"] });
  }, [queryClient]);

  useEffect(() => {
    socket.on("session-updated", handleSessionUpdate);
    socket.on("score-updated", handleSessionUpdate);
    return () => {
      socket.off("session-updated", handleSessionUpdate);
      socket.off("score-updated", handleSessionUpdate);
    };
  }, [socket, handleSessionUpdate]);

  // ─── Helpers ───

  function getSessionId(session: ScoringSession): string {
    return session._id || (session as any).id || "";
  }

  function getAthleteName(
    side: "red" | "blue",
    session: ScoringSession,
  ): string {
    const athlete =
      side === "red" ? session.fight?.redAthlete : session.fight?.blueAthlete;
    if (athlete?.firstName && athlete?.lastName) {
      return `${athlete.firstName} ${athlete.lastName}`;
    }
    return side === "red" ? "Rouge" : "Bleu";
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ALL: "Toutes",
      IDLE: "En attente",
      RUNNING: "En cours",
      PAUSED: "En pause",
      FINISHED: "Terminé",
    };
    return labels[status] || status;
  }

  // ─── Rendu ───

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des sessions de scoring..." />
      </div>
    );
  }

  if (isError && !sessionsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message ||
            "Impossible de charger les sessions de scoring"
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
        title="Contrôle scoring"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Contrôle scoring" },
        ]}
      />

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {(
          ["ALL", "IDLE", "RUNNING", "PAUSED", "FINISHED"] as SessionStatus[]
        ).map((s) => (
          <button
            key={s}
            style={filterPillStyle(statusFilter === s)}
            onClick={() => setStatusFilter(s)}
          >
            {getStatusLabel(s)}
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <EmptyState
          title="Aucune session"
          description={`Aucune session ${statusFilter !== "ALL" ? getStatusLabel(statusFilter).toLowerCase() : ""} trouvée`}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredSessions.map((session) => {
            const sid = getSessionId(session);
            const isExpanded = expandedSessionId === sid;
            const isRunning = session.status === "RUNNING";
            const isPaused = session.status === "PAUSED";
            const isIdle = session.status === "IDLE";

            return (
              <div
                key={sid}
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedSessionId(isExpanded ? null : sid)}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <strong
                      style={{ color: "var(--text)", fontSize: "1.05rem" }}
                    >
                      {session.competition?.name || "Compétition"} —{" "}
                      {session.mat ? `Tapis ${session.mat}` : "—"}
                    </strong>
                    <div style={{ marginTop: 4 }}>
                      <StatusBadge status={session.status} />
                      {session.discipline && (
                        <span className="muted" style={{ marginLeft: 8 }}>
                          {session.discipline} — {session.category || "—"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isIdle && (
                      <button
                        className="btn primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          startMutation.mutate(sid);
                        }}
                        disabled={startMutation.isPending}
                      >
                        Démarrer
                      </button>
                    )}
                    {isRunning && (
                      <button
                        className="btn ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseMutation.mutate(sid);
                        }}
                        disabled={pauseMutation.isPending}
                      >
                        Pause
                      </button>
                    )}
                    {isPaused && (
                      <button
                        className="btn primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeMutation.mutate(sid);
                        }}
                        disabled={resumeMutation.isPending}
                      >
                        Reprendre
                      </button>
                    )}
                  </div>
                </div>

                {/* Timer */}
                {isRunning && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: "var(--red)",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTime(session.remainingSeconds)}
                  </div>
                )}

                {/* Expanded scoring controls */}
                {isExpanded && (isRunning || isPaused) && (
                  <div style={{ marginTop: 16 }}>
                    {/* Red Side */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 20,
                      }}
                    >
                      {/* Red corner */}
                      <div
                        style={{
                          padding: 16,
                          background: "#d5133220",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 12,
                            color: "var(--red)",
                            fontWeight: 700,
                          }}
                        >
                          {getAthleteName("red", session)}
                        </div>
                        <div
                          style={{
                            fontSize: "2rem",
                            fontWeight: 700,
                            marginBottom: 12,
                          }}
                        >
                          {session.red.score}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          <span
                            className="muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Avantages: {session.red.advantages}
                          </span>
                          <span
                            className="muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Pénalités: {session.red.penalties}
                          </span>
                          <span
                            className="muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Avertissements: {session.red.warnings}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          {[2, 3, 4].map((pts) => (
                            <button
                              key={`red-${pts}`}
                              style={scoreBtnStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                scoreActionMutation.mutate({
                                  sessionId: sid,
                                  action: {
                                    side: "red",
                                    type: "POINTS",
                                    value: pts,
                                  },
                                });
                              }}
                            >
                              +{pts}
                            </button>
                          ))}
                          <button
                            style={scoreBtnStyle}
                            onClick={(e) => {
                              e.stopPropagation();
                              scoreActionMutation.mutate({
                                sessionId: sid,
                                action: { side: "red", type: "ADVANTAGE" },
                              });
                            }}
                          >
                            Av
                          </button>
                          <button
                            style={{
                              ...scoreBtnStyle,
                              color: "#e4c328",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              scoreActionMutation.mutate({
                                sessionId: sid,
                                action: { side: "red", type: "PENALTY" },
                              });
                            }}
                          >
                            Pé
                          </button>
                        </div>
                      </div>

                      {/* Blue corner */}
                      <div
                        style={{
                          padding: 16,
                          background: "#3b82f620",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 12,
                            color: "#3b82f6",
                            fontWeight: 700,
                          }}
                        >
                          {getAthleteName("blue", session)}
                        </div>
                        <div
                          style={{
                            fontSize: "2rem",
                            fontWeight: 700,
                            marginBottom: 12,
                          }}
                        >
                          {session.blue.score}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          <span
                            className="muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Avantages: {session.blue.advantages}
                          </span>
                          <span
                            className="muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Pénalités: {session.blue.penalties}
                          </span>
                          <span
                            className="muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            Avertissements: {session.blue.warnings}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          {[2, 3, 4].map((pts) => (
                            <button
                              key={`blue-${pts}`}
                              style={scoreBtnStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                scoreActionMutation.mutate({
                                  sessionId: sid,
                                  action: {
                                    side: "blue",
                                    type: "POINTS",
                                    value: pts,
                                  },
                                });
                              }}
                            >
                              +{pts}
                            </button>
                          ))}
                          <button
                            style={scoreBtnStyle}
                            onClick={(e) => {
                              e.stopPropagation();
                              scoreActionMutation.mutate({
                                sessionId: sid,
                                action: { side: "blue", type: "ADVANTAGE" },
                              });
                            }}
                          >
                            Av
                          </button>
                          <button
                            style={{
                              ...scoreBtnStyle,
                              color: "#e4c328",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              scoreActionMutation.mutate({
                                sessionId: sid,
                                action: { side: "blue", type: "PENALTY" },
                              });
                            }}
                          >
                            Pé
                          </button>
                        </div>
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
  );
}
