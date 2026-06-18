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
        await onSubmit(form);
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
