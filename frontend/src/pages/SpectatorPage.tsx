import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ScoringProvider, useScoring, MatchState } from "../context/ScoringContext";
import PublicScoreboard from "../components/scoring/PublicScoreboard";
import { io, Socket } from "socket.io-client";
import api from "../services/api";

function SpectatorContent() {
  const { state, dispatch } = useScoring();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId") || "";

  // ── Refs ──
  const socketRef = useRef<Socket | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state; // always point to the latest state for use in closures
  const [wsConnected, setWsConnected] = useState(false);
  const lastServerRemainingRef = useRef<number | null>(null);
  const prevStallingTopRef = useRef(false);
  const prevStallingBottomRef = useRef(false);

  // ── Poll localStorage for state from referee window (legacy, no matchId) ──
  useEffect(() => {
    if (matchId) return;
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem("scoring_state");
        if (stored) {
          const parsed = JSON.parse(stored) as MatchState;
          dispatch({ type: "LOAD_STATE", state: parsed });
        }
      } catch {
        /* ignore corrupt data */
      }
    }, 500);
    return () => clearInterval(interval);
  }, [dispatch, matchId]);

  // ── WebSocket: real-time scoring updates ──
  useEffect(() => {
    if (!matchId) return;

    // Connect to backend WebSocket (port 5000), not Vite dev server (port 5173)
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setWsConnected(true);
      console.log("[Spectator] WebSocket connected");
    });

    socket.on("disconnect", () => {
      setWsConnected(false);
      console.log("[Spectator] WebSocket disconnected");
    });

    socket.on("public:scoring:update", (data: any) => {
      // Only process updates for our match
      if (data.sessionId !== matchId) return;

      const latest = stateRef.current;
      const isRunning = data.timerState === "running";

      const backendStatus: string =
        typeof data.status === "string" ? data.status.toLowerCase() : "";

      dispatch({
        type: "LOAD_STATE",
        state: {
          top: {
            name: latest.top.name || "Rouge",
            academy: latest.top.academy || "",
            points: data.redScore ?? latest.top.points,
            advantages: data.redAdvantages ?? latest.top.advantages,
            penalties: data.redPenalties ?? latest.top.penalties,
            color: "red",
          },
          bottom: {
            name: latest.bottom.name || "Bleu",
            academy: latest.bottom.academy || "",
            points: data.blueScore ?? latest.bottom.points,
            advantages: data.blueAdvantages ?? latest.bottom.advantages,
            penalties: data.bluePenalties ?? latest.bottom.penalties,
            color: "blue",
          },
          clock: (() => {
            // If clock is already running locally, preserve it unless server indicates a change
            const wasRunning = latest.clock.running;
            const serverRemaining = typeof data.remainingSeconds === "number" ? data.remainingSeconds : null;

            if (!wasRunning && isRunning) {
              // Just started — seed from server
              return { total: 300, remaining: serverRemaining ?? 300, running: true };
            }
            if (wasRunning && !isRunning) {
              // Just stopped — use server value
              return { total: 300, remaining: serverRemaining ?? latest.clock.remaining, running: false };
            }
            if (wasRunning && isRunning) {
              // Already running — only update if server value jumped significantly (clock adjustment)
              if (serverRemaining !== null && lastServerRemainingRef.current !== null) {
                const expected = lastServerRemainingRef.current - 3; // ~3s elapsed between syncs
                if (Math.abs(serverRemaining - expected) > 2) {
                  // Manual adjustment detected
                  lastServerRemainingRef.current = serverRemaining;
                  return { total: 300, remaining: serverRemaining, running: true };
                }
              }
              if (serverRemaining !== null) {
                lastServerRemainingRef.current = serverRemaining;
              }
              return { total: 300, remaining: latest.clock.remaining, running: true };
            }
            // Idle or other — use server value
            return { total: 300, remaining: serverRemaining ?? latest.clock.remaining, running: isRunning };
          })(),
          stallingTop: (() => {
            const stallingActive = data.stallingTop || false;
            const wasActive = prevStallingTopRef.current;
            prevStallingTopRef.current = stallingActive;
            if (stallingActive && !wasActive) {
              // Just started — reset countdown to 20
              return { athleteKey: "top" as const, remaining: 20, active: true };
            }
            if (!stallingActive && wasActive) {
              // Just stopped
              return { athleteKey: "top" as const, remaining: 20, active: false };
            }
            if (stallingActive && wasActive) {
              // Already active — preserve local countdown
              return { ...latest.stallingTop, active: true };
            }
            // Not active — preserve local state
            return { ...latest.stallingTop, active: false };
          })(),
          stallingBottom: (() => {
            const stallingActive = data.stallingBottom || false;
            const wasActive = prevStallingBottomRef.current;
            prevStallingBottomRef.current = stallingActive;
            if (stallingActive && !wasActive) {
              return { athleteKey: "bottom" as const, remaining: 20, active: true };
            }
            if (!stallingActive && wasActive) {
              return { athleteKey: "bottom" as const, remaining: 20, active: false };
            }
            if (stallingActive && wasActive) {
              return { ...latest.stallingBottom, active: true };
            }
            return { ...latest.stallingBottom, active: false };
          })(),
          undoStack: latest.undoStack,
          status:
            backendStatus === "live"
              ? "running"
              : backendStatus === "finished"
                ? "ended"
                : backendStatus === "paused"
                  ? "paused"
                  : "idle",
          winner: {
            side:
              data.winnerSide === "red"
                ? "top"
                : data.winnerSide === "blue"
                  ? "bottom"
                  : null,
            method: data.winMethod || null,
          },
          matNumber: String(latest.matNumber || 1),
          division: latest.division || "",
        } as MatchState,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [matchId]);

  // ── Fetch initial match data (athlete names) once on mount ──
  useEffect(() => {
    if (!matchId) return;

    api
      .get(`/matches/${matchId}`)
      .then((r) => {
        const m = r.data?.data || r.data;
        if (!m) return;

        const latest = stateRef.current;
        const redName = `${m.redCorner?.firstName || ""} ${m.redCorner?.lastName || ""}`.trim();
        const blueName = `${m.blueCorner?.firstName || ""} ${m.blueCorner?.lastName || ""}`.trim();

        dispatch({
          type: "LOAD_STATE",
          state: {
            ...latest,
            top: {
              ...latest.top,
              name: redName || "Rouge",
              academy: m.redCorner?.club?.name || "",
            },
            bottom: {
              ...latest.bottom,
              name: blueName || "Bleu",
              academy: m.blueCorner?.club?.name || "",
            },
            matNumber: String(m.mat?.number || m.matNumber || 1),
            division: m.division || "",
          } as MatchState,
        });
      })
      .catch(() => {
        /* API may not be available yet */
      });
  }, [matchId]);

  return (
    <>
      <PublicScoreboard />
      {/* Connection indicator */}
      <div
        style={{
          position: "fixed",
          bottom: 8,
          right: 8,
          fontSize: "0.6rem",
          color: wsConnected ? "#22c55e" : "#dc2626",
          background: "rgba(0,0,0,0.8)",
          padding: "2px 8px",
          borderRadius: 4,
          zIndex: 9999,
        }}
      >
        {wsConnected ? "● LIVE" : "○ reconnect..."}
      </div>
    </>
  );
}

export default function SpectatorPage(): React.ReactElement {
  return (
    <ScoringProvider>
      <SpectatorContent />
    </ScoringProvider>
  );
}
