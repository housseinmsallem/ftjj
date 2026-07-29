import React, { useState, useRef } from "react";
import Papa from "papaparse";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import FileUpload from "../../components/shared/FileUpload";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import { COUNTRIES, getGradesForRole } from "../../utils/formOptions";
import type { Pricing } from "../../types";

interface CsvRow {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
  identityDocumentType: string;
  grade: string;
  club: string;
  achievements: string;
}

interface CsvError {
  row: number;
  errors: string[];
}

interface BatchPerson {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
  identityDocumentType: string;
  grade: string;
  identityDocumentUrl: string;
  birthCertificateUrl: string;
  photoUrl: string;
  achievements: string;
}

const emptyBatch: BatchPerson = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  nationality: "Tunisienne",
  gender: "MALE",
  identityDocumentType: "CIN",
  grade: "",
  identityDocumentUrl: "",
  birthCertificateUrl: "",
  photoUrl: "",
  achievements: "",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "8px 10px",
  fontSize: "0.9rem",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

export default function ClubAthleteImport(): React.ReactElement {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"csv" | "batch" | "licenses">("csv");

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<CsvError[]>([]);
  const [csvResult, setCsvResult] = useState<{
    success: number;
    failures: { row: number; message: string }[];
  } | null>(null);

  // Batch state
  const [batchRows, setBatchRows] = useState<BatchPerson[]>([
    { ...emptyBatch },
  ]);
  const [batchResult, setBatchResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  // Licenses state
  const [licenseSearch, setLicenseSearch] = useState("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [licensePricingId, setLicensePricingId] = useState<string>("");
  const [licensePaymentUrls, setLicensePaymentUrls] = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch pricing options (for licenses tab)
  const { data: pricingsData, isLoading: pricingLoading } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await api.get("/pricing");
      return (((res.data as any)?.data ?? res.data) as Pricing[]) || [];
    },
  });
  const pricings = pricingsData || [];

  // Search persons for licenses tab
  const { data: personsData, isLoading: personsSearchLoading } = useQuery({
    queryKey: ["persons", "search", licenseSearch],
    queryFn: async () => {
      if (!licenseSearch || licenseSearch.trim().length < 2) return [];
      const res = await api.get("/persons", {
        params: { search: licenseSearch.trim() },
      });
      return ((res.data as any)?.data ?? res.data) as any[];
    },
    enabled: licenseSearch.trim().length >= 2,
  });
  const searchedPersons = personsData || [];

  // Inline upload for batch rows
  async function uploadBatchDoc(
    idx: number,
    field: "identityDocumentUrl" | "birthCertificateUrl" | "photoUrl",
    file: File,
  ) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/uploads/single", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.data?.fileUrl || res.data?.fileUrl || "";
      updateBatchRow(idx, field, url);
      toast.success("Fichier téléchargé");
    } catch {
      toast.error("Échec du téléchargement");
    }
  }

  // Transfer CSV rows to batch tab for review
  function submitCsvPersons() {
    if (csvRows.length === 0) return;
    const mapped: BatchPerson[] = csvRows.map((r) => ({
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth: r.dateOfBirth,
      nationality: r.nationality || "Tunisienne",
      gender: r.gender || "MALE",
      identityDocumentType: r.identityDocumentType || "CIN",
      grade: r.grade || "",
      identityDocumentUrl: "",
      birthCertificateUrl: "",
      photoUrl: "",
      achievements: r.achievements || "",
    }));
    setBatchRows(mapped);
    setTab("batch");
    toast.success(
      `${mapped.length} athlète${mapped.length > 1 ? "s" : ""} transféré${mapped.length > 1 ? "s" : ""} vers la création manuelle.`,
    );
  }

  // Batch Mutation
  const batchMutation = useMutation({
    mutationFn: (payload: { persons: any[] }) =>
      api.post("/persons/batch", payload),
    onSuccess: (res: any) => {
      const data = res.data?.data ?? res.data;
      setBatchResult(data);
      // Also set csvResult when submitting from CSV tab
      if (tab === "csv") {
        setCsvResult({
          success: data?.success ?? 0,
          failures: (data?.errors || []).map(
            (e: string, i: number) => ({ row: i + 1, message: e }),
          ),
        });
      }
      toast.success(`${data?.success ?? 0} athlètes créés`);
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || "Erreur lors de la création par lot",
      ),
  });

  // CSV Handlers
  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const raw = results.data as Record<string, string>[];
        const rows: CsvRow[] = [];
        const errors: CsvError[] = [];
        raw.forEach((r, i) => {
          const rowErrors: string[] = [];
          const firstName = (r["Prenom"] || r["prenom"] || r["prénom"] || r.firstName || r.first_name || "").trim();
          const lastName = (r["Nom"] || r["nom"] || r.lastName || r.last_name || "").trim();
          if (!firstName) rowErrors.push("Prénom requis");
          if (!lastName) rowErrors.push("Nom requis");
          const dateOfBirth =
            r["Date naissance"] || r["date de naissance"] || r["date_naissance"] || r.dateOfBirth || r.date_of_birth || "";
          if (!dateOfBirth) rowErrors.push("Date de naissance requise");
          // Gender: map G/GARCON/HOMME → MALE, F/FILLE/FEMME → FEMALE
          const genderRaw = (r["Genre"] || r["genre"] || r["Sexe"] || r["sexe"] || r.gender || "").trim().toUpperCase();
          let gender = genderRaw;
          if (genderRaw === "G" || genderRaw === "GARCON" || genderRaw === "HOMME") gender = "MALE";
          else if (genderRaw === "F" || genderRaw === "FILLE" || genderRaw === "FEMME") gender = "FEMALE";
          else if (!["MALE", "FEMALE"].includes(genderRaw)) gender = "";
          if (!gender) rowErrors.push("Genre invalide (utilisez Homme/Femme ou G/F)");
          if (rowErrors.length) {
            errors.push({ row: i + 2, errors: rowErrors });
          }
          rows.push({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth,
            nationality: (r["Nationalite"] || r["nationalite"] || r["nationalité"] || r.nationality || "Tunisienne").trim(),
            gender,
            identityDocumentType:
              r["Type document"] || r["type_document"] || r["type document"] || r.identityDocumentType || "CIN",
            grade: (r["Grade"] || r["grade"] || r["ceinture"] || "").trim(),
            club: (r["Club"] || r["club"] || "").trim(),
            achievements: (r["Palmarès"] || r["palmares"] || r["achievements"] || "").trim(),
          });
        });
        setCsvRows(rows);
        setCsvErrors(errors);
      },
      error: () => toast.error("Erreur lors de la lecture du fichier CSV"),
    });
  }

  // Batch handlers
  function addBatchRow() {
    if (batchRows.length >= 100) {
      toast.error("Maximum 100 athlètes");
      return;
    }
    setBatchRows([...batchRows, { ...emptyBatch }]);
  }
  function removeBatchRow(idx: number) {
    if (batchRows.length <= 1) return;
    setBatchRows(batchRows.filter((_, i) => i !== idx));
  }
  function updateBatchRow(
    idx: number,
    field: keyof BatchPerson,
    value: string,
  ) {
    setBatchRows(
      batchRows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  }

  function validateBatch(): string[] {
    const errors: string[] = [];
    batchRows.forEach((row, i) => {
      if (!row.firstName.trim()) errors.push(`Ligne ${i + 1} : Prénom requis`);
      if (!row.lastName.trim()) errors.push(`Ligne ${i + 1} : Nom requis`);
      if (!row.dateOfBirth)
        errors.push(`Ligne ${i + 1} : Date de naissance requise`);
      if (!row.gender) errors.push(`Ligne ${i + 1} : Genre requis`);
    });
    return errors;
  }

  function handleBatchSubmit() {
    const errors = validateBatch();
    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
      return;
    }
    const persons = batchRows.map((row) => {
      const person: any = {
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        dateOfBirth: row.dateOfBirth,
        nationality: row.nationality || undefined,
        gender: row.gender || "MALE",
        type: "ATHLETE",
        identityDocumentType: row.identityDocumentType || "CIN",
        grade: row.grade || undefined,
      };
      if (row.identityDocumentUrl) person.identityDocumentUrl = row.identityDocumentUrl;
      if (row.birthCertificateUrl) person.birthCertificateUrl = row.birthCertificateUrl;
      if (row.photoUrl) person.photoUrl = row.photoUrl;
      if (row.achievements) {
        const parsed = row.achievements.split("|").map((s: string) => s.trim()).filter(Boolean);
        if (parsed.length > 0) person.achievements = parsed;
      }
      return person;
    });
    batchMutation.mutate({ persons });
  }

  return (
    <div className="page">
      <PageHeader
        title="Importation des athlètes"
        breadcrumbs={[{ label: "Club", to: "/club" }, { label: "Importation" }]}
      />

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <button
          style={{
            padding: "10px 24px",
            cursor: "pointer",
            borderBottom:
              tab === "csv" ? "2px solid var(--red)" : "2px solid transparent",
            fontWeight: tab === "csv" ? 700 : 500,
            color: tab === "csv" ? "var(--red)" : "var(--text)",
            background: "transparent",
            border: "none",
            fontSize: "0.95rem",
          }}
          onClick={() => setTab("csv")}
        >
          📄 Importation CSV
        </button>
        <button
          style={{
            padding: "10px 24px",
            cursor: "pointer",
            borderBottom:
              tab === "batch"
                ? "2px solid var(--red)"
                : "2px solid transparent",
            fontWeight: tab === "batch" ? 700 : 500,
            color: tab === "batch" ? "var(--red)" : "var(--text)",
            background: "transparent",
            border: "none",
            fontSize: "0.95rem",
          }}
          onClick={() => setTab("batch")}
        >
          ✍️ Création manuelle
        </button>
        <button
          style={{
            padding: "10px 24px",
            cursor: "pointer",
            borderBottom:
              tab === "licenses"
                ? "2px solid var(--red)"
                : "2px solid transparent",
            fontWeight: tab === "licenses" ? 700 : 500,
            color: tab === "licenses" ? "var(--red)" : "var(--text)",
            background: "transparent",
            border: "none",
            fontSize: "0.95rem",
          }}
          onClick={() => setTab("licenses")}
        >
          🎫 Demandes de licence
        </button>
      </div>

      {/* ─────────── TAB CSV ─────────── */}
      {tab === "csv" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Importation CSV</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            Téléchargez un fichier CSV contenant les athlètes à importer. Les
            colonnes attendues : Prenom, Nom, Date naissance, Genre, Nationalite,
            Type document, Grade, Club, Palmarès.
          </p>

          <div style={{ marginBottom: 16 }}>
            <a
              href="/template-import-athletes.csv"
              download
              className="btn ghost"
              style={{ textDecoration: "none", fontSize: "0.9rem" }}
            >
              📥 Télécharger le modèle CSV
            </a>
          </div>
          <input
            type="file"
            accept=".csv"
            ref={fileRef}
            onChange={handleCsvFileChange}
            style={{ marginBottom: 16 }}
          />
          {csvRows.length > 0 && (
            <>
              <div className="table-wrap" style={{ marginBottom: 16 }}>
                <table className="smart-table">
                  <thead>
                    <tr>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Date naissance</th>
                      <th>Nationalité</th>
                      <th>Genre</th>
                      <th>Document</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.firstName}</td>
                        <td>{row.lastName}</td>
                        <td>{row.dateOfBirth}</td>
                        <td>{row.nationality}</td>
                        <td>{row.gender}</td>
                        <td>{row.identityDocumentType}</td>
                        <td>{row.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvErrors.length > 0 && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    background: "#d5133220",
                    borderRadius: 8,
                  }}
                >
                  {csvErrors.map((e, i) => (
                    <p key={i} style={{ color: "var(--red)", margin: 4 }}>
                      Ligne {e.row}: {e.errors.join(", ")}
                    </p>
                  ))}
                </div>
              )}
              <button className="btn primary" onClick={submitCsvPersons}>
                Transférer {csvRows.length} personne
                {csvRows.length > 1 ? "s" : ""} vers la création manuelle
              </button>
            </>
          )}
          {csvResult && (
            <div
              className="card"
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            >
              <h4>Résultat</h4>
              <span
                className="badge"
                style={{
                  background: "#22c55e20",
                  color: "#22c55e",
                  padding: "4px 12px",
                  borderRadius: 12,
                }}
              >
                {csvResult.success || 0} créés
              </span>
              {csvResult.failures?.length > 0 && (
                <span
                  className="badge"
                  style={{
                    background: "#d5133220",
                    color: "#d51332",
                    padding: "4px 12px",
                    borderRadius: 12,
                    marginLeft: 8,
                  }}
                >
                  {csvResult.failures.length} échecs
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────── TAB BATCH ─────────── */}
      {tab === "batch" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Création manuelle</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            Ajoutez jusqu'à 100 athlètes manuellement. Les champs avec{" "}
            <span style={{ color: "var(--red)" }}>*</span> sont obligatoires.
          </p>

          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table className="smart-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Prénom *</th>
                  <th>Nom *</th>
                  <th>Date naissance *</th>
                  <th>Nationalité</th>
                  <th>Genre *</th>
                  <th>Type doc.</th>
                  <th>Fichier ID</th>
                  <th>Photo</th>
                  <th>Grade</th>
                  <th>Palmarès</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={row.firstName}
                        onChange={(e) =>
                          updateBatchRow(idx, "firstName", e.target.value)
                        }
                        placeholder="Prénom"
                        style={inputStyle}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.lastName}
                        onChange={(e) =>
                          updateBatchRow(idx, "lastName", e.target.value)
                        }
                        placeholder="Nom"
                        style={inputStyle}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={row.dateOfBirth}
                        onChange={(e) =>
                          updateBatchRow(idx, "dateOfBirth", e.target.value)
                        }
                        style={inputStyle}
                      />
                    </td>
                    <td>
                      <select
                        value={row.nationality || "Tunisienne"}
                        onChange={(e) =>
                          updateBatchRow(idx, "nationality", e.target.value)
                        }
                        style={selectStyle}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.gender}
                        onChange={(e) =>
                          updateBatchRow(idx, "gender", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="MALE">Homme</option>
                        <option value="FEMALE">Femme</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={row.identityDocumentType}
                        onChange={(e) =>
                          updateBatchRow(
                            idx,
                            "identityDocumentType",
                            e.target.value,
                          )
                        }
                        style={selectStyle}
                      >
                        <option value="">—</option>
                        <option value="CIN">CIN</option>
                        <option value="BIRTH_CERTIFICATE">Acte naiss.</option>
                      </select>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <label
                          style={{
                            ...inputStyle,
                            width: "auto",
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          📎 Télécharger
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                uploadBatchDoc(
                                  idx,
                                  row.identityDocumentType ===
                                    "BIRTH_CERTIFICATE"
                                    ? "birthCertificateUrl"
                                    : "identityDocumentUrl",
                                  file,
                                );
                            }}
                          />
                        </label>
                        {(
                          row.identityDocumentType === "CIN"
                            ? row.identityDocumentUrl
                            : row.birthCertificateUrl
                        ) ? (
                          <a
                            href={
                              row.identityDocumentType === "CIN"
                                ? row.identityDocumentUrl
                                : row.birthCertificateUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--green)",
                              fontSize: "0.75rem",
                            }}
                          >
                            ✓
                          </a>
                        ) : (
                          <span
                            style={{
                              color: "var(--muted)",
                              fontSize: "0.75rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <label style={{ ...inputStyle, width: "auto", padding: "6px 10px", cursor: "pointer", fontSize: "0.75rem", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          📷 Upload
                          <input type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: "none" }}
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadBatchDoc(idx, "photoUrl", file); }} />
                        </label>
                        {row.photoUrl ? (
                          <a href={row.photoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontSize: "0.75rem" }}>✓</a>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        value={row.grade || ""}
                        onChange={(e) =>
                          updateBatchRow(idx, "grade", e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="">Sélectionner...</option>
                        {getGradesForRole("ATHLETE").map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="text" value={row.achievements}
                        onChange={(e) => updateBatchRow(idx, "achievements", e.target.value)}
                        placeholder="Champ. 2025 | Open Tunis" style={inputStyle} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn danger"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => removeBatchRow(idx)}
                        disabled={batchRows.length <= 1}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn"
            onClick={addBatchRow}
            disabled={batchRows.length >= 100}
          >
            + Ajouter un athlète
          </button>
          <span
            className="muted"
            style={{ marginLeft: 12, fontSize: "0.85rem" }}
          >
            {batchRows.length} / 100 athlètes
          </span>

          {/* Submit button right after add button */}
          <div style={{ marginTop: 20 }}>
            <button
              className="btn primary"
              onClick={handleBatchSubmit}
              disabled={batchMutation.isPending || batchRows.length === 0}
            >
              {batchMutation.isPending
                ? "Enregistrement..."
                : `Créer ${batchRows.length} athlète${batchRows.length > 1 ? "s" : ""}`}
            </button>
          </div>

          {batchResult && (
            <div
              className="card"
              style={{
                marginTop: 24,
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h4 style={{ marginTop: 0 }}>Résultat</h4>
              <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                <span
                  className="badge"
                  style={{
                    background: "#22c55e20",
                    color: "#22c55e",
                    padding: "4px 12px",
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  {batchResult.success || 0} créé
                  {batchResult.success !== 1 ? "s" : ""}
                </span>
                {batchResult.errors && batchResult.errors.length > 0 && (
                  <span
                    className="badge"
                    style={{
                      background: "#d5133220",
                      color: "#d51332",
                      padding: "4px 12px",
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    {batchResult.errors.length} erreur
                    {batchResult.errors.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────── TAB LICENSES ─────────── */}
      {tab === "licenses" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Demandes de licence</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            Cette fonctionnalité sera disponible prochainement.
          </p>

          {/* Person search */}
          <div style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ marginBottom: 8 }}>
              Rechercher une personne
            </label>
            <input
              type="text"
              value={licenseSearch}
              onChange={(e) => setLicenseSearch(e.target.value)}
              placeholder="Tapez au moins 2 caractères..."
              style={inputStyle}
            />
          </div>

          {/* Search results */}
          {licenseSearch.trim().length >= 2 && (
            <div style={{ marginBottom: 20 }}>
              {personsSearchLoading ? (
                <LoadingSpinner text="Recherche en cours..." />
              ) : searchedPersons.length === 0 ? (
                <EmptyState title="Aucune personne trouvée" />
              ) : (
                <div
                  className="table-wrap"
                  style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}
                >
                  <table className="smart-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Prénom</th>
                        <th>Nom</th>
                        <th>Date naissance</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchedPersons.map((p: any) => {
                        const pid = p._id || p.id;
                        const checked = selectedPersonIds.includes(pid);
                        return (
                          <tr
                            key={pid}
                            style={{
                              background: checked ? "var(--red-transparent)" : undefined,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setSelectedPersonIds(
                                checked
                                  ? selectedPersonIds.filter((id) => id !== pid)
                                  : [...selectedPersonIds, pid],
                              );
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                            <td>{p.firstName || "—"}</td>
                            <td>{p.lastName || "—"}</td>
                            <td>{p.dateOfBirth || "—"}</td>
                            <td></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {selectedPersonIds.length > 0 && (
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  {selectedPersonIds.length} personne
                  {selectedPersonIds.length > 1 ? "s" : ""} sélectionnée
                  {selectedPersonIds.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Pricing / license type */}
          <div style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ marginBottom: 8 }}>
              Type de licence
            </label>
            {pricingLoading ? (
              <LoadingSpinner text="Chargement des tarifs..." />
            ) : (
              <select
                value={licensePricingId}
                onChange={(e) => setLicensePricingId(e.target.value)}
                style={{ ...selectStyle, width: "100%" }}
              >
                <option value="">Sélectionner un type de licence</option>
                <option value="__athlete_license__">
                  🥋 License Athlete — 15 DT (Homme) / 5 DT (Femme)
                </option>
                {pricings
                  .filter((p) => p.category === "LICENSE")
                  .map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Payment receipt */}
          <div style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ marginBottom: 8 }}>
              Reçus de paiement
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {licensePaymentUrls.map((url, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: "var(--bg)",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.85rem",
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    📎 Reçu {i + 1}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--green)", fontSize: "0.8rem" }}
                  >
                    Voir
                  </a>
                  <button
                    className="btn danger"
                    style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                    onClick={() =>
                      setLicensePaymentUrls(
                        licensePaymentUrls.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <FileUpload
                label="Ajouter un reçu de paiement"
                accept=".pdf,.jpg,.jpeg,.png"
                maxSizeMB={10}
                currentUrl={null}
                onUploaded={(url) =>
                  setLicensePaymentUrls([...licensePaymentUrls, url])
                }
              />
            </div>
          </div>

          {/* Submit */}
          <div style={{ marginTop: 20 }}>
            <button
              className="btn primary"
              disabled={
                selectedPersonIds.length === 0 || !licensePricingId
              }
              onClick={() => {
                toast.info("Fonctionnalité à venir");
              }}
            >
              Attribuer les licences ({selectedPersonIds.length} personne
              {selectedPersonIds.length > 1 ? "s" : ""})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
