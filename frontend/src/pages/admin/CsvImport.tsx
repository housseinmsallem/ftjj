import React, { useState, useRef } from "react";
import Papa from "papaparse";
import api from "../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import EmptyState from "../../components/shared/EmptyState";
import FileUpload from "../../components/shared/FileUpload";
import { COUNTRIES, getGradesForRole } from "../../utils/formOptions";
import type { Pricing } from "../../types";

// ──────────────────────────────────────
// Types internes
// ──────────────────────────────────────

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

// ──────────────────────────────────────
// Styles partagés
// ──────────────────────────────────────

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

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 0,
  borderBottom: "2px solid var(--border)",
  marginBottom: 24,
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 24px",
    cursor: "pointer",
    borderBottom: active ? "2px solid var(--red)" : "2px solid transparent",
    marginBottom: -2,
    fontWeight: active ? 700 : 500,
    color: active ? "var(--red)" : "var(--text)",
    background: "transparent",
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
  };
}

// ──────────────────────────────────────
// Composant principal
// ──────────────────────────────────────

export default function CsvImport(): React.ReactElement {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"csv" | "batch" | "licenses">("csv");

  // ---- CSV state ----
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<CsvError[]>([]);
  const [csvResult, setCsvResult] = useState<{
    success: number;
    failures: { row: number; message: string }[];
  } | null>(null);

  // Submit CSV persons directly (no longer fills batch)
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
      `${mapped.length} athlète${mapped.length > 1 ? "s" : ""} transféré${mapped.length > 1 ? "s" : ""} vers la création manuelle. Vérifiez et validez.`,
    );
  }

  // ---- Batch state ----
  const [batchRows, setBatchRows] = useState<BatchPerson[]>([
    { ...emptyBatch },
  ]);
  const [batchResult, setBatchResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  // ---- Licenses state ----
  const [licenseSearch, setLicenseSearch] = useState("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [licensePricingId, setLicensePricingId] = useState<string>("");
  const [licensePaymentUrls, setLicensePaymentUrls] = useState<string[]>([]);

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

  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Fetch pricing options ----
  const { data: pricingsData, isLoading: pricingLoading } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await api.get("/pricing");
      return (((res.data as any)?.data ?? res.data) as Pricing[]) || [];
    },
  });
  const pricings = pricingsData || [];

  // ---- Search persons for licenses tab ----
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

  // ──────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────

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
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la création",
      );
    },
  });

  // ──────────────────────────────────────
  // CSV Helpers
  // ──────────────────────────────────────

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
          // Use separate Prenom / Nom columns only (no combined splitting)
          const firstName = (r["Prenom"] || r["prenom"] || r["firstName"] || "").trim();
          const lastName = (r["Nom"] || r["nom"] || r["lastName"] || "").trim();

          // Date: handle DD/MM/YYYY and YYYY-MM-DD
          let dateOfBirth = (
            r["Date naissance"] ||
            r["date de naissance"] ||
            r["dateOfBirth"] ||
            r["date_naissance"] ||
            ""
          ).trim();
          if (dateOfBirth && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateOfBirth)) {
            const parts = dateOfBirth.split("/");
            dateOfBirth = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }

          const nationality = (
            r["Nationalite"] ||
            r["nationality"] ||
            r["nationalite"] ||
            "Tunisienne"
          ).trim();

          // Gender: map "G"/"F" to MALE/FEMALE
          const genderRaw = (
            r["Genre"] ||
            r["gender"] ||
            r["genre"] ||
            r["Sexe"] ||
            r["sexe"] ||
            ""
          ).trim().toUpperCase();
          let gender = genderRaw;
          if (genderRaw === "G" || genderRaw === "GARCON" || genderRaw === "HOMME") gender = "MALE";
          else if (genderRaw === "F" || genderRaw === "FILLE" || genderRaw === "FEMME") gender = "FEMALE";

          const identityDocumentType = (
            r["Type document"] ||
            r["identityDocumentType"] ||
            r["type_document"] ||
            ""
          ).trim();
          const grade = (r["Grade"] || r["grade"] || "").trim();
          const club = (r["Club"] || r["club"] || "").trim();
          const achievements = (r["Palmarès"] || r["palmares"] || r["achievements"] || "").trim();

          const rowErrors: string[] = [];
          if (!firstName) rowErrors.push("Prenom requis");
          if (!lastName) rowErrors.push("Nom requis");
          if (!dateOfBirth) rowErrors.push("Date de naissance requise");
          if (!gender) rowErrors.push("Genre requis");

          if (rowErrors.length > 0) {
            errors.push({ row: i + 1, errors: rowErrors });
          }

          rows.push({
            firstName,
            lastName,
            dateOfBirth,
            nationality,
            gender,
            identityDocumentType,
            grade,
            club,
            achievements,
          });
        });
        setCsvRows(rows);
        setCsvErrors(errors);
        if (rows.length === 0) {
          toast.error("Le fichier CSV est vide ou n'a pas pu être analysé");
        } else {
          toast.info(`${rows.length} ligne(s) analysée(s)`);
        }
      },
      error: (err: any) => {
        toast.error(
          "Erreur lors de l'analyse du fichier CSV : " +
            (err?.message ?? "Format invalide"),
        );
      },
    });
  }

  // ──────────────────────────────────────
  // Batch Helpers
  // ──────────────────────────────────────

  function addBatchRow() {
    if (batchRows.length >= 100) {
      toast.error("Maximum 100 athlètes par lot");
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
      const { weight, ...cleanRow } = row as any;
      // Build a clean payload — strip empty strings and ensure required enums have valid values
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
      // Only include optional URLs if they have a value
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

  // ──────────────────────────────────────
  // Rendu
  // ──────────────────────────────────────

  return (
    <div className="page">
      <PageHeader
        title="Importation des athlètes"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Importation" },
        ]}
      />

      {/* Tab bar */}
      <div style={tabBarStyle}>
        <button
          type="button"
          style={tabStyle(tab === "csv")}
          onClick={() => setTab("csv")}
        >
          Importation CSV
        </button>
        <button
          type="button"
          style={tabStyle(tab === "batch")}
          onClick={() => setTab("batch")}
        >
          Création manuelle
        </button>
        <button
          type="button"
          style={tabStyle(tab === "licenses")}
          onClick={() => setTab("licenses")}
        >
          Licences en masse
        </button>
      </div>

      {/* ─────────── TAB CSV ─────────── */}
      {tab === "csv" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Importer un fichier CSV</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            Le fichier CSV doit contenir les colonnes : Prénom, Nom, Date
            naissance, Nationalité, Genre, Type document, Grade, Club. Les
            colonnes Prénom, Nom, Date naissance et Genre sont obligatoires.
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

          <div className="file-upload-field" style={{ marginBottom: 20 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="btn primary"
              onClick={() => fileRef.current?.click()}
            >
              Choisir un fichier CSV
            </button>
            {csvFile && (
              <span style={{ marginLeft: 12, fontSize: "0.9rem" }}>
                {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} Ko)
              </span>
            )}
          </div>

          {/* Preview table */}
          {csvRows.length > 0 && (
            <>
              <h4 style={{ marginBottom: 12 }}>
                Aperçu ({csvRows.length} ligne{csvRows.length > 1 ? "s" : ""})
              </h4>
              {csvErrors.length > 0 && (
                <div
                  className="card"
                  style={{
                    background: "#d5133215",
                    border: "1px solid #d5133240",
                    padding: 12,
                    marginBottom: 16,
                    borderRadius: 12,
                  }}
                >
                  <strong style={{ color: "#d51332" }}>
                    Erreurs de validation ({csvErrors.length} ligne
                    {csvErrors.length > 1 ? "s" : ""})
                  </strong>
                  <ul
                    style={{
                      margin: "8px 0 0",
                      paddingLeft: 20,
                      fontSize: "0.85rem",
                    }}
                  >
                    {csvErrors.map((e) => (
                      <li key={e.row}>
                        Ligne {e.row} : {e.errors.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div
                className="table-wrap"
                style={{ maxHeight: 400, overflowY: "auto", marginBottom: 20 }}
              >
                <table className="smart-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Date naissance</th>
                      <th>Nationalité</th>
                      <th>Genre</th>
                      <th>Type document</th>
                      <th>Grade</th>
                      <th>Club</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr
                        key={i}
                        style={
                          csvErrors.some((e) => e.row === i + 1)
                            ? { background: "#d5133210" }
                            : undefined
                        }
                      >
                        <td>{i + 1}</td>
                        <td
                          style={{
                            color: row.firstName ? undefined : "var(--red)",
                          }}
                        >
                          {row.firstName || "—"}
                        </td>
                        <td
                          style={{
                            color: row.lastName ? undefined : "var(--red)",
                          }}
                        >
                          {row.lastName || "—"}
                        </td>
                        <td
                          style={{
                            color: row.dateOfBirth ? undefined : "var(--red)",
                          }}
                        >
                          {row.dateOfBirth || "—"}
                        </td>
                        <td>{row.nationality || "—"}</td>
                        <td
                          style={{
                            color: row.gender ? undefined : "var(--red)",
                          }}
                        >
                          {row.gender || "—"}
                        </td>
                        <td>{row.identityDocumentType || "—"}</td>
                        <td>{row.grade || "—"}</td>
                        <td>{row.club || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                className="btn primary"
                disabled={csvRows.length === 0}
                onClick={submitCsvPersons}
              >
                Transférer {csvRows.length} personne
                {csvRows.length > 1 ? "s" : ""} vers la création manuelle
              </button>
            </>
          )}

          {/* CSV Result */}
          {csvResult && (
            <div
              className="card"
              style={{
                marginTop: 24,
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h4 style={{ marginTop: 0 }}>Résultat de l'importation</h4>
              <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                <div>
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
                    {csvResult.success} succès
                  </span>
                </div>
                <div>
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
                    {csvResult.failures.length} échec
                    {csvResult.failures.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {csvResult.failures.length > 0 && (
                <ul
                  style={{
                    marginTop: 12,
                    paddingLeft: 20,
                    fontSize: "0.85rem",
                  }}
                >
                  {csvResult.failures.map((f, i) => (
                    <li key={i}>
                      Ligne {f.row} : {f.message}
                    </li>
                  ))}
                </ul>
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

          {/* Batch rows */}
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
                        <option value="">Sélectionner...</option>
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
                              if (file) {
                                uploadBatchDoc(
                                  idx,
                                  row.identityDocumentType ===
                                    "BIRTH_CERTIFICATE"
                                    ? "birthCertificateUrl"
                                    : "identityDocumentUrl",
                                  file,
                                );
                              }
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
            style={{ marginBottom: 24 }}
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

          {/* Submit button moved right after add button */}
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

          {/* Batch Result */}
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
              {batchResult.errors && batchResult.errors.length > 0 && (
                <ul
                  style={{
                    marginTop: 12,
                    paddingLeft: 20,
                    fontSize: "0.85rem",
                  }}
                >
                  {batchResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────── TAB LICENSES ─────────── */}
      {tab === "licenses" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Licences en masse</h3>
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
