import React from "react";

interface Props {
  currentPhotoUrl?: string;
  onUpload: (file: File) => void;
  onRemove?: () => void;
}

export default function AthletePhotoUploader({ currentPhotoUrl, onUpload, onRemove }: Props) {
  return (
    <div className="card">
      <strong>AthletePhotoUploader</strong>
    </div>
  );
}
