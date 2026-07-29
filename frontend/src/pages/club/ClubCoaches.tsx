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
import { COUNTRIES, getGradesForRole } from "../../utils/formOptions";
import { useDebounce } from "../../hooks/useDebounce";
import type { Person } from "../../types";

interface CoachFormData {
  firstName: string;
  lastName: string;
  arabicFirstName?: string;
  arabicLastName?: string;
  dateOfBirth: string;
  nationality: string;
  gender: "MALE" | "FEMALE";
  identityDocumentType: "CIN" | "BIRTH_CERTIFICATE";
  identityDocumentUrl: string;
  photoUrl: string;
  grade: string;
  blackBeltAttestationUrl: string;
  coachingAttestationUrl: string;
  contractUrl: string;
  paymentReceiptUrl: string;
}

const emptyForm: CoachFormData = {
  firstName: "",
  lastName: "",
  arabicFirstName: "",
  arabicLastName: "",
  dateOfBirth: "",
  nationality: "Tunisienne",
  gender: "MALE",
  identityDocumentType: "CIN",
  identityDocumentUrl: "",
  photoUrl: "",
  grade: "",
  blackBeltAttestationUrl: "",
  coachingAttestationUrl: "",
  contractUrl: "",
  paymentReceiptUrl: "",
};

export default function ClubCoaches(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clubId = user?.club?._id || user?.club?.id || "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<CoachFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, 300);

  const {
    data: personsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["persons", "COACH", clubId],
    queryFn: async () => {
      const res = await api.get("/persons", {
        params: { type: "COACH", clubId },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: !!clubId,
  });

  const allPersons = personsData || [];

  // Client-side filtering
  const persons = useMemo(() => {
    if (!searchText.trim()) return allPersons;
    const q = searchText.toLowerCase();
    return allPersons.filter((p: any) => {
      const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
      return fullName.includes(q);
    });
  }, [allPersons, searchText]);

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
      arabicFirstName: ext.arabicFirstName || "",
      arabicLastName: ext.arabicLastName || "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.slice(0, 10) : "",
      nationality: person.nationality || "Tunisienne",
      gender: person.gender || "MALE",
      identityDocumentType: person.identityDocumentType || "CIN",
      identityDocumentUrl: person.identityDocumentUrl || "",
      photoUrl: person.photoUrl || "",
      grade: person.grade || "",
      blackBeltAttestationUrl: ext.blackBeltAttestationUrl || "",
      coachingAttestationUrl: ext.coachingAttestationUrl || "",
      contractUrl: ext.contractUrl || "",
      paymentReceiptUrl: ext.paymentReceiptUrl || "",
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
      type: "COACH",
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      arabicFirstName: form.arabicFirstName?.trim() || undefined,
      arabicLastName: form.arabicLastName?.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality.trim(),
      gender: form.gender,
      identityDocumentType: form.identityDocumentType,
      identityDocumentUrl: form.identityDocumentUrl,
      photoUrl: form.photoUrl,
      grade: form.grade.trim(),
      clubId,
      blackBeltAttestationUrl: form.blackBeltAttestationUrl || undefined,
      coachingAttestationUrl: form.coachingAttestationUrl || undefined,
      contractUrl: form.contractUrl || undefined,
      paymentReceiptUrl: form.paymentReceiptUrl || undefined,
    };

    // Clean empty strings — let backend auto-assign clubId from JWT
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) delete payload[k];
    });
    delete payload.clubId; // Never send clubId from club forms

    setSaving(true);
    try {
      if (editingPerson) {
        await api.patch(
          `/persons/${editingPerson._id || editingPerson.id}`,
          payload,
        );
        toast.success("Entraîneur modifié avec succès");
      } else {
        await api.post("/persons", payload);
        toast.success("Entraîneur créé avec succès");
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
      toast.success("Entraîneur supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  function attestationStatus(person: any): string {
    const has = (url: string) => url && url.length > 0;
    const count = [
      has(person.blackBeltAttestationUrl),
      has(person.coachingAttestationUrl),
      has(person.contractUrl),
    ].filter(Boolean).length;
    if (count === 3) return "Complet";
    if (count > 0) return `Partiel (${count}/3)`;
    return "Aucun";
  }

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
        <LoadingSpinner text="Chargement des entraîneurs..." />
      </div>
    );
  }

  if (isError && !personsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les entraîneurs"
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
        title="Mes entraîneurs"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Mes entraîneurs" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Ajouter un entraîneur
          </button>
        }
      />

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
                ? "Modifier l'entraîneur"
                : "Ajouter un entraîneur"}
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
                <input type="text" value={form.arabicFirstName || ""}
                  onChange={(e) => setForm({ ...form, arabicFirstName: e.target.value })}
                  placeholder="الاسم (Prénom en arabe)" style={inputStyle} />
                <input type="text" value={form.arabicLastName || ""}
                  onChange={(e) => setForm({ ...form, arabicLastName: e.target.value })}
                  placeholder="اللقب (Nom en arabe)" style={inputStyle} />
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
                    {getGradesForRole("COACH").map((g) => (
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
                    hint="Dimensions recommandées : 300×400 px (portrait)"
                    maxSizeMB={5}
                    onUploaded={(url) => setForm({ ...form, photoUrl: url })}
                    currentUrl={form.photoUrl || null}
                  />
              </div>
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Attestation ceinture noire"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) =>
                    setForm({ ...form, blackBeltAttestationUrl: url })
                  }
                  currentUrl={form.blackBeltAttestationUrl || null}
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Attestation d'entraîneur"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) =>
                    setForm({ ...form, coachingAttestationUrl: url })
                  }
                  currentUrl={form.coachingAttestationUrl || null}
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Contrat"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) => setForm({ ...form, contractUrl: url })}
                  currentUrl={form.contractUrl || null}
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Reçu de paiement"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={5}
                  onUploaded={(url) => setForm({ ...form, paymentReceiptUrl: url })}
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

      <div className="admin-search-bar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Rechercher par nom..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button className="btn ghost" onClick={() => setSearchInput("")}>
            ✕ Effacer
          </button>
        )}
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {persons.length} résultat{persons.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="table-card">
        {persons.length === 0 ? (
          <EmptyState
            title="Aucun entraîneur"
            description="Aucun entraîneur n'a encore été enregistré dans votre club."
            action={
              <button className="btn primary" onClick={openCreate}>
                Ajouter un entraîneur
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer l'entraîneur"
        message={`Êtes-vous sûr de vouloir supprimer l'entraîneur « ${deleteTarget?.firstName} ${deleteTarget?.lastName} » ? Cette action est irréversible.`}
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
