import React from "react";
import img from "../../assets/images/licence.jpeg";

interface LicenceCardProps {
  data: Record<string, unknown>;
}

const LicenceCard: React.FC<LicenceCardProps> = ({ data }) => {
  const formattedDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };

  // Generate QR code URL for the license code
  const code = (data.licenseNumber as string) || (data.code as string) || "";
  const displayId = (data.displayId as string) || code || "";
  const qrUrl = displayId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(displayId)}`
    : "";

  return (
    <>
      <div className="licenceImg">
        <img src={img} alt="Licence" />
        <div className="season">
          {(data.season as string) || `${new Date().getFullYear()}`}
        </div>
        <div className="licenceNumber">{displayId || "—"}</div>
        <div className="holderId">{data.id as React.ReactNode}</div>
        <div className="firstName">
          {(data.firstName as string) || "—"}
          {(data.arabicFirstName as string) && (
            <span className="arabicName"> — {data.arabicFirstName as string}</span>
          )}
        </div>
        <div className="lastName">
          {(data.lastName as string) || "—"}
          {(data.arabicLastName as string) && (
            <span className="arabicName"> — {data.arabicLastName as string}</span>
          )}
        </div>
        <div className="dob">
          {formattedDate(data.birthDate as string | undefined)}
        </div>
        <div className="categorie">{data.category as React.ReactNode}</div>
        <div className="club">
          {((data.club as Record<string, unknown>)?.name as string) || "N/A"}
        </div>
        <div className="photo">
          <img src={(data.photo as string) || "#"} alt="LicenceHolderPhoto" />
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
