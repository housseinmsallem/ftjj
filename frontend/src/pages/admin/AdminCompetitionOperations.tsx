import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import type { Competition } from "../../types";

export default function AdminCompetitionOperations(): React.ReactElement {
  const navigate = useNavigate();

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
        title="Opérations compétition"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Opérations compétition" },
        ]}
      />

      {competitions.length === 0 ? (
        <EmptyState
          title="Aucune compétition"
          description="Aucune compétition n'a encore été créée"
        />
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Date</th>
                  <th>Lieu</th>
                  <th>Statut</th>
                  <th>Inscrits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {competitions.map((comp) => (
                  <tr key={comp._id || comp.id}>
                    <td>
                      <strong>{comp.name}</strong>
                    </td>
                    <td>
                      {comp.date
                        ? new Date(comp.date).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>{comp.location || "—"}</td>
                    <td>
                      <StatusBadge status={comp.status || "UPCOMING"} />
                    </td>
                    <td>{comp._count?.signups ?? "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() =>
                            navigate(
                              `/admin/competitions/${comp._id || comp.id}`,
                            )
                          }
                        >
                          Gérer
                        </button>
                        {comp.status === "LIVE" && (
                          <button
                            className="btn ghost"
                            onClick={() => navigate("/admin/live-scoring")}
                          >
                            Live
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
