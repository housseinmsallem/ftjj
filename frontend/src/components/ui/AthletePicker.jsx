import React, { useEffect, useRef, useState } from "react";
import api from "../../services/api";

function athleteLabel(athlete) {
  if (!athlete) return "";
  return `${athlete.firstName} ${athlete.lastName}`;
}

export default function AthletePicker({
  value,
  onChange,
  disabled = false,
  clubId = null,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: query.trim() });
        if (clubId) params.set("club", clubId);
        const { data } = await api.get(`/athletes?${params.toString()}`);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, clubId]);

  useEffect(() => {
    function handleClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectAthlete(athlete) {
    onChange?.(athlete);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  function clearSelection() {
    onChange?.(null);
    setQuery("");
  }

  return (
    <div className="athlete-picker" ref={wrapRef}>
      {value ? (
        <div className="athlete-picker-selected">
          <div>
            <strong>{athleteLabel(value)}</strong>
            <small>
              {value.club?.name || value.club || "Sans club"} ·{" "}
              {value.weight ? `${value.weight} kg` : "Poids non renseigné"} ·{" "}
              {value.licenseStatus || "—"}
            </small>
          </div>
          {!disabled && (
            <button type="button" className="ghost" onClick={clearSelection}>
              Changer
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Rechercher un athlète (min. 2 caractères)..."
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
          {open && (query.trim().length >= 2 || loading) && (
            <div className="athlete-picker-dropdown">
              {loading && <div className="picker-empty">Recherche...</div>}
              {!loading && results.length === 0 && (
                <div className="picker-empty">Aucun athlète trouvé</div>
              )}
              {!loading &&
                results.map((athlete) => (
                  <button
                    type="button"
                    key={athlete._id}
                    className="athlete-picker-option"
                    onClick={() => selectAthlete(athlete)}
                  >
                    <strong>
                      {athlete.firstName} {athlete.lastName}
                    </strong>
                    <small>
                      {athlete.club?.name || "Sans club"} ·{" "}
                      {athlete.weight ? `${athlete.weight} kg` : "—"} ·{" "}
                      {athlete.jiujitsuBelt || athlete.belt || "—"}
                    </small>
                  </button>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
