import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
}

export default function StatCard({ label, value }: StatCardProps): React.ReactElement {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
