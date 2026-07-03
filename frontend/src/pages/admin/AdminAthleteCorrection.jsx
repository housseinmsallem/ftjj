import React, { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

const PERMITTED_FIELDS = [
  { key: "firstName", label: "Prénom", type: "text" },
  { key: "lastName", label: "Nom", type: "text" },
  { key: "dateOfBirth", label: "Date de naissance", type: "date" },
  { key: "age", label: "Âge", type: "number" },
  { key: "category", label: "Catégorie", type: "text" },
  { key: "weight", label: "Poids (kg)", type: "number" },
  { key: "belt", label: "Ceinture", type: "select", options: ["WHITE", "BLUE", "PURPLE", "BROWN", "BLACK"] },
  { key: "specialty", label: "Spécialité", type: "select", options: ["", "BJJ", "NE_WAZA", "MMA", "JU_JITSU", "SELF_DEFENSE", "OTHER"] },
  { key: "achievements", label: "Palmarès", type: "text" },
  { key: "licenseStatus", label: "Statut licence", type: "select", options: ["", "PENDING", "ACTIVE", "EXPIRED", "SUSPENDED"] },
  { key: "validationStatus", label: "Statut validation", type: "select", options: ["", "DRAFT", "PENDING", "VALIDATED", "REJECTED", "SUSPENDED"] },
];

export default function AdminAthleteCorrection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [form, setForm] = useState({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch() {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setMessage("");
    try {
      const { data } = await api.get(`/athletes?search=${encodeURIComponent(searchTerm.trim())}`);
      setAthletes(data || []);
      if (!data || data.length === 0) {
        setMessage("Aucun athlete trouve.");
      }
    } catch {
      setMessage("Erreur de recherche.");
    }
    setSearching(false);
  }

  function selectAthlete(athlete) {
    setSelectedAthlete(athlete);
    setForm({});
    setReason("");
    setMessage("");
  }

  function handleFieldChange(key, value) {
    setForm((prev) => {
      const next = { ...prev };
      if (value === "" || value == null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedAthlete) return;
    if (Object.keys(form).length === 0) {
      setMessage("Veuillez modifier au moins un champ.");
      return;
    }
    if (!reason.trim()) {
      setMessage("Veuillez fournir un motif de correction.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const { data } = await api.patch(
        `/federal-integration/athletes/${selectedAthlete._id}/correct`,
        { ...form, reason: reason.trim() },
      );
      setMessage(data.message || "Correction appliquee.");
      setSelectedAthlete(null);
      setForm({});
      setReason("");
      if (data.appliedFields) {
        setMessage(
          `Correction appliquee. Champs modifies: ${data.appliedFields.join(", ")}.` +
            (data.rejectedKeys?.length
              ? ` Champs rejetes: ${data.rejectedKeys.join(", ")}.`
              : ""),
        );
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur lors de la correction.");
    }
    setSubmitting(false);
  }

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Correction Fédérale d'Athlète</h1>
        <p>
          Recherchez un athlete et corrigez manuellement ses donnees. Toute
          modification requiert un motif obligatoire et est enregistree dans
          l'audit federal.
        </p>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background: message.includes("succès") || message.includes("appliquee")
              ? "#10b98122"
              : "#ef444422",
            color:
              message.includes("succès") || message.includes("appliquee")
                ? "#10b981"
                : "#ef4444",
          }}
        >
          {message}
        </div>
      )}

      {/* Search */}
      <section className="panel">
        <h2>Rechercher un athlete</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input
            type="text"
            placeholder="Nom, prénom ou ID fédéral..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{ flex: 1 }}
          />
          <button className="primary" onClick={handleSearch} disabled={searching}>
            {searching ? "Recherche..." : "Rechercher"}
          </button>
        </div>

        {athletes.length > 0 && (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>ID Fédéral</th>
                  <th>Nom</th>
                  <th>Club</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((a) => (
                  <tr
                    key={a._id}
                    style={{
                      background:
                        selectedAthlete?._id === a._id ? "#f0fdf4" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => selectAthlete(a)}
                  >
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {a.federalId || "—"}
                    </td>
                    <td>
                      <strong>
                        {[a.firstName, a.lastName].filter(Boolean).join(" ") || "—"}
                      </strong>
                    </td>
                    <td>{a.club?.name || "—"}</td>
                    <td>{a.validationStatus || "—"}</td>
                    <td>
                      <button
                        className="btn-link"
                        style={{ fontSize: "0.8rem" }}
                      >
                        Sélectionner
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Correction form */}
      {selectedAthlete && (
        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>
            Correction de : {selectedAthlete.firstName} {selectedAthlete.lastName}
            {selectedAthlete.federalId && (
              <span style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "#888", marginLeft: "0.75rem" }}>
                {selectedAthlete.federalId}
              </span>
            )}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {PERMITTED_FIELDS.map((field) => (
              <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600 }}>{field.label}</span>
                {field.type === "select" ? (
                  <select
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  >
                    <option value="">— Non modifié —</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={form[field.key] ?? ""}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={`Valeur actuelle: ${selectedAthlete[field.key] ?? "—"}`}
                  />
                )}
              </label>
            ))}
          </div>

          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
              Motif de correction *
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Justification obligatoire pour l'audit federal..."
            />
          </label>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="primary"
              onClick={handleSubmit}
              disabled={submitting || Object.keys(form).length === 0 || !reason.trim()}
            >
              {submitting ? "Envoi..." : "Appliquer la correction"}
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                setSelectedAthlete(null);
                setForm({});
                setReason("");
              }}
            >
              Annuler
            </button>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
