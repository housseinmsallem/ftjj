import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import licenceImage from "../../assets/images/licence.jpeg";

interface LicensePrintWrapperProps {
  license: any;
}

function getAgeDivisionLabel(div: string): string {
  const labels: Record<string, string> = {
    U6: "U6 (4-5 ans)",
    U8: "U8 (6-7 ans)",
    U10: "U10 (8-9 ans)",
    U12: "U12 (10-11 ans)",
    U14: "U14 (12-13 ans)",
    U16: "U16 (14-15 ans)",
    U18: "U18 (16-17 ans)",
    U21: "U21 (18-20 ans)",
    ADULTS: "Adultes (18+)",
    MASTERS_1: "Masters 1 (35-39 ans)",
    MASTERS_2: "Masters 2 (40-44 ans)",
    MASTERS_3: "Masters 3 (45-49 ans)",
    MASTERS_4: "Masters 4 (50+)",
  };
  return labels[div] || div || "—";
}

function computeAgeDivision(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return "—";
  const birthYear = new Date(dateOfBirth).getFullYear();
  const seasonYear = 2026;
  const age = seasonYear - birthYear;
  if (age <= 5) return "U6";
  if (age <= 7) return "U8";
  if (age <= 9) return "U10";
  if (age <= 11) return "U12";
  if (age <= 13) return "U14";
  if (age <= 15) return "U16";
  if (age <= 17) return "U18";
  if (age <= 20) return "U21";
  if (age <= 34) return "ADULTS";
  if (age <= 39) return "MASTERS_1";
  if (age <= 44) return "MASTERS_2";
  if (age <= 49) return "MASTERS_3";
  return "MASTERS_4";
}

export default function LicensePrintWrapper({ license }: LicensePrintWrapperProps): JSX.Element {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const person = license?.person;
  const club = person?.club;
  const ageDivision = computeAgeDivision(person?.dateOfBirth);
  const code = person?.code || "";
  const displayId = person?.displayId || license?.displayId || code || "";
  const qrUrl = displayId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(displayId)}`
    : "";
  const seasonName = license?.season?.name || "";

  return (
    <div>
      <button className="btn primary" style={{ margin: "12px 0" }} onClick={() => handlePrint()}>
        🖨️ Imprimer la licence
      </button>

      <div ref={printRef} style={{ padding: 0 }}>
        <div className="licenceImg">
          <img src={licenceImage} alt="Licence FTJJ" />
          <div className="season">{seasonName || new Date().getFullYear()}</div>
          <div className="licenceNumber">{code || "—"}</div>
          <div className="holderId">{license?.id || "—"}</div>
          <div className="firstName">
            {person?.firstName || "—"}
            {person?.arabicFirstName && (
              <span className="arabicName"> — {person.arabicFirstName}</span>
            )}
          </div>
          <div className="lastName">
            {person?.lastName || "—"}
            {person?.arabicLastName && (
              <span className="arabicName"> — {person.arabicLastName}</span>
            )}
          </div>
          <div className="dob">
            {person?.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString("fr-FR") : "—"}
          </div>
          <div className="categorie">{getAgeDivisionLabel(ageDivision)}</div>
          <div className="club">{club?.name || "—"}</div>
          <div className="photo">
            {person?.photoUrl ? (
              <img src={person.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>—</span>
            )}
          </div>
          {qrUrl && (
            <div className="qrCode">
              <img src={qrUrl} alt="QR Code" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
