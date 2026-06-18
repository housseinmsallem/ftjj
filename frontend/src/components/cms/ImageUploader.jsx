import React from "react";
export default function ImageUploader(props) {
  return (
    <div className="panel compact">
      <strong>ImageUploader</strong>
      <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
