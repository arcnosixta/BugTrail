export type Role = "USER" | "MODERATOR" | "ADMIN";
export type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_INFO"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED"
  | "DUPLICATE";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  role: Role;
  blocked: boolean;
};
export type Project = {
  id: string;
  slug: string;
  code: string;
  name: string;
  description: string;
  category: string;
  color: string;
  url: string;
  repository: string;
  rules: string;
  archived: boolean;
  moderatorIds: string[];
};
export type Attachment = { id: string; name: string; url: string };
export type Comment = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  hidden?: boolean;
};
export type ReportEvent = {
  id: string;
  title: string;
  detail: string;
  actorId: string;
  createdAt: string;
};
export type Report = {
  id: string;
  projectId: string;
  number: number;
  authorId: string;
  roleAtSubmission: Role | null;
  title: string;
  description: string;
  category: string;
  status: Status;
  severity: Severity;
  priority: Priority;
  steps: string[];
  expected: string;
  actual: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
  assigneeId?: string;
  duplicateOfId?: string;
  hidden: boolean;
  attachments: Attachment[];
  comments: Comment[];
  events: ReportEvent[];
};
export type Notification = {
  id: string;
  userId: string;
  title: string;
  description: string;
  reportId?: string;
  read: boolean;
  createdAt: string;
};
export type AuditEntry = {
  id: string;
  actorId: string;
  action: string;
  target: string;
  reason: string;
  createdAt: string;
};
export type DemoState = {
  users: User[];
  projects: Project[];
  reports: Report[];
  notifications: Notification[];
  audit: AuditEntry[];
  sessionUserId: string;
};

export const roles: Record<Role, string> = {
  USER: "Пользователь",
  MODERATOR: "Модератор",
  ADMIN: "Администратор",
};
export const statuses: Record<Status, string> = {
  DRAFT: "Черновик",
  SUBMITTED: "На проверке",
  NEEDS_INFO: "Нужны уточнения",
  CONFIRMED: "Подтверждён",
  IN_PROGRESS: "В работе",
  RESOLVED: "Исправлен",
  REJECTED: "Отклонён",
  DUPLICATE: "Дубликат",
};
export const severities: Record<Severity, string> = {
  LOW: "Низкая",
  MEDIUM: "Средняя",
  HIGH: "Высокая",
  CRITICAL: "Критическая",
};
export const categories: Record<string, string> = {
  FUNCTIONAL: "Функциональность",
  UI: "Интерфейс",
  PERFORMANCE: "Производительность",
  COMPATIBILITY: "Совместимость",
  ACCESSIBILITY: "Доступность",
  OTHER: "Другое",
};
export const activeStatuses: Status[] = [
  "CONFIRMED",
  "IN_PROGRESS",
  "RESOLVED",
];
export function rewarded(report: Report) {
  return (
    activeStatuses.includes(report.status) &&
    !report.hidden &&
    report.roleAtSubmission === "USER"
  );
}
export function pointsFor(state: DemoState, userId: string) {
  return (
    state.reports.filter((r) => r.authorId === userId && rewarded(r)).length *
    10
  );
}
export function usefulCount(state: DemoState, userId: string) {
  return pointsFor(state, userId) / 10;
}
export function levelFor(points: number) {
  return 1 + Math.floor(points / 100);
}
export function canModerate(state: DemoState, user: User, report: Report) {
  const p = state.projects.find((p) => p.id === report.projectId);
  return (
    !user.blocked &&
    report.authorId !== user.id &&
    (user.role === "ADMIN" ||
      (user.role === "MODERATOR" && !!p?.moderatorIds.includes(user.id)))
  );
}
export function canView(state: DemoState, user: User, report: Report) {
  if (report.status === "DRAFT") return report.authorId === user.id;
  return (
    !report.hidden ||
    report.authorId === user.id ||
    canModerate(state, user, report)
  );
}
export function reportCode(state: DemoState, report: Report) {
  return report.status === "DRAFT"
    ? "ЧЕРНОВИК"
    : (state.projects.find((p) => p.id === report.projectId)?.code ?? "BT") +
        "-" +
        report.number;
}
export function shortDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}
export function timestamp() {
  return new Date().toISOString();
}
export function uid() {
  return crypto.randomUUID();
}
export function addAudit(
  state: DemoState,
  actorId: string,
  action: string,
  target: string,
  reason: string,
) {
  state.audit.unshift({
    id: uid(),
    actorId,
    action,
    target,
    reason,
    createdAt: timestamp(),
  });
}
