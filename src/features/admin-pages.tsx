"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { useDemo } from "@/demo/store";
import {
  addAudit,
  DemoState,
  Project,
  Role,
  roles,
  shortDate,
  timestamp,
  uid,
} from "@/demo/model";

function AccessDenied() {
  return (
    <div className="card">
      <EmptyState
        title="Этот раздел для администратора"
        description="Выберите демонстрационный профиль администратора, чтобы посмотреть управление проектами и участниками."
        action={
          <Link className="btn btn-secondary" href="/dashboard">
            Вернуться к обзору
          </Link>
        }
      />
    </div>
  );
}

type ProjectForm = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  rules: string;
  url: string;
  category: string;
  moderatorIds: string[];
  reason: string;
};
const emptyForm: ProjectForm = {
  id: "",
  name: "",
  code: "",
  slug: "",
  description: "",
  rules: "",
  url: "",
  category: "Веб-приложение",
  moderatorIds: [],
  reason: "",
};
const projectColors = ["#6366f1", "#059669", "#e07843", "#8b5cf6"];

function validWebAddress(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function AdminProjects() {
  const { state, currentUser, update } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [error, setError] = useState("");
  const [archive, setArchive] = useState<Project | null>(null);
  const [reason, setReason] = useState("");
  if (currentUser.role !== "ADMIN" || currentUser.blocked)
    return <AccessDenied />;

  const projects = state.projects.filter(
    (project) =>
      (filter === "all" ||
        (filter === "active" ? !project.archived : project.archived)) &&
      (project.name + " " + project.code + " " + project.description)
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  const moderators = state.users.filter(
    (user) => user.role === "MODERATOR" && !user.blocked,
  );
  function change<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setForm((previous) => (previous ? { ...previous, [key]: value } : null));
  }
  function openEditor(project?: Project) {
    setError("");
    setArchive(null);
    setForm(
      project ? { ...project, reason: "" } : { ...emptyForm, moderatorIds: [] },
    );
  }
  function saveProject(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const name = form.name.trim(),
      code = form.code.trim(),
      slug = form.slug.trim();
    const description = form.description.trim(),
      rules = form.rules.trim(),
      url = form.url.trim();
    let message = "";
    if (name.length < 3 || name.length > 100)
      message = "Название должно содержать от 3 до 100 символов.";
    else if (!/^[A-Z][A-Z0-9]{1,7}$/.test(code))
      message = "Код: 2–8 латинских заглавных букв и цифр, первая — буква.";
    else if (!/^[a-z][a-z0-9-]{2,39}$/.test(slug))
      message = "Адрес: 3–40 строчных латинских букв, цифр и дефисов.";
    else if (
      state.projects.some(
        (project) =>
          project.id !== form.id &&
          (project.code === code || project.slug === slug),
      )
    )
      message = "Код или адрес уже занят другим проектом.";
    else if (description.length < 20 || description.length > 5000)
      message = "Описание должно содержать от 20 до 5000 символов.";
    else if (rules.length < 20 || rules.length > 10000)
      message = "Опишите правила тестирования: от 20 до 10 000 символов.";
    else if (!validWebAddress(url))
      message = "Укажите корректный адрес проекта, начинающийся с https://.";
    else if (form.reason.trim().length < 10)
      message = "Добавьте причину изменения не короче 10 символов.";
    if (message) {
      setError(message);
      return;
    }
    const savedForm = form;
    update(
      (draft) => {
        const existing = draft.projects.find(
          (project) => project.id === savedForm.id,
        );
        const selectedModerators = savedForm.moderatorIds.filter((id) =>
          draft.users.some(
            (user) =>
              user.id === id && user.role === "MODERATOR" && !user.blocked,
          ),
        );
        if (existing) {
          Object.assign(existing, {
            name,
            description,
            rules,
            url,
            category: savedForm.category,
            moderatorIds: selectedModerators,
          });
          draft.reports.forEach((report) => {
            const assignee = draft.users.find(
              (user) => user.id === report.assigneeId,
            );
            if (
              report.projectId === existing.id &&
              assignee?.role === "MODERATOR" &&
              !selectedModerators.includes(assignee.id)
            ) {
              report.assigneeId = undefined;
              report.events.push({
                id: uid(),
                title: "Ответственный снят",
                detail: "Назначение модератора в проекте удалено.",
                actorId: currentUser.id,
                createdAt: timestamp(),
              });
            }
          });
          addAudit(
            draft,
            currentUser.id,
            "Изменён проект",
            name,
            savedForm.reason.trim(),
          );
        } else {
          draft.projects.push({
            id: uid(),
            name,
            code,
            slug,
            description,
            rules,
            url,
            category: savedForm.category,
            moderatorIds: selectedModerators,
            repository: "",
            archived: false,
            color: projectColors[draft.projects.length % projectColors.length],
          });
          addAudit(
            draft,
            currentUser.id,
            "Создан проект",
            name,
            savedForm.reason.trim(),
          );
        }
      },
      form.id
        ? "Изменения проекта сохранены в демо"
        : "Демонстрационный проект создан",
    );
    setForm(null);
    setError("");
  }
  function toggleArchive(event: FormEvent) {
    event.preventDefault();
    if (!archive) return;
    if (reason.trim().length < 10) {
      setError("Укажите причину не короче 10 символов.");
      return;
    }
    const projectId = archive.id,
      archived = !archive.archived,
      explanation = reason.trim();
    update(
      (draft) => {
        const project = draft.projects.find((item) => item.id === projectId);
        if (!project) return;
        project.archived = archived;
        addAudit(
          draft,
          currentUser.id,
          archived ? "Проект архивирован" : "Проект возобновлён",
          project.name,
          explanation,
        );
      },
      archived ? "Проект переведён в архив" : "Приём отчётов возобновлён",
    );
    setArchive(null);
    setReason("");
    setError("");
  }
  return (
    <>
      <PageHeader
        eyebrow="Управление"
        title="Проекты"
        description="Правила тестирования, доступ модераторов и жизненный цикл проектов."
        actions={
          <button className="btn btn-primary" onClick={() => openEditor()}>
            + Создать проект
          </button>
        }
      />
      <div className="grid-3 mb-6">
        <div className="card p-5">
          <p className="muted text-sm">Всего проектов</p>
          <strong className="text-3xl">{state.projects.length}</strong>
        </div>
        <div className="card p-5">
          <p className="muted text-sm">Принимают отчёты</p>
          <strong className="text-3xl">
            {state.projects.filter((project) => !project.archived).length}
          </strong>
        </div>
        <div className="card p-5">
          <p className="muted text-sm">Назначений модераторов</p>
          <strong className="text-3xl">
            {state.projects.reduce(
              (sum, project) => sum + project.moderatorIds.length,
              0,
            )}
          </strong>
        </div>
      </div>

      {form && (
        <section className="card p-6 mb-6" aria-labelledby="project-form-title">
          <div className="row between mb-5">
            <h2 id="project-form-title" className="text-lg font-semibold">
              {form.id ? "Настройки проекта" : "Новый проект"}
            </h2>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setForm(null);
                setError("");
              }}
            >
              Закрыть
            </button>
          </div>
          <form onSubmit={saveProject} className="stack">
            <div className="grid-2">
              <label className="field">
                Название
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => change("name", event.target.value)}
                  maxLength={100}
                  required
                  placeholder="Например, Orbit Dashboard"
                />
              </label>
              <label className="field">
                Категория
                <select
                  className="select"
                  value={form.category}
                  onChange={(event) => change("category", event.target.value)}
                >
                  {[
                    "Веб-приложение",
                    "E-commerce",
                    "Продуктивность",
                    "Сообщество",
                    "Образование",
                    "Другое",
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Код отчётов
                <input
                  className="input mono"
                  value={form.code}
                  onChange={(event) =>
                    change("code", event.target.value.toUpperCase())
                  }
                  maxLength={8}
                  required
                  readOnly={!!form.id}
                  placeholder="ORB"
                />
                <small className="muted">
                  Код и адрес сохраняются после создания.
                </small>
              </label>
              <label className="field">
                Адрес в каталоге
                <input
                  className="input mono"
                  value={form.slug}
                  onChange={(event) =>
                    change("slug", event.target.value.toLowerCase())
                  }
                  maxLength={40}
                  required
                  readOnly={!!form.id}
                  placeholder="orbit-dashboard"
                />
              </label>
            </div>
            <label className="field">
              Описание
              <textarea
                className="textarea"
                value={form.description}
                onChange={(event) => change("description", event.target.value)}
                rows={3}
                maxLength={5000}
                required
                placeholder="Для чего создан проект и что в нём можно проверить"
              />
            </label>
            <label className="field">
              Адрес тестирования
              <input
                className="input"
                type="url"
                value={form.url}
                onChange={(event) => change("url", event.target.value)}
                required
                placeholder="https://example.com"
              />
              <small className="muted">
                В демо используйте синтетические адреса. BugTrail не проверяет
                сайт автоматически.
              </small>
            </label>
            <label className="field">
              Правила и границы проверки
              <textarea
                className="textarea"
                value={form.rules}
                onChange={(event) => change("rules", event.target.value)}
                rows={4}
                maxLength={10000}
                required
                placeholder="Разрешённые сценарии, тестовые данные и ограничения"
              />
            </label>
            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 font-medium text-sm">
                Модераторы проекта
              </legend>
              <div className="flex flex-wrap gap-4">
                {moderators.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 min-h-11 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.moderatorIds.includes(user.id)}
                      onChange={(event) =>
                        change(
                          "moderatorIds",
                          event.target.checked
                            ? [...form.moderatorIds, user.id]
                            : form.moderatorIds.filter((id) => id !== user.id),
                        )
                      }
                    />
                    {user.name}
                  </label>
                ))}
                {moderators.length === 0 && (
                  <p className="muted">
                    Активных модераторов пока нет. Отчёты обрабатывает
                    администратор.
                  </p>
                )}
              </div>
              {form.moderatorIds.length === 0 && (
                <p className="muted text-xs mt-2">
                  Без назначенного модератора очередь сопровождает
                  администратор.
                </p>
              )}
            </fieldset>
            <label className="field">
              Причина для журнала
              <input
                className="input"
                value={form.reason}
                onChange={(event) => change("reason", event.target.value)}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Например, начинаем открытое тестирование нового интерфейса"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row gap-3">
              <button className="btn btn-primary" type="submit">
                Сохранить проект
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setForm(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      )}

      {archive && (
        <section
          className="card p-6 mb-6 border-amber-200"
          aria-labelledby="archive-title"
        >
          <h2 id="archive-title" className="text-lg font-semibold">
            {archive.archived ? "Возобновить проект" : "Архивировать проект"} «
            {archive.name}»?
          </h2>
          <p className="muted text-sm mt-2 mb-4">
            {archive.archived
              ? "Пользователи снова смогут отправлять отчёты и обсуждать ошибки."
              : "История останется доступной. Новые отчёты, изменения и комментарии будут недоступны."}
          </p>
          <form className="stack" onSubmit={toggleArchive}>
            <label className="field">
              Причина
              <textarea
                className="textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={10}
                maxLength={2000}
                required
                rows={2}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row gap-3">
              <button className="btn btn-primary" type="submit">
                {archive.archived ? "Возобновить" : "Архивировать"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setArchive(null);
                  setError("");
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="toolbar p-4 border-b border-slate-100">
          <label className="field flex-1">
            <span className="sr-only">Найти проект</span>
            <input
              className="input"
              type="search"
              placeholder="Найти проект по названию или коду..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="sr-only">Состояние проекта</span>
            <select
              className="select"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Все состояния</option>
              <option value="active">Активные</option>
              <option value="archived">Архивные</option>
            </select>
          </label>
        </div>
        {projects.length ? (
          <div className="divide-y divide-slate-100">
            {projects.map((project) => (
              <article
                key={project.id}
                className="p-5 flex flex-col xl:flex-row xl:items-center gap-4"
              >
                <div className="flex gap-4 flex-1 min-w-0">
                  <span
                    className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: project.color }}
                  >
                    {project.code.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <div className="row gap-2">
                      <Link
                        href={"/projects/" + project.slug}
                        className="font-semibold hover:text-indigo-600"
                      >
                        {project.name}
                      </Link>
                      <span
                        className={
                          "badge " +
                          (project.archived
                            ? "bg-slate-100 text-slate-500"
                            : "bg-emerald-50 text-emerald-700")
                        }
                      >
                        {project.archived ? "В архиве" : "Активен"}
                      </span>
                    </div>
                    <p className="text-sm muted mt-1">{project.description}</p>
                    <p className="text-xs muted mt-2">
                      {project.code} ·{" "}
                      {
                        state.reports.filter(
                          (report) =>
                            report.projectId === project.id &&
                            report.status !== "DRAFT",
                        ).length
                      }{" "}
                      отчётов ·{" "}
                      {project.moderatorIds.length
                        ? project.moderatorIds
                            .map(
                              (id) =>
                                state.users.find((user) => user.id === id)
                                  ?.name,
                            )
                            .filter(Boolean)
                            .join(", ")
                        : "Обрабатывает администратор"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEditor(project)}
                  >
                    Настроить
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setArchive(project);
                      setForm(null);
                      setReason("");
                      setError("");
                    }}
                  >
                    {project.archived ? "Возобновить" : "В архив"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Проекты не найдены"
            description="Измените поисковый запрос или выберите другое состояние."
          />
        )}
      </section>
    </>
  );
}

function releaseAssignments(draft: DemoState, userId: string, actorId: string) {
  const user = draft.users.find((item) => item.id === userId);
  if (!user) return;
  if (user.blocked || user.role !== "MODERATOR")
    draft.projects.forEach((project) => {
      project.moderatorIds = project.moderatorIds.filter((id) => id !== userId);
    });
  draft.reports.forEach((report) => {
    if (report.assigneeId !== userId) return;
    const project = draft.projects.find((item) => item.id === report.projectId);
    const stillEligible =
      !user.blocked &&
      (user.role === "ADMIN" ||
        (user.role === "MODERATOR" &&
          !!project?.moderatorIds.includes(userId)));
    if (!stillEligible) {
      report.assigneeId = undefined;
      report.events.push({
        id: uid(),
        title: "Ответственный снят",
        detail: "Изменились роль или состояние аккаунта.",
        actorId,
        createdAt: timestamp(),
      });
    }
  });
}

export function AdminUsers() {
  const { state, currentUser, update } = useDemo();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pending, setPending] = useState<{
    userId: string;
    action: "role" | "block";
    nextRole: Role;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (currentUser.role !== "ADMIN" || currentUser.blocked)
    return <AccessDenied />;
  const users = state.users.filter(
    (user) =>
      (roleFilter === "all" || user.role === roleFilter) &&
      (user.name + " " + user.handle + " " + user.email)
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  const target = state.users.find((user) => user.id === pending?.userId);
  function openAction(
    userId: string,
    action: "role" | "block",
    nextRole: Role,
  ) {
    setPending({ userId, action, nextRole });
    setReason("");
    setError("");
  }
  function saveAction(event: FormEvent) {
    event.preventDefault();
    if (!pending || !target) return;
    if (reason.trim().length < 10) {
      setError("Объясните решение: не менее 10 символов.");
      return;
    }
    if (target.id === currentUser.id) {
      setError("Измените текущего администратора из другого профиля.");
      return;
    }
    const activeAdmins = state.users.filter(
      (user) => user.role === "ADMIN" && !user.blocked,
    ).length;
    const removesAdmin =
      target.role === "ADMIN" &&
      !target.blocked &&
      ((pending.action === "role" && pending.nextRole !== "ADMIN") ||
        (pending.action === "block" && !target.blocked));
    if (removesAdmin && activeAdmins <= 1) {
      setError("Нельзя лишить доступа последнего активного администратора.");
      return;
    }
    const command = pending,
      explanation = reason.trim();
    update((draft) => {
      const user = draft.users.find((item) => item.id === command.userId);
      if (!user) return;
      if (command.action === "role") {
        const oldRole = user.role;
        user.role = command.nextRole;
        releaseAssignments(draft, user.id, currentUser.id);
        addAudit(
          draft,
          currentUser.id,
          "Изменена роль",
          user.name,
          roles[oldRole] + " → " + roles[user.role] + ". " + explanation,
        );
      } else {
        user.blocked = !user.blocked;
        releaseAssignments(draft, user.id, currentUser.id);
        addAudit(
          draft,
          currentUser.id,
          user.blocked ? "Аккаунт заблокирован" : "Аккаунт разблокирован",
          user.name,
          explanation,
        );
      }
    }, "Изменения участника сохранены в демо");
    setPending(null);
    setReason("");
    setError("");
  }
  return (
    <>
      <PageHeader
        eyebrow="Управление"
        title="Участники"
        description="Роли и доступ к демонстрационному пространству. Каждое изменение попадает в аудит."
      />
      <div className="notice mb-6">
        <strong>Три роли — понятные границы.</strong> Пользователи отправляют
        отчёты, модераторы ведут назначенные проекты, администраторы управляют
        платформой. В этой версии права показывают только поведение интерфейса.
      </div>

      {pending && target && (
        <section className="card p-6 mb-6" aria-labelledby="user-action-title">
          <div className="row between mb-4">
            <div>
              <p className="eyebrow">Изменение доступа</p>
              <h2 id="user-action-title" className="text-lg font-semibold">
                {target.name}
              </h2>
              <p className="muted text-sm">@{target.handle}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => setPending(null)}>
              Закрыть
            </button>
          </div>
          <form className="stack" onSubmit={saveAction}>
            {pending.action === "role" ? (
              <label className="field">
                Новая роль
                <select
                  className="select"
                  value={pending.nextRole}
                  onChange={(event) =>
                    setPending({
                      ...pending,
                      nextRole: event.target.value as Role,
                    })
                  }
                >
                  {Object.entries(roles).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm">
                {target.blocked
                  ? "Участник снова появится в рейтинге и сможет работать с отчётами в демо."
                  : "Участник исчезнет из рейтинга. Его публикации и подтверждённый вклад останутся в истории."}
              </p>
            )}
            {pending.action === "role" && (
              <p className="muted text-sm">
                Несовместимые назначения будут сняты. Изменение роли не
                переписывает ранее подтверждённый вклад.
              </p>
            )}
            <label className="field">
              Причина решения
              <textarea
                className="textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                minLength={10}
                maxLength={2000}
                required
                placeholder="Укажите причину для журнала действий"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row gap-3">
              <button
                className={
                  "btn " +
                  (pending.action === "block" && !target.blocked
                    ? "btn-danger"
                    : "btn-primary")
                }
                type="submit"
              >
                {pending.action === "role"
                  ? "Изменить роль"
                  : target.blocked
                    ? "Разблокировать"
                    : "Заблокировать"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setPending(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="toolbar p-4 border-b border-slate-100">
          <label className="field flex-1">
            <span className="sr-only">Найти участника</span>
            <input
              className="input"
              type="search"
              placeholder="Имя, псевдоним или email..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="sr-only">Роль участника</span>
            <select
              className="select"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">Все роли</option>
              {Object.entries(roles).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {users.length ? (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <article
                key={user.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <div className="row gap-2 flex-wrap">
                      <Link
                        className="font-semibold hover:text-indigo-600"
                        href={"/profile/" + user.handle}
                      >
                        {user.name}
                      </Link>
                      {user.id === currentUser.id && (
                        <span className="badge bg-indigo-50 text-indigo-700">
                          Вы
                        </span>
                      )}
                    </div>
                    <p className="muted text-xs mt-1 break-all">
                      @{user.handle} · {user.email}
                    </p>
                  </div>
                </div>
                <div className="row gap-2 flex-wrap">
                  <span className="badge bg-slate-100 text-slate-600">
                    {roles[user.role]}
                  </span>
                  <span
                    className={
                      "badge " +
                      (user.blocked
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700")
                    }
                  >
                    {user.blocked ? "Заблокирован" : "Активен"}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn btn-secondary"
                    disabled={user.id === currentUser.id}
                    title={
                      user.id === currentUser.id
                        ? "Текущий профиль изменяется из другой сессии"
                        : undefined
                    }
                    onClick={() => openAction(user.id, "role", user.role)}
                  >
                    Изменить роль
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={user.id === currentUser.id}
                    onClick={() => openAction(user.id, "block", user.role)}
                  >
                    {user.blocked ? "Разблокировать" : "Заблокировать"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Никого не нашли"
            description="Попробуйте другой запрос или выберите все роли."
          />
        )}
        <div className="p-4 bg-slate-50 text-xs muted border-t border-slate-100">
          Текущий администратор защищён от изменения собственной роли и
          блокировки. Последний активный администратор всегда сохраняется.
        </div>
      </section>
    </>
  );
}

export function AdminAudit() {
  const { state, currentUser } = useDemo();
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  if (currentUser.role !== "ADMIN" || currentUser.blocked)
    return <AccessDenied />;
  const actions = Array.from(new Set(state.audit.map((entry) => entry.action)));
  const entries = state.audit.filter(
    (entry) =>
      (actionFilter === "all" || entry.action === actionFilter) &&
      (
        entry.action +
        " " +
        entry.target +
        " " +
        entry.reason +
        " " +
        state.users.find((user) => user.id === entry.actorId)?.name
      )
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  return (
    <>
      <PageHeader
        eyebrow="Управление"
        title="Журнал действий"
        description="История решений, влияющих на проекты, роли и доступ участников."
      />
      <div className="flex items-center gap-3 mb-6">
        <span className="badge bg-indigo-50 text-indigo-700">
          {state.audit.length} событий
        </span>
        <span className="muted text-sm">Новые действия появляются сверху</span>
      </div>
      <section className="card overflow-hidden">
        <div className="toolbar p-4 border-b border-slate-100">
          <label className="field flex-1">
            <span className="sr-only">Поиск по журналу</span>
            <input
              className="input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Действие, участник, объект или причина..."
            />
          </label>
          <label className="field">
            <span className="sr-only">Тип события</span>
            <select
              className="select"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              <option value="all">Все действия</option>
              {actions.map((action) => (
                <option key={action}>{action}</option>
              ))}
            </select>
          </label>
        </div>
        {entries.length ? (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const actor = state.users.find(
                (user) => user.id === entry.actorId,
              );
              return (
                <article key={entry.id} className="p-5 flex gap-4">
                  <div
                    className="w-9 h-9 shrink-0 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-base"
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-semibold text-sm">{entry.action}</h2>
                      <time
                        className="muted text-xs"
                        dateTime={entry.createdAt}
                      >
                        {shortDate(entry.createdAt)} ·{" "}
                        {new Intl.DateTimeFormat("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        }).format(new Date(entry.createdAt))}{" "}
                        UTC
                      </time>
                    </div>
                    <p className="text-sm mt-1">{entry.target}</p>
                    <p className="muted text-sm mt-2 break-words">
                      {entry.reason}
                    </p>
                    <p className="text-xs muted mt-3">
                      Выполнил: {actor?.name ?? "Участник"}
                      {actor ? " · @" + actor.handle : ""}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={
              state.audit.length ? "События не найдены" : "Журнал пока пуст"
            }
            description={
              state.audit.length
                ? "Измените фильтры или поисковый запрос."
                : "Измените проект или роль участника — действие появится здесь."
            }
          />
        )}
      </section>
      <p className="muted text-xs mt-4">
        Это локальная история демонстрационных действий. Защищённый серверный
        аудит появится на этапе backend.
      </p>
    </>
  );
}
