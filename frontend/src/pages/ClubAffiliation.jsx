import React, { useState } from "react";
import api from "../services/api";

const initial = {
  name: "",
  governorate: "",
  address: "",
  president: "",
  email: "",
  phone: "",
  message: "",
  password: "",
};

export default function ClubAffiliation() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      await api.post("/public/affiliation", form);
      setStatus(
        "Demande envoyee avec succes. La Federation doit valider votre affiliation avant activation complete.",
      );
      setForm(initial);
    } catch (err) {
      console.error("FTJJ affiliation failed", err);
      setStatus(
        err.response?.data?.message ||
          err.message ||
          "Impossible d envoyer la demande actuellement.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section affiliation-page">
      <div className="section-inner affiliation-layout">
        <div className="affiliation-intro">
          <p className="eyebrow">Affiliation officielle</p>
          <h1>Demande d affiliation Club / Association</h1>
          <p>
            Les clubs peuvent demander leur affiliation, creer leur acces prive
            et suivre ensuite les licences, documents, athletes et competitions
            depuis leur espace.
          </p>
          <ul>
            <li>Creation d un compte club securise</li>
            <li>Validation par la Federation</li>
            <li>Upload documents administratifs</li>
            <li>Gestion des athletes et licences</li>
          </ul>
        </div>

        <form className="card affiliation-form" onSubmit={submit}>
          <h2>Formulaire d affiliation</h2>
          <div className="form-grid">
            <input
              required
              placeholder="Nom du club / association"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <input
              required
              placeholder="Gouvernorat"
              value={form.governorate}
              onChange={(e) => update("governorate", e.target.value)}
            />
            <input
              placeholder="Adresse"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
            <input
              required
              placeholder="President / responsable"
              value={form.president}
              onChange={(e) => update("president", e.target.value)}
            />
            <input
              required
              type="email"
              placeholder="Email acces club"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <input
              placeholder="Telephone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
            <input
              required
              type="password"
              placeholder="Mot de passe espace club"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
          <textarea
            placeholder="Message / informations complementaires"
            value={form.message}
            onChange={(e) => update("message", e.target.value)}
          />
          <button className="public-btn primary" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer la demande"}
          </button>
          {status && <div className="notice">{status}</div>}
        </form>
      </div>
    </section>
  );
}
