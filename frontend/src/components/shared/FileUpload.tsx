import React, { useState, useRef } from "react";
import api from "../../services/api";

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  onUploaded: (url: string) => void;
  currentUrl?: string | null;
  light?: boolean;
}

export default function FileUpload({
  label = "Télécharger un fichier",
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSizeMB = 10,
  onUploaded,
  currentUrl,
  light,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier dépasse la taille maximale de ${maxSizeMB} Mo`);
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/uploads/single", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) => {
          if (pe.total) {
            setProgress(Math.round((pe.loaded * 100) / pe.total));
          }
        },
      });
      const url = response.data.data?.fileUrl || response.data.fileUrl;
      onUploaded(url);
    } catch (err: any) {
      setError(err.response?.data?.message || "Échec du téléchargement");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div className="file-upload-field">
      <label className="field-label" style={light ? { color: "rgba(255,255,255,0.85)" } : undefined}>{label}</label>
      <div className="file-upload-area">
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Téléchargement..." : "Choisir un fichier"}
        </button>
        {uploading && (
          <div className="upload-progress">
            <div
              className="upload-progress-bar"
              style={{ width: `${progress}%` }}
            />
            <span>{progress}%</span>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        {currentUrl && !uploading && (
          <div className="file-preview">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="file-link"
              style={light ? { color: "rgba(255,255,255,0.7)" } : undefined}
            >
              Voir le fichier actuel
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
