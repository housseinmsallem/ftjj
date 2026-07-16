import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import LicenceCard from "./licenceCard";

export interface ExportLicenceProps {
  holderData: Record<string, unknown>;
}

export const ExportLicence: React.FC<ExportLicenceProps> = ({ holderData }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `License_${holderData.licenseNo as string}`,
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
