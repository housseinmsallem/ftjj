import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { publicApi } from "../services/api";

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

function athleteName(athlete) {
  if (!athlete) return "Athlete FTJJ";
  return (
    `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() ||
    athlete.name ||
    "Athlete FTJJ"
  );
}

export default function Live() {
  const [matches, setMatches] = useState([]);

  async function load() {
    const data = await publicApi.live();
    setMatches(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(() => setMatches([]));
    const socket = io(SOCKET_URL);
    socket.on("match:updated", () => load().catch(() => setMatches([])));
    socket.on("match:created", () => load().catch(() => setMatches([])));
    socket.on("match:timer", () => load().catch(() => setMatches([])));
    return () => socket.disconnect();
  }, []);

  const live = useMemo(
    () =>
      matches.find((match) => match.status === "live") || matches[0] || null,
    [matches],
  );

  return (
    <div className="public-page-shell">
      <section className="public-hero-banner public-hero-live">
        <div className="section-inner public-hero-grid">
          <div>
            <p className="eyebrow">Centre live FTJJ</p>
            <h1>Suivre les tatamis en temps reel</h1>
            <p className="hero-copy">
              Cette vue publique est maintenant reliee au flux live du
              backoffice pour afficher les combats, les scores et l'etat du
              chrono sans confusion de routes API.
            </p>
          </div>
          {live && (
            <div className="surface-card hero-aside">
              <p className="eyebrow">Combat en cours</p>
              <h2>{live.mat || "Tatami 1"}</h2>
              <p>{live.category || "Combat officiel FTJJ"}</p>
              <div className="story-meta">
                <span>{athleteName(live.redAthlete)}</span>
                <span>{athleteName(live.blueAthlete)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="public-section">
        <div className="section-inner">
          {live && (
            <section className="live-board public-live">
              <div className="score-card red">
                <span>{athleteName(live.redAthlete)}</span>
                <strong>{live.redScore || 0}</strong>
              </div>
              <div className="timer-card">
                <span>{live.mat || "Tatami 1"}</span>
                <strong>
                  {live.remainingSeconds ?? live.durationSeconds ?? 300}s
                </strong>
                <small>
                  {live.timerState || "idle"} · {live.category || "Combat FTJJ"}
                </small>
              </div>
              <div className="score-card blue">
                <span>{athleteName(live.blueAthlete)}</span>
                <strong>{live.blueScore || 0}</strong>
              </div>
            </section>
          )}

          <div className="feature-grid live-match-grid">
            {matches.map((match) => (
              <article className="surface-card match-card" key={match._id}>
                <span className="feature-chip">
                  {match.status || "scheduled"}
                </span>
                <h3>{match.mat || "Tatami"}</h3>
                <p>{match.category || "Combat officiel"}</p>
                <div className="match-score-line">
                  <strong>{athleteName(match.redAthlete)}</strong>
                  <em>{match.redScore || 0}</em>
                </div>
                <div className="match-score-line">
                  <strong>{athleteName(match.blueAthlete)}</strong>
                  <em>{match.blueScore || 0}</em>
                </div>
                <div className="story-meta">
                  <span>{match.round || "Tableau principal"}</span>
                  <span>{match.timerState || "idle"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
