import React from "react";

const DISCIPLINES = [
  { key: "NEWAZA", label: "Newaza (Ne-Waza)", duration: 300, icon: "🥋" },
  { key: "FIGHTING", label: "Fighting", duration: 180, icon: "🥊" },
  { key: "FULL_CONTACT", label: "Full Contact", duration: 180, icon: "💢" },
  { key: "DUO", label: "Duo System", duration: 180, icon: "🤝" },
];

export default function DisciplineSelector({ value = "NEWAZA", onChange }) {
  return (
    <div className="discipline-selector">
      <label className="form-label">Discipline</label>
      <div className="discipline-grid">
        {DISCIPLINES.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`discipline-chip ${value === d.key ? "selected" : ""}`}
            onClick={() => onChange && onChange(d.key)}
          >
            <span className="discipline-icon">{d.icon}</span>
            <span className="discipline-label">{d.label}</span>
            <span className="discipline-duration">{d.duration}s</span>
          </button>
        ))}
      </div>
    </div>
  );
}
