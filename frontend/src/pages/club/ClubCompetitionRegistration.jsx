import React, { useEffect, useState } from "react";
import api from "../../services/api";
export default function ClubCompetitionRegistration() {
  const [competitions, setCompetitions] = useState([]);
  const [form, setForm] = useState({
    discipline: "NEWAZA",
    belt: "BLUE",
    gender: "MALE",
  });
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.get("/competitions").then((r) => setCompetitions(r.data));
  }, []);
  async function submit(e) {
    e.preventDefault();
    try {
      await api.post(`/competitions/${form.competitionId}/registrations`, form);
      setMsg("Inscription envoyee");
    } catch (err) {
      setMsg(err.response?.data?.message || "Inscription impossible");
    }
  }
  return (
    <section className="panel">
      <h1>Inscription competition</h1>
      {msg && <div className="notice">{msg}</div>}
      <form onSubmit={submit} className="resource-form">
        <label>
          Competition
          <select
            value={form.competitionId || ""}
            onChange={(e) =>
              setForm({ ...form, competitionId: e.target.value })
            }
          >
            {competitions.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        {[
          "firstName",
          "lastName",
          "licenseNumber",
          "weightDeclared",
          "ageCategory",
          "weightCategory",
        ].map((k) => (
          <label key={k}>
            {k}
            <input
              value={form[k] || ""}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </label>
        ))}
        <button>Soumettre</button>
      </form>
    </section>
  );
}
