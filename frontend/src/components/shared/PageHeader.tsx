import React from "react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
}

export default function PageHeader({ title, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="breadcrumbs" aria-label="Fil d'Ariane">
            {breadcrumbs.map((crumb, i) => (
              <span key={i}>
                {i > 0 && <span className="breadcrumb-sep"> / </span>}
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              </span>
            ))}
          </nav>
        )}
      </div>
      {action && <div className="page-head-action">{action}</div>}
    </div>
  );
}
