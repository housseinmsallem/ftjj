import React, { useEffect, useState } from "react";
import api from "../services/api";

const endpoints = {
  athletes: "athletes",
  clubs: "clubs",
  coaches: "coaches",
  referees: "referees",
};

export default function DirectoryPage({ type, title }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get(`/${endpoints[type]}`)
      .then((res) => setItems(res.data.data || []))
      .catch(() => setItems([]));
  }, [type]);

  const filtered = items.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section className="section">
      <div className="section-inner">
        <h1 className="section-title">{title}</h1>
        <div className="filterbar">
          <input
            placeholder="Rechercher..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="grid">
          {filtered.map((item) => (
            <article className="card" key={item._id}>
              <h3>{item.name || item.fullName}</h3>
              <p>
                {item.club?.name ||
                  item.city ||
                  item.category ||
                  item.level ||
                  "FTJJ"}
              </p>
              <span className="badge">
                {item.status || item.belt || item.licenseStatus || "Actif"}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
