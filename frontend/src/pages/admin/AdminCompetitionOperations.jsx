import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../services/api";
import BracketTree from "../../components/competitions/BracketTree";
import LiveMatch from "../../components/competitions/LiveMatch";

const TABS = ["registrations", "brackets", "fights"];

export default function AdminCompetitionOperations() {
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState([]);
  const [competitionId, setCompetitionId] = useState("");
  const [activeTab, setActiveTab] = useState("registrations");
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brackets, setBrackets] = useState([]);
  const [fights, setFights] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [athletes, setAthletes] = useState([]);

  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState("NEWAZA");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [liveMatchFight, setLiveMatchFight] = useState(null);
  const [message, setMessage] = useState("");

  // ---- Data loading ----
  const loadCompetitions = useCallback(async () => {
    try {
      const { data } = await api.get("/competitions");
      const list = Array.isArray(data) ? data : data.data || [];
      setCompetitions(list);
      if (!competitionId && list[0]?._id) {
        setCompetitionId(list[0]._id);
      }
    } catch {
      setMessage("Impossible de charger les compétitions");
    }
  }, []);

  const loadDetails = useCallback(async (id) => {
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

      const allFights = Array.isArray(f.data) ? f.data : f.data?.data || [];
      const compFights = allFights.filter(
        (fight) =>
          String(fight.competition?._id || fight.competition) === String(id),
      );
      setFights(compFights);
      setSessions(Array.isArray(s.data) ? s.data : s.data?.data || []);
      setAthletes(Array.isArray(ath.data) ? ath.data : ath.data?.data || []);

      // Auto-select first category
      const cats = c.data || [];
      if (cats[0]?._id && !selectedCategoryId) {
        setSelectedCategoryId(cats[0]._id);
      }
    } catch {
      setMessage("Erreur lors du chargement des détails");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);
  useEffect(() => {
    loadDetails(competitionId);
  }, [competitionId]); // eslint-disable-line

  // ---- Workflow actions ----
  const runAction = async (label, path, method = "post") => {
    try {
      await api[method](path);
      setMessage(`${label} — succès`);
      await loadDetails(competitionId);
    } catch (err) {
      setMessage(err.response?.data?.message || `${label} — échec`);
    }
  };

  // ---- Registration actions ----
  const registerAthlete = async (e) => {
    e.preventDefault();
    if (!selectedAthleteId) return;
    try {
      await api.post(`/competitions/${competitionId}/registrations`, {
        athleteId: selectedAthleteId,
        discipline: selectedDiscipline,
      });
      setMessage("Athlète inscrit");
      setSelectedAthleteId("");
      await loadDetails(competitionId);
    } catch (err) {
      setMessage(err.response?.data?.message || "Inscription impossible");
    }
  };

  const approveReg = async (id) => {
    await api.patch(`/competitions/registrations/${id}/approve`);
    await loadDetails(competitionId);
  };
  const rejectReg = async (id) => {
    const c = prompt("Motif du rejet (facultatif) :");
    await api.patch(`/competitions/registrations/${id}/reject`, { comment: c });
    await loadDetails(competitionId);
  };

  // ---- Live match from bracket ----
  const startLiveMatch = async (match) => {
    try {
      let fight = match.fight
        ? fights.find((f) => String(f._id) === String(match.fight))
        : null;

      if (!fight) {
        // Create a Fight document
        const { data } = await api.post("/fights", {
          federation: competitions.find((c) => c._id === competitionId)
            ?.federation,
          competition: competitionId,
          category: selectedBracket?.name || "",
          redAthlete: match.redAthlete?._id || match.redAthlete,
          blueAthlete: match.blueAthlete?._id || match.blueAthlete,
          mat: "Tatami 1",
          status: "SCHEDULED",
          timerSeconds: 300,
        });
        fight = data;

        // Link fight to bracket match
        try {
          await api.patch(
            `/competitions/brackets/${selectedBracket?._id}/matches/${match._id || match.matchNumber}`,
            { fight: fight._id },
          );
        } catch {
          /* best-effort */
        }

        // Refresh fights
        const { data: fData } = await api.get("/fights");
        const fresh = Array.isArray(fData) ? fData : fData?.data || [];
        setFights(
          fresh.filter(
            (f) =>
              String(f.competition?._id || f.competition) ===
              String(competitionId),
          ),
        );
      }

      setLiveMatchFight(fight);
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Impossible de démarrer le match",
      );
    }
  };

  const handleMatchClick = (match) => {
    const fight = fights.find((f) => String(f._id) === String(match.fight));
    if (fight) {
      setLiveMatchFight(fight);
    }
  };

  const handleScoreUpdate = (data) => {
    setFights((prev) =>
      prev.map((f) =>
        String(f._id) === String(data.fightId)
          ? { ...f, redScore: data.redScore, blueScore: data.blueScore }
          : f,
      ),
    );
  };

  const reloadBrackets = async () => {
    try {
      const { data } = await api.get(`/competitions/${competitionId}/brackets`);
      setBrackets(Array.isArray(data) ? data : data.data || []);
    } catch {
      /* ignore */
    }
  };

  // ---- Derived ----
  const selectedBracket = brackets.find(
    (b) =>
      String(b.categoryId?._id || b.categoryId) === String(selectedCategoryId),
  );

  const tabConfig = [
    {
      key: "registrations",
      label: "Inscriptions",
      count: registrations.length,
    },
    { key: "brackets", label: "Arbres & Catégories", count: brackets.length },
    { key: "fights", label: "Arbitrage & Combats", count: fights.length },
  ];

  // ---- Status labels ----
  const regStatusLabel = (s) =>
    s === "approved" ? "Validé" : s === "rejected" ? "Rejeté" : "En attente";
  const fightStatusLabel = (s) =>
    s === "SCHEDULED"
      ? "Planifié"
      : s === "LIVE"
        ? "En Cours"
        : s === "FINISHED"
          ? "Terminé"
          : s;

  // =============================================================================
  //  RENDER
  // =============================================================================
  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Opérations Compétition</h1>
        <p>Inscriptions, génération des arbres et arbitrage en direct.</p>
      </div>

      {message && (
        <div className="notice" style={{ marginBottom: "1rem" }}>
          {message}
          <button className="notice-close" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      {/* ---- Competition selector ---- */}
      <section
        className="card"
        style={{
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <label className="form-row" style={{ flex: "1 1 300px" }}>
          <span>Compétition</span>
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
        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {categories.length} catégorie(s) · {fights.length} combat(s) ·{" "}
          {registrations.length} inscription(s)
        </span>
      </section>

      {/* ---- Tabs ---- */}
      <div
        className="tabs-bar"
        style={{ marginBottom: "1.25rem", display: "flex", gap: "0" }}
      >
        {tabConfig.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "0.75rem 1rem",
              border: "none",
              borderBottom:
                activeTab === t.key
                  ? "3px solid var(--accent)"
                  : "3px solid transparent",
              background:
                activeTab === t.key ? "var(--panel-bg)" : "transparent",
              color:
                activeTab === t.key
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
              fontWeight: activeTab === t.key ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loadingDetails ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          Chargement des détails...
        </div>
      ) : (
        <>
          {/* ======== TAB: REGISTRATIONS ======== */}
          {activeTab === "registrations" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "1.25rem",
                alignItems: "start",
              }}
            >
              <div className="card">
                <h2 style={{ marginBottom: "1rem" }}>Inscrire un athlète</h2>
                <form
                  onSubmit={registerAthlete}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <label>
                    <span
                      style={{
                        display: "block",
                        marginBottom: "0.3rem",
                        fontWeight: 600,
                      }}
                    >
                      Athlète
                    </span>
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      required
                      style={{ width: "100%" }}
                    >
                      <option value="">Sélectionner...</option>
                      {athletes.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.firstName} {a.lastName} (
                          {a.club?.name || "Sans club"})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span
                      style={{
                        display: "block",
                        marginBottom: "0.3rem",
                        fontWeight: 600,
                      }}
                    >
                      Discipline
                    </span>
                    <select
                      value={selectedDiscipline}
                      onChange={(e) => setSelectedDiscipline(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <option value="NEWAZA">Newaza</option>
                      <option value="FIGHTING">Fighting</option>
                      <option value="FULL_CONTACT">Full Contact</option>
                      <option value="DUO">Duo System</option>
                    </select>
                  </label>
                  <button type="submit" className="primary">
                    Inscrire l'athlète
                  </button>
                </form>
              </div>

              <div className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h2>Inscriptions ({registrations.length})</h2>
                  <button
                    onClick={() =>
                      runAction(
                        "Validation globale",
                        `/competitions/${competitionId}/registrations/validate-all`,
                      )
                    }
                  >
                    Valider tout
                  </button>
                </div>
                {registrations.length === 0 ? (
                  <p className="muted">Aucune inscription.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="smart-table">
                      <thead>
                        <tr>
                          <th>Athlète</th>
                          <th>Club</th>
                          <th>Discipline</th>
                          <th>Âge</th>
                          <th>Poids</th>
                          <th>Statut</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map((reg) => (
                          <tr key={reg._id}>
                            <td>
                              {reg.athleteId?.firstName}{" "}
                              {reg.athleteId?.lastName}
                            </td>
                            <td>{reg.clubId?.name || "—"}</td>
                            <td>{reg.discipline}</td>
                            <td>{reg.ageCategory || "—"}</td>
                            <td>{reg.weightCategory || "—"}</td>
                            <td>
                              <span className={`badge ${reg.status}`}>
                                {regStatusLabel(reg.status)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.35rem" }}>
                                {reg.status !== "approved" && (
                                  <button
                                    className="primary sm"
                                    onClick={() => approveReg(reg._id)}
                                  >
                                    ✓
                                  </button>
                                )}
                                {reg.status !== "rejected" && (
                                  <button
                                    className="ghost danger sm"
                                    onClick={() => rejectReg(reg._id)}
                                  >
                                    ✕
                                  </button>
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
            </div>
          )}

          {/* ======== TAB: BRACKETS ======== */}
          {activeTab === "brackets" && (
            <div>
              {/* Workflow controls */}
              <div className="card" style={{ marginBottom: "1.25rem" }}>
                <h2 style={{ marginBottom: "0.75rem" }}>
                  Génération des Arbres
                </h2>
                <p className="muted" style={{ marginBottom: "0.75rem" }}>
                  Étape 1 : Générer les catégories → Étape 2 : Générer les
                  arbres → Étape 3 : Verrouiller → Étape 4 : Publier
                </p>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <button
                    onClick={() =>
                      runAction(
                        "Catégories",
                        `/competitions/${competitionId}/generate-categories`,
                      )
                    }
                  >
                    ① Générer les catégories
                  </button>
                  <button
                    onClick={() =>
                      runAction(
                        "Arbres",
                        `/competitions/${competitionId}/generate-brackets`,
                      )
                    }
                  >
                    ② Générer les arbres
                  </button>
                  <button
                    onClick={() =>
                      runAction(
                        "Verrouillage",
                        `/competitions/${competitionId}/lock-brackets`,
                        "patch",
                      )
                    }
                  >
                    ③ Verrouiller
                  </button>
                  <button
                    onClick={() =>
                      runAction(
                        "Publication",
                        `/competitions/${competitionId}/publish-brackets`,
                        "patch",
                      )
                    }
                  >
                    ④ Publier
                  </button>
                  <button
                    onClick={() =>
                      runAction(
                        "Envoi au live",
                        `/competitions/${competitionId}/brackets/send-to-live`,
                      )
                    }
                  >
                    ▶ Envoyer au direct
                  </button>
                </div>
              </div>

              {/* Category selector + Bracket tree */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr",
                  gap: "1.25rem",
                  alignItems: "start",
                }}
              >
                <div className="card">
                  <h3 style={{ marginBottom: "0.75rem" }}>Catégories</h3>
                  {categories.length === 0 ? (
                    <p className="muted">Aucune catégorie.</p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                      }}
                    >
                      {categories.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => setSelectedCategoryId(c._id)}
                          className={
                            String(c._id) === String(selectedCategoryId)
                              ? "primary"
                              : "ghost"
                          }
                          style={{
                            textAlign: "left",
                            justifyContent: "flex-start",
                            padding: "0.5rem 0.75rem",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.85rem", lineHeight: 1.3 }}
                          >
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card" style={{ overflow: "hidden" }}>
                  <h2 style={{ marginBottom: "0.75rem" }}>
                    {selectedBracket
                      ? `Arbre : ${selectedBracket.name}`
                      : "Aucun arbre sélectionné"}
                    {selectedBracket?.status && (
                      <span
                        className={`badge ${selectedBracket.status}`}
                        style={{ marginLeft: "0.75rem", fontSize: "0.75rem" }}
                      >
                        {selectedBracket.status}
                      </span>
                    )}
                  </h2>
                  <BracketTree
                    bracket={selectedBracket}
                    fights={fights}
                    onMatchClick={handleMatchClick}
                    onStartMatch={startLiveMatch}
                    onBracketUpdate={reloadBrackets}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======== TAB: FIGHTS ======== */}
          {activeTab === "fights" && (
            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2>Tableau d'Arbitrage ({fights.length})</h2>
                <button
                  onClick={() =>
                    runAction(
                      "Envoi au live",
                      `/competitions/${competitionId}/brackets/send-to-live`,
                    )
                  }
                >
                  ▶ Envoyer les combats au direct
                </button>
              </div>

              {fights.length === 0 ? (
                <p
                  className="muted"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  Aucun combat. Générez les arbres puis cliquez "Envoyer au
                  direct".
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="smart-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th>🔴 Rouge</th>
                        <th>🔵 Bleu</th>
                        <th>Tatami</th>
                        <th>Score</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fights.map((fight) => {
                        const redName = fight.redAthlete
                          ? `${fight.redAthlete.firstName || ""} ${fight.redAthlete.lastName || ""}`.trim()
                          : "Qualifié";
                        const blueName = fight.blueAthlete
                          ? `${fight.blueAthlete.firstName || ""} ${fight.blueAthlete.lastName || ""}`.trim()
                          : "Qualifié";
                        const isLive = fight.status === "LIVE";
                        const isFinished = fight.status === "FINISHED";
                        const isScheduled = fight.status === "SCHEDULED";

                        return (
                          <tr
                            key={fight._id}
                            style={{
                              background: isLive
                                ? "rgba(239,68,68,0.06)"
                                : "transparent",
                            }}
                          >
                            <td>{fight.category || "—"}</td>
                            <td>🔴 {redName}</td>
                            <td>🔵 {blueName}</td>
                            <td>{fight.mat || "Tatami 1"}</td>
                            <td>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                }}
                              >
                                {fight.redScore ?? 0} — {fight.blueScore ?? 0}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge ${fight.status?.toLowerCase()}`}
                              >
                                {fightStatusLabel(fight.status)}
                                {isLive && (
                                  <span
                                    style={{
                                      marginLeft: "4px",
                                      animation: "pulse 1.5s infinite",
                                    }}
                                  >
                                    ●
                                  </span>
                                )}
                              </span>
                            </td>
                            <td>
                              {(isScheduled || isLive) && (
                                <button
                                  className="primary sm"
                                  onClick={() => setLiveMatchFight(fight)}
                                >
                                  {isLive ? "Arbitrer" : "Démarrer"}
                                </button>
                              )}
                              {isFinished && (
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  Terminé
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Live Match Modal */}
      {liveMatchFight && (
        <LiveMatch
          fight={liveMatchFight}
          discipline={selectedDiscipline}
          onClose={() => {
            setLiveMatchFight(null);
            loadDetails(competitionId);
          }}
          onScoreUpdate={handleScoreUpdate}
        />
      )}
    </AdminLayout>
  );
}
