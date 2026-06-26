import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import LicenceCard from "./licenceCard";

export const ExportLicence = ({ holderData }) => {
  // Fixed: use the imported useRef directly
  const contentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `License_${holderData.licenseNo}`,
  });

  return (
    <div className="exportLicenceContainer">
      {/* This container is now safely out of the layout flow */}
      <div className="non-visible" ref={contentRef}>
        <LicenceCard data={holderData} />
      </div>

      <button
        className="btn btn-primary licenseButton"
        onClick={() => handlePrint()}
      >
        Print License
      </button>
    </div>
  );
};
