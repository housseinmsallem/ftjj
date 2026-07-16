import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";

interface ClubDoc {
  _id: string;
  id?: string;
  fileName: string;
  fileUrl: string;
}

interface PendingRegistration {
  _id: string;
  id?: string;
  email: string;
  club?: {
    _id?: string;
    id?: string;
    name: string;
    address?: string;
    documents?: ClubDoc[];
  };
  clubName?: string;
  createdAt: string;
  status: string;
}

export default function AdminAffiliationRequests(): React.ReactElement {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);

  const {
    data: pendingData,
    isLoading,
    isError,
    error,
    refetch,
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
      toast.success("Demande approuvée avec succès");
      setConfirmApprove(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Erreur"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, comment }: { userId: string; comment: string }) =>
      api.post(`/auth/admin/reject-registration/${userId}`, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "pending-registrations"],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success("Demande refusée");
      setRejectModal(null);
      setRejectComment("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Erreur"),
  });

  const pending = pendingData || [];

  if (isLoading)
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des demandes..." />
      </div>
    );
  if (isError && !pendingData)
    return (
      <div className="page">
        <EmptyState
          title="Erreur"
          description={(error as any)?.message || "Impossible de charger"}
          action={
            <button className="btn primary" onClick={() => refetch()}>
              Réessayer
            </button>
          }
        />
      </div>
    );

  return (
    <div className="page">
      <PageHeader
        title="Demandes d'inscription"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Demandes d'inscription" },
        ]}
      />

      <div className="table-card">
        {pending.length === 0 ? (
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
                {pending.map((reg) => {
                  const rid = reg._id || reg.id || "";
                  const isExpanded = expandedId === rid;
                  return (
                    <React.Fragment key={rid}>
                      <tr
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpandedId(isExpanded ? null : rid)}
                      >
                        <td
                          style={{
                            fontWeight: 600,
                            color: "var(--red)",
                            textDecoration: "underline",
                          }}
                        >
                          {reg.email}
                        </td>
                        <td>{reg.club?.name || reg.clubName || "—"}</td>
                        <td>
                          {reg.createdAt
                            ? new Date(reg.createdAt).toLocaleDateString(
                                "fr-FR",
                              )
                            : "—"}
                        </td>
                        <td>
                          <StatusBadge status={reg.status} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button
                              className="btn primary"
                              onClick={() => setConfirmApprove(rid)}
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
                                  userId: rid,
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
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: "20px 24px",
                              background: "white",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <h3
                              style={{
                                margin: "0 0 16px",
                                color: "var(--text)",
                                fontSize: "1rem",
                              }}
                            >
                              📋 Détails de la demande —{" "}
                              {reg.club?.name || reg.clubName || "Club"}
                            </h3>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    margin: "4px 0",
                                    color: "var(--muted)",
                                  }}
                                >
                                  <strong style={{ color: "var(--text)" }}>
                                    Email :
                                  </strong>{" "}
                                  {reg.email}
                                </p>
                                <p
                                  style={{
                                    margin: "4px 0",
                                    color: "var(--muted)",
                                  }}
                                >
                                  <strong style={{ color: "var(--text)" }}>
                                    Club :
                                  </strong>{" "}
                                  {reg.club?.name || reg.clubName || "—"}
                                </p>
                                {reg.club?.address && (
                                  <p
                                    style={{
                                      margin: "4px 0",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    <strong style={{ color: "var(--text)" }}>
                                      Adresse :
                                    </strong>{" "}
                                    {reg.club.address}
                                  </p>
                                )}
                                <p
                                  style={{
                                    margin: "4px 0",
                                    color: "var(--muted)",
                                  }}
                                >
                                  <strong style={{ color: "var(--text)" }}>
                                    Date :
                                  </strong>{" "}
                                  {reg.createdAt
                                    ? new Date(
                                        reg.createdAt,
                                      ).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </p>
                              </div>
                            </div>
                            <h4
                              style={{
                                margin: "20px 0 12px",
                                color: "var(--text)",
                                fontSize: "0.9rem",
                                borderTop: "1px solid var(--border)",
                                paddingTop: 16,
                              }}
                            >
                              📄 Documents fournis (
                              {reg.club?.documents?.length || 0})
                            </h4>
                            {reg.club?.documents &&
                            reg.club.documents.length > 0 ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {reg.club.documents.map((doc: ClubDoc) => (
                                  <a
                                    key={doc._id || doc.id}
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      padding: "10px 14px",
                                      background: "var(--bg)",
                                      borderRadius: 8,
                                      border: "1px solid var(--border)",
                                      color: "var(--gold)",
                                      textDecoration: "underline",
                                      fontSize: "0.9rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    📄 {doc.fileName}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="muted">Aucun document fourni.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmApprove !== null}
        title="Approuver la demande"
        message="Êtes-vous sûr de vouloir approuver cette demande ?"
        confirmLabel="Approuver"
        onConfirm={() => {
          if (confirmApprove)
            approveMutation.mutate({ userId: confirmApprove });
        }}
        onCancel={() => setConfirmApprove(null)}
      />

      {rejectModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setRejectModal(null);
            setRejectComment("");
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Refuser la demande</h3>
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
