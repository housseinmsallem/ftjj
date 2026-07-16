import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import api from "../../services/api";
import type { Match } from "../../types";

// ──────────────────────────────────────
// WebSocket
// ──────────────────────────────────────

const SOCKET_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace("/api", "");

// ──────────────────────────────────────
// Types locaux
// ──────────────────────────────────────

interface SpectatorMatch {
  _id?: string;
  id?: string;
  redCorner?: {
    firstName?: string;
    lastName?: string;
    club?: { name?: string; shortName?: string };
  };
  blueCorner?: {
    firstName?: string;
    lastName?: string;
    club?: { name?: string; shortName?: string };
  };
  redScore: number;
  blueScore: number;
  warningsRed: number;
  penaltiesRed: number;
  warningsBlue: number;
  penaltiesBlue: number;
  status: string;
  matNumber: number;
  winnerSide?: string;
  winMethod?: string;
}

// ──────────────────────────────────────
// Composant
// ──────────────────────────────────────

export default function SpectatorWindow(): React.ReactElement {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<SpectatorMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ──────────────────────────────────────
  // Fetch initial data
  // ──────────────────────────────────────

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await api.get(`/matches/${matchId}`);
      const data = res.data?.data ?? res.data;
      setMatch(data);
      setError("");
    } catch (err: any) {
      console.error("Erreur de chargement du match:", err);
      if (!match) {
        setError(
          err?.response?.data?.message || "Impossible de charger le match",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // ──────────────────────────────────────
  // WebSocket listener
  // ──────────────────────────────────────

  useEffect(() => {
    if (!matchId) return;
    const socket: Socket = io(SOCKET_URL);

    socket.on("match:update", (data: any) => {
      if (data.matchId === matchId) {
        setMatch((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            redScore: data.redScore ?? prev.redScore,
            blueScore: data.blueScore ?? prev.blueScore,
            warningsRed: data.warningsRed ?? prev.warningsRed,
            penaltiesRed: data.penaltiesRed ?? prev.penaltiesRed,
            warningsBlue: data.warningsBlue ?? prev.warningsBlue,
            penaltiesBlue: data.penaltiesBlue ?? prev.penaltiesBlue,
            status: data.status ?? prev.status,
            winnerSide: data.winnerSide ?? prev.winnerSide,
            winMethod: data.winMethod ?? prev.winMethod,
          };
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [matchId]);

  // ──────────────────────────────────────
  // Auto-refresh fallback (every 5 sec)
  // ──────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatch();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMatch]);

  // ──────────────────────────────────────
  // Keyboard: Escape to close
  // ──────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        window.close();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ──────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────

  function getAthleteName(
    corner: SpectatorMatch["redCorner"] | SpectatorMatch["blueCorner"],
  ): string {
    if (!corner) return "—";
    if (corner.firstName && corner.lastName)
      return `${corner.firstName} ${corner.lastName}`;
    return corner.firstName || corner.lastName || "—";
  }

  function getClubName(
    corner: SpectatorMatch["redCorner"] | SpectatorMatch["blueCorner"],
  ): string {
    return corner?.club?.name || corner?.club?.shortName || "";
  }

  function formatStatus(status: string): string {
    const labels: Record<string, string> = {
      UPCOMING: "À venir",
      LIVE: "En direct",
      FINISHED: "Terminé",
    };
    return labels[status] || status;
  }

  function winMethodLabel(method?: string): string {
    const labels: Record<string, string> = {
      POINTS: "Points",
      SUBMISSION: "Soumission",
      DECISION: "Décision",
      FORFEIT: "Forfait",
      DISQUALIFICATION: "Disqualification",
    };
    return labels[method || ""] || method || "";
  }

  // ──────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────

  if (loading) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            color: "#888",
          }}
        >
          <div
            className="spinner"
            style={{
              width: 48,
              height: 48,
              border: "4px solid #333",
              borderTopColor: "#d51332",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ marginTop: 16, fontSize: "1.1rem" }}>
            Chargement du match...
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────
  // Error state
  // ──────────────────────────────────────

  if (error && !match) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            color: "#d51332",
            gap: 16,
          }}
        >
          <p style={{ fontSize: "1.2rem" }}>{error}</p>
          <button
            onClick={() => window.close()}
            style={{
              padding: "10px 24px",
              background: "#d51332",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!match) return null;

  const redScore = match.redScore ?? 0;
  const blueScore = match.blueScore ?? 0;
  const isFinished = match.status === "FINISHED";
  const winnerIsRed = match.winnerSide === "RED";
  const winnerIsBlue = match.winnerSide === "BLUE";

  return (
    <div style={containerStyle}>
      {/* ─── TOP HALF : RED CORNER ─── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px",
          background: `linear-gradient(135deg, rgba(213,19,50,0.35) 0%, rgba(213,19,50,0.15) 100%)`,
          position: "relative",
        }}
      >
        {/* Winner overlay for red */}
        {isFinished && winnerIsRed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(213,19,50,0.25)",
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: "3rem",
                fontWeight: 900,
                color: "#fff",
                textShadow: "0 0 20px rgba(213,19,50,0.8)",
                textTransform: "uppercase",
              }}
            >
              🏆 Vainqueur — {winMethodLabel(match.winMethod)}
            </span>
          </div>
        )}

        {/* Left: athlete info */}
        <div style={{ maxWidth: 320, zIndex: 1 }}>
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              margin: "0 0 4px",
              color: "#fff",
              lineHeight: 1.2,
            }}
          >
            {getAthleteName(match.redCorner)}
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: "rgba(255,255,255,0.7)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {getClubName(match.redCorner)}
          </p>
        </div>

        {/* Center: score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: "6rem",
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1,
              textShadow: "0 0 30px rgba(213,19,50,0.5)",
            }}
          >
            {redScore}
          </span>
        </div>

        {/* Right: warnings / penalties */}
        <div
          style={{
            display: "flex",
            gap: 24,
            zIndex: 1,
          }}
        >
          {/* Warnings (yellow cards) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {Array.from({ length: match.warningsRed ?? 0 }).map((_, i) => (
              <div
                key={`warn-red-${i}`}
                style={{
                  width: 28,
                  height: 40,
                  background: "#e4c328",
                  borderRadius: 4,
                  boxShadow: "0 0 10px rgba(228,195,40,0.5)",
                }}
              />
            ))}
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
                marginTop: 2,
              }}
            >
              Avert.
            </span>
          </div>
          {/* Penalties (red cards) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {Array.from({ length: match.penaltiesRed ?? 0 }).map((_, i) => (
              <div
                key={`pen-red-${i}`}
                style={{
                  width: 28,
                  height: 40,
                  background: "#d51332",
                  borderRadius: 4,
                  boxShadow: "0 0 10px rgba(213,19,50,0.7)",
                }}
              />
            ))}
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
                marginTop: 2,
              }}
            >
              Pénal.
            </span>
          </div>
        </div>
      </div>

      {/* ─── MIDDLE : Timer / Status ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          padding: "12px 48px",
          background: "#111",
          borderTop: "2px solid #222",
          borderBottom: "2px solid #222",
        }}
      >
        {/* VS */}
        <span
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: 4,
          }}
        >
          VS
        </span>

        {/* Mat number */}
        <span
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            background: "#1a1a1a",
            padding: "4px 16px",
            borderRadius: 20,
          }}
        >
          Tatami {match.matNumber ?? "—"}
        </span>

        {/* Status */}
        <span
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: match.status === "LIVE" ? "#d51332" : "#fff",
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {formatStatus(match.status)}
          {match.status === "LIVE" && (
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#d51332",
                marginLeft: 8,
                animation: "pulse 1s ease-in-out infinite",
              }}
            />
          )}
        </span>
      </div>

      {/* ─── BOTTOM HALF : BLUE CORNER ─── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px",
          background: `linear-gradient(135deg, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0.15) 100%)`,
          position: "relative",
        }}
      >
        {/* Winner overlay for blue */}
        {isFinished && winnerIsBlue && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(37,99,235,0.25)",
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: "3rem",
                fontWeight: 900,
                color: "#fff",
                textShadow: "0 0 20px rgba(37,99,235,0.8)",
                textTransform: "uppercase",
              }}
            >
              🏆 Vainqueur — {winMethodLabel(match.winMethod)}
            </span>
          </div>
        )}

        {/* Left: athlete info */}
        <div style={{ maxWidth: 320, zIndex: 1 }}>
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              margin: "0 0 4px",
              color: "#fff",
              lineHeight: 1.2,
            }}
          >
            {getAthleteName(match.blueCorner)}
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: "rgba(255,255,255,0.7)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {getClubName(match.blueCorner)}
          </p>
        </div>

        {/* Center: score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: "6rem",
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1,
              textShadow: "0 0 30px rgba(37,99,235,0.5)",
            }}
          >
            {blueScore}
          </span>
        </div>

        {/* Right: warnings / penalties */}
        <div
          style={{
            display: "flex",
            gap: 24,
            zIndex: 1,
          }}
        >
          {/* Warnings (yellow cards) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {Array.from({ length: match.warningsBlue ?? 0 }).map((_, i) => (
              <div
                key={`warn-blue-${i}`}
                style={{
                  width: 28,
                  height: 40,
                  background: "#e4c328",
                  borderRadius: 4,
                  boxShadow: "0 0 10px rgba(228,195,40,0.5)",
                }}
              />
            ))}
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
                marginTop: 2,
              }}
            >
              Avert.
            </span>
          </div>
          {/* Penalties (red cards) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            {Array.from({ length: match.penaltiesBlue ?? 0 }).map((_, i) => (
              <div
                key={`pen-blue-${i}`}
                style={{
                  width: 28,
                  height: 40,
                  background: "#2563eb",
                  borderRadius: 4,
                  boxShadow: "0 0 10px rgba(37,99,235,0.7)",
                }}
              />
            ))}
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.5)",
                marginTop: 2,
              }}
            >
              Pénal.
            </span>
          </div>
        </div>
      </div>

      {/* ─── DRAW OVERLAY ─── */}
      {isFinished && match.winnerSide === "DRAW" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "3rem",
              fontWeight: 900,
              color: "#fff",
              textShadow: "0 0 20px rgba(255,255,255,0.5)",
              textTransform: "uppercase",
            }}
          >
            🤝 Égalité
          </span>
        </div>
      )}

      {/* ─── CLOSE BUTTON ─── */}
      <button
        onClick={() => window.close()}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          padding: "8px 20px",
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "0.9rem",
          zIndex: 200,
          backdropFilter: "blur(8px)",
        }}
        title="Fermer (Échap)"
      >
        Fermer ✕
      </button>

      {/* ─── KEYFRAMES (injected via style tag) ─── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────
// Container style (full-screen dark)
// ──────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  background: "#0a0a0a",
  color: "#fff",
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  overflow: "hidden",
};
