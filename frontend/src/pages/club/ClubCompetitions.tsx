import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import type { Competition, CompetitionSignup } from "../../types";

export default function ClubCompetitions(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clubId = user?.club?._id || user?.club?.id || "";
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data: competitionsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const res = await api.get("/competitions");
      return (((res.data as any)?.data ?? res.data) as Competition[]) || [];
    },
  });

  const competitions = competitionsData || [];

  // Fetch club signups for expanded competition
  const { data: clubSignupsData, isLoading: signupsLoading } = useQuery({
    queryKey: ["competitions", expandedId, "signups", clubId],
    queryFn: async () => {
      const res = await api.get(`/competitions/${expandedId}/signups`);
      const allSignups: CompetitionSignup[] =
        ((res.data as any)?.data ?? res.data) || [];
      return allSignups.filter((s: any) => {
        const pClubId =
          s.person?.club?._id || s.person?.club?.id || s.person?.clubId;
        return pClubId === clubId;
      });
    },
    enabled: !!expandedId && !!clubId,
  });

  const clubSignups = clubSignupsData || [];

  function toggleExpand(compId: string) {
    setExpandedId((prev) => (prev === compId ? null : compId));
  }

  function getPersonName(s: CompetitionSignup): string {
    if (s.person) {
      const { firstName, lastName, name } = s.person as any;
      if (firstName && lastName) return `${firstName} ${lastName}`;
      if (name) return name;
    }
    return "—";
  }

  function getSignupTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ATHLETE: "Athlète",
      COACH: "Entraîneur",
      REFEREE: "Arbitre",
      TECHNICIAN: "Technicien",
    };
    return labels[type] || type;
  }

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des compétitions..." />
      </div>
    );
  }

  if (isError && !competitionsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les compétitions"
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
        title="Compétitions"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Compétitions" },
        ]}
      />

      {competitions.length === 0 ? (
        <EmptyState
          title="Aucune compétition"
          description="Aucune compétition n'est disponible pour le moment"
        />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Ruleset</th>
                  <th>Date</th>
                  <th>Lieu</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((comp) => (
                  <React.Fragment key={comp._id || comp.id}>
                    <tr
                      onClick={() => toggleExpand(comp._id || comp.id || "")}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 600 }}>{comp.name}</td>
                      <td>
                        <span
                          style={{
                            background:
                              (comp as any).type === "Championship"
                                ? "#e4c32820"
                                : "#3b82f620",
                            color:
                              (comp as any).type === "Championship"
                                ? "#e4c328"
                                : "#3b82f6",
                            padding: "2px 10px",
                            borderRadius: 12,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          {(comp as any).type || "Open"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{ color: "var(--muted)", fontSize: "0.85rem" }}
                        >
                          {(comp as any).splitByBelt ? 'Par ceinture' : 'Tous niveaux'}
                        </span>
                      </td>
                      <td>
                        {comp.date
                          ? new Date(comp.date).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td>{comp.location || "—"}</td>
                      <td>
                        {(comp as any).isRegistrationOpen ? (
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: 12,
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              background: "#22c55e20",
                              color: "#22c55e",
                            }}
                          >
                            Ouvert
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: 12,
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              background: "rgba(100,116,139,0.15)",
                              color: "#94a3b8",
                            }}
                          >
                            Fermé
                          </span>
                        )}
                      </td>
                      <td>
                        <div onClick={(e) => e.stopPropagation()}>
                          {(comp as any).isRegistrationOpen ? (
                            <button
                              className="btn primary"
                              onClick={() =>
                                navigate(
                                  `/club/competitions/${comp._id || comp.id}/register`,
                                )
                              }
                            >
                              S'inscrire
                            </button>
                          ) : (
                            <span
                              style={{
                                color: "var(--muted)",
                                fontSize: "0.85rem",
                                fontStyle: "italic",
                              }}
                            >
                              Inscriptions fermées
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expandable details */}
                    {expandedId === (comp._id || comp.id) && (
                      <tr key={`${comp._id || comp.id}-details`}>
                        <td colSpan={7} style={{ padding: "16px 20px" }}>
                          {/* Description */}
                          {(comp as any).description && (
                            <div style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  margin: "0 0 8px",
                                  color: "var(--text)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                📝 Description
                              </h4>
                              <p
                                className="muted"
                                style={{ whiteSpace: "pre-wrap", margin: 0 }}
                              >
                                {(comp as any).description}
                              </p>
                            </div>
                          )}

                          {/* Poster */}
                          {(comp as any).posterUrl && (
                            <div style={{ marginBottom: 16 }}>
                              <h4
                                style={{
                                  margin: "0 0 8px",
                                  color: "var(--text)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                🖼️ Affiche
                              </h4>
                              <img
                                src={(comp as any).posterUrl}
                                alt="Affiche"
                                style={{
                                  maxWidth: 300,
                                  borderRadius: 12,
                                  border: "1px solid var(--border)",
                                }}
                              />
                            </div>
                          )}

                          {/* Documents */}
                          {Array.isArray((comp as any).documents) &&
                            (comp as any).documents.length > 0 && (
                              <div style={{ marginBottom: 16 }}>
                                <h4
                                  style={{
                                    margin: "0 0 8px",
                                    color: "var(--text)",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  📄 Documents & communiqués
                                </h4>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  {(comp as any).documents.map(
                                    (doc: any, i: number) => (
                                      <a
                                        key={i}
                                        href={doc.fileUrl || doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          padding: "8px 12px",
                                          background: "var(--bg)",
                                          borderRadius: 8,
                                          border: "1px solid var(--border)",
                                          color: "var(--red)",
                                          textDecoration: "none",
                                          fontWeight: 600,
                                        }}
                                      >
                                        📎{" "}
                                        {doc.fileName ||
                                          doc.name ||
                                          `Document ${i + 1}`}
                                      </a>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Club signups */}
                          <div
                            style={{
                              paddingTop: 16,
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            <h4
                              style={{
                                margin: "0 0 12px",
                                color: "var(--text)",
                                fontSize: "0.9rem",
                              }}
                            >
                              👥 Athlètes inscrits de votre club
                            </h4>
                            {signupsLoading ? (
                              <LoadingSpinner text="Chargement..." />
                            ) : clubSignups.length === 0 ? (
                              <p className="muted">
                                Aucun athlète de votre club n'est encore
                                inscrit.
                              </p>
                            ) : (
                              <div className="table-wrap">
                                <table className="smart-table">
                                  <thead>
                                    <tr>
                                      <th>Nom</th>
                                      <th>Type</th>
                                      <th>Ceinture</th>
                                      <th>Poids</th>
                                      <th>Statut</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {clubSignups.map((s: CompetitionSignup) => (
                                      <tr key={s._id || (s as any).id}>
                                        <td>{getPersonName(s)}</td>
                                        <td>{getSignupTypeLabel(s.type)}</td>
                                        <td>
                                          {(s as any).person?.athleteDetails
                                            ?.grade || "—"}
                                        </td>
                                        <td>
                                          {(s as any).person?.athleteDetails
                                            ?.weight
                                            ? `${(s as any).person.athleteDetails.weight} kg`
                                            : "—"}
                                        </td>
                                        <td>
                                          <StatusBadge status={s.status} />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
