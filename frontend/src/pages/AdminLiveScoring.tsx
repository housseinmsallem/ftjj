import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "../services/api";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import StatusBadge from "../components/shared/StatusBadge";

interface MatchItem {
  _id: string;
  id?: string;
  competition?: { _id?: string; id?: string; name: string };
  redCorner?: {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
  };
  blueCorner?: {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
  };
  redScore: number;
  blueScore: number;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  matNumber: number;
}

export default function AdminLiveScoring(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch matches
  const { data: matchesData, isLoading } = useQuery({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const res = await api.get("/matches");
      return (res.data?.data ?? res.data ?? []) as MatchItem[];
    },
  });

  const startMutation = useMutation({
    mutationFn: (matchId: string) =>
      api.patch(`/matches/${matchId}/status`, { status: "LIVE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match démarré");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Erreur"),
  });

  const matches = matchesData || [];
  const upcoming = matches.filter((m) => m.status === "UPCOMING");
  const live = matches.filter((m) => m.status === "LIVE");

  function athleteName(side: MatchItem["redCorner"]): string {
    if (!side) return "—";
    return `${side.firstName || ""} ${side.lastName || ""}`.trim() || "—";
  }

  return (
    <div className="page">
      <PageHeader
        title="Scoring en direct"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Scoring en direct" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Section 1: Standalone scoring */}
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🥋</div>
          <h2 style={{ color: "var(--text)", margin: "0 0 8px" }}>
            Match indépendant
          </h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Lancez un client de scoring sans lien avec une compétition. Idéal
            pour les entraînements ou les matchs libres.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
            }}
          >
            <button
              className="btn primary"
              style={{ fontSize: "1rem", padding: "14px 32px" }}
              onClick={() => navigate("/admin/scoring")}
            >
              🎮 Lancer le scoring indépendant
            </button>
            <button
              className="btn ghost"
              onClick={() =>
                window.open("/scoring", "_blank", "width=1400,height=900")
              }
            >
              🖥️ Ouvrir dans une nouvelle fenêtre
            </button>
          </div>
        </div>

        {/* Section 2: Competition matches */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ color: "var(--text)", margin: "0 0 8px" }}>
            Matchs de compétition
          </h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Matchs issus des compétitions, prêts à être arbitrés.
          </p>

          {isLoading ? (
            <LoadingSpinner text="Chargement des matchs..." />
          ) : matches.length === 0 ? (
            <EmptyState
              title="Aucun match"
              description="Aucun match trouvé. Créez des matchs depuis une compétition."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Live matches */}
              {live.length > 0 && (
                <div>
                  <h3
                    style={{
                      color: "#d51332",
                      margin: "0 0 8px",
                      fontSize: "0.9rem",
                      textTransform: "uppercase",
                    }}
                  >
                    🔴 En direct ({live.length})
                  </h3>
                  {live.map((m) => (
                    <div
                      key={m._id || m.id}
                      style={{
                        padding: "10px 14px",
                        background: "rgba(213,19,50,0.1)",
                        borderRadius: 8,
                        border: "1px solid rgba(213,19,50,0.3)",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong style={{ color: "#fff" }}>
                            {athleteName(m.redCorner)} vs{" "}
                            {athleteName(m.blueCorner)}
                          </strong>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>
                            {m.competition?.name} · Tatami {m.matNumber}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: 900,
                            color: "#e4c328",
                          }}
                        >
                          {m.redScore} — {m.blueScore}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming matches */}
              {upcoming.length > 0 && (
                <div>
                  <h3
                    style={{
                      color: "#e4c328",
                      margin: "0 0 8px",
                      fontSize: "0.9rem",
                      textTransform: "uppercase",
                    }}
                  >
                    ⏳ À venir ({upcoming.length})
                  </h3>
                  {upcoming.map((m) => (
                    <div
                      key={m._id || m.id}
                      style={{
                        padding: "10px 14px",
                        background: "var(--bg)",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        marginBottom: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#fff" }}>
                          {athleteName(m.redCorner)} vs{" "}
                          {athleteName(m.blueCorner)}
                        </strong>
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {m.competition?.name} · Tatami {m.matNumber}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <StatusBadge status="UPCOMING" />
                        <button
                          className="btn primary"
                          style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                          onClick={() =>
                            startMutation.mutate(m._id || m.id || "")
                          }
                          disabled={startMutation.isPending}
                        >
                          ▶ Démarrer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
