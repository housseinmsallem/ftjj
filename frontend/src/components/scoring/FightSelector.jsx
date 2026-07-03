import React, { useEffect, useState } from "react";
import api from "../../services/api";

function athleteName(a) {
  if (!a) return "—";
  return (
    `${a.firstName || ""} ${a.lastName || ""}`.trim() ||
    a.name ||
    "Athlète FTJJ"
  );
}

export default function FightSelector({ onSelect, selectedId, competitionId }) {
  const [fights, setFights] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState(competitionId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get("/competitions")
      .then(({ data }) => {
        setCompetitions(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedComp) {
      setFights([]);
      return;
    }
    setLoading(true);
    api
      .get("/fights", { params: { competition: selectedComp } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setFights(
          list.filter((f) => f.status === "SCHEDULED" || f.status === "LIVE"),
        );
      })
      .catch(() => setFights([]))
      .finally(() => setLoading(false));
  }, [selectedComp]);

  return (
    <div className="fight-selector card">
      <h3>Sélection du combat</h3>

      <div className="form-group">
        <label>Compétition</label>
        <select
          value={selectedComp}
          onChange={(e) => {
            setSelectedComp(e.target.value);
            if (onSelect) onSelect(null);
          }}
        >
          <option value="">— Choisir une compétition —</option>
          {competitions.map((c) => (
            <option key={c._id} value={c._id}>
              {c.title || c.name || c._id}
            </option>
          ))}
        </select>
      </div>

      {selectedComp && (
        <div className="form-group">
          <label>Combat disponible</label>
          {loading ? (
            <p className="muted">Chargement...</p>
          ) : fights.length === 0 ? (
            <p className="muted">
              Aucun combat disponible pour cette compétition
            </p>
          ) : (
            <div className="fight-list">
              {fights.map((f) => (
                <button
                  key={f._id}
                  className={`fight-item ${selectedId === f._id ? "selected" : ""}`}
                  onClick={() => onSelect && onSelect(f)}
                >
                  <span className="fight-mat">{f.mat || "Tatami"}</span>
                  <span className="fight-athletes">
                    <span className="red-name">
                      {athleteName(f.redAthlete)}
                    </span>
                    <span className="vs">vs</span>
                    <span className="blue-name">
                      {athleteName(f.blueAthlete)}
                    </span>
                  </span>
                  <span className="fight-category">{f.category || ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
