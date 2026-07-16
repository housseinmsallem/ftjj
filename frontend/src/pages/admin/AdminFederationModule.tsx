import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import type { DashboardStats } from "../../types";

interface PendingRegistration {
  _id: string;
  id?: string;
  email: string;
  clubName?: string;
  club?: { name: string };
  createdAt: string;
  status: string;
}

export default function AdminFederationModule(): React.ReactElement {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);

  const {
    data: statsData,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErr,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return ((res.data as any)?.data ?? res.data) as DashboardStats;
    },
  });

  const {
    data: pendingData,
    isLoading: pendingLoading,
    isError: pendingError,
    error: pendingErr,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ["admin", "pending-registrations"],
    queryFn: async () => {
      const res = await api.get("/auth/admin/pending-registrations");
      return (
        (((res.data as any)?.data ?? res.data) as PendingRegistration[]) || []
      );
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ userId, comment }: { userId: string; comment?: string }) =>
      api.post(`/auth/admin/approve-registration/${userId}`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-registrations"],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success("Inscription approuvée avec succès");
      setConfirmApprove(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'approbation",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, comment }: { userId: string; comment: string }) =>
      api.post(`/auth/admin/reject-registration/${userId}`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-registrations"],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success("Inscription refusée");
      setRejectModal(null);
      setRejectComment("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors du refus");
    },
  });

  const stats = statsData;
  const pending = pendingData || [];

  const statCards = [
    { label: "Utilisateurs", value: stats?.users ?? 0 },
    { label: "Clubs actifs", value: stats?.clubs ?? 0 },
    { label: "Athlètes", value: stats?.persons?.athletes ?? 0 },
    { label: "Entraîneurs", value: stats?.persons?.coaches ?? 0 },
    { label: "Arbitres", value: stats?.persons?.referees ?? 0 },
    { label: "Techniciens", value: stats?.persons?.technicians ?? 0 },
    { label: "Licences actives", value: stats?.licenses?.active ?? 0 },
    { label: "Demandes en attente", value: stats?.registrations?.pending ?? 0 },
  ];

  if (statsLoading || pendingLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement du tableau de bord..." />
      </div>
    );
  }

  if (statsError && !statsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (statsErr as any)?.message ||
            "Impossible de charger les statistiques"
          }
          action={
            <button className="btn primary" onClick={() => refetchStats()}>
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
        title="Tableau de bord"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Tableau de bord" },
        ]}
      />

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="muted">{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Pending Registrations */}
      <div className="card">
        <div className="panel-head">
          <h2>En attente de validation</h2>
          {pending.length > 0 && (
            <small>
              {pending.length} demande{pending.length > 1 ? "s" : ""}
            </small>
          )}
        </div>

        {pendingError && !pendingData ? (
          <EmptyState
            title="Erreur de chargement"
            description={
              (pendingErr as any)?.message ||
              "Impossible de charger les demandes"
            }
            action={
              <button className="btn primary" onClick={() => refetchPending()}>
                Réessayer
              </button>
            }
          />
        ) : pending.length === 0 ? (
          <EmptyState
            title="Aucune demande en attente"
            description="Toutes les demandes ont été traitées"
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Club</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((reg) => (
                  <tr key={reg._id || reg.id}>
                    <td>{reg.email}</td>
                    <td>{reg.club?.name || reg.clubName || "—"}</td>
                    <td>
                      {reg.createdAt
                        ? new Date(reg.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge status={reg.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() =>
                            setConfirmApprove(reg._id || reg.id || "")
                          }
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending
                          }
                        >
                          Approuver
                        </button>
                        <button
                          className="btn danger"
                          onClick={() =>
                            setRejectModal({
                              userId: reg._id || reg.id || "",
                              email: reg.email,
                            })
                          }
                          disabled={
                            approveMutation.isPending ||
                            rejectMutation.isPending
                          }
                        >
                          Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        open={confirmApprove !== null}
        title="Approuver l'inscription"
        message="Êtes-vous sûr de vouloir approuver cette demande d'inscription ?"
        confirmLabel="Approuver"
        variant="default"
        onConfirm={() => {
          if (confirmApprove) {
            approveMutation.mutate({ userId: confirmApprove });
          }
        }}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* Reject Modal */}
      {rejectModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setRejectModal(null);
            setRejectComment("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Refuser l'inscription</h3>
            <p style={{ marginBottom: 12 }}>
              Motif du refus pour <strong>{rejectModal.email}</strong> :
            </p>
            <textarea
              style={{
                width: "100%",
                minHeight: 100,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
              placeholder="Motif du refus (obligatoire)..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                className="btn"
                onClick={() => {
                  setRejectModal(null);
                  setRejectComment("");
                }}
              >
                Annuler
              </button>
              <button
                className="btn danger"
                disabled={!rejectComment.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    userId: rejectModal.userId,
                    comment: rejectComment.trim(),
                  })
                }
              >
                {rejectMutation.isPending
                  ? "Refus en cours..."
                  : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
