import React, { useState } from "react";
import api from "../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import FileUpload from "../components/shared/FileUpload";

interface UploadedFile {
  _id: string;
  id?: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export default function AdminMediaLibrary(): React.ReactElement {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<UploadedFile | null>(null);

  const {
    data: filesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["uploads"],
    queryFn: async () => {
      const res = await api.get("/uploads");
      return (((res.data as any)?.data ?? res.data) as UploadedFile[]) || [];
    },
  });

  const files = filesData || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/uploads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      toast.success("Fichier supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Lien copié dans le presse-papier"),
      () => toast.error("Impossible de copier le lien"),
    );
  }

  if (isLoading) {
    return (
      <div className="page">
        <LoadingSpinner text="Chargement de la bibliothèque média..." />
      </div>
    );
  }

  if (isError && !filesData) {
    return (
      <div className="page">
        <EmptyState
          title="Erreur de chargement"
          description={
            (error as any)?.message || "Impossible de charger les fichiers"
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
        title="Bibliothèque média"
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Bibliothèque média" },
        ]}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ color: "var(--text)", marginBottom: 16 }}>
          Télécharger un nouveau fichier
        </h3>
        <FileUpload
          label="Sélectionner un fichier"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxSizeMB={20}
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ["uploads"] });
            toast.success("Fichier téléchargé avec succès");
          }}
        />
      </div>

      <div className="table-card">
        {files.length === 0 ? (
          <EmptyState
            title="Aucun fichier"
            description="Aucun fichier n'a encore été téléchargé"
          />
        ) : (
          <div className="table-wrap">
            <table className="smart-table">
              <thead>
                <tr>
                  <th>Nom du fichier</th>
                  <th>URL</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file._id || file.id}>
                    <td>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--red)", textDecoration: "none" }}
                      >
                        {file.fileName || "Fichier"}
                      </a>
                    </td>
                    <td>
                      <span
                        className="muted"
                        style={{ fontSize: "0.8rem", wordBreak: "break-all" }}
                      >
                        {file.fileUrl}
                      </span>
                    </td>
                    <td>
                      {file.createdAt
                        ? new Date(file.createdAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn primary"
                          onClick={() => copyToClipboard(file.fileUrl)}
                        >
                          Copier le lien
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => setDeleteTarget(file)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer le fichier"
        message={`Êtes-vous sûr de vouloir supprimer le fichier « ${deleteTarget?.fileName || "sans nom"} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget._id || deleteTarget.id || "");
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
