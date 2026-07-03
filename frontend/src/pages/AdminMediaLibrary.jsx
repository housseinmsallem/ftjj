import React, { useState, useEffect } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import api from "../services/api";

const CATEGORIES = [
  "LOGO",
  "POSTER",
  "ATHLETE_PHOTO",
  "COACH_PHOTO",
  "REFEREE_PHOTO",
  "CLUB_PHOTO",
  "HERO",
  "SPONSOR",
  "DOCUMENT",
  "GALLERY",
  "SCORING",
  "OTHER",
];

export default function AdminMediaLibrary() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState("GALLERY");
  const [uploadPublic, setUploadPublic] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/media");
      setAssets(data);
    } catch (err) {
      setError("Erreur lors du chargement de la médiathèque.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (selectedFiles.length === 1) {
        formData.append("file", selectedFiles[0]);
        formData.append("category", uploadCategory);
        formData.append("public", uploadPublic);
        await api.post("/media/upload", formData);
      } else {
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("category", uploadCategory);
        formData.append("public", uploadPublic);
        await api.post("/media/upload-multiple", formData);
      }
      setSelectedFiles([]);
      fetchAssets();
    } catch (err) {
      alert("Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer définitivement cet asset ?")) return;
    try {
      await api.delete(`/media/${id}`);
      fetchAssets();
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert("URL copiée !");
    });
  };

  const togglePublic = async (asset) => {
    try {
      await api.patch(`/media/${asset._id}`, { public: !asset.public });
      fetchAssets();
    } catch {
      alert("Erreur lors de la mise à jour.");
    }
  };

  const filtered = assets.filter((a) => {
    const name = a.originalName || a.filename || "";
    const matchesSearch = name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (loading)
    return (
      <AdminLayout>
        <p>Chargement...</p>
      </AdminLayout>
    );
  if (error)
    return (
      <AdminLayout>
        <p style={{ color: "red" }}>{error}</p>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div style={{ padding: "1.5rem" }}>
        <h1>Médiathèque</h1>

        {/* Upload section */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Ajouter des fichiers</h3>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontWeight: 600,
                }}
              >
                Fichiers
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.25rem",
                  fontWeight: 600,
                }}
              >
                Catégorie
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                style={{ padding: "0.4rem" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                paddingTop: "1.4rem",
              }}
            >
              <input
                type="checkbox"
                id="uploadPublic"
                checked={uploadPublic}
                onChange={(e) => setUploadPublic(e.target.checked)}
              />
              <label
                htmlFor="uploadPublic"
                style={{ fontSize: "0.85rem", fontWeight: 600 }}
              >
                Public
              </label>
            </div>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              style={{
                padding: "0.5rem 1.25rem",
                background: "#1e40af",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: selectedFiles.length === 0 ? "not-allowed" : "pointer",
                opacity: selectedFiles.length === 0 ? 0.6 : 1,
              }}
            >
              {uploading ? "Upload en cours..." : "Uploader"}
            </button>
          </div>
          {selectedFiles.length > 0 && (
            <p style={{ marginTop: "0.75rem", color: "#64748b" }}>
              {selectedFiles.length} fichier
              {selectedFiles.length > 1 ? "s" : ""} sélectionné
              {selectedFiles.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
            }}
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>
            {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p
            style={{ color: "#94a3b8", textAlign: "center", padding: "3rem 0" }}
          >
            Aucun asset trouvé.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {filtered.map((a) => (
              <div
                key={a._id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {a.mimeType && a.mimeType.includes("image") ? (
                  <img
                    src={a.url}
                    alt={a.originalName || a.filename}
                    style={{
                      width: "100%",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      fontSize: "2.5rem",
                    }}
                  >
                    📄
                  </div>
                )}
                <div style={{ padding: "0.75rem", flex: 1 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      margin: "0 0 0.25rem",
                      fontSize: "0.85rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={a.originalName || a.filename}
                  >
                    {a.originalName || a.filename || "—"}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#dbeafe",
                      color: "#1e40af",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {a.category || "—"}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      background: a.public
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(148,163,184,0.15)",
                      color: a.public ? "#16a34a" : "#64748b",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                      marginLeft: "0.3rem",
                    }}
                  >
                    {a.public ? "🌐 Public" : "🔒 Privé"}
                  </span>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {a.createdAt
                      ? new Date(a.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      margin: "0 0 0.5rem",
                    }}
                  >
                    {formatSize(a.size)}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <button
                    onClick={() => copyUrl(a.url)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "#2563eb",
                    }}
                  >
                    Copier URL
                  </button>
                  <button
                    onClick={() => togglePublic(a)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      color: a.public ? "#dc2626" : "#16a34a",
                      borderLeft: "1px solid #e2e8f0",
                    }}
                  >
                    {a.public ? "Rendre privé" : "Rendre public"}
                  </button>
                  <button
                    onClick={() => handleDelete(a._id)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "#dc2626",
                      borderLeft: "1px solid #e2e8f0",
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
