import React, { useEffect, useRef, useState } from "react";
import ClubLayout from "../../components/layout/ClubLayout";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const STATUS_LABELS = {
  PROCESSING: "En cours",
  COMPLETED: "Terminé",
  PARTIAL: "Partiel",
  FAILED: "Échec",
};

const STATUS_COLORS = {
  PROCESSING: "#3b82f6",
  COMPLETED: "#10b981",
  PARTIAL: "#f59e0b",
  FAILED: "#ef4444",
};

function Badge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "0.8rem",
        fontWeight: 600,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function ClubAthleteImport() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batches, setBatches] = useState([]);
  const [message, setMessage] = useState("");
  const [clubId, setClubId] = useState("");
  const [clubs, setClubs] = useState([]);
  const [activeTab, setActiveTab] = useState("import");

  const isAdmin =
    user?.role === "FEDERATION_ADMIN" || user?.role === "SUPER_ADMIN";

  // Load batch history on mount
  useEffect(() => {
    loadBatches();
    if (isAdmin) loadClubs();
  }, []);

  async function loadClubs() {
    try {
      const { data } = await api.get("/clubs");
      setClubs(data || []);
    } catch {
      /* silent */
    }
  }

  async function loadBatches() {
    try {
      const { data } = await api.get("/federal-integration/import/batches");
      setBatches(data || []);
    } catch {
      setBatches([]);
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = (selected.name || "").toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setMessage("Format non supporté. Utilisez XLSX, XLS ou CSV.");
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setMessage("Fichier trop volumineux (max 10 Mo).");
      setFile(null);
      return;
    }

    setFile(selected);
    setMessage("");
  }

  function clearFile() {
    setFile(null);
    setBatchResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) {
      setMessage("Veuillez sélectionner un fichier.");
      return;
    }

    if (isAdmin && !clubId) {
      setMessage("Veuillez sélectionner un club cible.");
      return;
    }

    setUploading(true);
    setMessage("");
    setBatchResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (clubId) formData.append("clubId", clubId);

      const { data } = await api.post(
        "/federal-integration/import/athletes",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setBatchResult(data.batch);
      setMessage(data.message || "Import terminé.");
      loadBatches();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors de l'import.";
      setMessage(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <ClubLayout>
      <div className="page-head">
        <h1>Importation d'Athlètes</h1>
        <p>
          Importez un fichier XLSX ou CSV contenant les athlètes du club. Les
          colonnes sont détectées automatiquement (Prénom, Nom, Date de
          naissance, Genre, Ceinture, Poids, etc.).
        </p>
      </div>

      {/* Tab nav */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "2px solid var(--border, #e5e7eb)",
          marginBottom: "1.5rem",
        }}
      >
        <button
          onClick={() => setActiveTab("import")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontWeight: activeTab === "import" ? 700 : 400,
            color:
              activeTab === "import"
                ? "var(--accent, #e63946)"
                : "var(--text-secondary, #666)",
            borderBottom:
              activeTab === "import"
                ? "3px solid var(--accent, #e63946)"
                : "3px solid transparent",
            marginBottom: "-2px",
            fontSize: "0.95rem",
          }}
        >
          Nouvel import
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            padding: "0.75rem 1.5rem",
            border: "none",
            background: "none",
            cursor: "pointer",
            fontWeight: activeTab === "history" ? 700 : 400,
            color:
              activeTab === "history"
                ? "var(--accent, #e63946)"
                : "var(--text-secondary, #666)",
            borderBottom:
              activeTab === "history"
                ? "3px solid var(--accent, #e63946)"
                : "3px solid transparent",
            marginBottom: "-2px",
            fontSize: "0.95rem",
          }}
        >
          Historique ({batches.length})
        </button>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background:
              batchResult?.status === "COMPLETED"
                ? "#10b98122"
                : batchResult?.status === "PARTIAL"
                  ? "#f59e0b22"
                  : message.includes("Erreur") ||
                      message.includes("échec") ||
                      batchResult?.status === "FAILED"
                    ? "#ef444422"
                    : undefined,
            color:
              batchResult?.status === "COMPLETED"
                ? "#10b981"
                : batchResult?.status === "PARTIAL"
                  ? "#f59e0b"
                  : message.includes("Erreur") ||
                      message.includes("échec") ||
                      batchResult?.status === "FAILED"
                    ? "#ef4444"
                    : undefined,
            marginBottom: "1rem",
          }}
        >
          {message}
        </div>
      )}

      {activeTab === "import" && (
        <section className="panel">
          <h2>Téléverser un fichier</h2>

          {/* Club selector for admin */}
          {isAdmin && (
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                Club cible
              </label>
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                style={{ maxWidth: "400px" }}
              >
                <option value="">-- Sélectionner un club --</option>
                {clubs.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.federalId ? `(${c.federalId})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File upload zone */}
          <div
            style={{
              border: "2px dashed var(--border, #ccc)",
              borderRadius: "12px",
              padding: "2.5rem 2rem",
              textAlign: "center",
              cursor: "pointer",
              background: file ? "#f0fdf4" : "var(--bg-card, #fff)",
              transition: "all 0.2s",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {file ? (
              <div>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                  📄
                </div>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                  {file.name}
                </strong>
                <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                  {(file.size / 1024).toFixed(1)} Ko
                </span>
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    className="btn-link"
                    style={{
                      fontSize: "0.8rem",
                      color: "#ef4444",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  📁
                </div>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                  Cliquez pour sélectionner un fichier
                </strong>
                <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                  Formats acceptés : XLSX, XLS, CSV (max 10 Mo)
                </span>
              </div>
            )}
          </div>

          {/* Upload button */}
          <div
            style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}
          >
            <button
              className="primary"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Importation en cours..." : "Lancer l'importation"}
            </button>
            {file && (
              <button
                className="btn-outline"
                onClick={clearFile}
                disabled={uploading}
              >
                Annuler
              </button>
            )}
          </div>

          {/* Format guide */}
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "8px",
              fontSize: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            <strong>Colonnes reconnues :</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.25rem 1rem",
                marginTop: "0.5rem",
              }}
            >
              <span>Prénom / First Name / firstName</span>
              <span>Nom / Last Name / lastName</span>
              <span>Date de naissance / Date of Birth</span>
              <span>Genre / Sexe (M/F)</span>
              <span>Âge / Age</span>
              <span>Téléphone / Phone</span>
              <span>Ville / City</span>
              <span>Catégorie / Category</span>
              <span>Poids / Weight (kg)</span>
              <span>Ceinture / Belt</span>
              <span>Spécialité / Specialty</span>
            </div>
          </div>
        </section>
      )}

      {/* Import result */}
      {batchResult && (
        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Résultat de l'import</h2>
          <div
            className="grid cards"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              marginBottom: "1rem",
            }}
          >
            <div className="stat-card">
              <strong>{batchResult.totalRows}</strong>
              <span>Lignes totales</span>
            </div>
            <div
              className="stat-card"
              style={{ borderTop: "3px solid #10b981" }}
            >
              <strong>{batchResult.inserted}</strong>
              <span>Créés</span>
            </div>
            <div
              className="stat-card"
              style={{ borderTop: "3px solid #3b82f6" }}
            >
              <strong>{batchResult.updated}</strong>
              <span>Mis à jour</span>
            </div>
            <div
              className="stat-card"
              style={{ borderTop: "3px solid #ef4444" }}
            >
              <strong>{batchResult.rejected}</strong>
              <span>Rejetés</span>
            </div>
          </div>
          <Badge
            label={STATUS_LABELS[batchResult.status] || batchResult.status}
            color={STATUS_COLORS[batchResult.status] || "#6b7280"}
          />
        </section>
      )}

      {/* Error details */}
      {batchResult?.rowErrors?.length > 0 && (
        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Erreurs ({batchResult.rowErrors.length})</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>Ligne</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {batchResult.rowErrors.map((err, i) => (
                  <tr key={i}>
                    <td>{err.row}</td>
                    <td style={{ color: "#ef4444" }}>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <section className="panel">
          <h2>Historique des imports</h2>
          {batches.length === 0 ? (
            <p
              style={{
                color: "#9ca3af",
                padding: "2rem 0",
                textAlign: "center",
              }}
            >
              Aucun import trouvé.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fichier</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Créés</th>
                    <th>MàJ</th>
                    <th>Rejetés</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch._id}>
                      <td
                        style={{
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {batch.sourceFile || "—"}
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleString("fr-TN")
                          : "—"}
                      </td>
                      <td>{batch.totalRows}</td>
                      <td style={{ color: "#10b981" }}>{batch.inserted}</td>
                      <td style={{ color: "#3b82f6" }}>{batch.updated}</td>
                      <td style={{ color: "#ef4444" }}>{batch.rejected}</td>
                      <td>
                        <Badge
                          label={STATUS_LABELS[batch.status] || batch.status}
                          color={STATUS_COLORS[batch.status] || "#6b7280"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </ClubLayout>
  );
}
