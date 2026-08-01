import React from "react";
import img from "../../assets/images/licence.jpeg";

interface LicenceCardProps {
  /**
   * Accepts two shapes:
   * 1. Flat (IdentiteFederale): { id, code, displayId, licenseId, firstName, lastName, ... }
   * 2. Nested (licences endpoint): { id, person: { id, code, displayId, firstName, ... }, ... }
   */
  data: Record<string, unknown>;
}

/**
 * Derive a short, human-readable licence number from an arbitrary string (UUID, code, etc.).
 * Deterministic – same input always produces the same output.
 * Uses the same FNV-1a hash as the backend display-id.ts utility.
 * Format: "FTJJ-XXXX-XXXX" (8-char alphanumeric hash prefixed with "FTJJ").
 */
function hashToDisplayId(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const base36 = (hash >>> 0).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
  return `FTJJ-${base36.slice(0, 4)}-${base36.slice(4, 8)}`;
}

const LicenceCard: React.FC<LicenceCardProps> = ({ data }) => {
  // Normalize: data may be flat (IdentiteFederale) or nested (licences endpoint → data.person).
  const person = (data.person as Record<string, unknown> | undefined) ?? data;

  const formattedDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };

  // QR code encodes the licence ID for verification (scan → check validity/expiry).
  // `licenseId` is explicit when passed from IdentiteFederale; `data.id` is the licence
  // ID when coming from the licences endpoint.
  const licenseId =
    (data.licenseId as string) ||
    ((data as any).licenseNumber as string) ||
    (data.id as string) ||
    "";
  const qrUrl = licenseId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(licenseId)}`
    : "";

  // Human-readable athlete ID: backend displayId, or derive from person ID/code.
  const athleteId = (person.id as string) || (person.code as string) || "";
  const displayId = (person.displayId as string) || hashToDisplayId(athleteId);
  console.log(data)
  return (
    <>
      <div className="licenceImg">
        <img src={img} alt="Licence" />
        <div className="season">
          {(data.season as string) || `${new Date().getFullYear()}`}
        </div>
        <div className="licenceNumber">{displayId || "—"}</div>
        <div className="holderId">{displayId || "—"}</div>
        <div className="firstName">
          {(person.firstName as string) || "—"}
          {(person.arabicFirstName as string) && (
            <span className="arabicName"> — {person.arabicFirstName as string}</span>
          )}
        </div>
        <div className="lastName">
          {(person.lastName as string) || "—"}
          {(person.arabicLastName as string) && (
            <span className="arabicName"> — {person.arabicLastName as string}</span>
          )}
        </div>
        <div className="dob">
          {formattedDate((person.dateOfBirth ?? person.birthDate) as string | undefined)}
        </div>
        <div className="categorie">{data.category as React.ReactNode}</div>
        <div className="club">
          {((person.club as Record<string, unknown>)?.name as string) || "N/A"}
        </div>
        <div className="photo">
          <img src={(person.photoUrl ?? person.photo ?? "#") as string} alt="LicenceHolderPhoto" />
        </div>
        {qrUrl && (
          <div className="qrCode">
            <img src={qrUrl} alt="QR Code" />
          </div>
        )}
      </div>
    </>
  );
};
export default LicenceCard;
