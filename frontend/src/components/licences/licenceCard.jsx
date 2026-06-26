import React from "react";
import img from "../../assets/images/licence.jpeg";
import houss from "../../assets/images/houss.jpeg";
const LicenceCard = ({ data }) => {
  console.log("LicenceCard data:", data); // Debugging line to check the data being passed
  const formattedDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };
  return (
    <>
      <div className="licenceImg">
        <img src={img} alt="Licence" />
        <div className="season">{new Date().getFullYear()}</div>{" "}
        <div className="licenceNumber">{data.licenseNumber}</div>
        <div className="holderId">{data.id}</div>
        <div className="firstName">{data.firstName}</div>
        <div className="lastName">{data.lastName}</div>
        <div className="dob">{formattedDate(data.birthDate)}</div>
        <div className="categorie">{data.category}</div>
        <div className="club">{data.club?.name || "N/A"}</div>
        <div className="photo">
          <img src={data.photo || "#"} alt="LicenceHolderPhoto" />
        </div>
      </div>
    </>
  );
};
export default LicenceCard;
