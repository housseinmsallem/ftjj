import React, { useEffect, useState } from "react";
export default function ResourceForm({
  fields,
  onSubmit,
  submitLabel = "Enregistrer",
  initialValues = {},
  onCancel = null,
}) {
  const [form, setForm] = useState(initialValues);
  useEffect(() => {
    setForm(initialValues || {});
  }, [initialValues]);
  function change(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function renderField(field) {
    if (field.type === "select") {
      return (
        <select
          value={form[field.key] ?? ""}
          onChange={(e) => change(field.key, e.target.value)}
        >
          <option value="">Choisir</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          rows={field.rows || 4}
          value={form[field.key] ?? ""}
          onChange={(e) => change(field.key, e.target.value)}
          required={field.required}
        />
      );
    }

    if (field.type === "file") {
      return (
        <input
          type="file"
          // Crucial: Clear value string constraint for file inputs for security reasons.
          // Instead, listen for the file object array allocation
          onChange={(e) => change(field.key, e.target.files[0])}
          required={field.required && !initialValues[field.key]} // Not required on edits if already exists
        />
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={form[field.key] ?? ""}
        onChange={(e) => change(field.key, e.target.value)}
        required={field.required}
      />
    );
  }

  return (
    <form
      className="resource-form"
      onSubmit={async (e) => {
        e.preventDefault();

        // ─── NEW: CONDITIONAL FORMDATA PROCESSING ──────────────────────────
        // Check if any of the fields inside our form config is a file type
        const hasFile = fields.some((f) => f.type === "file");

        if (hasFile) {
          const formData = new FormData();

          // Append all fields to the FormData payload dynamically
          Object.keys(form).forEach((key) => {
            // Only append values that actually exist
            if (form[key] !== undefined && form[key] !== null) {
              formData.append(key, form[key]);
            }
          });

          // Submit using the multi-part data payload instead of raw state object
          await onSubmit(formData);
        } else {
          // If no files are needed, keep passing standard text payload object
          await onSubmit(form);
        }

        if (!onCancel) setForm({});
      }}
    >
      {fields.map((f) => (
        <label key={f.key}>
          {f.label}
          {renderField(f)}
        </label>
      ))}
      <div className="form-actions">
        <button className="primary" type="submit">
          {submitLabel}
        </button>
        {onCancel && (
          <button className="ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
