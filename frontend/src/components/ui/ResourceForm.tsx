import React, { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import MediaImageField from "./MediaImageField";

export interface ResourceFormField {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea" | "file" | "lookup";
  options?: string[];
  rows?: number;
  required?: boolean;
  endpoint?: string;
  displayKey?: string;
}

export interface ResourceFormProps {
  fields: ResourceFormField[];
  onSubmit: (form: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  initialValues?: Record<string, unknown>;
  onCancel?: (() => void) | null;
}

export default function ResourceForm({
  fields,
  onSubmit,
  submitLabel = "Enregistrer",
  initialValues = {},
  onCancel = null,
}: ResourceFormProps): React.ReactElement {
  const [form, setForm] = useState<Record<string, unknown>>(initialValues);
  const [lookupOptions, setLookupOptions] = useState<Record<string, Record<string, unknown>[]>>({});
  const [lookupSearch, setLookupSearch] = useState<Record<string, string>>({});
  const [lookupDisplay, setLookupDisplay] = useState<Record<string, string>>({});
  const [lookupOpen, setLookupOpen] = useState<Record<string, boolean>>({});
  const [lookupLoading, setLookupLoading] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    setForm(initialValues || {});
  }, [initialValues]);

  // Fetch lookup data once per endpoint key
  useEffect(() => {
    const lookupFields = fields.filter((f) => f.type === "lookup");
    lookupFields.forEach((field) => {
      if (!fetchedRef.current[field.key]) {
        fetchedRef.current[field.key] = true;
        setLookupLoading((prev) => ({ ...prev, [field.key]: true }));
        api
          .get(field.endpoint!)
          .then((res) => {
            const data = Array.isArray(res.data)
              ? res.data
              : res.data?.data || [];
            setLookupOptions((prev) => ({ ...prev, [field.key]: data }));
          })
          .catch(() => {
            setLookupOptions((prev) => ({ ...prev, [field.key]: [] }));
          })
          .finally(() => {
            setLookupLoading((prev) => ({ ...prev, [field.key]: false }));
          });
      }
    });
  }, [fields]);

  // Pre-populate display text from initialValues once options load
  useEffect(() => {
    const lookupFields = fields.filter((f) => f.type === "lookup");
    lookupFields.forEach((field) => {
      const options = lookupOptions[field.key];
      const initialId = initialValues[field.key];
      if (
        options &&
        options.length > 0 &&
        initialId &&
        !lookupDisplay[field.key]
      ) {
        const match = options.find((item) => item._id === initialId);
        if (match) {
          setLookupDisplay((prev) => ({
            ...prev,
            [field.key]: getDisplayValue(match, field.displayKey),
          }));
        }
      }
    });
  }, [lookupOptions, initialValues, fields]);

  function getDisplayValue(item: Record<string, unknown>, displayKey?: string): string {
    if (displayKey) {
      const val = item[displayKey];
      if (val !== undefined && val !== null) return String(val);
    }
    return `${(item.firstName as string) || ""} ${(item.lastName as string) || ""}`.trim() || (item._id as string);
  }

  function change(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function renderField(field: ResourceFormField): React.ReactElement {
    if (field.type === "select") {
      return (
        <select
          value={(form[field.key] as string) ?? ""}
          onChange={(e) => change(field.key, e.target.value)}
        >
          <option value="">Choisir</option>
          {field.options?.map((option) => (
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
          value={(form[field.key] as string) ?? ""}
          onChange={(e) => change(field.key, e.target.value)}
          required={field.required}
        />
      );
    }

    if (field.type === "file") {
      return (
        <MediaImageField
          value={(form[field.key] as string) || ""}
          onChange={(url: string) => change(field.key, url)}
          label={field.label}
        />
      );
    }

    if (field.type === "lookup") {
      const options = lookupOptions[field.key] || [];
      const search = lookupSearch[field.key] || "";
      const display = lookupDisplay[field.key] || "";
      const open = lookupOpen[field.key] || false;
      const loading = lookupLoading[field.key];
      const filtered = options.filter((item) => {
        const displayVal = getDisplayValue(item, field.displayKey);
        return displayVal.toLowerCase().includes(search.toLowerCase());
      });

      return (
        <div className="lookup-wrapper" style={{ position: "relative" }}>
          <input
            type="text"
            value={open ? search : display}
            placeholder={loading ? "Chargement..." : "Rechercher..."}
            onChange={(e) => {
              setLookupSearch((prev) => ({
                ...prev,
                [field.key]: e.target.value,
              }));
              setLookupOpen((prev) => ({ ...prev, [field.key]: true }));
            }}
            onFocus={() =>
              setLookupOpen((prev) => ({ ...prev, [field.key]: true }))
            }
            onBlur={() => {
              setTimeout(
                () =>
                  setLookupOpen((prev) => ({ ...prev, [field.key]: false })),
                200,
              );
            }}
            required={field.required}
            autoComplete="off"
          />
          {open && filtered.length > 0 && (
            <div
              className="lookup-dropdown"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: "200px",
                overflowY: "auto",
                background: "var(--bg, white)",
                border: "1px solid var(--border, #ccc)",
                borderRadius: "4px",
                zIndex: 1000,
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {filtered.map((item) => (
                <div
                  key={item._id as string}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    change(field.key, item._id);
                    const displayVal = getDisplayValue(item, field.displayKey);
                    setLookupDisplay((prev) => ({
                      ...prev,
                      [field.key]: displayVal,
                    }));
                    setLookupSearch((prev) => ({ ...prev, [field.key]: "" }));
                    setLookupOpen((prev) => ({ ...prev, [field.key]: false }));
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border, #eee)",
                  }}
                >
                  {getDisplayValue(item, field.displayKey)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={(form[field.key] as string) ?? ""}
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
