import React, { useRef, useState } from "react";
import api from "../../services/api";

interface MediaAsset {
  _id?: string;
  url: string;
  originalName?: string;
  filename?: string;
}

interface MediaImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function MediaImageField({ value, onChange, label }: MediaImageFieldProps): React.ReactElement {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function openMediaPicker() {
    try {
      const { data } = await api.get<MediaAsset[]>("/media");
      setMediaAssets(Array.isArray(data) ? data : []);
      setShowMediaPicker(true);
    } catch {
      // silently fail
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "OTHER");
      const { data } = await api.post<{ url: string }>("/media/upload", fd);
      onChange(data.url);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const imageUrl = value || "";

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label ? `URL ${label.toLowerCase()}` : "URL de l'image"}
            readOnly={false}
            style={{ flex: 1 }}
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: "40px",
                height: "40px",
                objectFit: "cover",
                borderRadius: "4px",
                border: "1px solid var(--border, #ccc)",
              }}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="ghost"
            onClick={openMediaPicker}
            style={{ fontSize: "0.85rem" }}
          >
            📁 Médiathèque
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ fontSize: "0.85rem" }}
          >
            {uploading ? "⏳ Upload..." : "📤 Uploader"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </div>
      </div>

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
                className="ghost"
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
                      onChange(a.url);
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
    </>
  );
}
