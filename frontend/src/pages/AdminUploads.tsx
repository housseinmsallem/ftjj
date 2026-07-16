import React, { useState } from "react";
import api from "../services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import FileUpload from "../components/shared/FileUpload";

interface UploadRecord {
  _id: string;
  id?: string;
  fileName: string;
  fileUrl: string;
  status: "COMPLETED" | "FAILED";
  createdAt: string;
}

export default function AdminUploads(): React.ReactElement {
  const queryClient = useQueryClient();
  const [uploadKey, setUploadKey] = useState(0);

  const {
    data: uploadsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["uploads"],
    queryFn: async () => {
      const res = await api.get("/uploads");
      return (((res.data as any)?.data ?? res.data) as UploadRecord[]) || [];
    },
  });

  const uploads = uploadsData || [];

  const recentUploads = uploads.slice(0, 10);

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement des téléchargements..." />
      </div>
    );
  }

  if (isError && !uploadsData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message ||
            "Impossible de charger les téléchargements"
          }
          action={
            <button className="btn primary" onClick={() => refetch()}>
              Réessayer
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Téléchargements"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Téléchargements" },
        ]}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ color: "var(--text)", marginBottom: 16 }}>
          Télécharger un fichier
        </h3>
        <p className="muted" style={{ marginBottom: 16 }}>
          Utilisez ce composant pour télécharger des fichiers vers le serveur.
          Formats acceptés : PDF, JPG, PNG (max 10 Mo).
        </p>
        <FileUpload
          key={uploadKey}
          label="Choisir un fichier à télécharger"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSizeMB={10}
          onUploaded={(url) => {
            queryClient.invalidateQueries({ queryKey: ["uploads"] });
            toast.success(`Fichier téléchargé : ${url}`);
            setUploadKey((k) => k + 1);
          }}
        />
      </div>

      <div className="table-card">
        <h3
          style={{
            color: "var(--text)",
            marginBottom: 16,
            padding: "16px 16px 0",
          }}
        >
          Téléchargements récents
        </h3>

        {recentUploads.length === 0 ? (
          <EmptyState
            title="Aucun téléchargement"
            description="Aucun fichier n'a encore été téléchargé"
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom du fichier</th>
                  <th>URL</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((upload) => (
                  <tr key={upload._id || upload.id}>
                    <td>
                      <a
                        href={upload.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--red)", textDecoration: "none" }}
                      >
                        {upload.fileName || "Fichier"}
                      </a>
                    </td>
                    <td>
                      <span
                        className="muted"
                        style={{ fontSize: "0.8rem", wordBreak: "break-all" }}
                      >
                        {upload.fileUrl}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            upload.status === "COMPLETED"
                              ? "#22c55e20"
                              : "#d5133220",
                          color:
                            upload.status === "COMPLETED"
                              ? "#22c55e"
                              : "#d51332",
                          padding: "2px 10px",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        {upload.status === "COMPLETED" ? "Terminé" : "Échoué"}
                      </span>
                    </td>
                    <td>
                      {upload.createdAt
                        ? new Date(upload.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
