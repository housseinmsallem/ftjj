import React, { useEffect, useState } from "react";
import api from "../../services/api";
export default function ClubRegistrations() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/registrations").then((r) => setRows(r.data));
  }, []);
  return (
    <section className="panel">
      <h1>Mes inscriptions</h1>
      {rows.map((r) => (
        <article key={r._id} className="card">
          <strong>
            {r.firstName} {r.lastName}
          </strong>
          <span>
            {r.discipline} - {r.status}
          </span>
        </article>
      ))}
    </section>
  );
}
