import React, { useEffect, useState } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import SmartTable from "../components/ui/SmartTable";
import api from "../services/api";

const emptyForm = {
  title: "",
  subtitle: "",
  type: "EVENT",
  description: "",
  imageUrl: "",
  ctaLabel: "Voir plus",
  ctaUrl: "/competitions",
  startDate: "",
  endDate: "",
  location: "",
  status: "DRAFT",
  displayOrder: 0,
  animation: "SLIDE",
  displayOnHome: true,
  featured: true,
};

export default function AdminContentBuilder() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaAssets, setMediaAssets] = useState([]);

  async function load() {
    const { data } = await api.get("/content");
    setItems(Array.isArray(data) ? data : []);
  }
  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function edit(item) {
    setEditingId(item._id);
    setForm({
      ...emptyForm,
      ...item,
      startDate: item.startDate?.slice(0, 10) || "",
      endDate: item.endDate?.slice(0, 10) || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      displayOrder: Number(form.displayOrder || 0),
      displayOnHome: Boolean(form.displayOnHome),
      featured: Boolean(form.featured),
    };
    if (editingId) await api.put(`/content/${editingId}`, payload);
    else await api.post("/content", payload);
    setMessage(
      editingId
        ? "Contenu mis à jour avec succès."
        : "Contenu ajouté au slider.",
    );
    setForm(emptyForm);
    setEditingId(null);
    load();
  }
  async function publish(id) {
    await api.patch(`/content/${id}/publish`);
    setMessage("Contenu publié sur le site.");
    load();
  }
  async function archive(id) {
    await api.patch(`/content/${id}/archive`);
    setMessage("Contenu archivé.");
    load();
  }
  async function remove(id) {
    await api.delete(`/content/${id}`);
    setMessage("Contenu supprimé.");
    load();
  }

  async function openMediaPicker() {
    try {
      const { data } = await api.get("/media");
      setMediaAssets(Array.isArray(data) ? data : []);
      setShowMediaPicker(true);
    } catch {
      setMessage("Impossible de charger la médiathèque.");
    }
  }

  const columns = [
    {
      key: "title",
      label: "Contenu",
      render: (r) => (
        <div>
          <strong>{r.title}</strong>
          <small>{r.subtitle}</small>
        </div>
      ),
    },
    { key: "type", label: "Type" },
    {
      key: "startDate",
      label: "Date",
      render: (r) =>
        r.startDate ? new Date(r.startDate).toLocaleDateString("fr-FR") : "-",
    },
    {
      key: "status",
      label: "Statut",
      render: (r) => (
        <span className={`status-pill ${r.status?.toLowerCase()}`}>
          {r.status}
        </span>
      ),
    },
    { key: "displayOrder", label: "Ordre" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="row-actions">
          <button onClick={() => edit(r)}>Modifier</button>
          <button onClick={() => publish(r._id)}>Publier</button>
          <button onClick={() => archive(r._id)}>Archiver</button>
          <button onClick={() => remove(r._id)}>Supprimer</button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="hero-admin content-hero">
        <div>
          <span className="eyebrow">Constructeur de contenu</span>
          <h1>Slider événements, stages & annonces</h1>
          <p>
            Créez les contenus qui apparaissent sur la page d’accueil : opens,
            stages, championnats, passages de grade, actualités et annonces
            officielles.
          </p>
        </div>
      </div>
      {message && <div className="notice">{message}</div>}
      <section className="panel content-builder-panel">
        <div className="panel-head">
          <div>
            <h2>{editingId ? "Modifier le contenu" : "Nouveau contenu"}</h2>
            <small>
              Les contenus publiés avec “Afficher accueil” apparaissent dans le
              slider public.
            </small>
          </div>
        </div>
        <form className="content-builder-form" onSubmit={submit}>
          <div
            className="notice info"
            style={{ gridColumn: "1/-1", marginBottom: "0.5rem" }}
          >
            💡 Pour apparaître sur le site public, le contenu doit être en
            statut <strong>Publié</strong> ET avoir{" "}
            <strong>'Afficher accueil'</strong> coché.
          </div>
          <label>
            Titre
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
            />
          </label>
          <label>
            Sous-titre
            <input
              value={form.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
            />
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
            >
              <option value="EVENT">Événement</option>
              <option value="STAGE">Stage</option>
              <option value="NEWS">Actualité</option>
              <option value="ANNOUNCEMENT">Annonce</option>
              <option value="GRADE_PASSAGE">Passage de grade</option>
              <option value="CHAMPIONSHIP">Championnat</option>
            </select>
          </label>
          <label>
            Statut
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
          </label>
          <label className="wide">
            Description
            <textarea
              required
              rows="4"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label className="wide">
            Image URL
            <input
              placeholder="https://... ou /uploads/image.jpg"
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
            />
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={openMediaPicker}
              style={{ marginTop: "0.4rem" }}
            >
              📁 Parcourir la médiathèque
            </button>
          </label>
          <label>
            Date début
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </label>
          <label>
            Date fin
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
            />
          </label>
          <label>
            Lieu
            <input
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </label>
          <label>
            Animation
            <select
              value={form.animation}
              onChange={(e) => update("animation", e.target.value)}
            >
              <option value="SLIDE">Slide</option>
              <option value="FADE">Fade</option>
              <option value="ZOOM">Zoom</option>
            </select>
          </label>
          <label>
            Label bouton
            <input
              value={form.ctaLabel}
              onChange={(e) => update("ctaLabel", e.target.value)}
            />
          </label>
          <label>
            Lien bouton
            <input
              value={form.ctaUrl}
              onChange={(e) => update("ctaUrl", e.target.value)}
            />
          </label>
          <label>
            Ordre
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => update("displayOrder", e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.displayOnHome}
              onChange={(e) => update("displayOnHome", e.target.checked)}
            />{" "}
            Afficher accueil
          </label>
          <div className="form-actions">
            <button className="primary" type="submit">
              {editingId ? "Enregistrer" : "Ajouter au slider"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </section>
      {showMediaPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowMediaPicker(false)}
        >
          <div
            style={{
              background: "#1e1e2e",
              borderRadius: "12px",
              maxWidth: "720px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0, color: "#fff" }}>📁 Médiathèque</h3>
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={() => setShowMediaPicker(false)}
              >
                ✕ Fermer
              </button>
            </div>
            {mediaAssets.length === 0 ? (
              <p style={{ color: "#aaa" }}>Aucun média trouvé.</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "0.75rem",
                }}
              >
                {mediaAssets.map((a) => (
                  <div
                    key={a._id || a.url}
                    style={{
                      cursor: "pointer",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "2px solid transparent",
                      background: "#2a2a3e",
                      transition: "border-color 0.2s",
                    }}
                    onClick={() => {
                      update("imageUrl", a.url);
                      setShowMediaPicker(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "#7c3aed")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "transparent")
                    }
                  >
                    {a.url && /\.(pdf)$/i.test(a.url) ? (
                      <div
                        style={{
                          height: "100px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "2rem",
                          color: "#aaa",
                        }}
                      >
                        📄
                      </div>
                    ) : (
                      <img
                        src={a.url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}
                    <p
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.7rem",
                        color: "#ccc",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        margin: 0,
                      }}
                    >
                      {a.originalName || a.filename || a.url?.split("/").pop()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <SmartTable title="Contenus créés" rows={items} columns={columns} />
    </AdminLayout>
  );
}
