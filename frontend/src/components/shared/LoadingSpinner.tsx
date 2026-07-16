import React from "react";

interface LoadingSpinnerProps {
  text?: string;
}

export default function LoadingSpinner({ text = "Chargement..." }: LoadingSpinnerProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: "12px" }}>
      <div className="spinner" style={{
        width: "32px", height: "32px",
        border: "3px solid var(--border)",
        borderTopColor: "var(--red)",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p className="muted">{text}</p>
    </div>
  );
}
