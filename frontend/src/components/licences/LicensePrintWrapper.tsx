import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";

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

export default function LicensePrintWrapper({ license }: LicensePrintWrapperProps): React.ReactElement {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const person = license?.person;
  const pricing = license?.pricing;
  const club = person?.club;
  const ageDivision = computeAgeDivision(person?.dateOfBirth);

  return (
    <div>
      <button className="btn primary" style={{ margin: "12px 0" }} onClick={() => handlePrint()}>
        🖨️ Imprimer la licence
      </button>

      <div ref={printRef} style={{ padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 420, margin: "0 auto" }}>
        {/* License Card */}
        <div style={{
          border: "2px solid #1e293b",
          borderRadius: 16,
          padding: 24,
          background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
          color: "#0f172a",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #d51332", paddingBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#d51332", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              Fédération Tunisienne de Jiu-Jitsu
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>
              Licence Officielle
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
              Saison 2026
            </div>
          </div>

          {/* Photo + Code */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
            <div style={{
              width: 80, height: 100, borderRadius: 8, overflow: "hidden",
              background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #94a3b8", flexShrink: 0,
            }}>
              {person?.photoUrl ? (
                <img src={person.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 28, color: "#94a3b8" }}>👤</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                Code Athlète
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#d51332", letterSpacing: 1 }}>
                {person?.code || license?.code || "—"}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginTop: 8, marginBottom: 2 }}>
                Type de licence
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {pricing?.name || license?.licenseType || "—"}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 11 }}>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Nom</div>
              <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
                {person?.lastName || "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Prénom</div>
              <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
                {person?.firstName || "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Date de naissance</div>
              <div style={{ fontWeight: 700 }}>
                {person?.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString("fr-FR") : "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Nationalité</div>
              <div style={{ fontWeight: 700 }}>
                {person?.nationality || "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Catégorie</div>
              <div style={{ fontWeight: 700 }}>
                {getAgeDivisionLabel(ageDivision)}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Grade</div>
              <div style={{ fontWeight: 700 }}>
                {person?.athleteDetails?.grade || person?.grade || "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Club</div>
              <div style={{ fontWeight: 700 }}>
                {club?.name || "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.5 }}>Validité</div>
              <div style={{ fontWeight: 700 }}>
                {license?.issuedAt ? new Date(license.issuedAt).toLocaleDateString("fr-FR") : "—"} →{" "}
                {license?.expiryDate ? new Date(license.expiryDate).toLocaleDateString("fr-FR") : "—"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #cbd5e1", fontSize: 8, color: "#94a3b8", letterSpacing: 0.5 }}>
            Fédération Tunisienne de Jiu-Jitsu — Licence officielle saison 2026
          </div>
        </div>
      </div>
    </div>
  );
}
