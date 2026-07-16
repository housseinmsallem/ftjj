import React, { useState } from "react";
import api from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import FileUpload from "../components/shared/FileUpload";

interface Resource {
  _id: string;
  id?: string;
  name: string;
  type: string;
  fileUrl: string;
  createdAt: string;
}

interface ResourceForm {
  name: string;
  type: string;
  fileUrl: string;
}

const emptyForm: ResourceForm = {
  name: "",
  type: "DOCUMENT",
  fileUrl: "",
};

const resourceTypes = [
  { value: "DOCUMENT", label: "Document" },
  { value: "REGULATION", label: "Réglement" },
  { value: "FORM", label: "Formulaire" },
  { value: "GUIDE", label: "Guide" },
  { value: "OTHER", label: "Autre" },
];

export default function AdminResourcePage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: resourcesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const res = await api.get("/resources");
      return (((res.data as any)?.data ?? res.data) as Resource[]) || [];
    },
  });

  const resources = resourcesData || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Ressource supprimée avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  function openCreate() {
    setEditingResource(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(resource: Resource) {
    setEditingResource(resource);
    setForm({
      name: resource.name || "",
      type: resource.type || "DOCUMENT",
      fileUrl: resource.fileUrl || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingResource(null);
    setForm(emptyForm);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom de la ressource est obligatoire");
      return;
    }
    if (!form.fileUrl) {
      toast.error("Veuillez télécharger un fichier");
      return;
    }
    setSaving(true);
    try {
      if (editingResource) {
        await api.patch(
          `/resources/${editingResource._id || editingResource.id}`,
          form,
        );
        toast.success("Ressource modifiée avec succès");
      } else {
        await api.post("/resources", form);
        toast.success("Ressource créée avec succès");
      }
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      closeModal();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'enregistrement",
      );
    } finally {
      setSaving(false);
    }
  }

  function getTypeLabel(type: string): string {
    const found = resourceTypes.find((t) => t.value === type);
    return found ? found.label : type;
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
    fontSize: "0.9rem",
    width: "100%",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des ressources..." />
      </div>
    );
  }

  if (isError && !resourcesData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les ressources"
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
        title="Ressources"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Ressources" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Ajouter une ressource
          </button>
        }
      />

      <div className="table-card">
        {resources.length === 0 ? (
          <EmptyState
            title="Aucune ressource"
            description="Aucune ressource n'a encore été créée"
            action={
              <button className="btn primary" onClick={openCreate}>
                Ajouter une ressource
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((res) => (
                  <tr key={res._id || res.id}>
                    <td>
                      <a
                        href={res.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--red)", textDecoration: "none" }}
                      >
                        {res.name || "Sans nom"}
                      </a>
                    </td>
                    <td>{getTypeLabel(res.type)}</td>
                    <td>
                      {res.createdAt
                        ? new Date(res.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() => openEdit(res)}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => setDeleteTarget(res)}
                        >
                          Supprimer
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {editingResource
                ? "Modifier la ressource"
                : "Ajouter une ressource"}
            </h3>
            <form onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-grid">
                <label className="field-label">
                  Nom <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nom de la ressource"
                    required
                    style={inputStyle}
                  />
                </label>
                <label className="field-label">
                  Type
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    style={selectStyle}
                  >
                    {resourceTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Fichier de la ressource"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  maxSizeMB={20}
                  onUploaded={(url) => setForm({ ...form, fileUrl: url })}
                  currentUrl={form.fileUrl || null}
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
                  {saving
                    ? "Enregistrement..."
                    : editingResource
                      ? "Enregistrer"
                      : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer la ressource"
        message={`Êtes-vous sûr de vouloir supprimer la ressource « ${deleteTarget?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
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
