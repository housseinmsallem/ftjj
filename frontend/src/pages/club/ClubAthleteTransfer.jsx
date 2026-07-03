import React, { useEffect, useState } from "react";
import ClubLayout from "../../components/layout/ClubLayout";
import api from "../../services/api";

export default function ClubAthleteTransfer() {
  const [athletes, setAthletes] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [athRes, clubRes] = await Promise.all([
          api.get("/athletes"),
          api.get("/clubs"),
        ]);
        const athleteData = Array.isArray(athRes.data)
          ? athRes.data
          : athRes.data?.data || [];
        const clubData = Array.isArray(clubRes.data)
          ? clubRes.data
          : clubRes.data?.data || [];
        setAthletes(athleteData);
        // Only show other clubs (not the athlete's current club)
        setClubs(clubData);
      } catch {
        setMessage("Erreur de chargement des donnees.");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAthlete || !selectedClub || !reason.trim()) {
      setMessage("Veuillez remplir tous les champs.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const { data } = await api.post("/federal-integration/transfers", {
        athleteId: selectedAthlete,
        toClubId: selectedClub,
        reason: reason.trim(),
      });
      setMessage(data.message || "Demande de transfert envoyee.");
      setSelectedAthlete("");
      setSelectedClub("");
      setReason("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Erreur lors de la demande.");
    }
    setSubmitting(false);
  }

  if (loading)
    return (
      <ClubLayout>
        <div className="notice">Chargement...</div>
      </ClubLayout>
    );

  const selectedAthObj = athletes.find((a) => a._id === selectedAthlete);
  const currentClub = selectedAthObj?.club?.name || selectedAthObj?.club || "—";
  const filteredClubs = clubs.filter((c) => {
    if (!selectedAthObj) return true;
    const athleteClubId =
      typeof selectedAthObj.club === "object"
        ? selectedAthObj.club?._id
        : selectedAthObj.club;
    return c._id !== athleteClubId;
  });

  return (
    <ClubLayout>
      <div className="page-head">
        <h1>Demande de Transfert</h1>
        <p>
          Initiez un transfert d'athlete vers un autre club. La demande sera
          examinee par un administrateur federal.
        </p>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            background:
              message.includes("succès") || message.includes("envoyee")
                ? "#10b98122"
                : "#ef444422",
            color:
              message.includes("succès") || message.includes("envoyee")
                ? "#10b981"
                : "#ef4444",
          }}
        >
          {message}
        </div>
      )}

      <section className="panel">
        <form onSubmit={handleSubmit}>
          {/* Athlete selection */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "0.35rem",
              }}
            >
              Athlète concerné
            </label>
            <select
              value={selectedAthlete}
              onChange={(e) => {
                setSelectedAthlete(e.target.value);
                setSelectedClub(""); // reset target club
              }}
              required
            >
              <option value="">-- Sélectionner un athlete --</option>
              {athletes.map((a) => (
                <option key={a._id} value={a._id}>
                  {[a.firstName, a.lastName].filter(Boolean).join(" ")}{" "}
                  {a.federalId ? `(${a.federalId})` : ""}
                </option>
              ))}
            </select>
            {selectedAthObj && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.85rem",
                  color: "#6b7280",
                }}
              >
                Club actuel : <strong>{currentClub}</strong>
                {selectedAthObj.federalId && (
                  <>
                    {" "}
                    &middot; ID:{" "}
                    <span style={{ fontFamily: "monospace" }}>
                      {selectedAthObj.federalId}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Target club */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "0.35rem",
              }}
            >
              Club de destination
            </label>
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              required
              disabled={!selectedAthlete}
            >
              <option value="">-- Sélectionner un club --</option>
              {filteredClubs.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.federalId ? `(${c.federalId})` : ""}
                </option>
              ))}
            </select>
            {selectedAthlete && filteredClubs.length === 0 && (
              <div
                style={{
                  marginTop: "0.35rem",
                  fontSize: "0.8rem",
                  color: "#f59e0b",
                }}
              >
                Aucun autre club disponible.
              </div>
            )}
          </div>

          {/* Reason */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "0.35rem",
              }}
            >
              Motif du transfert *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Expliquez la raison du transfert..."
              required
            />
          </div>

          <button
            className="primary"
            type="submit"
            disabled={
              submitting || !selectedAthlete || !selectedClub || !reason.trim()
            }
          >
            {submitting
              ? "Envoi en cours..."
              : "Envoyer la demande de transfert"}
          </button>
        </form>
      </section>

      {/* Info panel */}
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
        <strong>Informations :</strong>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
          <li>La demande sera examinée par la Fédération.</li>
          <li>Une seule demande en attente est autorisée par athlète.</li>
          <li>
            L'historique des clubs est conservé dans le profil de l'athlète.
          </li>
          <li>Un motif détaillé facilite le traitement de votre demande.</li>
        </ul>
      </div>
    </ClubLayout>
  );
}
