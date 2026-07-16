import React, { useState, useMemo } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import FileUpload from "../../components/shared/FileUpload";
import type { Person, Pricing } from "../../types";

interface Registration {
  _id: string;
  id?: string;
  personId?: string;
  person?: Person;
  clubId?: string;
  licenseType?: string;
  paymentReceiptUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string;
  createdAt: string;
}

export default function ClubRegistrations(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clubId = user?.club?._id || user?.club?.id || "";

  const [statusFilter, setStatusFilter] = useState<string>("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Registration | null>(null);
  const [form, setForm] = useState({
    personId: "",
    pricingId: "",
    paymentReceiptUrl: "",
  });

  // Fetch registrations
  const {
    data: registrationsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["registrations", clubId],
    queryFn: async () => {
      const res = await api.get("/registrations", {
        params: { clubId },
      });
      const data = res.data?.data ?? res.data;
      return (Array.isArray(data) ? data : []) as Registration[];
    },
    enabled: !!clubId,
  });

  // Fetch club's persons for the dropdown
  const { data: persons } = useQuery({
    queryKey: ["persons", clubId, "all"],
    queryFn: async () => {
      const res = await api.get("/persons", {
        params: { clubId },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: !!clubId,
  });

  // Fetch pricing / license types
  const { data: pricingOptions } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await api.get("/pricing");
      const data = res.data?.data ?? res.data;
      return (Array.isArray(data) ? data : []) as Pricing[];
    },
  });

  const registrations = registrationsData || [];
  const licenseTypeOptions = useMemo(() => {
    if (!pricingOptions || pricingOptions.length === 0) return [];
    return pricingOptions.filter((p) => p.category === "LICENSE");
  }, [pricingOptions]);

  const filteredRegistrations = useMemo(() => {
    if (statusFilter === "Tous") return registrations;
    return registrations.filter((r) => r.status === statusFilter);
  }, [registrations, statusFilter]);

  function getPersonName(reg: Registration): string {
    if (reg.person) {
      return `${reg.person.firstName} ${reg.person.lastName}`;
    }
    if (reg.personId) {
      const found = persons?.find((p) => (p._id || p.id) === reg.personId);
      if (found) return `${found.firstName} ${found.lastName}`;
    }
    return "—";
  }

  function openCreate() {
    setForm({ personId: "", pricingId: "", paymentReceiptUrl: "" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.personId) {
      toast.error("Veuillez sélectionner une personne");
      return;
    }
    if (!form.pricingId) {
      toast.error("Veuillez sélectionner un type de licence");
      return;
    }
    if (!form.paymentReceiptUrl) {
      toast.error("Veuillez télécharger un reçu de paiement");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        personId: form.personId,
        pricingId: form.pricingId,
        paymentReceiptUrl: form.paymentReceiptUrl || undefined,
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === undefined) delete payload[k];
      });
      await api.post("/licenses", payload);
      toast.success("Demande d'inscription envoyée avec succès");
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      closeModal();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'envoi de la demande",
      );
    } finally {
      setSaving(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/licenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      toast.success("Demande d'inscription supprimée");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
    width: "100%",
  };

  const filterTabs = ["Tous", "PENDING", "APPROVED", "REJECTED"];

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des inscriptions..." />
      </div>
    );
  }

  if (isError && !registrationsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message ||
            "Impossible de charger les demandes d'inscription"
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

  const countsByStatus = {
    Tous: registrations.length,
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    APPROVED: registrations.filter((r) => r.status === "APPROVED").length,
    REJECTED: registrations.filter((r) => r.status === "REJECTED").length,
  };

  return (
    <div className="page">
      <PageHeader
        title="Gestion des inscriptions"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Gestion des inscriptions" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Nouvelle inscription
          </button>
        }
      />

      {/* Status filter tabs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab}
            className={`btn ${statusFilter === tab ? "primary" : "ghost"}`}
            onClick={() => setStatusFilter(tab)}
            style={{
              fontSize: "0.85rem",
              padding: "6px 14px",
            }}
          >
            {tab === "Tous"
              ? "Tous"
              : tab === "PENDING"
                ? "En attente"
                : tab === "APPROVED"
                  ? "Approuvé"
                  : "Refusé"}
            {countsByStatus[tab] != null && (
              <span
                style={{
                  marginLeft: 6,
                  background:
                    statusFilter === tab
                      ? "rgba(255,255,255,0.2)"
                      : "var(--border)",
                  borderRadius: 10,
                  padding: "1px 8px",
                  fontSize: "0.75rem",
                }}
              >
                {countsByStatus[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Registrations table */}
      <div className="table-card">
        {filteredRegistrations.length === 0 ? (
          <EmptyState
            title="Aucune demande"
            description={
              registrations.length === 0
                ? "Aucune demande d'inscription n'a encore été créée."
                : "Aucune demande ne correspond au filtre sélectionné."
            }
            action={
              registrations.length === 0 ? (
                <button className="btn primary" onClick={openCreate}>
                  Nouvelle inscription
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Type de licence</th>
                  <th>Reçu de paiement</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Commentaire admin</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((reg) => (
                  <tr key={reg._id || reg.id}>
                    <td>{getPersonName(reg)}</td>
                    <td>{reg.licenseType || "—"}</td>
                    <td>
                      {reg.paymentReceiptUrl ? (
                        <a
                          href={reg.paymentReceiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--red)",
                            fontWeight: 600,
                            textDecoration: "underline",
                          }}
                        >
                          Voir le reçu
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={reg.status} />
                    </td>
                    <td>
                      {reg.createdAt
                        ? new Date(reg.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      {reg.adminComment ? (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--muted)",
                            maxWidth: 180,
                            display: "inline-block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={reg.adminComment}
                        >
                          {reg.adminComment}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {reg.status === "PENDING" && (
                          <button
                            className="btn danger"
                            onClick={() => setDeleteTarget(reg)}
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New registration modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: "85vh", overflow: "auto" }}
          >
            <h3>Nouvelle inscription</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
              <div className="form-grid">
                <label className="field-label">
                  Personne <span style={{ color: "var(--red)" }}>*</span>
                  <select
                    value={form.personId}
                    onChange={(e) =>
                      setForm({ ...form, personId: e.target.value })
                    }
                    required
                    style={inputStyle}
                  >
                    <option value="">-- Sélectionner une personne --</option>
                    {persons?.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.firstName} {p.lastName} {p.type ? `(${p.type})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Type de licence <span style={{ color: "var(--red)" }}>*</span>
                  {licenseTypeOptions.length > 0 ? (
                    <select
                      value={form.pricingId}
                      onChange={(e) =>
                        setForm({ ...form, pricingId: e.target.value })
                      }
                      required
                      style={inputStyle}
                    >
                      <option value="">-- Sélectionner --</option>
                      {licenseTypeOptions.map((p) => (
                        <option key={p._id || p.id} value={p._id || p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.pricingId}
                      onChange={(e) =>
                        setForm({ ...form, pricingId: e.target.value })
                      }
                      placeholder="Ex: Licence annuelle"
                      required
                      style={inputStyle}
                    />
                  )}
                </label>
              </div>

              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Reçu de paiement"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) =>
                    setForm({ ...form, paymentReceiptUrl: url })
                  }
                  currentUrl={form.paymentReceiptUrl || null}
                />
              </div>

              <div
                className="modal-actions"
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                }}
              >
                <button type="button" className="btn" onClick={closeModal}>
                  Annuler
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Envoi..." : "Envoyer la demande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Annuler la demande"
        message={`Êtes-vous sûr de vouloir annuler la demande d'inscription pour « ${deleteTarget ? getPersonName(deleteTarget) : ""} » ?`}
        confirmLabel="Annuler la demande"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget._id || deleteTarget.id || "");
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
