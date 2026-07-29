import React, { useState, useMemo } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import FileUpload from "../../components/shared/FileUpload";
import LicensePrintWrapper from "../../components/licences/LicensePrintWrapper";
import type { License, Person, Pricing } from "../../types";

interface Club {
  _id: string;
  id?: string;
  name: string;
}

interface LicenseFormData {
  personId: string;
  pricingId: string;
  medicalCertificateUrl: string;
  paymentReceiptUrl: string;
}

const emptyForm: LicenseFormData = {
  personId: "",
  pricingId: "",
  medicalCertificateUrl: "",
  paymentReceiptUrl: "",
};

export default function LicensesManagement(): React.ReactElement {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LicenseFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);
  const [printLicense, setPrintLicense] = useState<License | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const searchText = useDebounce(searchInput, 300);
  const [activeOnly, setActiveOnly] = useState(false);
  const [filterClubId, setFilterClubId] = useState("");

  // Person search in modal
  const [personSearch, setPersonSearch] = useState("");

  const {
    data: licensesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "licenses",
      { isActive: activeOnly || undefined, clubId: filterClubId || undefined },
    ],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeOnly) params.isActive = "true";
      if (filterClubId) params.clubId = filterClubId;
      const res = await api.get("/licenses", { params });
      return (((res.data as any)?.data ?? res.data) as License[]) || [];
    },
  });

  const { data: personsData } = useQuery({
    queryKey: ["persons"],
    queryFn: async () => {
      const res = await api.get("/persons");
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
  });

  const { data: pricingData } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await api.get("/pricing");
      return (((res.data as any)?.data ?? res.data) as Pricing[]) || [];
    },
  });

  const { data: clubsData } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await api.get("/clubs");
      return (((res.data as any)?.data ?? res.data) as Club[]) || [];
    },
  });

  const licenses = licensesData || [];
  const persons = personsData || [];
  const pricingOptions = pricingData || [];
  const clubs = clubsData || [];

  // Client-side filtering by person name
  const filteredLicenses = useMemo(() => {
    if (!searchText.trim()) return licenses;
    const q = searchText.toLowerCase();
    return licenses.filter((lic) => {
      const person = persons.find((p) => (p._id || p.id) === lic.personId);
      if (!person) return false;
      const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
      return fullName.includes(q);
    });
  }, [licenses, persons, searchText]);

  // Enrich a license with nested person/pricing/club data for printing
  const enrichLicense = (lic: License): any => {
    const person = persons.find((p) => (p._id || p.id) === lic.personId);
    const pricing = pricingOptions.find(
      (p) => (p._id || p.id) === (lic as any).pricingId,
    );
    const club = clubs.find((c) => (c._id || c.id) === person?.clubId);
    return {
      ...lic,
      person: person
        ? {
            ...person,
            club,
            athleteDetails: (person as any).athleteDetails || null,
          }
        : undefined,
      pricing: pricing || undefined,
    };
  };

  // Filter persons for the modal dropdown
  const filteredPersons = useMemo(() => {
    if (!personSearch.trim()) return persons.slice(0, 50);
    const q = personSearch.toLowerCase();
    return persons
      .filter((p) => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(q);
      })
      .slice(0, 30);
  }, [persons, personSearch]);

  function getPersonName(personId: string): string {
    const person = persons.find((p) => (p._id || p.id) === personId);
    if (!person) return "—";
    return `${person.firstName} ${person.lastName}`;
  }

  function getPricingName(pricingId: string): string {
    const pricing = pricingOptions.find(
      (pr) => (pr._id || pr.id) === pricingId,
    );
    return pricing?.name || "—";
  }

  function openCreate() {
    setForm(emptyForm);
    setPersonSearch("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
    setPersonSearch("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.personId) {
      toast.error("Veuillez sélectionner une personne");
      return;
    }
    if (!form.pricingId) {
      toast.error("Veuillez sélectionner un type de licence");
      return;
    }

    setSaving(true);
    try {
      await api.post("/licenses", {
        personId: form.personId,
        pricingId: form.pricingId,
        medicalCertificateUrl: form.medicalCertificateUrl || undefined,
        paymentReceiptUrl: form.paymentReceiptUrl || undefined,
      });
      toast.success("Licence créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      closeModal();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Erreur lors de la création de la licence",
      );
    } finally {
      setSaving(false);
    }
  }

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/licenses/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      toast.success("Licence désactivée avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la désactivation",
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
        <LoadingSpinner text="Chargement des licences..." />
      </div>
    );
  }

  if (isError && !licensesData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les licences"
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
        title="Licences"
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Licences" }]}
        action={
          <button className="btn primary" onClick={openCreate}>
            Nouvelle licence
          </button>
        }
      />

      {/* Filter bar */}
      <div className="admin-search-bar">
        <input
          type="text"
          className="admin-search-input"
          placeholder="Rechercher par nom de personne..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text)",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Actives uniquement
        </label>
        <select
          value={filterClubId}
          onChange={(e) => setFilterClubId(e.target.value)}
          style={{
            ...inputStyle,
            minWidth: 200,
          }}
        >
          <option value="">Tous les clubs</option>
          {clubs.map((c) => (
            <option key={c._id || c.id} value={c._id || c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        {filteredLicenses.length === 0 ? (
          <EmptyState
            title="Aucune licence"
            description="Aucune licence trouvée avec les filtres actuels"
            action={
              <button className="btn primary" onClick={openCreate}>
                Nouvelle licence
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Type de licence</th>
                  <th>Date d'émission</th>
                  <th>Date d'expiration</th>
                  <th>Statut</th>
                  <th>Validé par admin</th>
                  <th>Reçu de paiement</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLicenses.map((lic) => (
                  <tr key={lic._id || lic.id}>
                    <td>{getPersonName(lic.personId)}</td>
                    <td>
                      {getPricingName(
                        (lic as any).pricingId ??
                          (lic as any).licenseType ??
                          "",
                      )}
                    </td>
                    <td>
                      {lic.issuedAt
                        ? new Date(lic.issuedAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      {lic.expiryDate
                        ? new Date(lic.expiryDate).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge
                        status={lic.isActive ? "ACTIVE" : "EXPIRED"}
                      />
                    </td>
                    <td>
                      {lic.validatedByAdmin ? (
                        <span style={{ color: "var(--green, #22c55e)" }}>
                          ✓
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {lic.paymentReceiptUrl ? (
                        <a
                          href={lic.paymentReceiptUrl}
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
                      <div className="row-actions">
                        <button
                          className="btn ghost"
                          onClick={() =>
                            window.open(`/identite-federale/${lic.personId}`)
                          }
                        >
                          Détails
                        </button>
                        {lic.isActive && (
                          <>
                            <button
                              className="btn primary"
                              onClick={() => setPrintLicense(lic)}
                            >
                              🖨️ Imprimer
                            </button>
                            <button
                              className="btn danger"
                              onClick={() => setDeleteTarget(lic)}
                            >
                              Désactiver
                            </button>
                          </>
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

      {/* Print License Section */}
      {printLicense && (
        <div className="modal-overlay" onClick={() => setPrintLicense(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 500, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Imprimer la licence</h3>
            <LicensePrintWrapper license={enrichLicense(printLicense)} />
            <button
              className="btn ghost"
              style={{ marginTop: 12 }}
              onClick={() => setPrintLicense(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Create License Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: "85vh", overflow: "auto" }}
          >
            <h3>Nouvelle licence</h3>
            <form onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-grid">
                <label className="field-label">
                  Personne <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    type="text"
                    placeholder="Rechercher une personne..."
                    value={personSearch}
                    onChange={(e) => {
                      setPersonSearch(e.target.value);
                      if (form.personId) setForm({ ...form, personId: "" });
                    }}
                    style={inputStyle}
                  />
                  <select
                    value={form.personId}
                    onChange={(e) =>
                      setForm({ ...form, personId: e.target.value })
                    }
                    size={Math.min(Math.max(filteredPersons.length, 1), 6)}
                    style={{
                      ...inputStyle,
                      marginTop: 4,
                      width: "100%",
                      minHeight: 40,
                    }}
                  >
                    <option value="">— Sélectionner —</option>
                    {filteredPersons.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                  {form.personId && (
                    <small
                      style={{
                        color: "var(--green, #22c55e)",
                        marginTop: 4,
                        display: "block",
                      }}
                    >
                      Sélectionné : {getPersonName(form.personId)}
                    </small>
                  )}
                </label>
                <label className="field-label">
                  Type de licence <span style={{ color: "var(--red)" }}>*</span>
                  <select
                    value={form.pricingId}
                    onChange={(e) =>
                      setForm({ ...form, pricingId: e.target.value })
                    }
                    style={inputStyle}
                  >
                    <option value="">— Sélectionner —</option>
                    {pricingOptions
                      .filter((pr) => pr.category === "LICENSE")
                      .map((pr) => (
                        <option key={pr._id || pr.id} value={pr._id || pr.id}>
                          {pr.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Certificat médical"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hint="Obligatoire pour les athlètes"
                  maxSizeMB={5}
                  onUploaded={(url) =>
                    setForm({ ...form, medicalCertificateUrl: url })
                  }
                  currentUrl={form.medicalCertificateUrl || null}
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <FileUpload
                  label="Reçu de paiement"
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSizeMB={10}
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
                  {saving ? "Création..." : "Créer la licence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Désactiver la licence"
        message={`Êtes-vous sûr de vouloir désactiver la licence de « ${deleteTarget ? getPersonName(deleteTarget.personId) : ""} » ?`}
        confirmLabel="Désactiver"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deactivateMutation.mutate(
              deleteTarget._id || deleteTarget.id || "",
            );
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
