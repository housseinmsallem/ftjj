import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/shared/PageHeader";
import LoadingSpinner from "../../components/shared/LoadingSpinner";

export default function ClubImport(): React.ReactElement {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/club/athletes/import", { replace: true });
  }, [navigate]);

  return (
    <div className="page">
      <PageHeader
        title="Importation"
        breadcrumbs={[{ label: "Club", to: "/club" }, { label: "Importation" }]}
      />
      <LoadingSpinner text="Redirection vers l'importation d'athlètes..." />
    </div>
  );
}
