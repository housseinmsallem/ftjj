import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import LicenceCard from "./licenceCard";
import { getWeightClass } from "../../utils/weightClass";
import type { Person, ClubRef, Pricing } from "../../types";

export interface LicenseData {
  _id?: string;
  id?: string;
  number?: number;
  personId?: string;
  person?: Pick<
    Person,
    | "firstName"
    | "lastName"
    | "dateOfBirth"
    | "type"
    | "photoUrl"
    | "gender"
    | "club"
  > & {
    athleteDetails?: { grade?: string; weight?: number } | null;
    club?: ClubRef | null;
  };
  pricing?: Pick<Pricing, "name">;
  issuedAt?: string;
  expiryDate?: string;
  isActive?: boolean;
}

interface HolderData {
  licenseNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  category: string;
  club: ClubRef | { name: string };
  photo: string;
  id: string;
}

function mapToHolderData(license: LicenseData): HolderData {
  const person = license.person;
  const isAthlete = person?.type === "ATHLETE";
  const category = isAthlete
    ? getWeightClass(person?.athleteDetails?.weight, person?.gender)
    : "N/A";
  const year = new Date().getFullYear();
  const licenseNum = license.number
    ? `FTJJ-${year}-${String(license.number).padStart(4, "0")}`
    : (license._id || license.id || "").slice(0, 8).toUpperCase();
  return {
    licenseNumber: licenseNum,
    firstName: person?.firstName || "",
    lastName: person?.lastName || "",
    birthDate: person?.dateOfBirth || "",
    category,
    club: person?.club || { name: "" },
    photo: person?.photoUrl || "",
    id: (license._id || license.id || "").slice(0, 8).toUpperCase(),
  };
}

export default function LicensePrintWrapper({
  license,
}: {
  license: LicenseData;
}): React.ReactElement {
  const contentRef = useRef<HTMLDivElement>(null);
  const holderData = mapToHolderData(license);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Licence_${holderData.lastName}_${holderData.firstName}`,
  });

  return (
    <div className="exportLicenceContainer">
      <div className="non-visible" ref={contentRef}>
        <LicenceCard
          data={{
            licenseNumber: holderData.licenseNumber,
            firstName: holderData.firstName,
            lastName: holderData.lastName,
            birthDate: holderData.birthDate,
            category: holderData.category,
            club: holderData.club,
            photo: holderData.photo,
            id: holderData.id,
            season: new Date().getFullYear(),
          }}
        />
      </div>
      <button className="btn primary" onClick={() => handlePrint()}>
        🖨️ Imprimer la licence
      </button>
    </div>
  );
}
