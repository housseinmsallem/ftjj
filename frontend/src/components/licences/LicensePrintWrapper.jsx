import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { ExportLicence } from "./exportLicence";

const endpointMap = {
  ATHLETE: "/athletes",
  COACH: "/coaches",
  REFEREE: "/referees",
  CLUB: "/clubs",
};

export default function LicensePrintWrapper({ licenseRow }) {
  const [holderData, setHolderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchOwner() {
      try {
        const endpoint = endpointMap[licenseRow.ownerType];
        if (!endpoint) {
          if (!cancelled) setLoading(false);
          return;
        }
        const { data } = await api.get(`${endpoint}/${licenseRow.ownerId}`);
        if (!cancelled) {
          setHolderData({
            licenseNumber: licenseRow.licenseNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            birthDate: data.birthDate,
            category: data.category || "",
            club: data.club || { name: "" },
            photo: data.photo || "",
            id: licenseRow._id,
          });
        }
      } catch {
        // If owner fetch fails, build partial data from licenseRow
        if (!cancelled) {
          setHolderData({
            licenseNumber: licenseRow.licenseNumber,
            firstName: "",
            lastName: "",
            birthDate: "",
            category: "",
            club: { name: "" },
            photo: "",
            id: licenseRow._id,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOwner();

    return () => {
      cancelled = true;
    };
  }, [licenseRow]);

  if (loading) return <span>Chargement...</span>;
  if (!holderData) return null;

  return <ExportLicence holderData={holderData} />;
}
