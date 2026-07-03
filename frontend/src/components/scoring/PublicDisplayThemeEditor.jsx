import React, { useState } from "react";

const DEFAULT_THEME = {
  backgroundColor: "#0f172a",
  textColor: "#e2e8f0",
  redColor: "#ef4444",
  blueColor: "#3b82f6",
  timerColor: "#48bb78",
  accentColor: "#f59e0b",
  fontSize: "lg",
};

export default function PublicDisplayThemeEditor({
  theme: externalTheme,
  onChange,
}) {
  const [theme, setTheme] = useState(externalTheme || DEFAULT_THEME);

  const update = (key, value) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    if (onChange) onChange(updated);
  };

  return (
    <div className="public-display-theme-editor card">
      <h3>Thème affichage public</h3>
      <p className="muted">
        Personnalisez l'apparence du tableau d'affichage public
      </p>

      <div className="theme-grid">
        <div className="form-group">
          <label>Fond</label>
          <input
            type="color"
            value={theme.backgroundColor}
            onChange={(e) => update("backgroundColor", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Texte</label>
          <input
            type="color"
            value={theme.textColor}
            onChange={(e) => update("textColor", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Rouge</label>
          <input
            type="color"
            value={theme.redColor}
            onChange={(e) => update("redColor", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Bleu</label>
          <input
            type="color"
            value={theme.blueColor}
            onChange={(e) => update("blueColor", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Chrono</label>
          <input
            type="color"
            value={theme.timerColor}
            onChange={(e) => update("timerColor", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Accent</label>
          <input
            type="color"
            value={theme.accentColor}
            onChange={(e) => update("accentColor", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Taille police</label>
          <select
            value={theme.fontSize}
            onChange={(e) => update("fontSize", e.target.value)}
          >
            <option value="sm">Petite</option>
            <option value="md">Moyenne</option>
            <option value="lg">Grande</option>
            <option value="xl">Très grande</option>
          </select>
        </div>
      </div>

      {/* Live preview */}
      <div
        className="theme-preview"
        style={{ background: theme.backgroundColor, color: theme.textColor }}
      >
        <div className="preview-scoreboard">
          <div className="preview-side" style={{ borderColor: theme.redColor }}>
            <span
              style={{
                color: theme.redColor,
                fontSize:
                  theme.fontSize === "xl"
                    ? "3rem"
                    : theme.fontSize === "lg"
                      ? "2rem"
                      : "1.5rem",
              }}
            >
              12
            </span>
            <small>Rouge</small>
          </div>
          <div
            className="preview-timer"
            style={{ borderColor: theme.timerColor }}
          >
            <span
              style={{
                color: theme.timerColor,
                fontSize:
                  theme.fontSize === "xl"
                    ? "4rem"
                    : theme.fontSize === "lg"
                      ? "2.5rem"
                      : "2rem",
              }}
            >
              02:45
            </span>
            <small>Tatami 1</small>
          </div>
          <div
            className="preview-side"
            style={{ borderColor: theme.blueColor }}
          >
            <span
              style={{
                color: theme.blueColor,
                fontSize:
                  theme.fontSize === "xl"
                    ? "3rem"
                    : theme.fontSize === "lg"
                      ? "2rem"
                      : "1.5rem",
              }}
            >
              8
            </span>
            <small>Bleu</small>
          </div>
        </div>
      </div>

      <button
        className="btn btn-outline btn-sm"
        onClick={() => {
          update("backgroundColor", DEFAULT_THEME.backgroundColor);
          update("textColor", DEFAULT_THEME.textColor);
          update("redColor", DEFAULT_THEME.redColor);
          update("blueColor", DEFAULT_THEME.blueColor);
          update("timerColor", DEFAULT_THEME.timerColor);
          update("accentColor", DEFAULT_THEME.accentColor);
          update("fontSize", DEFAULT_THEME.fontSize);
        }}
      >
        Réinitialiser le thème
      </button>
    </div>
  );
}
