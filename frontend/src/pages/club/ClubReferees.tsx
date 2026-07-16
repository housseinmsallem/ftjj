import React, { useState } from "react";
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
import { COUNTRIES, getGradesForRole } from "../../utils/formOptions";
import type { Person } from "../../types";

interface RefereeFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: "MALE" | "FEMALE";
  identityDocumentType: "CIN" | "BIRTH_CERTIFICATE";
  identityDocumentUrl: string;
  photoUrl: string;
  grade: string;
  refereeDegreeAttestationUrl: string;
}

const emptyForm: RefereeFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "Tunisienne",
  gender: "MALE",
  identityDocumentType: "CIN",
  identityDocumentUrl: "",
  photoUrl: "",
  grade: "",
  refereeDegreeAttestationUrl: "",
};

export default function ClubReferees(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clubId = user?.club?._id || user?.club?.id || "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<RefereeFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    data: personsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["persons", "REFEREE", clubId],
    queryFn: async () => {
      const res = await api.get("/persons", {
        params: { type: "REFEREE", clubId },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: !!clubId,
  });

  const persons = personsData || [];

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
      refereeDegreeAttestationUrl: ext.refereeDegreeAttestationUrl || "",
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
      type: "REFEREE",
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality.trim(),
      gender: form.gender,
      identityDocumentType: form.identityDocumentType,
      identityDocumentUrl: form.identityDocumentUrl,
      photoUrl: form.photoUrl,
      grade: form.grade.trim(),
      clubId,
      refereeDegreeAttestationUrl:
        form.refereeDegreeAttestationUrl || undefined,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) delete payload[k];
    });
    delete payload.clubId;

    setSaving(true);
    try {
      if (editingPerson) {
        await api.patch(
          `/persons/${editingPerson._id || editingPerson.id}`,
          payload,
        );
        toast.success("Arbitre modifié avec succès");
      } else {
        await api.post("/persons", payload);
        toast.success("Arbitre créé avec succès");
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
      toast.success("Arbitre supprimé avec succès");
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
  };

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des arbitres..." />
      </div>
    );
  }

  if (isError && !personsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les arbitres"
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
        title="Mes arbitres"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Mes arbitres" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Ajouter un arbitre
          </button>
        }
      />

      <div className="table-card">
        {persons.length === 0 ? (
          <EmptyState
            title="Aucun arbitre"
            description="Aucun arbitre n'a encore été enregistré dans votre club."
            action={
              <button className="btn primary" onClick={openCreate}>
                Ajouter un arbitre
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Date de naissance</th>
                  <th>Nationalité</th>
                  <th>Attestation</th>
                  <th>Statut Licence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((p) => (
                  <tr key={p._id || p.id}>
                    <td>
                      {p.firstName} {p.lastName}
                    </td>
                    <td>
                      {p.dateOfBirth
                        ? new Date(p.dateOfBirth).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>{p.nationality || "—"}</td>
                    <td>
                      {(p as any).refereeDegreeAttestationUrl ? (
                        <a
                          href={(p as any).refereeDegreeAttestationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--red)", fontWeight: 600 }}
                        >
                          Voir
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={(p as any).licenseStatus || "PENDING"}
                      />
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
              {editingPerson ? "Modifier l'arbitre" : "Ajouter un arbitre"}
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
                    <option value="">Sélectionner...</option>
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
                  Grade
                  <select
                    value={form.grade || ""}
                    onChange={(e) =>
                      setForm({ ...form, grade: e.target.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">Sélectionner un grade</option>
                    {getGradesForRole("REFEREE").map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
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
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Attestation degré arbitre"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) =>
                    setForm({ ...form, refereeDegreeAttestationUrl: url })
                  }
                  currentUrl={form.refereeDegreeAttestationUrl || null}
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
        title="Supprimer l'arbitre"
        message={`Êtes-vous sûr de vouloir supprimer l'arbitre « ${deleteTarget?.firstName} ${deleteTarget?.lastName} » ? Cette action est irréversible.`}
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
