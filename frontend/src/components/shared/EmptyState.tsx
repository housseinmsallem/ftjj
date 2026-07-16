import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="directory-empty-state" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  );
}
