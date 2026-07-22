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
import type { Person } from "../../types";

interface AthleteFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: "MALE" | "FEMALE";
  identityDocumentType: "CIN" | "BIRTH_CERTIFICATE";
  identityDocumentUrl: string;
  birthCertificateUrl: string;
  photoUrl: string;
  grade: string;
  achievements: string[];
  paymentReceiptUrl: string;
}

const emptyForm: AthleteFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "Tunisienne",
  gender: "MALE",
  identityDocumentType: "CIN",
  identityDocumentUrl: "",
  birthCertificateUrl: "",
  photoUrl: "",
  grade: "",
  achievements: [],
  paymentReceiptUrl: "",
};

export default function ClubAthletes(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clubId = user?.club?._id || user?.club?.id || "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<AthleteFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");

  const {
    data: personsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["persons", "ATHLETE", clubId, searchText],
    queryFn: async () => {
      const res = await api.get("/persons", {
        params: { type: "ATHLETE", clubId, search: searchText || undefined },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: !!clubId,
  });

  const persons = personsData || [];

  const ageAtDOB = useMemo(() => {
    if (!form.dateOfBirth) return 99;
    const dob = new Date(form.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }, [form.dateOfBirth]);

  function openCreate() {
    setEditingPerson(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(person: Person) {
    setEditingPerson(person);
    setForm({
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.slice(0, 10) : "",
      nationality: person.nationality || "Tunisienne",
      gender: person.gender || "MALE",
      identityDocumentType: person.identityDocumentType || "CIN",
      identityDocumentUrl: person.identityDocumentUrl || "",
      birthCertificateUrl: (person as any).birthCertificateUrl || "",
      photoUrl: person.photoUrl || "",
      grade: person.grade || "",
      achievements: Array.isArray((person as any).achievements) ? (person as any).achievements : [],
      paymentReceiptUrl: (person as any).paymentReceiptUrl || "",
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
    if (!form.dateOfBirth) {
      toast.error("La date de naissance est obligatoire");
      return;
    }
    if (ageAtDOB < 18 && form.identityDocumentType !== "BIRTH_CERTIFICATE") {
      toast.error(
        "Pour les mineurs, le type de pièce d'identité doit être un acte de naissance",
      );
      return;
    }

    const payload: any = {
      type: "ATHLETE",
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth,
      nationality: form.nationality.trim(),
      gender: form.gender,
      identityDocumentType: form.identityDocumentType,
      identityDocumentUrl: form.identityDocumentUrl || undefined,
      birthCertificateUrl: form.birthCertificateUrl || undefined,
      photoUrl: form.photoUrl || undefined,
      grade: form.grade.trim() || undefined,
      achievements: form.achievements.length > 0 ? form.achievements : undefined,
      paymentReceiptUrl: form.paymentReceiptUrl || undefined,
    };

    // Clean empty strings — let backend auto-assign clubId from JWT
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
        toast.success("Athlète modifié avec succès");
      } else {
        await api.post("/persons", payload);
        toast.success("Athlète créé avec succès");
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
      toast.success("Athlète supprimé avec succès");
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
        <LoadingSpinner text="Chargement des athlètes..." />
      </div>
    );
  }

  if (isError && !personsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les athlètes"
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
        title="Mes athlètes"
        breadcrumbs={[
          { label: "Club", to: "/club" },
          { label: "Mes athlètes" },
        ]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Ajouter un athlète
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
              {editingPerson ? "Modifier l'athlète" : "Ajouter un athlète"}
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
                  Date de naissance{" "}
                  <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm({ ...form, dateOfBirth: e.target.value })
                    }
                    required
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
                <div className="files"></div>
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
                  {ageAtDOB < 18 && (
                    <small
                      style={{
                        color: "var(--gold)",
                        marginTop: 4,
                        display: "block",
                      }}
                    >
                      Mineur : l'acte de naissance est obligatoire
                    </small>
                  )}
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
                    {getGradesForRole("ATHLETE").map((g) => (
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
                      setForm({ ...form, birthCertificateUrl: url })
                    }
                    currentUrl={form.birthCertificateUrl || null}
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
                <FileUpload label="Reçu de paiement" accept=".pdf,.jpg,.jpeg,.png" maxSizeMB={5} onUploaded={(url) => setForm({ ...form, paymentReceiptUrl: url })} currentUrl={form.paymentReceiptUrl || null} />
              </div>

              <div style={{ marginTop: 20 }}>
                <label className="field-label" style={{ marginBottom: 8 }}>Palmarès</label>
                {form.achievements.map((ach, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input type="text" value={ach}
                      onChange={(e) => { const u = [...form.achievements]; u[i] = e.target.value; setForm({ ...form, achievements: u }); }}
                      placeholder="Ex: 🥇 Champion National 2025" style={inputStyle} />
                    <button type="button" className="btn danger" style={{ padding: "8px 12px" }}
                      onClick={() => setForm({ ...form, achievements: form.achievements.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn ghost" style={{ marginTop: 4 }}
                  onClick={() => setForm({ ...form, achievements: [...form.achievements, ""] })}>
                  + Ajouter un accomplissement
                </button>
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

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "10px 16px", fontSize: "0.9rem", width: 300,
          }}
        />
        {searchText && (
          <button className="btn ghost" onClick={() => setSearchText("")}>
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
            title="Aucun athlète"
            description="Aucun athlète n'a encore été enregistré dans votre club."
            action={
              <button className="btn primary" onClick={openCreate}>
                Ajouter un athlète
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
                  <th>Palmarès</th>
                  <th>Documents</th>
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
                    <td>{(p as any).achievements?.length || 0} titre{(p as any).achievements?.length !== 1 ? "s" : ""}</td>
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
                            CIN
                          </a>
                        ) : null}
                        {(p as any).birthCertificateUrl ? (
                          <a
                            href={(p as any).birthCertificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--red)",
                              textDecoration: "underline",
                            }}
                          >
                            Acte naissance
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
                        {!(p as any).identityDocumentUrl &&
                        !(p as any).birthCertificateUrl &&
                        !(p as any).photoUrl
                          ? "—"
                          : null}
                      </div>
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer l'athlète"
        message={`Êtes-vous sûr de vouloir supprimer l'athlète « ${deleteTarget?.firstName} ${deleteTarget?.lastName} » ? Cette action est irréversible.`}
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
