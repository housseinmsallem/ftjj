import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";

interface LicenseRequest {
  _id: string;
  id?: string;
  clubId: string;
  personId?: string;
  person?: {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    type?: string;
    photoUrl?: string;
    identityDocumentUrl?: string;
    birthCertificateUrl?: string;
    identityDocumentType?: string;
    athleteDetails?: { grade?: string };
    coachDetails?: {
      blackBeltAttestationUrl?: string;
      coachingAttestationUrl?: string;
      contractUrl?: string;
    };
    refereeDetails?: { refereeDegreeAttestationUrl?: string };
  };
  club?: {
    _id?: string;
    name?: string;
  };
  licenseType?: string;
  paymentReceiptUrl?: string;
  identityDocumentUrl?: string;
  status: string;
  adminComment?: string;
  createdAt: string;
  type?: string;
}

export default function AdminRegistrations(): React.ReactElement {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState<{
    requestId: string;
    label: string;
  } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);

  const {
    data: requestsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["licenses", "pending-requests"],
    queryFn: async () => {
      const res = await api.get("/licenses/pending-requests");
      return (((res.data as any)?.data ?? res.data) as LicenseRequest[]) || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/licenses/request/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["licenses", "pending-requests"],
      });
      toast.success("Demande de licence approuvée avec succès");
      setConfirmApprove(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'approbation",
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.patch(`/licenses/request/${id}/reject`, { adminComment: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["licenses", "pending-requests"],
      });
      toast.success("Demande de licence refusée");
      setRejectModal(null);
      setRejectComment("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur lors du refus");
    },
  });

  const requests = requestsData || [];

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des demandes de licence..." />
      </div>
    );
  }

  if (isError && !requestsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message ||
            "Impossible de charger les demandes de licence"
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

  const getPersonName = (req: LicenseRequest): string => {
    if (req.person) {
      const { firstName, lastName, name } = req.person;
      if (firstName && lastName) return `${firstName} ${lastName}`;
      if (name) return name;
    }
    return "—";
  };

  const getLicenseLabel = (req: LicenseRequest): string => {
    if (req.licenseType) return req.licenseType;
    if (req.type) return req.type;
    return "—";
  };

  const getFileLink = (
    url: string | undefined,
    label: string,
  ): React.ReactNode => {
    if (!url) return null;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "var(--red)",
          fontWeight: 600,
          textDecoration: "underline",
          fontSize: "0.85rem",
        }}
      >
        {label}
      </a>
    );
  };

  const renderDocs = (req: LicenseRequest): React.ReactNode => {
    const p = req.person;
    if (!p) return <span className="muted">—</span>;
    const links: React.ReactNode[] = [];
    if (p.photoUrl) links.push(getFileLink(p.photoUrl, "📷 Photo"));
    if (p.identityDocumentUrl) {
      const label =
        p.identityDocumentType === "BIRTH_CERTIFICATE"
          ? "📄 Acte naiss."
          : "📄 CIN";
      links.push(getFileLink(p.identityDocumentUrl, label));
    }
    if (p.birthCertificateUrl)
      links.push(getFileLink(p.birthCertificateUrl, "📄 Acte naiss."));
    if (req.paymentReceiptUrl)
      links.push(getFileLink(req.paymentReceiptUrl, "🧾 Reçu"));
    if (p.coachDetails?.blackBeltAttestationUrl)
      links.push(
        getFileLink(p.coachDetails.blackBeltAttestationUrl, "🥋 Black Belt"),
      );
    if (p.coachDetails?.coachingAttestationUrl)
      links.push(
        getFileLink(p.coachDetails.coachingAttestationUrl, "📋 Coaching"),
      );
    if (p.coachDetails?.contractUrl)
      links.push(getFileLink(p.coachDetails.contractUrl, "📝 Contrat"));
    if (p.refereeDetails?.refereeDegreeAttestationUrl)
      links.push(
        getFileLink(p.refereeDetails.refereeDegreeAttestationUrl, "⚖️ Arbitre"),
      );
    if (links.length === 0) return <span className="muted">—</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {links}
      </div>
    );
  };

  return (
    <div className="page">
      <PageHeader
        title="Demandes de licence"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Demandes de licence" },
        ]}
      />

      <div className="table-card">
        {requests.length === 0 ? (
          <EmptyState
            title="Aucune demande en attente"
            description="Toutes les demandes de licence ont été traitées"
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Personne</th>
                  <th>Type de licence</th>
                  <th>Documents</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id || req.id}>
                    <td>{req.club?.name || "—"}</td>
                    <td>{getPersonName(req)}</td>
                    <td>{getLicenseLabel(req)}</td>
                    <td>{renderDocs(req)}</td>
                    <td>
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() =>
                            setConfirmApprove(req._id || req.id || "")
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
                              requestId: req._id || req.id || "",
                              label: getPersonName(req),
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
        title="Approuver la demande de licence"
        message="Êtes-vous sûr de vouloir approuver cette demande de licence ?"
        confirmLabel="Approuver"
        variant="default"
        onConfirm={() => {
          if (confirmApprove) {
            approveMutation.mutate(confirmApprove);
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
            <h3>Refuser la demande de licence</h3>
            <p style={{ marginBottom: 12 }}>
              Motif du refus pour <strong>{rejectModal.label}</strong> :
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
                    id: rejectModal.requestId,
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
