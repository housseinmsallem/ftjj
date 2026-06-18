import React, { useEffect, useState } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import api from "../services/api";
export default function AdminSettings() {
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get("/settings").then((r) => setForm(r.data));
  }, []);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const save = async () => {
    await api.put("/settings", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Paramètres Fédération</h1>
        <button className="btn primary" onClick={save}>
          Enregistrer
        </button>
      </div>
      {saved && <div className="alert success">Paramètres sauvegardés</div>}
      <div className="form-grid">
        <label>
          Nom
          <input
            value={form.name || ""}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label>
          Acronyme
          <input
            value={form.acronym || ""}
            onChange={(e) => set("acronym", e.target.value)}
          />
        </label>
        <label>
          Saison
          <input
            value={form.season || ""}
            onChange={(e) => set("season", e.target.value)}
          />
        </label>
        <label>
          Email
          <input
            value={form.contactEmail || ""}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </label>
        <label>
          Adresse
          <textarea
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
        </label>
        <label>
          RIB / compte bancaire
          <textarea
            value={form.bankAccount || ""}
            onChange={(e) => set("bankAccount", e.target.value)}
          />
        </label>
      </div>
    </AdminLayout>
  );
}
