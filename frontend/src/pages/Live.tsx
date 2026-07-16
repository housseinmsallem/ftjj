import React, { useEffect, useMemo, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { scoringApi } from "../services/api";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

interface SessionAthlete {
  firstName?: string;
  lastName?: string;
  name?: string;
  club?: { name?: string; shortName?: string } | string;
}

interface LiveSession {
  _id: string;
  status: string;
  timerState: string;
  remainingSeconds: number;
  winnerSide?: string | null;
  winMethod?: string | null;
  red: { score: number; advantages: number; penalties: number; warnings: number };
  blue: { score: number; advantages: number; penalties: number; warnings: number };
  fight?: {
    redAthlete?: SessionAthlete;
    blueAthlete?: SessionAthlete;
  };
  discipline?: string;
  category?: string;
  mat?: string;
  round?: string;
}

function athleteName(athlete: SessionAthlete | undefined): string {
  if (!athlete) return "Athlète FTJJ";
  return (
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() ||
    athlete.name ||
    "Athlète FTJJ"
  );
}

function clubName(club: SessionAthlete["club"]): string {
  if (!club) return "";
  return typeof club === "string" ? club : club.name || club.shortName || "";
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const winMethodLabels: Record<string, string> = {
  points: "Points",
  submission: "Soumission",
  decision: "Décision",
  forfeit: "Forfait",
  disqualification: "Disqualification",
  draw: "Égalité",
};

export default function Live(): React.ReactElement {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(): Promise<void> {
    try {
      const data = await scoringApi.listPublicSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + WebSocket
  useEffect(() => {
    load();
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("public:scoring:update", (updated: any) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (String(s._id) === String(updated.sessionId)) {
            return {
              ...s,
              status: updated.status,
              timerState: updated.timerState,
              remainingSeconds: updated.remainingSeconds,
              winnerSide: updated.winnerSide,
              winMethod: updated.winMethod,
              red: { ...s.red, score: updated.redScore },
              blue: { ...s.blue, score: updated.blueScore },
            };
          }
          return s;
        }),
      );
    });

    socket.on("scoring:sessionCreated", () => load());
    socket.on("scoring:validated", () => load());
    socket.on("dashboard:scoring:update", () => load());

    return () => {
      socket.removeAllListeners();
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  // Local countdown for live sessions
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessions((prev) =>
        prev.map((s) => {
          if (
            s.timerState === "running" &&
            s.status === "live" &&
            s.remainingSeconds > 0
          ) {
            return { ...s, remainingSeconds: s.remainingSeconds - 1 };
          }
          return s;
        }),
      );
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const liveSessions = useMemo(
    () => sessions.filter((s) => s.status === "live" || s.status === "paused"),
    [sessions],
  );

  const finishedSessions = useMemo(
    () =>
      sessions.filter(
        (s) => s.status === "finished" || s.status === "validated",
      ),
    [sessions],
  );

  const upcomingSessions = useMemo(
    () => sessions.filter((s) => s.status === "waiting"),
    [sessions],
  );

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-live">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Centre live FTJJ</p>
            <h1>Suivez les tatamis en temps réel</h1>
            <p className="hero-copy">
              Scores, chronomètre, avantages et pénalités — suivez chaque combat
              en direct avec les mises à jour instantanées.
            </p>
          </div>
          <div className="surface-card hero-aside">
            <p className="eyebrow">En direct</p>
            <h2>
              {liveSessions.length} combat{liveSessions.length !== 1 ? "s" : ""}{" "}
              en cours
            </h2>
            <p>
              {liveSessions.map((s) => s.mat || "Tatami").join(", ") ||
                "Aucun combat en cours"}
            </p>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          {loading && (
            <p className="text-center muted">Chargement des sessions...</p>
          )}

          {/* Live fights */}
          {liveSessions.length > 0 && (
            <div className="live-fights-section">
              <h2>🔴 En cours</h2>
              {liveSessions.map((session) => {
                const fight = session.fight || {};
                const isRedWinner = session.winnerSide === "red";
                const isBlueWinner = session.winnerSide === "blue";

                return (
                  <div key={session._id} className="live-fight-card card">
                    <div className="live-fight-header">
                      <span className="live-chip">
                        {session.mat || "Tatami"}
                      </span>
                      <span className="live-chip">
                        {session.discipline || "NEWAZA"}
                      </span>
                      <span className="live-chip live-status">
                        {session.timerState === "running"
                          ? "▶ LIVE"
                          : session.timerState === "paused"
                            ? "⏸ PAUSE"
                            : session.timerState === "doctor_time"
                              ? "🩺 MÉDECIN"
                              : session.timerState}
                      </span>
                    </div>

                    <section className="live-board public-live">
                      <div
                        className={`score-card red ${isRedWinner ? "winner" : ""}`}
                      >
                        <span>{athleteName(fight.redAthlete)}</span>
                        <strong>{session.red?.score || 0}</strong>
                        <div className="score-details">
                          <span>Av: {session.red?.advantages || 0}</span>
                          <span>Pén: {session.red?.penalties || 0}</span>
                          {(session.red?.warnings || 0) > 0 && (
                            <span className="warning-indicator">
                              ⚠ {session.red.warnings}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="timer-card">
                        <span>{session.mat || "Tatami"}</span>
                        <strong
                          className={
                            session.timerState === "running" &&
                            session.remainingSeconds <= 30
                              ? "urgent"
                              : ""
                          }
                        >
                          {formatTime(session.remainingSeconds)}
                        </strong>
                        <small>
                          {session.category || ""}{" "}
                          {session.round ? `— ${session.round}` : ""}
                        </small>
                      </div>

                      <div
                        className={`score-card blue ${isBlueWinner ? "winner" : ""}`}
                      >
                        <span>{athleteName(fight.blueAthlete)}</span>
                        <strong>{session.blue?.score || 0}</strong>
                        <div className="score-details">
                          <span>Av: {session.blue?.advantages || 0}</span>
                          <span>Pén: {session.blue?.penalties || 0}</span>
                          {(session.blue?.warnings || 0) > 0 && (
                            <span className="warning-indicator">
                              ⚠ {session.blue.warnings}
                            </span>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming */}
          {upcomingSessions.length > 0 && (
            <div className="feature-grid live-match-grid">
              {upcomingSessions.map((session) => {
                const fight = session.fight || {};
                return (
                  <article
                    className="surface-card match-card"
                    key={session._id}
                  >
                    <span className="feature-chip">
                      {session.mat || "Tatami"}
                    </span>
                    <h3>{session.discipline || "NEWAZA"}</h3>
                    <p>{session.category || "Combat officiel"}</p>
                    <div className="match-score-line">
                      <strong>{athleteName(fight.redAthlete)}</strong>
                    </div>
                    <div className="match-score-line">
                      <strong>{athleteName(fight.blueAthlete)}</strong>
                    </div>
                    <div className="story-meta">
                      <span>{session.round || "Tableau principal"}</span>
                      <span>⏳ En attente</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Finished */}
          {finishedSessions.length > 0 && (
            <>
              <h2>✅ Résultats récents</h2>
              <div className="feature-grid live-match-grid">
                {finishedSessions.map((session) => {
                  const fight = session.fight || {};
                  const winnerLabel =
                    session.winnerSide === "red"
                      ? athleteName(fight.redAthlete)
                      : session.winnerSide === "blue"
                        ? athleteName(fight.blueAthlete)
                        : "Égalité";

                  return (
                    <article
                      className={`surface-card match-card ${session.winnerSide === "red" ? "red-won" : session.winnerSide === "blue" ? "blue-won" : ""}`}
                      key={session._id}
                    >
                      <span className="feature-chip">
                        {session.mat || "Tatami"}
                      </span>
                      <h3>🏆 {winnerLabel}</h3>
                      <p>
                        {session.discipline || "NEWAZA"} ·{" "}
                        {session.category || ""}
                      </p>
                      <div className="match-score-line">
                        <strong>{athleteName(fight.redAthlete)}</strong>
                        <em>{session.red?.score || 0}</em>
                      </div>
                      <div className="match-score-line">
                        <strong>{athleteName(fight.blueAthlete)}</strong>
                        <em>{session.blue?.score || 0}</em>
                      </div>
                      <div className="story-meta">
                        <span>
                          {winMethodLabels[session.winMethod || ""] ||
                            session.winMethod ||
                            "Points"}
                        </span>
                        <span>
                          {session.status === "validated"
                            ? "Validé"
                            : "En attente"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {!loading && sessions.length === 0 && (
            <div className="empty-state">
              <h2>Aucun combat en cours</h2>
              <p>
                Revenez pendant une compétition pour suivre les scores en
                direct.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
