import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import FileUpload from "../../components/shared/FileUpload";
import { COUNTRIES, getGradesForRole } from "../../utils/formOptions";
import type { Person } from "../../types";

interface Club {
  _id: string;
  id?: string;
  name: string;
}

interface TechnicianFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: "MALE" | "FEMALE";
  identityDocumentType: "CIN" | "BIRTH_CERTIFICATE";
  identityDocumentUrl: string;
  photoUrl: string;
  grade: string;
  clubId: string;
  specialization: string;
}

const emptyForm: TechnicianFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "Tunisienne",
  gender: "MALE",
  identityDocumentType: "CIN",
  identityDocumentUrl: "",
  photoUrl: "",
  grade: "",
  clubId: "",
  specialization: "",
};

export default function TechniciansManagement(): React.ReactElement {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<TechnicianFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: personsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["persons", "TECHNICIAN"],
    queryFn: async () => {
      const res = await api.get("/persons", { params: { type: "TECHNICIAN" } });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
  });

  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return (((res.data as any)?.data ?? res.data) as Club[]) || [];
    },
  });

  const persons = personsData || [];
  const clubs = clubsData || [];

  function openCreate() {
    setEditingPerson(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(person: Person) {
    setEditingPerson(person);
    const ext = person as any;
    setForm({
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.slice(0, 10) : "",
      nationality: person.nationality || "Tunisienne",
      gender: person.gender || "MALE",
      identityDocumentType: person.identityDocumentType || "CIN",
      identityDocumentUrl: person.identityDocumentUrl || "",
      photoUrl: person.photoUrl || "",
      grade: person.grade || "",
      clubId: person.clubId || person.club?._id || person.club?.id || "",
      specialization: ext.specialization || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPerson(null);
    setForm(emptyForm);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Le prénom et le nom sont obligatoires");
      return;
    }

    const payload: any = {
      type: "TECHNICIAN",
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality.trim(),
      gender: form.gender,
      identityDocumentType: form.identityDocumentType,
      identityDocumentUrl: form.identityDocumentUrl,
      photoUrl: form.photoUrl || undefined,
      grade: form.grade.trim() || undefined,
      clubId: form.clubId || undefined,
      specialization: form.specialization.trim() || undefined,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) delete payload[k];
    });

    setSaving(true);
    try {
      if (editingPerson) {
        await api.patch(
          `/persons/${editingPerson._id || editingPerson.id}`,
          payload,
        );
        toast.success("Technicien modifié avec succès");
      } else {
        await api.post("/persons", payload);
        toast.success("Technicien créé avec succès");
      }
      queryClient.invalidateQueries({ queryKey: ["persons"] });
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
    mutationFn: (id: string) => api.delete(`/persons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Technicien supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  const inputStyle = {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "11px 12px",
  };

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des techniciens..." />
      </div>
    );
  }

  if (isError && !personsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les techniciens"
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
        title="Gestion des techniciens"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Gestion des techniciens" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Ajouter un technicien
          </button>
        }
      />

      <div className="table-card">
        {persons.length === 0 ? (
          <EmptyState
            title="Aucun technicien"
            description="Aucun technicien n'a encore été enregistré"
            action={
              <button className="btn primary" onClick={openCreate}>
                Ajouter un technicien
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Nationalité</th>
                  <th>Club</th>
                  <th>Spécialisation</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((p) => (
                  <tr key={p._id || p.id}>
                    <td>
                      {p.firstName} {p.lastName}
                    </td>
                    <td>{p.nationality || "—"}</td>
                    <td>{p.club?.name || "—"}</td>
                    <td>{(p as any).specialization || "—"}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          fontSize: "0.85rem",
                        }}
                      >
                        {(p as any).identityDocumentUrl ? (
                          <a
                            href={(p as any).identityDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--red)",
                              textDecoration: "underline",
                            }}
                          >
                            Pièce d'identité
                          </a>
                        ) : null}
                        {(p as any).photoUrl ? (
                          <a
                            href={(p as any).photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--red)",
                              textDecoration: "underline",
                            }}
                          >
                            Photo
                          </a>
                        ) : null}
                        {!(p as any).identityDocumentUrl && !(p as any).photoUrl
                          ? "—"
                          : null}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() => openEdit(p)}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => setDeleteTarget(p)}
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
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 700, maxHeight: "85vh", overflow: "auto" }}
          >
            <h3>
              {editingPerson
                ? "Modifier le technicien"
                : "Ajouter un technicien"}
            </h3>
            <form onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-grid">
                <label className="field-label">
                  Prénom <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    placeholder="Prénom"
                    required
                    style={inputStyle}
                  />
                </label>
                <label className="field-label">
                  Nom <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    placeholder="Nom"
                    required
                    style={inputStyle}
                  />
                </label>
                <label className="field-label">
                  Date de naissance
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm({ ...form, dateOfBirth: e.target.value })
                    }
                    style={inputStyle}
                  />
                </label>
                <label className="field-label">
                  Nationalité
                  <select
                    value={form.nationality || "Tunisienne"}
                    onChange={(e) =>
                      setForm({ ...form, nationality: e.target.value })
                    }
                    style={inputStyle}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Genre
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gender: e.target.value as "MALE" | "FEMALE",
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="MALE">Homme</option>
                    <option value="FEMALE">Femme</option>
                  </select>
                </label>
                <label className="field-label">
                  Type de pièce d'identité
                  <select
                    value={form.identityDocumentType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        identityDocumentType: e.target.value as
                          "CIN" | "BIRTH_CERTIFICATE",
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="CIN">CIN</option>
                    <option value="BIRTH_CERTIFICATE">Acte de naissance</option>
                  </select>
                </label>
                <label className="field-label">
                  Grade Newaza
                  <select
                    value={form.grade || ""}
                    onChange={(e) =>
                      setForm({ ...form, grade: e.target.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">Sélectionner un grade</option>
                    {getGradesForRole("TECHNICIAN").map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Club
                  <select
                    value={form.clubId}
                    onChange={(e) =>
                      setForm({ ...form, clubId: e.target.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">— Aucun —</option>
                    {clubs.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Spécialisation
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={(e) =>
                      setForm({ ...form, specialization: e.target.value })
                    }
                    placeholder="Ex: Arbitrage vidéo"
                    style={inputStyle}
                  />
                </label>
              </div>

              {/* Dynamic identity document upload */}
              {form.identityDocumentType === "CIN" ? (
                <div style={{ marginTop: 18 }}>
                  <FileUpload
                    label="Pièce d'identité (CIN)"
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSizeMB={5}
                    onUploaded={(url) =>
                      setForm({ ...form, identityDocumentUrl: url })
                    }
                    currentUrl={form.identityDocumentUrl || null}
                  />
                </div>
              ) : (
                <div style={{ marginTop: 18 }}>
                  <FileUpload
                    label="Acte de naissance"
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSizeMB={5}
                    onUploaded={(url) =>
                      setForm({ ...form, identityDocumentUrl: url })
                    }
                    currentUrl={form.identityDocumentUrl || null}
                  />
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Photo"
                  accept=".jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) => setForm({ ...form, photoUrl: url })}
                  currentUrl={form.photoUrl || null}
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
                    : editingPerson
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
        title="Supprimer le technicien"
        message={`Êtes-vous sûr de vouloir supprimer le technicien « ${deleteTarget?.firstName} ${deleteTarget?.lastName} » ? Cette action est irréversible.`}
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
