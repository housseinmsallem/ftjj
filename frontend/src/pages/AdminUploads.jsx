import React, { useEffect, useState } from "react";
import api from "../services/api";
import AdminLayout from "../components/layout/AdminLayout";

export default function AdminUploads() {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ title: "", category: "other" });
  const [file, setFile] = useState(null);
  async function load() {
    const { data } = await api.get("/uploads");
    setAssets(data);
  }
  useEffect(() => {
    load();
  }, []);
  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("file", file);
    await api.post("/uploads", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setFile(null);
    await load();
  }
  async function validate(id, status) {
    await api.patch(`/uploads/${id}/validate`, { status });
    load();
  }
  return (
    <AdminLayout>
      <div className="page-head">
        <h1>Stockage & documents</h1>
        <p>
          Cloudinary, S3/OVH Object Storage ou stockage local selon les
          variables d’environnement.
        </p>
      </div>
      <section className="panel">
        <h2>Ajouter un document</h2>
        <form className="resource-form" onSubmit={submit}>
          <input
            placeholder="Titre"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="license">Licence</option>
            <option value="medical_certificate">Certificat médical</option>
            <option value="affiliation">Affiliation</option>
            <option value="competition">Compétition</option>
            <option value="other">Autre</option>
          </select>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button disabled={!file}>Uploader</button>
        </form>
      </section>
      <section className="panel">
        <h2>Documents</h2>
        <div className="admin-grid">
          {assets.map((a) => (
            <div className="card" key={a._id}>
              <h3>{a.title}</h3>
              <p>
                {a.category} · {a.status}
              </p>
              {a.mimeType?.includes("image") ? (
                <img className="preview" src={a.url} />
              ) : (
                <a href={a.url} target="_blank">
                  Aperçu PDF/fichier
                </a>
              )}
              <div className="row-actions">
                <button onClick={() => validate(a._id, "approved")}>
                  Valider
                </button>
                <button onClick={() => validate(a._id, "rejected")}>
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
