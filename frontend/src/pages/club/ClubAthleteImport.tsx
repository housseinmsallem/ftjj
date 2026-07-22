import React, { useState, useRef } from "react";
import Papa from "papaparse";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../../components/shared/PageHeader";
import FileUpload from "../../components/shared/FileUpload";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
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
  weight: string;
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
  weight: "",
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
  const [tab, setTab] = useState<"csv" | "batch">("csv");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<CsvError[]>([]);
  const [csvResult, setCsvResult] = useState<{
    success: number;
    failures: { row: number; message: string }[];
  } | null>(null);

  const [batchRows, setBatchRows] = useState<BatchPerson[]>([
    { ...emptyBatch },
  ]);
  const [commonPaymentUrls, setCommonPaymentUrls] = useState<string[]>([]);
  const [commonPricingId, setCommonPricingId] = useState<string>("");
  const [batchResult, setBatchResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const { data: pricingsData } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await api.get("/pricing");
      return (((res.data as any)?.data ?? res.data) as Pricing[]) || [];
    },
  });
  const pricings = pricingsData || [];

  // Total calculation
  const batchTotal = pricings.find((p) => (p._id || p.id) === commonPricingId);
  const athleteLicenseTotal =
    commonPricingId === "__athlete_license__"
      ? batchRows.reduce(
          (sum, row) => sum + (row.gender === "FEMALE" ? 5 : 15),
          0,
        )
      : 0;
  const displayTotal =
    commonPricingId === "__athlete_license__"
      ? athleteLicenseTotal
      : batchTotal
        ? Number(batchTotal.amount) * batchRows.length
        : 0;

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

  // Fill batch from CSV
  function fillBatchFromCsv() {
    if (csvRows.length === 0) return;
    const mapped: any[] = csvRows.map((r) => ({
      firstName: r.firstName,
      lastName: r.lastName,
      dateOfBirth: r.dateOfBirth,
      nationality: r.nationality || "Tunisienne",
      gender: r.gender || "MALE",
      identityDocumentType: r.identityDocumentType || "CIN",
      grade: r.grade || "",
      weight: "",
      identityDocumentUrl: "",
      birthCertificateUrl: "",
      photoUrl: "",
      achievements: "",
    }));
    setBatchRows(mapped);
    setTab("batch");
    toast.success(
      `${mapped.length} athlète${mapped.length > 1 ? "s" : ""} chargé${mapped.length > 1 ? "s" : ""} dans le lot.`,
    );
  }

  // Batch Mutation
  const batchMutation = useMutation({
    mutationFn: (payload: {
      persons: BatchPerson[];
      commonPaymentReceiptUrl: string;
      commonPricingId: string;
    }) => api.post("/persons/batch", payload),
    onSuccess: (res: any) => {
      const data = res.data?.data ?? res.data;
      setBatchResult(data);
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
          const firstName = r.firstName || r.first_name || r["prénom"] || "";
          const lastName = r.lastName || r.last_name || r["nom"] || "";
          if (!firstName.trim()) rowErrors.push("Prénom requis");
          if (!lastName.trim()) rowErrors.push("Nom requis");
          const dateOfBirth =
            r.dateOfBirth || r.date_of_birth || r["date naissance"] || "";
          if (!dateOfBirth) rowErrors.push("Date de naissance requise");
          const genderRaw = (r.gender || r["genre"] || "").toUpperCase();
          const gender = ["MALE", "FEMALE"].includes(genderRaw)
            ? genderRaw
            : "";
          if (!gender) rowErrors.push("Genre invalide");
          if (rowErrors.length) {
            errors.push({ row: i + 2, errors: rowErrors });
          }
          rows.push({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dateOfBirth,
            nationality: r.nationality || r["nationalité"] || "Tunisienne",
            gender,
            identityDocumentType:
              r.identityDocumentType || r["type document"] || "CIN",
            grade: r.grade || r["ceinture"] || "",
            club: r.club || r["club"] || "",
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
    if (commonPaymentUrls.length === 0) errors.push("Au moins un reçu de paiement est requis");
    if (!commonPricingId) errors.push("Le type de licence est requis");
    return errors;
  }

  function handleBatchSubmit() {
    const errors = validateBatch();
    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
      return;
    }
    const persons = batchRows.map((row) => {
      const pricingId =
        commonPricingId === "__athlete_license__"
          ? row.gender === "FEMALE"
            ? pricings.find((p) => p.name === "License Athlete 5dt (Female)")
                ?._id ||
              pricings.find((p) => p.name === "License Athlete 5dt (Female)")
                ?.id
            : pricings.find((p) => p.name === "License Athlete 15dt (Male)")
                ?._id ||
              pricings.find((p) => p.name === "License Athlete 15dt (Male)")?.id
          : undefined;
      return {
        ...row,
        weight: row.weight ? Number(row.weight) : undefined,
        identityDocumentUrl: row.identityDocumentUrl || undefined,
        birthCertificateUrl: row.birthCertificateUrl || undefined,
        photoUrl: row.photoUrl || undefined,
        achievements: row.achievements ? row.achievements.split("|").map(s => s.trim()).filter(Boolean) : undefined,
      };
    });
    batchMutation.mutate({
      persons: persons as any,
      commonPaymentReceiptUrl: commonPaymentUrls.join("|"),
      commonPricingId:
        commonPricingId === "__athlete_license__" ? "" : commonPricingId,
    });
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
          ✍️ Création par lot
        </button>
      </div>

      {tab === "csv" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Importation CSV</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            Téléchargez un fichier CSV contenant les athlètes à importer. Les
            colonnes attendues : firstName, lastName, dateOfBirth, nationality,
            gender, identityDocumentType.
          </p>
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
              <button className="btn primary" onClick={fillBatchFromCsv}>
                Remplir le lot ({csvRows.length} personne
                {csvRows.length > 1 ? "s" : ""})
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

      {tab === "batch" && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Création par lot</h3>
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
                  <th>Poids (kg)</th>
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
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="200"
                        value={row.weight}
                        onChange={(e) =>
                          updateBatchRow(idx, "weight", e.target.value)
                        }
                        placeholder="73"
                        style={{ ...inputStyle, width: 70 }}
                      />
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

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h4 style={{ margin: 0 }}>Configuration du lot</h4>
            <div
              className="form-grid"
              style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              <div>
                <label className="field-label">
                  Type de licence <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select
                  value={commonPricingId}
                  onChange={(e) => setCommonPricingId(e.target.value)}
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
                        {p.name} — {p.amount} DT
                      </option>
                    ))}
                </select>
                {commonPricingId && batchRows.length > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 16px",
                      background: "var(--panel)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{ color: "var(--muted)", fontSize: "0.9rem" }}
                      >
                        {batchRows.length} athlète
                        {batchRows.length > 1 ? "s" : ""}
                        {commonPricingId === "__athlete_license__" && (
                          <span style={{ marginLeft: 8, fontSize: "0.8rem" }}>
                            (
                            {
                              batchRows.filter((r) => r.gender === "MALE")
                                .length
                            }{" "}
                            ♂,{" "}
                            {
                              batchRows.filter((r) => r.gender === "FEMALE")
                                .length
                            }{" "}
                            ♀)
                          </span>
                        )}
                      </span>
                      <strong
                        style={{ color: "var(--gold)", fontSize: "1.1rem" }}
                      >
                        Total : {displayTotal} DT
                      </strong>
                    </div>
                    {commonPricingId === "__athlete_license__" && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: "0.8rem",
                          color: "var(--muted)",
                        }}
                      >
                        ♂ {batchRows.filter((r) => r.gender === "MALE").length}{" "}
                        × 15 DT + ♀{" "}
                        {batchRows.filter((r) => r.gender === "FEMALE").length}{" "}
                        × 5 DT
                      </div>
                    )}
                    {commonPricingId !== "__athlete_license__" &&
                      batchTotal && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: "0.8rem",
                            color: "var(--muted)",
                          }}
                        >
                          {batchRows.length} × {Number(batchTotal.amount)} DT
                        </div>
                      )}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label" style={{ marginBottom: 8 }}>Reçus de paiement</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {commonPaymentUrls.map((url, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <span style={{ flex: 1, fontSize: "0.85rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📎 Reçu {i + 1}
                      </span>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontSize: "0.8rem" }}>Voir</a>
                      <button className="btn danger" style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                        onClick={() => setCommonPaymentUrls(commonPaymentUrls.filter((_, j) => j !== i))}>
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
                    onUploaded={(url) => setCommonPaymentUrls([...commonPaymentUrls, url])}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="btn primary"
              onClick={handleBatchSubmit}
              disabled={batchMutation.isPending || batchRows.length === 0}
            >
              {batchMutation.isPending
                ? "Enregistrement..."
                : "Enregistrer le lot"}
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
    </div>
  );
}
