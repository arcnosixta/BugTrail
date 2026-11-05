"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/demo/store";
import {
  canModerate,
  canView,
  levelFor,
  pointsFor,
  reportCode,
  shortDate,
  statuses,
  usefulCount,
  type Report,
  type Status,
} from "@/demo/model";
import {
  Avatar,
  EmptyState,
  Icon,
  PageHeader,
  ProjectIcon,
  SeverityBadge,
  StatusBadge,
} from "@/components/ui";

function ReportRows({ reports }: { reports: Report[] }) {
  const { state } = useDemo();
  if (!reports.length)
    return (
      <EmptyState
        title="Пока ничего нет"
        description="Попробуйте изменить фильтры или добавьте первый отчёт."
      />
    );
  return (
    <div className="table-wrap">
      <table className="reports-table">
        <thead>
          <tr>
            <th>Отчёт</th>
            <th>Статус</th>
            <th>Серьёзность</th>
            <th>Автор</th>
            <th>Обновлён</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => {
            const project = state.projects.find(
              (p) => p.id === report.projectId,
            );
            const author = state.users.find((u) => u.id === report.authorId);
            return (
              <tr key={report.id}>
                <td>
                  <Link
                    href={"/reports/" + report.id}
                    className="block min-w-52 max-w-xl"
                  >
                    <span className="mono text-xs text-slate-400">
                      {reportCode(state, report)}{" "}
                      <span className="mx-1">·</span> {project?.name}
                    </span>
                    <span className="mt-1 block font-medium text-slate-800 hover:text-indigo-600">
                      {report.title}
                    </span>
                    {report.hidden && <span className="badge mt-1">Скрыт</span>}
                  </Link>
                </td>
                <td>
                  <StatusBadge status={report.status} />
                </td>
                <td>
                  <SeverityBadge severity={report.severity} />
                </td>
                <td>
                  {author && (
                    <Link
                      href={"/profile/" + author.handle}
                      className="row gap-2 whitespace-nowrap"
                    >
                      <Avatar user={author} size={28} />
                      <span className="text-sm">
                        {author.name.split(" ")[0]}
                      </span>
                    </Link>
                  )}
                </td>
                <td className="whitespace-nowrap text-sm text-slate-500">
                  {shortDate(report.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardPage() {
  const { state, currentUser } = useDemo();
  const mine = state.reports.filter((r) => r.authorId === currentUser.id);
  const visible = state.reports.filter(
    (r) => r.status !== "DRAFT" && canView(state, currentUser, r),
  );
  const own = currentUser.role === "USER";
  const queue = state.reports.filter(
    (r) =>
      canModerate(state, currentUser, r) &&
      ["SUBMITTED", "NEEDS_INFO"].includes(r.status) &&
      !state.projects.find((p) => p.id === r.projectId)?.archived,
  );
  const needInfo = mine.filter((r) => r.status === "NEEDS_INFO");
  const points = pointsFor(state, currentUser.id);
  const events = visible
    .flatMap((r) => r.events.map((e) => ({ ...e, report: r })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const top = state.users
    .filter(
      (u) => !u.blocked && u.role === "USER" && pointsFor(state, u.id) > 0,
    )
    .sort(
      (a, b) =>
        pointsFor(state, b.id) - pointsFor(state, a.id) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3);
  const recent = (own ? mine : visible)
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="stack">
      <PageHeader
        eyebrow="ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО"
        title={"С возвращением, " + currentUser.name.split(" ")[0] + "!"}
        description={
          own
            ? "Каждый найденный баг — шаг к лучшему продукту."
            : "Помогайте полезным находкам превращаться в исправления."
        }
        actions={
          <Link href="/reports/new" className="btn btn-primary">
            <Icon name="plus" size={17} /> Сообщить об ошибке
          </Link>
        }
      />
      <div className="grid-4">
        <Metric
          label={own ? "Ваши отчёты" : "Всего отчётов"}
          value={
            own
              ? mine.filter((r) => r.status !== "DRAFT").length
              : visible.length
          }
          caption={
            own
              ? mine.filter((r) => r.status === "DRAFT").length +
                " в черновиках"
              : "В доступных проектах"
          }
          icon="file"
        />
        <Metric
          label={own ? "Полезные находки" : "На проверке"}
          value={own ? usefulCount(state, currentUser.id) : queue.length}
          caption={own ? "Подтверждено модератором" : "Ожидают вашего внимания"}
          icon="check-circle"
        />
        <Metric
          label={own ? "Очки вклада" : "Исправлено"}
          value={
            own ? points : visible.filter((r) => r.status === "RESOLVED").length
          }
          caption={
            own
              ? "Уровень " +
                levelFor(points) +
                " · до следующего " +
                (100 - (points % 100))
              : "Отчётов с проверенным результатом"
          }
          icon="sparkles"
        />
        <Metric
          label="Активные проекты"
          value={state.projects.filter((p) => !p.archived).length}
          caption="Есть где оставить свой след"
          icon="layers"
        />
      </div>
      {(needInfo.length > 0 || (!own && queue.length > 0)) && (
        <div className="notice flex flex-wrap items-center justify-between gap-4">
          <div className="row gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Icon name="message" size={20} />
            </span>
            <div>
              <strong>
                {own
                  ? "Ваш ответ поможет разобраться"
                  : "В очереди есть новые находки"}
              </strong>
              <p className="muted mt-1 text-sm">
                {own
                  ? "Модератор ждёт уточнений по " +
                    needInfo.length +
                    " отчёту."
                  : queue.length + " отчёта готовы к проверке."}
              </p>
            </div>
          </div>
          <Link
            href={own ? "/reports/" + needInfo[0]?.id : "/moderation"}
            className="btn btn-secondary"
          >
            {own ? "Добавить детали" : "Открыть очередь"}{" "}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      )}
      <section className="card overflow-hidden">
        <div className="card-header">
          <div>
            <h2 className="text-lg font-semibold">
              {own ? "Ваши последние отчёты" : "Последние отчёты"}
            </h2>
            <p className="muted mt-1 text-sm">
              От находки до решения — всё на виду.
            </p>
          </div>
          <Link href={own ? "/me/reports" : "/reports"} className="link">
            Все отчёты <span aria-hidden>→</span>
          </Link>
        </div>
        <ReportRows reports={recent} />
      </section>
      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Лента изменений</h2>
            <span className="badge">В проектах</span>
          </div>
          <div className="px-6 pb-3">
            {events.length ? (
              events.map((event) => (
                <Link
                  key={event.id + event.report.id}
                  href={"/reports/" + event.report.id}
                  className="list-item flex gap-3 py-4"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <Icon
                      name={
                        event.title.includes("подтверждена")
                          ? "check"
                          : "activity"
                      }
                      size={15}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {event.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {reportCode(state, event.report)} · {event.report.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {shortDate(event.createdAt)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="Здесь появится история"
                description="Добавьте первый отчёт, чтобы начать."
              />
            )}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Вклад сообщества</h2>
            <Link href="/leaderboard" className="link">
              Весь рейтинг →
            </Link>
          </div>
          <div className="px-6">
            {top.map((user, index) => (
              <Link
                href={"/profile/" + user.handle}
                key={user.id}
                className="list-item row between py-4"
              >
                <div className="row gap-3">
                  <span className="w-4 text-sm text-slate-400">
                    {index + 1}
                  </span>
                  <Avatar user={user} size={38} />
                  <div>
                    <p className="font-medium text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">
                      {usefulCount(state, user.id)} полезных находки
                    </p>
                  </div>
                </div>
                <span className="mono text-sm font-semibold text-indigo-600">
                  {pointsFor(state, user.id)}{" "}
                  <span className="font-normal text-slate-400">очков</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="m-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            <strong className="text-slate-700">
              Качество важнее количества.
            </strong>
            <p className="mt-1">
              10 очков за подтверждённую находку. За отправку и комментарии очки
              не начисляются.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  caption,
  icon,
}: {
  label: string;
  value: number;
  caption: string;
  icon: string;
}) {
  return (
    <div className="card p-5">
      <div className="row between gap-2">
        <span className="text-sm text-slate-500">{label}</span>
        <span className="text-slate-400">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      <p className="mt-2 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

export function ProjectsPage() {
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("active");
  const projects = state.projects.filter(
    (p) =>
      (view === "all" || p.archived === (view === "archived")) &&
      (p.name + " " + p.description + " " + p.category)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="stack">
      <PageHeader
        eyebrow="ОСТАВЬТЕ СВОЙ СЛЕД"
        title="Проекты"
        description="Выберите продукт, который хочется сделать лучше."
      />
      <div className="toolbar">
        <div className="tabs" aria-label="Состояние проектов">
          {[
            ["active", "Активные"],
            ["archived", "Архив"],
            ["all", "Все проекты"],
          ].map(([key, label]) => (
            <button
              className={"tab " + (view === key ? "active" : "")}
              key={key}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block min-w-52">
          <span className="sr-only">Поиск проектов</span>
          <input
            className="input"
            placeholder="Найти проект…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="grid-3">
        {projects.map((project) => {
          const reports = state.reports.filter(
            (r) =>
              r.projectId === project.id && r.status !== "DRAFT" && !r.hidden,
          );
          return (
            <Link
              href={"/projects/" + project.slug}
              key={project.id}
              className="card group flex min-h-72 flex-col p-6 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="row between">
                <ProjectIcon project={project} />
                <span
                  className={
                    "badge " +
                    (project.archived ? "" : "bg-emerald-50 text-emerald-700")
                  }
                >
                  {project.archived ? "Архив" : "Активный"}
                </span>
              </div>
              <p className="mt-6 text-xs font-medium uppercase tracking-wider text-slate-400">
                {project.category}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 group-hover:text-indigo-600">
                {project.name}
              </h2>
              <p className="muted mt-3 flex-1 text-sm leading-6">
                {project.description}
              </p>
              <div className="mt-6 row between border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span>{reports.length} отчётов</span>
                <span>
                  {reports.filter((r) => r.status === "RESOLVED").length}{" "}
                  исправлено
                </span>
                <span className="text-indigo-600">
                  <Icon name="arrow-up-right" size={18} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      {!projects.length && (
        <EmptyState
          title="Проекты не найдены"
          description="Попробуйте другой запрос или откройте все проекты."
          action={
            <button
              className="btn btn-secondary"
              onClick={() => {
                setQuery("");
                setView("all");
              }}
            >
              Сбросить фильтры
            </button>
          }
        />
      )}
      <div className="notice">
        <strong>Тестируйте в разрешённых границах.</strong>
        <p className="mt-1 text-sm text-slate-500">
          Перед проверкой прочитайте правила проекта. Все проекты и адреса в
          этом пространстве — демонстрационные.
        </p>
      </div>
    </div>
  );
}

export function ProjectDetail({ slug }: { slug: string }) {
  const { state, currentUser } = useDemo();
  const [tab, setTab] = useState("reports");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const project = state.projects.find((p) => p.slug === slug || p.id === slug);
  if (!project)
    return (
      <EmptyState
        title="Проект не найден"
        description="Возможно, ссылка устарела."
        action={
          <Link href="/projects" className="btn btn-primary">
            К проектам
          </Link>
        }
      />
    );
  const all = state.reports.filter(
    (r) =>
      r.projectId === project.id &&
      r.status !== "DRAFT" &&
      canView(state, currentUser, r),
  );
  const reports = all
    .filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (r.title + " " + reportCode(state, r))
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const moderators = state.users.filter(
    (u) => project.moderatorIds.includes(u.id) && !u.blocked,
  );
  return (
    <div className="stack">
      <Link href="/projects" className="link w-fit">
        ← Все проекты
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <ProjectIcon project={project} />
          <div>
            <div className="row gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {project.name}
              </h1>
              <span className="badge">
                {project.archived ? "Архив" : "Активный"}
              </span>
            </div>
            <p className="muted mt-2 max-w-2xl leading-6">
              {project.description}
            </p>
          </div>
        </div>
        {!project.archived && (
          <Link
            className="btn btn-primary"
            href={"/reports/new?project=" + project.id}
          >
            <Icon name="plus" size={17} /> Сообщить об ошибке
          </Link>
        )}
      </div>
      {project.archived && (
        <div className="notice">
          Проект в архиве. Отчёты доступны для чтения, новые сообщения не
          принимаются.
        </div>
      )}
      <div className="grid-4">
        <Metric
          label="Всего отчётов"
          value={all.length}
          caption="Уникальные сообщения"
          icon="file"
        />
        <Metric
          label="На проверке"
          value={
            all.filter((r) => ["SUBMITTED", "NEEDS_INFO"].includes(r.status))
              .length
          }
          caption="Ждут решения"
          icon="clock"
        />
        <Metric
          label="В работе"
          value={all.filter((r) => r.status === "IN_PROGRESS").length}
          caption="Исправления в процессе"
          icon="activity"
        />
        <Metric
          label="Исправлено"
          value={all.filter((r) => r.status === "RESOLVED").length}
          caption="Результат проверен"
          icon="check"
        />
      </div>
      <div className="tabs">
        {[
          ["reports", "Отчёты"],
          ["rules", "О проекте и правила"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={"tab " + (tab === key ? "active" : "")}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "reports" ? (
        <section className="card overflow-hidden">
          <div className="card-header flex-wrap gap-3">
            <h2 className="font-semibold">
              Отчёты проекта{" "}
              <span className="ml-2 text-slate-400">{reports.length}</span>
            </h2>
            <div className="row flex-wrap gap-2">
              <label>
                <span className="sr-only">Поиск в проекте</span>
                <input
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Номер или заголовок…"
                />
              </label>
              <label>
                <span className="sr-only">Статус</span>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">Все статусы</option>
                  {(Object.entries(statuses) as [Status, string][])
                    .filter(([s]) => s !== "DRAFT")
                    .map(([s, label]) => (
                      <option key={s} value={s}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </div>
          <ReportRows reports={reports} />
        </section>
      ) : (
        <div className="grid-2">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Границы тестирования</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
              {project.rules}
            </p>
            <div className="mt-6 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
              <strong>Разрешение важнее любопытства.</strong>
              <p className="mt-2">
                Не проводите нагрузочные проверки, не используйте реальные
                данные и не публикуйте пароли или токены.
              </p>
            </div>
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Информация</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-400">Категория</dt>
                <dd className="mt-1 text-slate-700">{project.category}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Демонстрационный адрес</dt>
                <dd className="mt-1 break-all text-slate-700">{project.url}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Модераторы</dt>
                <dd className="mt-2 flex flex-wrap gap-3">
                  {moderators.length
                    ? moderators.map((u) => (
                        <Link
                          key={u.id}
                          href={"/profile/" + u.handle}
                          className="row gap-2"
                        >
                          <Avatar user={u} size={28} />
                          {u.name}
                        </Link>
                      ))
                    : "Очередь ведёт администратор"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}

export function ReportsPage({
  mine = false,
  moderation = false,
}: {
  mine?: boolean;
  moderation?: boolean;
}) {
  const { state, currentUser } = useDemo();
  const urlQuery = useSearchParams().get("q") ?? "";
  const [search, setSearch] = useState({ source: urlQuery, value: urlQuery });
  const query = search.source === urlQuery ? search.value : urlQuery;
  const setQuery = (value: string) => setSearch({ source: urlQuery, value });
  const [status, setStatus] = useState(moderation ? "PENDING" : "ALL");
  const [project, setProject] = useState("ALL");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  if (moderation && currentUser.role === "USER")
    return (
      <EmptyState
        title="Раздел для модератора"
        description="В демонстрационном переключателе выберите профиль модератора или администратора."
        action={
          <Link href="/dashboard" className="btn btn-secondary">
            Вернуться к обзору
          </Link>
        }
      />
    );
  const base = state.reports.filter((r) => {
    if (!canView(state, currentUser, r)) return false;
    if (mine) return r.authorId === currentUser.id;
    if (r.status === "DRAFT") return false;
    if (moderation)
      return (
        canModerate(state, currentUser, r) &&
        !state.projects.find((p) => p.id === r.projectId)?.archived
      );
    return true;
  });
  const filtered = base
    .filter((r) => {
      const p = state.projects.find((p) => p.id === r.projectId);
      const matchesStatus =
        status === "ALL" ||
        (status === "PENDING"
          ? ["SUBMITTED", "NEEDS_INFO"].includes(r.status)
          : r.status === status);
      return (
        matchesStatus &&
        (project === "ALL" || r.projectId === project) &&
        (r.title + " " + reportCode(state, r) + " " + p?.name)
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())
      );
    })
    .toSorted((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
        : sort === "priority"
          ? a.priority.localeCompare(b.priority) ||
            b.updatedAt.localeCompare(a.updatedAt)
          : b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
    );
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const reports = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const reset = () => {
    setQuery("");
    setStatus("ALL");
    setProject("ALL");
    setSort("updated");
    setPage(1);
  };
  const title = moderation ? "Модерация" : mine ? "Мои отчёты" : "Отчёты";
  const quickTabs = moderation
    ? [
        ["PENDING", "Ожидают решения"],
        ["CONFIRMED", "Подтверждённые"],
        ["IN_PROGRESS", "В работе"],
        ["ALL", "Все доступные"],
      ]
    : mine
      ? [
          ["ALL", "Все"],
          ["DRAFT", "Черновики"],
          ["NEEDS_INFO", "Нужен ответ"],
          ["CONFIRMED", "Подтверждённые"],
        ]
      : [
          ["ALL", "Все отчёты"],
          ["SUBMITTED", "На проверке"],
          ["IN_PROGRESS", "В работе"],
          ["RESOLVED", "Исправлены"],
        ];
  return (
    <div className="stack">
      <PageHeader
        eyebrow={
          moderation
            ? "ОТ НАХОДКИ К РЕШЕНИЮ"
            : mine
              ? "ВАШ ВКЛАД В ПРОДУКТЫ"
              : "НИ ОДНА НАХОДКА НЕ ПОТЕРЯЕТСЯ"
        }
        title={title}
        description={
          moderation
            ? "Проверяйте воспроизводимость, запрашивайте детали и помогайте двигаться дальше."
            : mine
              ? "Черновики, ответы модераторов и подтверждённые находки."
              : "Прозрачная история качества: от первого сообщения до исправления."
        }
        actions={
          !moderation && (
            <Link href="/reports/new" className="btn btn-primary">
              <Icon name="plus" size={17} /> Новый отчёт
            </Link>
          )
        }
      />
      {moderation && (
        <div className="notice text-sm">
          Показаны только доступные активные проекты. Собственные отчёты
          проверяет другой сотрудник. Все решения в этом режиме сохраняются
          только в браузере.
        </div>
      )}
      <div className="tabs flex-wrap">
        {quickTabs.map(([key, label]) => (
          <button
            key={key}
            className={"tab " + (status === key ? "active" : "")}
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
          >
            {label}
            {key === "ALL" && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs text-slate-500">
                {base.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <label className="min-w-48 flex-1">
            <span className="sr-only">Поиск отчётов</span>
            <input
              className="input w-full"
              placeholder="Поиск по заголовку, номеру или проекту…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span className="sr-only">Проект</span>
            <select
              className="select"
              value={project}
              onChange={(e) => {
                setProject(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Все проекты</option>
              {state.projects
                .filter(
                  (p) =>
                    !moderation ||
                    currentUser.role === "ADMIN" ||
                    p.moderatorIds.includes(currentUser.id),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Статус</span>
            <select
              className="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Все статусы</option>
              {moderation && <option value="PENDING">Ожидают решения</option>}
              {(Object.entries(statuses) as [Status, string][])
                .filter(([s]) => mine || s !== "DRAFT")
                .map(([s, label]) => (
                  <option key={s} value={s}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Сортировка</span>
            <select
              className="select"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="updated">Сначала обновлённые</option>
              <option value="oldest">Сначала старые</option>
              <option value="priority">По приоритету</option>
            </select>
          </label>
        </div>
        {reports.length ? (
          <ReportRows reports={reports} />
        ) : (
          <EmptyState
            title="Отчёты не найдены"
            description={
              mine && !base.length
                ? "Начните с первого наблюдения — его можно сохранить как черновик."
                : "По выбранным условиям ничего не нашлось. Попробуйте убрать фильтры."
            }
            action={
              <button className="btn btn-secondary" onClick={reset}>
                Сбросить фильтры
              </button>
            }
          />
        )}
        <div className="row between flex-wrap gap-3 border-t border-slate-100 px-5 py-4 text-sm">
          <span className="text-slate-500">
            {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, filtered.length)} из{" "}
            {filtered.length} отчётов
          </span>
          <div className="row gap-2">
            <button
              className="btn btn-secondary"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ← Назад
            </button>
            <span className="px-2 text-slate-500">
              {currentPage} / {pages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Далее →
            </button>
          </div>
        </div>
      </section>
      {mine && (
        <p className="muted text-sm">
          Черновики видны только вашему демонстрационному профилю. Изображения в
          новых отчётах остаются локальными.
        </p>
      )}
    </div>
  );
}

export function LandingPage() {
  const { state } = useDemo();
  const published = state.reports.filter(
    (r) => r.status !== "DRAFT" && !r.hidden,
  );
  const preview = published.slice(0, 3);
  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 lg:pt-20">
      <section className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />{" "}
            Маленькая находка. Большая разница.
          </span>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[60px]">
            Хороший продукт начинается с{" "}
            <span className="text-indigo-600">найденного бага.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-500 sm:text-lg">
            Находите ошибки, помогайте командам и оставляйте заметный след.
            BugTrail превращает «кажется, что-то сломалось» в понятный путь к
            исправлению.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-primary">
              Открыть демо <Icon name="arrow-right" size={18} />
            </Link>
            <Link href="/projects" className="btn btn-secondary">
              Посмотреть проекты
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Демонстрационный режим · без регистрации и реальных данных
          </p>
          <div className="mt-9 flex flex-wrap gap-5 text-xs font-medium text-slate-500">
            <span className="row gap-1.5">
              <Icon name="check" size={15} /> Три роли
            </span>
            <span className="row gap-1.5">
              <Icon name="check" size={15} /> Прозрачные решения
            </span>
            <span className="row gap-1.5">
              <Icon name="check" size={15} /> Очки за пользу
            </span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-[50%] bg-indigo-100/50 blur-3xl" />
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-20px_rgba(50,45,120,0.18)]">
            <div className="row between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="row gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="h-2 w-2 rounded-full bg-slate-300" />
              </div>
              <span className="mono text-[10px] text-slate-400">
                workspace / reports
              </span>
              <Icon name="layers" size={14} />
            </div>
            <div className="p-6">
              <div className="row between">
                <div>
                  <p className="text-xs text-slate-400">КАЧЕСТВО В ДЕТАЛЯХ</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    Следы, которые помогают
                  </h2>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Icon name="plus" size={18} />
                </span>
              </div>
              <div className="my-6 grid grid-cols-3 gap-3">
                {[
                  [String(published.length), "отчётов"],
                  [
                    String(
                      published.filter((r) =>
                        ["CONFIRMED", "IN_PROGRESS", "RESOLVED"].includes(
                          r.status,
                        ),
                      ).length,
                    ),
                    "подтверждено",
                  ],
                  [
                    String(
                      published.filter((r) => r.status === "RESOLVED").length,
                    ),
                    "исправлено",
                  ],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <p className="text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {preview.map((r) => (
                  <Link
                    key={r.id}
                    href={"/reports/" + r.id}
                    className="flex items-start justify-between gap-3 rounded-xl px-1 py-4 hover:bg-slate-50"
                  >
                    <div>
                      <span className="mono text-[10px] text-slate-400">
                        {reportCode(state, r)}
                      </span>
                      <p className="mt-1 max-w-60 text-xs font-medium leading-5 text-slate-700">
                        {r.title}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
              <div className="mt-3 row gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600">
                  <Icon name="check" size={19} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Находка подтверждена
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    +10 очков за реальный вклад
                  </p>
                </div>
                <span className="ml-auto text-xl">↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mt-24 border-t border-slate-200 pt-12">
        <div className="max-w-xl">
          <p className="eyebrow">ПОНЯТНЫЙ ПРОЦЕСС</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            От «не работает» до «исправлено».
          </h2>
          <p className="muted mt-3 leading-7">
            Без потерянных скриншотов и сообщений в разных чатах.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            [
              "01",
              "Заметьте и опишите",
              "Выберите проект, запишите шаги и покажите ожидаемый результат. Хороший отчёт начинается с деталей.",
              "search",
            ],
            [
              "02",
              "Получите обратную связь",
              "Модератор проверит находку, запросит уточнения и свяжет повторные сообщения с оригиналом.",
              "message",
            ],
            [
              "03",
              "Увидьте результат",
              "Следите за исправлением и получайте очки за подтверждённый вклад. Каждая полезная находка имеет значение.",
              "check-circle",
            ],
          ].map(([n, title, text, icon]) => (
            <div key={n} className="card p-6">
              <div className="row between">
                <span className="mono text-xs text-slate-400">{n}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name={icon} size={20} />
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="muted mt-3 text-sm leading-7">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-slate-900 px-7 py-9 text-white sm:px-10">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Найдите свой первый след.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            В демо можно пройти весь путь: создать отчёт, сменить профиль и
            проверить находку.
          </p>
        </div>
        <Link
          className="btn bg-white text-slate-900 hover:bg-indigo-50"
          href="/projects"
        >
          Выбрать проект <Icon name="arrow-right" size={17} />
        </Link>
      </section>
      <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400">
        <span>BugTrail · Оставляйте полезный след.</span>
        <span>Учебное frontend-приложение. Данные хранятся в браузере.</span>
      </footer>
    </div>
  );
}
