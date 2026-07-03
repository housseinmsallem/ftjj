import React, { useEffect, useState } from "react";
import api from "../../services/api";
import ClubLayout from "../../components/layout/ClubLayout";

export default function ClubCompetitions() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/competitions").then((r) => setRows(r.data));
  }, []);
  return (
    <ClubLayout>
      <div className="page-head">
        <h1>Compétitions</h1>
        <p>Compétitions disponibles pour votre club.</p>
      </div>
      {rows.map((c) => (
        <article key={c._id} className="card">
          <h2>{c.title}</h2>
          <p>
            {c.location} - {c.registrationStatus}
          </p>
        </article>
      ))}
    </ClubLayout>
  );
}
