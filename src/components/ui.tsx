"use client";
import Link from "next/link";
import { ReactNode } from "react";
import {
  Project,
  Severity,
  Status,
  User,
  severities,
  statuses,
} from "@/demo/model";

const paths: Record<string, ReactNode> = {
  bug: (
    <>
      <path d="m9 3 1 3m5-3-1 3M5 9H2m3 6H2m20-6h-3m3 6h-3M6 20l3-3m9 3-3-3" />
      <rect x="6" y="6" width="12" height="14" rx="6" />
      <path d="M12 7v12M8 11h8" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  folder: (
    <path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  ),
  list: (
    <>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 3h8v7a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v6m-4 1h8" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v2" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1 1 3-2 2 2 3-1 3 3 1 1 3h5l1-3 3-1-1-3 2-3-2-2 1-3-3-1-1-3Z" />
      <circle cx="11.5" cy="12" r="3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10M10 22h4" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7-11 11" />
      <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M10 3H4v18h6m4-14 5 5-5 5m-6-5h11" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  archive: (
    <>
      <path d="M4 8v13h16V8M3 3h18v5H3Z" />
      <path d="M9 12h6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const aliases: Record<string, string> = {
    "arrow-right": "arrow",
    "arrow-up-right": "external",
    "check-circle": "check",
    layers: "folder",
    activity: "chart",
    message: "mail",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[aliases[name] ?? name] ?? paths.file}
    </svg>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={"badge status-" + status.toLowerCase()}>
      <span className="status-dot" />
      {statuses[status]}
    </span>
  );
}
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={"severity severity-" + severity.toLowerCase()}>
      <span className="severity-bars" aria-hidden="true">
        ▂▅▇
      </span>
      {severities[severity]}
    </span>
  );
}
export function Avatar({ user, size = 36 }: { user?: User; size?: number }) {
  const name = user?.name ?? "Участник";
  return (
    <span
      className={"avatar avatar-" + ((name.charCodeAt(0) || 0) % 5)}
      style={{ width: size, height: size, fontSize: size * 0.31 }}
      aria-label={name}
    >
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function ProjectIcon({ project }: { project: Project }) {
  return (
    <span className="project-icon" style={{ background: project.color }}>
      {project.name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="search" size={25} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
export function AccessNotice() {
  return (
    <div className="card">
      <EmptyState
        title="Эта страница для другого профиля"
        description="Выберите нужную демонстрационную роль в верхней панели, чтобы посмотреть этот сценарий."
        action={
          <Link className="btn btn-secondary" href="/dashboard">
            Вернуться к обзору
          </Link>
        }
      />
    </div>
  );
}
