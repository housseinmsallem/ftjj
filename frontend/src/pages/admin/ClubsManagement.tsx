import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";

interface Club {
  _id: string;
  id?: string;
  name: string;
  shortName?: string;
  ownerId?: string;
  owner?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  address?: string;
  governorate?: string;
  status?: string;
}

interface ClubFormData {
  name: string;
  address: string;
}

const emptyForm: ClubFormData = { name: "", address: "" };

export default function ClubsManagement(): React.ReactElement {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [form, setForm] = useState<ClubFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: clubsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return (((res.data as any)?.data ?? res.data) as Club[]) || [];
    },
  });

  const clubs = clubsData || [];

  function openCreate() {
    setEditingClub(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(club: Club) {
    setEditingClub(club);
    setForm({ name: club.name, address: club.address || "" });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingClub(null);
    setForm(emptyForm);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom du club est obligatoire");
      return;
    }
    setSaving(true);
    try {
      if (editingClub) {
        await api.patch(`/clubs/${editingClub._id || editingClub.id}`, {
          name: form.name.trim(),
          address: form.address.trim(),
        });
        toast.success("Club modifié avec succès");
      } else {
        await api.post("/clubs", {
          name: form.name.trim(),
          address: form.address.trim(),
        });
        toast.success("Club créé avec succès");
      }
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      closeModal();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'enregistrement",
      );
    } finally {
      setSaving(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clubs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      toast.success("Club supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  function getOwnerName(club: Club): string {
    if (club.owner) {
      const { firstName, lastName, email } = club.owner;
      if (firstName && lastName) return `${firstName} ${lastName}`;
      if (email) return email;
    }
    return "—";
  }

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des clubs..." />
      </div>
    );
  }

  if (isError && !clubsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les clubs"
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
        title="Gestion des clubs"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Gestion des clubs" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Ajouter un club
          </button>
        }
      />

      <div className="table-card">
        {clubs.length === 0 ? (
          <EmptyState
            title="Aucun club"
            description="Aucun club n'a encore été créé"
            action={
              <button className="btn primary" onClick={openCreate}>
                Ajouter un club
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse</th>
                  <th>Propriétaire</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => (
                  <tr key={club._id || club.id}>
                    <td>{club.name}</td>
                    <td>{club.address || "—"}</td>
                    <td>{getOwnerName(club)}</td>
                    <td>
                      <StatusBadge status={club.status || "ACTIVE"} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() => openEdit(club)}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => setDeleteTarget(club)}
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
            <h3>{editingClub ? "Modifier le club" : "Ajouter un club"}</h3>
            <form onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-grid">
                <label className="field-label">
                  Nom <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nom du club"
                    required
                    style={{
                      background: "var(--bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "11px 12px",
                    }}
                  />
                </label>
                <label className="field-label">
                  Adresse
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Adresse du club"
                    style={{
                      background: "var(--bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "11px 12px",
                    }}
                  />
                </label>
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
                    : editingClub
                      ? "Enregistrer"
                      : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le club"
        message={`Êtes-vous sûr de vouloir supprimer le club « ${deleteTarget?.name} » ? Cette action est irréversible.`}
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
