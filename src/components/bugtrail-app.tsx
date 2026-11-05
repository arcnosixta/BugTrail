"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { DemoProvider, useDemo } from "@/demo/store";
import { Role, pointsFor, roles } from "@/demo/model";
import { Avatar, EmptyState, Icon } from "./ui";
import {
  DashboardPage,
  LandingPage,
  ProjectDetail,
  ProjectsPage,
  ReportsPage,
} from "@/features/work-pages";
import { ReportDetail, ReportEditor } from "@/features/report-pages";
import { AdminAudit, AdminProjects, AdminUsers } from "@/features/admin-pages";
import {
  AuthPage,
  LeaderboardPage,
  NotificationsPage,
  ProfilePage,
  SettingsPage,
} from "@/features/account-pages";

const nav = [
  { href: "/dashboard", label: "Обзор", icon: "grid" },
  { href: "/projects", label: "Проекты", icon: "folder" },
  { href: "/reports", label: "Все отчёты", icon: "bug" },
  { href: "/me/reports", label: "Мои отчёты", icon: "file" },
  { href: "/leaderboard", label: "Рейтинг", icon: "trophy" },
];
function Logo() {
  return (
    <Link href="/" className="brand">
      <span className="brand-icon">
        <Icon name="bug" size={23} />
      </span>
      <span>
        bugtrail<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
function RouteView({ path }: { path: string }) {
  const search = useSearchParams();
  const parts = path.split("/").filter(Boolean);
  if (path === "/") return <LandingPage />;
  if (
    [
      "/sign-in",
      "/sign-up",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
    ].includes(path)
  )
    return <AuthPage mode={parts[0]} />;
  if (path === "/dashboard") return <DashboardPage />;
  if (path === "/projects") return <ProjectsPage />;
  if (parts[0] === "projects" && parts.length === 2)
    return <ProjectDetail slug={parts[1]} />;
  if (path === "/reports/new")
    return <ReportEditor projectId={search.get("project") ?? undefined} />;
  if (parts[0] === "reports" && parts.length === 3 && parts[2] === "edit")
    return <ReportEditor id={parts[1]} />;
  if (path === "/reports") return <ReportsPage />;
  if (parts[0] === "reports" && parts.length === 2)
    return <ReportDetail id={parts[1]} />;
  if (path === "/me/reports") return <ReportsPage mine />;
  if (path === "/moderation") return <ReportsPage moderation />;
  if (path === "/leaderboard") return <LeaderboardPage />;
  if (path === "/notifications") return <NotificationsPage />;
  if (path === "/settings") return <SettingsPage />;
  if (parts[0] === "profile" && parts.length === 2)
    return <ProfilePage handle={parts[1]} />;
  if (path === "/admin/projects") return <AdminProjects />;
  if (path === "/admin/users") return <AdminUsers />;
  if (path === "/admin/audit") return <AdminAudit />;
  return (
    <EmptyState
      title="Страница не найдена"
      description="Возможно, адрес изменился. Все проекты и отчёты доступны через меню."
      action={
        <Link className="btn btn-primary" href="/dashboard">
          К обзору
        </Link>
      }
    />
  );
}
function Shell() {
  const { state, currentUser, setRole, toast, ready } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const mobileOpen = menuPath === path;
  const setMobileOpen = (open: boolean) => setMenuPath(open ? path : null);
  const [search, setSearch] = useState("");
  const publicPage =
    path === "/" ||
    [
      "/sign-in",
      "/sign-up",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
    ].includes(path);
  const unread = state.notifications.filter(
    (n) => n.userId === currentUser.id && !n.read,
  ).length;
  function handleSearch(e: FormEvent) {
    e.preventDefault();
    router.push(
      "/reports" +
        (search.trim() ? "?q=" + encodeURIComponent(search.trim()) : ""),
    );
    setSearch("");
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      <div className="demo-bar">
        <div className="demo-copy">
          <span className="demo-indicator" />
          <strong>Демо-пространство</strong>
          <span className="demo-detail">Данные остаются в этом браузере</span>
        </div>
        <label className="role-control">
          <span>Вы смотрите как</span>
          <select
            value={currentUser.role}
            aria-label="Демонстрационная роль"
            onChange={(e) => {
              if (document.querySelector('form[data-dirty="true"]') && !window.confirm("В форме есть несохранённые изменения. Переключить профиль и выйти из формы?")) return;
              setRole(e.target.value as Role);
            }}
          >
            {Object.entries(roles).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {publicPage ? (
        <>
          <header className="public-nav">
            <Logo />
            <nav aria-label="Главная навигация">
              <Link href="/projects">Проекты</Link>
              <Link href="/leaderboard">Рейтинг</Link>
              <Link className="btn btn-secondary" href="/sign-in">
                Войти
              </Link>
              <Link className="btn btn-primary" href="/dashboard">
                Открыть демо <Icon name="arrow" size={16} />
              </Link>
            </nav>
          </header>
          <main
            id="main"
            className={path === "/" ? "landing-main" : "auth-main"}
          >
            <RouteView key={path} path={path} />
          </main>
          <footer className="public-footer">
            <Logo />
            <span>Маленький баг. Большой вклад.</span>
            <span>Учебное пространство · 2026</span>
          </footer>
        </>
      ) : (
        <div className="workspace">
          {mobileOpen && (
            <button
              className="sidebar-backdrop"
              aria-label="Закрыть меню"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <aside className={"sidebar " + (mobileOpen ? "sidebar-open" : "")} onKeyDown={(event) => { if (event.key === "Escape") setMobileOpen(false); }}>
            <div className="sidebar-brand">
              <Logo />
              <button
                className="icon-button mobile-only"
                aria-label="Закрыть меню"
                onClick={() => setMobileOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="workspace-label">
              <span className="workspace-avatar">B</span>
              <div>
                <strong>Сообщество BugTrail</strong>
                <span>Общее пространство</span>
              </div>
            </div>
            <div className="nav-group-label">Рабочее пространство</div>
            <nav className="side-nav" aria-label="Рабочее пространство">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    path === item.href ||
                    (item.href === "/projects" && path.startsWith("/projects/"))
                      ? "active"
                      : ""
                  }
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.href === "/me/reports" && (
                    <span className="nav-count">
                      {
                        state.reports.filter(
                          (r) => r.authorId === currentUser.id,
                        ).length
                      }
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            {currentUser.role !== "USER" && (
              <>
                <div className="nav-group-label">Управление</div>
                <nav className="side-nav" aria-label="Управление">
                  <Link
                    href="/moderation"
                    className={path === "/moderation" ? "active" : ""}
                  >
                    <Icon name="shield" />
                    <span>Модерация</span>
                    <span className="nav-count">
                      {
                        state.reports.filter(
                          (r) =>
                            r.status === "SUBMITTED" &&
                            (currentUser.role === "ADMIN" ||
                              state.projects
                                .find((p) => p.id === r.projectId)
                                ?.moderatorIds.includes(currentUser.id)),
                        ).length
                      }
                    </span>
                  </Link>
                  {currentUser.role === "ADMIN" && (
                    <>
                      <Link
                        href="/admin/projects"
                        className={path === "/admin/projects" ? "active" : ""}
                      >
                        <Icon name="folder" />
                        <span>Проекты</span>
                      </Link>
                      <Link
                        href="/admin/users"
                        className={path === "/admin/users" ? "active" : ""}
                      >
                        <Icon name="users" />
                        <span>Участники</span>
                      </Link>
                      <Link
                        href="/admin/audit"
                        className={path === "/admin/audit" ? "active" : ""}
                      >
                        <Icon name="list" />
                        <span>Журнал действий</span>
                      </Link>
                    </>
                  )}
                </nav>
              </>
            )}
            <div className="sidebar-bottom">
              <div className="contribution-card">
                <span className="contribution-icon">
                  <Icon name="sparkles" />
                </span>
                <strong>Качество важнее количества</strong>
                <p>Каждый подтверждённый баг делает чей-то продукт лучше.</p>
              </div>
              <nav className="side-nav">
                <Link
                  href="/settings"
                  className={path === "/settings" ? "active" : ""}
                >
                  <Icon name="settings" />
                  <span>Настройки</span>
                </Link>
              </nav>
              <Link
                href={"/profile/" + currentUser.handle}
                className="sidebar-user"
              >
                <Avatar user={currentUser} />
                <div>
                  <strong>{currentUser.name}</strong>
                  <span>
                    {roles[currentUser.role]} ·{" "}
                    {pointsFor(state, currentUser.id)} очков
                  </span>
                </div>
                <Icon name="chevron" size={16} />
              </Link>
            </div>
          </aside>
          <div className="workspace-content">
            <header className="topbar">
              <div className="topbar-left">
                <button
                  className="icon-button mobile-only"
                  aria-label="Открыть меню"
                  onClick={() => setMobileOpen(true)}
                >
                  <Icon name="menu" />
                </button>
                <span className="topbar-breadcrumb">
                  Рабочее пространство <Icon name="chevron" size={13} />{" "}
                  <strong>
                    {path.startsWith("/admin")
                      ? "Управление"
                      : (nav.find((n) => n.href === path)?.label ??
                        (path.startsWith("/reports/")
                          ? "Отчёт"
                          : path.startsWith("/projects/")
                            ? "Проект"
                            : "BugTrail"))}
                  </strong>
                </span>
              </div>
              <div className="topbar-actions">
                <form className="global-search" onSubmit={handleSearch}>
                  <Icon name="search" size={17} />
                  <input
                    aria-label="Поиск отчётов"
                    placeholder="Найти отчёт..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <kbd>↵</kbd>
                </form>
                <Link
                  href="/notifications"
                  className="icon-button notification-button"
                  aria-label={
                    "Уведомления" + (unread ? ", непрочитанных: " + unread : "")
                  }
                >
                  <Icon name="bell" />
                  {unread > 0 && <span className="notification-dot" />}
                </Link>
                <Link
                  href={"/profile/" + currentUser.handle}
                  aria-label="Мой профиль"
                >
                  <Avatar user={currentUser} size={32} />
                </Link>
              </div>
            </header>
            <main id="main" className="main-content">
              {ready ? (
                <RouteView key={path + "-" + currentUser.id} path={path} />
              ) : (
                <div className="loading-state" role="status">
                  Открываем рабочее пространство…
                </div>
              )}
            </main>
            <footer className="workspace-footer">
              <span>BugTrail · Вместе делаем продукты лучше</span>
              <span>Frontend-демо · Без сервера</span>
            </footer>
          </div>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          <span className="toast-check">
            <Icon name="check" size={18} />
          </span>
          {toast}
        </div>
      )}
    </>
  );
}
export default function BugTrailApp() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  );
}
