import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";

export default function AdminCompetitionOperations() {
  const navigate = useNavigate();

  // State
  const [competitions, setCompetitions] = useState([]);
  const [competitionId, setCompetitionId] = useState("");
  const [activeTab, setActiveTab] = useState("registrations");
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Loaded Details
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [fights, setFights] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [athletes, setAthletes] = useState([]);

  // Selections
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("NEWAZA");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [message, setMessage] = useState("");

  async function load() {
    try {
      const { data } = await api.get("/competitions");
      const list = Array.isArray(data) ? data : data.data || [];
      setCompetitions(list);
      if (!competitionId && list[0]?._id) {
        setCompetitionId(list[0]._id);
      }
    } catch (err) {
      console.error(err);
      setMessage("Impossible de charger les compétitions");
    }
  }

  async function loadDetails(id = competitionId) {
    if (!id) return;
    setLoadingDetails(true);
    try {
      const [r, c, b, f, s, ath] = await Promise.all([
        api.get(`/competitions/${id}/registrations`),
        api.get(`/competitions/${id}/categories`),
        api.get(`/competitions/${id}/brackets`),
        api.get("/fights"),
        api.get("/scoring/sessions"),
        api.get("/athletes"),
      ]);

      setRegistrations(r.data || []);
      setCategories(c.data || []);
      setBrackets(b.data || []);

      const compFights = (Array.isArray(f.data) ? f.data : f.data.data || []).filter(
        (fight) => String(fight.competition?._id || fight.competition) === String(id)
      );
      setFights(compFights);
      setSessions(Array.isArray(s.data) ? s.data : s.data.data || []);
      setAthletes(Array.isArray(ath.data) ? ath.data : ath.data.data || []);

      // Default select the first category if none is selected
      if (c.data && c.data[0]?._id && !selectedCategoryId) {
        setSelectedCategoryId(c.data[0]._id);
      }
    } catch (err) {
      console.error(err);
      setMessage("Erreur lors du chargement des détails de la compétition");
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadDetails();
  }, [competitionId]);

  async function runWorkflowAction(label, path, method = "post") {
    try {
      await api[method](path);
      setMessage(`${label} effectuée avec succès`);
      await loadDetails();
    } catch (error) {
      setMessage(error.response?.data?.message || `${label} impossible`);
    }
  }

  async function handleRegisterAthlete(e) {
    e.preventDefault();
    if (!selectedAthleteId) return;
    try {
      await api.post(`/competitions/${competitionId}/registrations`, {
        athleteId: selectedAthleteId,
        discipline: selectedDiscipline,
      });
      setMessage("Athlète inscrit avec succès");
      setSelectedAthleteId("");
      await loadDetails();
    } catch (err) {
      setMessage(err.response?.data?.message || "Inscription impossible");
    }
  }

  async function approveRegistration(regId) {
    try {
      await api.patch(`/competitions/registrations/${regId}/approve`);
      setMessage("Inscription approuvée");
      await loadDetails();
    } catch (err) {
      setMessage(err.response?.data?.message || "Approbation impossible");
    }
  }

  async function rejectRegistration(regId) {
    const comment = prompt("Motif du rejet (facultatif) :");
    try {
      await api.patch(`/competitions/registrations/${regId}/reject`, { comment });
      setMessage("Inscription rejetée");
      await loadDetails();
    } catch (err) {
      setMessage(err.response?.data?.message || "Rejet impossible");
    }
  }

  async function startScoring(fightId, discipline = "NEWAZA") {
    try {
      let session = sessions.find(
        (s) => String(s.fight?._id || s.fight) === String(fightId)
      );
      if (!session) {
        const { data } = await api.post("/scoring/sessions", {
          fightId,
          discipline,
        });
        session = data;
      }
      navigate(`/admin/scoring/${session._id}`);
    } catch (err) {
      setMessage(err.response?.data?.message || "Impossible de démarrer l'arbitrage");
    }
  }

  const selectedBracket = brackets.find(
    (b) => String(b.categoryId?._id || b.categoryId) === String(selectedCategoryId)
  );

  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Opérations Compétition</h1>
        <p>Gérer les inscriptions, générer les arbres et lancer les combats en direct.</p>
      </div>

      {message && <div className="notice">{message}</div>}

      {/* Select Competition Header Panel */}
      <section className="panel">
        <label className="form-row">
          <span>Sélectionner la compétition</span>
          <select
            value={competitionId}
            onChange={(e) => {
              setCompetitionId(e.target.value);
              setSelectedCategoryId("");
            }}
          >
            {competitions.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title || c.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Navigation Tabs */}
      <div className="table-row-actions" style={{ marginBottom: "1.5rem" }}>
        <button
          className={activeTab === "registrations" ? "primary" : "ghost"}
          onClick={() => setActiveTab("registrations")}
        >
          Inscriptions ({registrations.length})
        </button>
        <button
          className={activeTab === "brackets" ? "primary" : "ghost"}
          onClick={() => setActiveTab("brackets")}
        >
          Arbres & Catégories ({brackets.length})
        </button>
        <button
          className={activeTab === "fights" ? "primary" : "ghost"}
          onClick={() => setActiveTab("fights")}
        >
          Arbitrage & Combats ({fights.length})
        </button>
      </div>

      {loadingDetails ? (
        <div className="panel" style={{ textAlign: "center" }}>
          Chargement des détails...
        </div>
      ) : (
        <>
          {/* TAB 1: REGISTRATIONS */}
          {activeTab === "registrations" && (
            <div className="grid two">
              {/* Form to Register Athlete */}
              <section className="panel">
                <h2>Inscrire un athlète</h2>
                <form onSubmit={handleRegisterAthlete} className="resource-form">
                  <label>
                    Athlète
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      required
                    >
                      <option value="">Sélectionner un athlète</option>
                      {athletes.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.firstName} {a.lastName} ({a.club?.name || "Sans club"})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Discipline
                    <select
                      value={selectedDiscipline}
                      onChange={(e) => setSelectedDiscipline(e.target.value)}
                      required
                    >
                      <option value="NEWAZA">Newaza</option>
                      <option value="FIGHTING">Fighting</option>
                    </select>
                  </label>
                  <button className="primary" type="submit" style={{ marginTop: "1rem" }}>
                    Inscrire l'athlète
                  </button>
                </form>
              </section>

              {/* Registrations List */}
              <section className="panel" style={{ gridColumn: "span 2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h2>Inscriptions de la compétition</h2>
                  <button
                    onClick={() =>
                      runWorkflowAction(
                        "Validation globale",
                        `/competitions/${competitionId}/registrations/validate-all`
                      )
                    }
                  >
                    Valider toutes les inscriptions
                  </button>
                </div>
                <div className="table-wrap">
                  <table className="smart-table">
                    <thead>
                      <tr>
                        <th>Athlète</th>
                        <th>Club</th>
                        <th>Discipline</th>
                        <th>Catégorie d'âge</th>
                        <th>Catégorie de poids</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center" }}>
                            Aucune inscription trouvée.
                          </td>
                        </tr>
                      ) : (
                        registrations.map((reg) => (
                          <tr key={reg._id}>
                            <td>
                              {reg.athleteId?.firstName} {reg.athleteId?.lastName}
                            </td>
                            <td>{reg.clubId?.name || "Sans Club"}</td>
                            <td>{reg.discipline}</td>
                            <td>{reg.ageCategory || "N/A"}</td>
                            <td>{reg.weightCategory || "N/A"}</td>
                            <td>
                              <span className={`badge ${reg.status}`}>
                                {reg.status === "approved"
                                  ? "Validé"
                                  : reg.status === "rejected"
                                  ? "Rejeté"
                                  : "En attente"}
                              </span>
                            </td>
                            <td>
                              <div className="table-row-actions">
                                {reg.status !== "approved" && (
                                  <button
                                    className="primary"
                                    onClick={() => approveRegistration(reg._id)}
                                  >
                                    Approuver
                                  </button>
                                )}
                                {reg.status !== "rejected" && (
                                  <button
                                    className="ghost danger"
                                    onClick={() => rejectRegistration(reg._id)}
                                  >
                                    Rejeter
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: BRACKETS */}
          {activeTab === "brackets" && (
            <div className="grid three">
              {/* Category Generation Rule Actions */}
              <section className="panel" style={{ gridColumn: "span 3" }}>
                <h2>Génération des Catégories & Arbres</h2>
                <p style={{ marginBottom: "1rem" }}>
                  Générez les catégories officielles d'abord, puis seeding les combattants dans les arbres (Brackets).
                </p>
                <div className="table-row-actions">
                  <button
                    onClick={() =>
                      runWorkflowAction(
                        "Génération des catégories",
                        `/competitions/${competitionId}/generate-categories`
                      )
                    }
                  >
                    Générer les catégories
                  </button>
                  <button
                    onClick={() =>
                      runWorkflowAction(
                        "Génération des arbres (brackets)",
                        `/competitions/${competitionId}/generate-brackets`
                      )
                    }
                  >
                    Générer les arbres (brackets)
                  </button>
                  <button
                    onClick={() =>
                      runWorkflowAction(
                        "Verrouillage des arbres",
                        `/competitions/${competitionId}/lock-brackets`,
                        "patch"
                      )
                    }
                  >
                    Verrouiller les arbres
                  </button>
                  <button
                    onClick={() =>
                      runWorkflowAction(
                        "Publication des arbres",
                        `/competitions/${competitionId}/publish-brackets`,
                        "patch"
                      )
                    }
                  >
                    Publier les arbres
                  </button>
                </div>
              </section>

              {/* Categories Selector Panel */}
              <section className="panel">
                <h2>Catégories</h2>
                {categories.length === 0 ? (
                  <p>Aucune catégorie générée.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {categories.map((c) => (
                      <button
                        key={c._id}
                        className={String(c._id) === String(selectedCategoryId) ? "primary" : "ghost"}
                        onClick={() => setSelectedCategoryId(c._id)}
                        style={{ textAlign: "left", width: "100%" }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Interactive Bracket Tree Renderer */}
              <section className="panel" style={{ gridColumn: "span 2" }}>
                <h2>Arbre de combat: {selectedBracket?.name || "Aucun"}</h2>
                {selectedBracket ? (
                  <div className="bracket-wrapper" style={{ overflowX: "auto", padding: "1rem" }}>
                    <div style={{ display: "flex", gap: "2rem" }}>
                      {selectedBracket.rounds?.map((round, rIndex) => (
                        <div
                          key={round._id || rIndex}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-around",
                            gap: "1.5rem",
                            minWidth: "220px",
                          }}
                        >
                          <h3 style={{ textAlign: "center", borderBottom: "1px solid #ccc" }}>
                            Round {round.round}
                          </h3>
                          {round.matches?.map((match) => {
                            const redName = match.redAthlete
                              ? `${match.redAthlete.firstName || ""} ${match.redAthlete.lastName || ""}`
                              : match.redSeed
                              ? `Semence #${match.redSeed}`
                              : "En attente";
                            const blueName = match.blueAthlete
                              ? `${match.blueAthlete.firstName || ""} ${match.blueAthlete.lastName || ""}`
                              : match.blueSeed
                              ? `Semence #${match.blueSeed}`
                              : "En attente";

                            const isFinished = match.winnerSeed !== null;
                            const isLive = match.fight && fights.find((f) => String(f._id) === String(match.fight))?.status === "LIVE";

                            return (
                              <div
                                key={match._id || match.matchNumber}
                                style={{
                                  border: "1px solid var(--border)",
                                  borderRadius: "6px",
                                  padding: "0.5rem",
                                  backgroundColor: "var(--panel-bg)",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                }}
                              >
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                                  Match #{match.matchNumber} {isLive && <span className="badge LIVE">LIVE</span>}
                                </div>
                                <div
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    backgroundColor: match.winnerSeed === match.redSeed ? "rgba(40,167,69,0.1)" : "transparent",
                                    fontWeight: match.winnerSeed === match.redSeed ? "bold" : "normal",
                                    borderRadius: "4px",
                                  }}
                                >
                                  🔴 {redName}
                                </div>
                                <div style={{ margin: "0.25rem 0", borderTop: "1px dashed var(--border)" }} />
                                <div
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    backgroundColor: match.winnerSeed === match.blueSeed ? "rgba(40,167,69,0.1)" : "transparent",
                                    fontWeight: match.winnerSeed === match.blueSeed ? "bold" : "normal",
                                    borderRadius: "4px",
                                  }}
                                >
                                  🔵 {blueName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>Aucun arbre généré pour cette catégorie.</p>
                )}
              </section>
            </div>
          )}

          {/* TAB 3: FIGHTS & LIVE SCORING CONTROL */}
          {activeTab === "fights" && (
            <section className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h2>Tableau d'Arbitrage</h2>
                <button
                  onClick={() =>
                    runWorkflowAction(
                      "Envoi au live",
                      `/competitions/${competitionId}/brackets/send-to-live`
                    )
                  }
                >
                  Envoyer les combats au direct
                </button>
              </div>

              <div className="table-wrap">
                <table className="smart-table">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th>Combattant Rouge</th>
                      <th>Combattant Bleu</th>
                      <th>Aire de combat</th>
                      <th>Statut</th>
                      <th>Arbitrage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fights.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center" }}>
                          Aucun combat en cours ou planifié. Veuillez envoyer les arbres au direct.
                        </td>
                      </tr>
                    ) : (
                      fights.map((fight) => {
                        const redName = fight.redAthlete
                          ? `${fight.redAthlete.firstName} ${fight.redAthlete.lastName}`
                          : "Qualifié";
                        const blueName = fight.blueAthlete
                          ? `${fight.blueAthlete.firstName} ${fight.blueAthlete.lastName}`
                          : "Qualifié";

                        return (
                          <tr key={fight._id}>
                            <td>{fight.category}</td>
                            <td>🔴 {redName}</td>
                            <td>🔵 {blueName}</td>
                            <td>{fight.mat || "Tatami 1"}</td>
                            <td>
                              <span className={`badge ${fight.status}`}>
                                {fight.status === "SCHEDULED"
                                  ? "Planifié"
                                  : fight.status === "LIVE"
                                  ? "En Cours"
                                  : "Terminé"}
                              </span>
                            </td>
                            <td>
                              <div className="table-row-actions">
                                {fight.status === "SCHEDULED" && (
                                  <button
                                    className="primary"
                                    onClick={() => startScoring(fight._id, "NEWAZA")}
                                  >
                                    Lancer l'Arbitrage
                                  </button>
                                )}
                                {fight.status === "LIVE" && (
                                  <button
                                    className="primary"
                                    onClick={() => startScoring(fight._id, "NEWAZA")}
                                  >
                                    Continuer l'Arbitrage
                                  </button>
                                )}
                                {fight.status === "FINISHED" && (
                                  <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                                    Score: {fight.redScore ?? 0} - {fight.blueScore ?? 0}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </AdminLayout>
  );
}
