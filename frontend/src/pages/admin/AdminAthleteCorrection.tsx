import React, { useState } from "react";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import { COUNTRIES, getGradesForRole } from "../../utils/formOptions";
import type { Person } from "../../types";

interface AthleteFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: "MALE" | "FEMALE";
  grade: string;
  clubId: string;
}

const emptyForm: AthleteFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "Tunisienne",
  gender: "MALE",
  grade: "",
  clubId: "",
};

export default function AdminAthleteCorrection(): React.ReactElement {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<Person | null>(null);
  const [form, setForm] = useState<AthleteFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const {
    data: searchResults,
    isLoading: searchLoading,
    refetch: searchRefetch,
  } = useQuery({
    queryKey: ["persons", "search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const res = await api.get("/persons", {
        params: { type: "ATHLETE", search: searchTerm },
      });
      return (((res.data as any)?.data ?? res.data) as Person[]) || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const results = searchResults || [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) {
      toast.error("Veuillez saisir au moins 2 caractères");
      return;
    }
    setSearchTerm(searchQuery.trim());
  }

  function selectAthlete(athlete: Person) {
    setSelectedAthlete(athlete);
    setForm({
      firstName: athlete.firstName || "",
      lastName: athlete.lastName || "",
      dateOfBirth: athlete.dateOfBirth ? athlete.dateOfBirth.slice(0, 10) : "",
      nationality: athlete.nationality || "Tunisienne",
      gender: athlete.gender || "MALE",
      grade: athlete.grade || "",
      clubId: athlete.clubId || athlete.club?._id || athlete.club?.id || "",
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAthlete) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Le prénom et le nom sont obligatoires");
      return;
    }
    if (!form.dateOfBirth) {
      toast.error("La date de naissance est obligatoire");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/persons/${selectedAthlete._id || selectedAthlete.id}`, {
        ...form,
        type: "ATHLETE",
      });
      toast.success("Athlète modifié avec succès");
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      setSelectedAthlete(null);
      setForm(emptyForm);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la modification",
      );
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="page">
      <PageHeader
        title="Correction des athlètes"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Correction des athlètes" },
        ]}
      />

      {/* Search Section */}
      <div className="card" style={{ marginBottom: 20, maxWidth: 700 }}>
        <h3 style={{ color: "var(--text)", marginBottom: 16 }}>
          Rechercher un athlète
        </h3>
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
        >
          <label className="field-label" style={{ flex: 1 }}>
            Nom ou prénom
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou prénom..."
              style={inputStyle}
            />
          </label>
          <button type="submit" className="btn primary" style={{ height: 44 }}>
            Rechercher
          </button>
        </form>

        {searchTerm && (
          <div style={{ marginTop: 16 }}>
            {searchLoading ? (
              <LoadingSpinner text="Recherche en cours..." />
            ) : results.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description={`Aucun athlète trouvé pour "${searchTerm}"`}
              />
            ) : (
              <div style={{ marginTop: 12 }}>
                <p className="muted" style={{ marginBottom: 12 }}>
                  {results.length} résultat{results.length > 1 ? "s" : ""} pour
                  « {searchTerm} »
                </p>
                <div className="table-wrap">
                  <table className="smart-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Date de naissance</th>
                        <th>Club</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((athlete) => (
                        <tr key={athlete._id || athlete.id}>
                          <td>
                            {athlete.firstName} {athlete.lastName}
                          </td>
                          <td>
                            {athlete.dateOfBirth
                              ? new Date(
                                  athlete.dateOfBirth,
                                ).toLocaleDateString("fr-FR")
                              : "—"}
                          </td>
                          <td>{athlete.club?.name || "—"}</td>
                          <td>
                            <button
                              className="btn primary"
                              onClick={() => selectAthlete(athlete)}
                            >
                              Corriger
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Form */}
      {selectedAthlete && (
        <div className="card" style={{ maxWidth: 700 }}>
          <h3 style={{ color: "var(--text)", marginBottom: 16 }}>
            Correction de : {selectedAthlete.firstName}{" "}
            {selectedAthlete.lastName}
          </h3>
          <form onSubmit={handleSave}>
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
                Date de naissance <span style={{ color: "var(--red)" }}>*</span>
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
                  style={selectStyle}
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
                  style={selectStyle}
                >
                  <option value="MALE">Homme</option>
                  <option value="FEMALE">Femme</option>
                </select>
              </label>
              <label className="field-label">
                Grade
                <select
                  value={form.grade || ""}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  style={selectStyle}
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

            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSelectedAthlete(null);
                  setForm(emptyForm);
                }}
              >
                Annuler
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
