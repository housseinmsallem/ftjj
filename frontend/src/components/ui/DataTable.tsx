import React from "react";

export interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>, index: number) => React.ReactNode;
}

export interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
}

export default function DataTable({ columns, rows }: DataTableProps): React.ReactElement {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={(row._id as string) || index}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(row, index) : (row[c.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
