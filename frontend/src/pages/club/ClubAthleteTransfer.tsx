import React, { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import type { Person } from "../../types";

interface Club {
  _id: string;
  id?: string;
  name: string;
}

export default function ClubAthleteTransfer(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [transferModal, setTransferModal] = useState<Person | null>(null);
  const [targetClubId, setTargetClubId] = useState("");

  const clubId = user?.club?._id || user?.club?.id || "";

  // Fetch club's athletes
  const {
    data: athletesData,
    isLoading: athletesLoading,
    isError: athletesError,
    error: athletesErr,
    refetch: refetchAthletes,
  } = useQuery({
    queryKey: ["persons", "ATHLETE", "club", clubId],
    queryFn: async () => {
      const res = await api.get("/persons", {
        params: { type: "ATHLETE", clubId },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: !!clubId,
  });

  // Fetch all clubs for transfer target
  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return (((res.data as any)?.data ?? res.data) as Club[]) || [];
    },
  });

  const athletes = athletesData || [];
  const clubs = (clubsData || []).filter((c) => (c._id || c.id) !== clubId);

  const transferMutation = useMutation({
    mutationFn: (params: { athleteId: string; targetClubId: string }) =>
      api.post("/transfers", params),
    onSuccess: () => {
      toast.success("Demande de transfert envoyée avec succès");
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      setTransferModal(null);
      setTargetClubId("");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Erreur lors de la demande de transfert",
      );
    },
  });

  function handleTransferSubmit() {
    if (!transferModal) return;
    if (!targetClubId) {
      toast.error("Veuillez sélectionner un club de destination");
      return;
    }
    transferMutation.mutate({
      athleteId: transferModal._id || transferModal.id || "",
      targetClubId,
    });
  }

  if (athletesLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des athlètes..." />
      </div>
    );
  }

  if (athletesError && !athletesData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (athletesErr as any)?.message ||
            "Impossible de charger les athlètes"
          }
          action={
            <button className="btn primary" onClick={() => refetchAthletes()}>
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
        title="Transfert d'athlètes"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Transfert d'athlètes" },
        ]}
      />

      <div className="table-card">
        {athletes.length === 0 ? (
          <EmptyState
            title="Aucun athlète"
            description="Votre club ne contient aucun athlète à transférer"
          />
        ) : (
          <>
            <p className="muted" style={{ padding: "16px 16px 0" }}>
              Sélectionnez un athlète pour initier une demande de transfert vers
              un autre club.
            </p>
            <div className="table-wrap">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Date de naissance</th>
                    <th>Nationalité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((athlete) => (
                    <tr key={athlete._id || athlete.id}>
                      <td>
                        {athlete.firstName} {athlete.lastName}
                      </td>
                      <td>
                        {athlete.dateOfBirth
                          ? new Date(athlete.dateOfBirth).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </td>
                      <td>{athlete.nationality || "—"}</td>
                      <td>
                        <button
                          className="btn primary"
                          onClick={() => setTransferModal(athlete)}
                        >
                          Demander un transfert
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Transfer Modal */}
      {transferModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setTransferModal(null);
            setTargetClubId("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Demander un transfert</h3>
            <p style={{ marginBottom: 16, color: "var(--text)" }}>
              Athlète :{" "}
              <strong>
                {transferModal.firstName} {transferModal.lastName}
              </strong>
            </p>

            <label className="field-label" style={{ marginBottom: 16 }}>
              Club de destination
              <select
                value={targetClubId}
                onChange={(e) => setTargetClubId(e.target.value)}
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "11px 12px",
                  fontSize: "0.9rem",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <option value="">— Sélectionner un club —</option>
                {clubs.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn"
                onClick={() => {
                  setTransferModal(null);
                  setTargetClubId("");
                }}
              >
                Annuler
              </button>
              <button
                className="btn primary"
                onClick={handleTransferSubmit}
                disabled={transferMutation.isPending}
              >
                {transferMutation.isPending
                  ? "Envoi en cours..."
                  : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
