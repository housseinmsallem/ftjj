import React from "react";
import img from "../../assets/images/licence.jpeg";
import houss from "../../assets/images/houss.jpeg";

interface LicenceCardProps {
  data: Record<string, unknown>;
}

const LicenceCard: React.FC<LicenceCardProps> = ({ data }) => {
  console.log("LicenceCard data:", data); // Debugging line to check the data being passed
  const formattedDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };
  return (
    <>
      <div className="licenceImg">
        <img src={img} alt="Licence" />
        <div className="season">{new Date().getFullYear()}</div>{" "}
        <div className="licenceNumber">
          {data.licenseNumber as React.ReactNode}
        </div>
        <div className="holderId">{data.id as React.ReactNode}</div>
        <div className="firstName">{data.firstName as React.ReactNode}</div>
        <div className="lastName">{data.lastName as React.ReactNode}</div>
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
      </div>
    </>
  );
};
export default LicenceCard;
