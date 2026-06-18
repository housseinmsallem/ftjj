import React from "react";
export default function SponsorManager(props) {
  return (
    <div className="panel compact">
      <strong>SponsorManager</strong>
      <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
