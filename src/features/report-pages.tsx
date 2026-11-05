"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useDemo } from "@/demo/store";
import {
  activeStatuses,
  addAudit,
  canModerate,
  canView,
  categories,
  Priority,
  Report,
  reportCode,
  rewarded,
  Severity,
  severities,
  shortDate,
  Status,
  timestamp,
  uid,
} from "@/demo/model";
import {
  Avatar,
  EmptyState,
  PageHeader,
  SeverityBadge,
  StatusBadge,
} from "@/components/ui";

type Action =
  | "confirm"
  | "request-info"
  | "reject"
  | "duplicate"
  | "start"
  | "resolve"
  | "return"
  | "reopen"
  | "reset"
  | "hide"
  | "restore";
const actionLabels: Record<Action, string> = {
  confirm: "Подтвердить ошибку",
  "request-info": "Запросить уточнение",
  reject: "Отклонить отчёт",
  duplicate: "Отметить дубликатом",
  start: "Взять в работу",
  resolve: "Отметить исправленным",
  return: "Вернуть в подтверждённые",
  reopen: "Открыть повторно",
  reset: "Отправить на перепроверку",
  hide: "Скрыть отчёт",
  restore: "Восстановить видимость",
};
const allowedFrom: Record<Action, Status[]> = {
  confirm: ["SUBMITTED", "NEEDS_INFO"],
  "request-info": ["SUBMITTED", "NEEDS_INFO"],
  reject: ["SUBMITTED", "NEEDS_INFO"],
  duplicate: ["SUBMITTED", "NEEDS_INFO"],
  start: ["CONFIRMED"],
  resolve: ["CONFIRMED", "IN_PROGRESS"],
  return: ["IN_PROGRESS"],
  reopen: ["RESOLVED"],
  reset: ["CONFIRMED", "IN_PROGRESS", "RESOLVED", "REJECTED", "DUPLICATE"],
  hide: [
    "SUBMITTED",
    "NEEDS_INFO",
    "CONFIRMED",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
    "DUPLICATE",
  ],
  restore: [
    "SUBMITTED",
    "NEEDS_INFO",
    "CONFIRMED",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
    "DUPLICATE",
  ],
};
const deletedComment = "Комментарий удалён автором.";

export function ReportDetail({ id }: { id: string }) {
  const { state, currentUser, update } = useDemo();
  const [tab, setTab] = useState("description");
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [originalId, setOriginalId] = useState("");
  const [severity, setSeverity] = useState<Severity>("MEDIUM");
  const [priority, setPriority] = useState<Priority>("P2");
  const [actionError, setActionError] = useState("");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [hideComment, setHideComment] = useState<string | null>(null);
  const [commentReason, setCommentReason] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const report = state.reports.find((r) => r.id === id);
  if (!report || !canView(state, currentUser, report))
    return (
      <EmptyState
        title="Отчёт недоступен"
        description="Он удалён, находится в чужих черновиках или скрыт от этого профиля."
        action={
          <Link className="btn btn-primary" href="/reports">
            К списку отчётов
          </Link>
        }
      />
    );
  const project = state.projects.find((p) => p.id === report.projectId);
  if (!project) return <EmptyState title="Проект не найден" />;
  const author = state.users.find((u) => u.id === report.authorId)!;
  const moderator = canModerate(state, currentUser, report);
  const editable =
    report.authorId === currentUser.id &&
    ["DRAFT", "NEEDS_INFO"].includes(report.status) &&
    !project.archived &&
    !currentUser.blocked;
  const canComment =
    !currentUser.blocked && !project.archived && report.status !== "DRAFT";
  const canonical =
    report.duplicateOfId &&
    state.reports.find((r) => r.id === report.duplicateOfId);
  const originals = state.reports.filter(
    (r) =>
      r.id !== report.id &&
      r.projectId === report.projectId &&
      activeStatuses.includes(r.status) &&
      !r.hidden &&
      !r.duplicateOfId,
  );

  function openAction(value: Action) {
    setAction(value);
    setReason("");
    setActionError("");
    setOriginalId("");
    setSeverity(report!.severity);
    setPriority(report!.priority);
  }

  function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!action || !report || !project || !moderator) return;
    if (!allowedFrom[action].includes(report.status)) {
      setActionError(
        "Состояние отчёта изменилось. Выберите доступное действие заново.",
      );
      return;
    }
    if (reason.trim().length < 10) {
      setActionError("Опишите причину: не менее 10 символов.");
      return;
    }
    if (reason.length > 2000) {
      setActionError("Сократите причину до 2000 символов.");
      return;
    }
    if (project.archived && action !== "hide" && action !== "restore") {
      setActionError("Проект в архиве. Рабочие изменения недоступны.");
      return;
    }
    if (action === "duplicate" && !originals.some((r) => r.id === originalId)) {
      setActionError("Выберите подтверждённый оригинал в этом проекте.");
      return;
    }
    if (
      action === "reset" &&
      state.reports.some((r) => r.duplicateOfId === report.id)
    ) {
      setActionError(
        "На отчёт ссылаются дубликаты. Сначала отправьте их на перепроверку.",
      );
      return;
    }
    const expectedStatus = report.status;
    const note = reason.trim();
    const command = action;
    update((draft) => {
      const target = draft.reports.find((r) => r.id === id);
      if (
        !target ||
        target.status !== expectedStatus ||
        !canModerate(draft, currentUser, target)
      )
        return;
      const before = rewarded(target);
      const nextStatuses: Partial<Record<Action, Status>> = {
        confirm: "CONFIRMED",
        "request-info": "NEEDS_INFO",
        reject: "REJECTED",
        duplicate: "DUPLICATE",
        start: "IN_PROGRESS",
        resolve: "RESOLVED",
        return: "CONFIRMED",
        reopen: "CONFIRMED",
        reset: "SUBMITTED",
      };
      if (nextStatuses[command]) target.status = nextStatuses[command]!;
      if (command === "confirm") {
        target.severity = severity;
        target.priority = priority;
      }
      if (command === "duplicate") target.duplicateOfId = originalId;
      if (command === "reset") {
        target.duplicateOfId = undefined;
        target.assigneeId = undefined;
      }
      if (command === "start") target.assigneeId = currentUser.id;
      if (command === "return") target.assigneeId = undefined;
      if (command === "request-info")
        target.comments.push({
          id: uid(),
          authorId: currentUser.id,
          body: note,
          createdAt: timestamp(),
        });
      if (command === "hide") target.hidden = true;
      if (command === "restore") target.hidden = false;
      target.updatedAt = timestamp();
      const after = rewarded(target);
      const rewardNote =
        !before && after
          ? " Право на 10 очков активно."
          : before && !after
            ? " Награда отменена: −10 очков."
            : "";
      target.events.push({
        id: uid(),
        title: actionLabels[command],
        detail: note + rewardNote,
        actorId: currentUser.id,
        createdAt: timestamp(),
      });
      draft.notifications.unshift({
        id: uid(),
        userId: target.authorId,
        title: actionLabels[command],
        description: note + rewardNote,
        reportId: id,
        read: false,
        createdAt: timestamp(),
      });
      addAudit(
        draft,
        currentUser.id,
        actionLabels[command],
        reportCode(draft, target),
        note,
      );
    }, actionLabels[command] + ". Изменение сохранено в демо.");
    setAction(null);
  }

  function sendComment(event: FormEvent) {
    event.preventDefault();
    const text = comment.trim();
    if (!canComment) return;
    if (!text || text.length > 3000) {
      setCommentError("Напишите комментарий длиной от 1 до 3000 символов.");
      return;
    }
    update(
      (draft) => {
        const target = draft.reports.find((r) => r.id === id)!;
        if (editingComment) {
          const found = target.comments.find(
            (c) => c.id === editingComment && c.authorId === currentUser.id,
          );
          if (
            found &&
            Date.now() - new Date(found.createdAt).getTime() < 15 * 60 * 1000
          )
            found.body = text;
        } else {
          target.comments.push({
            id: uid(),
            authorId: currentUser.id,
            body: text,
            createdAt: timestamp(),
          });
          if (target.authorId !== currentUser.id)
            draft.notifications.unshift({
              id: uid(),
              userId: target.authorId,
              title: "Новый комментарий",
              description: text.slice(0, 150),
              reportId: id,
              read: false,
              createdAt: timestamp(),
            });
        }
      },
      editingComment ? "Комментарий изменён" : "Комментарий добавлен",
    );
    setComment("");
    setCommentError("");
    setEditingComment(null);
  }

  function hideSelectedComment() {
    if (!hideComment || commentReason.trim().length < 10 || !moderator) return;
    update((draft) => {
      const target = draft.reports.find((r) => r.id === id)!;
      const found = target.comments.find((c) => c.id === hideComment);
      if (found && found.authorId !== currentUser.id) {
        found.hidden = !found.hidden;
        addAudit(
          draft,
          currentUser.id,
          found.hidden ? "Комментарий скрыт" : "Комментарий восстановлен",
          reportCode(draft, target),
          commentReason.trim(),
        );
      }
    }, "Видимость комментария изменена");
    setHideComment(null);
    setCommentReason("");
  }

  const actions: Action[] = [];
  if (moderator && !project.archived) {
    if (["SUBMITTED", "NEEDS_INFO"].includes(report.status))
      actions.push("confirm", "request-info", "duplicate", "reject");
    if (report.status === "CONFIRMED") actions.push("start", "resolve");
    if (report.status === "IN_PROGRESS") actions.push("resolve", "return");
    if (report.status === "RESOLVED") actions.push("reopen");
    if (
      [
        "CONFIRMED",
        "IN_PROGRESS",
        "RESOLVED",
        "REJECTED",
        "DUPLICATE",
      ].includes(report.status)
    )
      actions.push("reset");
  }
  if (moderator && report.status !== "DRAFT")
    actions.push(report.hidden ? "restore" : "hide");

  return (
    <div className="stack">
      <div className="row muted text-sm">
        <Link href="/reports" className="link">
          Отчёты
        </Link>
        <span>/</span>
        <Link className="link" href={"/projects/" + project.slug}>
          {project.name}
        </Link>
        <span>/</span>
        <span className="mono">{reportCode(state, report)}</span>
      </div>
      <PageHeader
        eyebrow={reportCode(state, report)}
        title={report.title || "Черновик без названия"}
        description={
          "Создан " +
          shortDate(report.createdAt) +
          " · обновлён " +
          shortDate(report.updatedAt)
        }
        actions={
          editable ? (
            <Link className="btn btn-primary" href={"/reports/" + id + "/edit"}>
              {report.status === "NEEDS_INFO"
                ? "Дополнить отчёт"
                : "Продолжить черновик"}
            </Link>
          ) : undefined
        }
      />
      {project.archived && (
        <div className="notice">
          Проект в архиве. Отчёт доступен только для чтения.
        </div>
      )}
      {report.hidden && (
        <div className="notice">
          Отчёт скрыт. Его видят автор и уполномоченные сотрудники. Действующая
          награда временно отозвана.
        </div>
      )}
      {report.status === "NEEDS_INFO" && (
        <div className="notice">
          <strong>Модератор ждёт уточнений.</strong> Прочитайте обсуждение,
          дополните данные и отправьте отчёт повторно.
        </div>
      )}
      {canonical && (
        <div className="notice">
          Этот отчёт отмечен дубликатом.{" "}
          {canView(state, currentUser, canonical) ? (
            <Link
              className="link font-semibold"
              href={"/reports/" + canonical.id}
            >
              Открыть оригинал {reportCode(state, canonical)} →
            </Link>
          ) : (
            "Оригинал сейчас недоступен."
          )}
        </div>
      )}
      <div className="detail-grid">
        <main className="stack min-w-0">
          <div className="card">
            <div className="tabs" aria-label="Разделы отчёта">
              {[
                ["description", "Описание"],
                ["comments", "Обсуждение · " + report.comments.length],
                ["history", "История · " + report.events.length],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={"tab " + (tab === value ? "active" : "")}
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === "description" && (
                <div className="stack">
                  {report.description && (
                    <section>
                      <h2 className="font-semibold mb-3">Описание проблемы</h2>
                      <p className="whitespace-pre-wrap text-slate-600 leading-7">
                        {report.description}
                      </p>
                    </section>
                  )}
                  <section>
                    <h2 className="font-semibold mb-3">Шаги воспроизведения</h2>
                    {report.steps.length ? (
                      <ol className="list-decimal pl-5 space-y-3 text-slate-600">
                        {report.steps.map((step, i) => (
                          <li key={i} className="pl-2">
                            {step}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="muted">Шаги ещё не заполнены.</p>
                    )}
                  </section>
                  <div className="grid-2">
                    <section className="rounded-lg bg-emerald-50 p-4">
                      <h2 className="font-semibold text-emerald-900 mb-2">
                        Ожидаемый результат
                      </h2>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-emerald-900">
                        {report.expected || "Не заполнен"}
                      </p>
                    </section>
                    <section className="rounded-lg bg-rose-50 p-4">
                      <h2 className="font-semibold text-rose-900 mb-2">
                        Фактический результат
                      </h2>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-rose-900">
                        {report.actual || "Не заполнен"}
                      </p>
                    </section>
                  </div>
                  <section>
                    <h2 className="font-semibold mb-3">Окружение</h2>
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm mono break-words">
                      {report.environment || "Не указано"}
                    </p>
                  </section>
                  <section>
                    <h2 className="font-semibold mb-3">
                      Вложения{" "}
                      <span className="muted font-normal">
                        · {report.attachments.length}
                      </span>
                    </h2>
                    {report.attachments.length ? (
                      <div className="grid-2">
                        {report.attachments.map((file) => (
                          <figure
                            key={file.id}
                            className="rounded-lg border border-slate-200 overflow-hidden"
                          >
                            <LocalImage src={file.url} name={file.name} />
                            <figcaption className="px-3 py-2 text-xs muted truncate">
                              {file.name}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <p className="muted text-sm">
                        Изображений нет. Для этого отчёта достаточно описания
                        шагов.
                      </p>
                    )}
                  </section>
                </div>
              )}
              {tab === "comments" && (
                <div className="stack">
                  {report.comments.length ? (
                    report.comments.map((item) => {
                      const user = state.users.find(
                        (u) => u.id === item.authorId,
                      )!;
                      const age = clock - new Date(item.createdAt).getTime();
                      const ownRecent =
                        item.body !== deletedComment &&
                        item.authorId === currentUser.id &&
                        age >= 0 &&
                        age < 15 * 60 * 1000;
                      return (
                        <article
                          key={item.id}
                          className="border-b border-slate-100 pb-5 last:border-0"
                        >
                          <div className="row mb-3">
                            <Avatar user={user} />
                            <div>
                              <strong className="text-sm">{user.name}</strong>
                              <div className="text-xs muted">
                                {shortDate(item.createdAt)}
                              </div>
                            </div>
                          </div>
                          <p
                            className={
                              "whitespace-pre-wrap leading-7 text-sm " +
                              (item.hidden ? "muted italic" : "text-slate-600")
                            }
                          >
                            {item.hidden
                              ? "Комментарий скрыт сотрудником."
                              : item.body}
                          </p>
                          {!project.archived && (
                            <div className="row mt-2 text-xs">
                              {ownRecent && !item.hidden && (
                                <>
                                  <button
                                    className="link"
                                    onClick={() => {
                                      setEditingComment(item.id);
                                      setComment(item.body);
                                      setCommentError("");
                                    }}
                                  >
                                    Изменить
                                  </button>
                                  <button
                                    className="link text-rose-600"
                                    onClick={() =>
                                      update((draft) => {
                                        const target = draft.reports.find(
                                          (r) => r.id === id,
                                        )!;
                                        const found = target.comments.find(
                                          (c) => c.id === item.id,
                                        );
                                        if (found) found.body = deletedComment;
                                      }, "Комментарий удалён")
                                    }
                                  >
                                    Удалить
                                  </button>
                                </>
                              )}
                              {moderator &&
                                item.authorId !== currentUser.id && (
                                  <button
                                    className="link"
                                    onClick={() => {
                                      setHideComment(item.id);
                                      setCommentReason("");
                                    }}
                                  >
                                    {item.hidden ? "Восстановить" : "Скрыть"}
                                  </button>
                                )}
                            </div>
                          )}
                          {hideComment === item.id && (
                            <div className="mt-3 stack">
                              <label className="field">
                                Причина модерации
                                <input
                                  className="input"
                                  minLength={10}
                                  maxLength={2000}
                                  value={commentReason}
                                  onChange={(e) =>
                                    setCommentReason(e.target.value)
                                  }
                                  placeholder="Не менее 10 символов"
                                />
                              </label>
                              <div className="row">
                                <button
                                  className="btn btn-secondary"
                                  disabled={commentReason.trim().length < 10}
                                  onClick={hideSelectedComment}
                                >
                                  Сохранить решение
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => setHideComment(null)}
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="Обсуждение ещё не началось"
                      description="Уточните детали или поделитесь результатом проверки."
                    />
                  )}
                  {canComment ? (
                    <form onSubmit={sendComment} className="stack">
                      <label className="field">
                        {editingComment
                          ? "Редактирование комментария"
                          : "Ваш комментарий"}
                        <textarea
                          className="textarea"
                          value={comment}
                          maxLength={3000}
                          onChange={(e) => setComment(e.target.value)}
                          rows={4}
                          placeholder="Добавьте полезные детали. Не публикуйте пароли и личные данные."
                        />
                      </label>
                      {commentError && (
                        <p role="alert" className="form-error">
                          {commentError}
                        </p>
                      )}
                      <div className="row">
                        <button className="btn btn-primary" type="submit">
                          {editingComment
                            ? "Сохранить"
                            : "Отправить комментарий"}
                        </button>
                        {editingComment && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingComment(null);
                              setComment("");
                            }}
                          >
                            Отмена
                          </button>
                        )}
                      </div>
                      <p className="text-xs muted">
                        Комментарии не приносят очков. Свой комментарий можно
                        изменить в течение 15 минут.
                      </p>
                    </form>
                  ) : (
                    <p className="muted text-sm">
                      Для этого отчёта обсуждение недоступно.
                    </p>
                  )}
                </div>
              )}
              {tab === "history" && (
                <div className="stack">
                  {[...report.events].reverse().map((item) => (
                    <article
                      key={item.id}
                      className="flex gap-4 border-l-2 border-indigo-100 pl-5 py-1"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                        <p className="text-sm muted mt-1 whitespace-pre-wrap">
                          {item.detail}
                        </p>
                        <p className="text-xs muted mt-2">
                          {state.users.find((u) => u.id === item.actorId)?.name}{" "}
                          · {shortDate(item.createdAt)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
          {action && (
            <form onSubmit={submitAction} className="card p-6 stack">
              <div>
                <h2 className="font-semibold text-lg">
                  {actionLabels[action]}
                </h2>
                <p className="muted text-sm mt-1">
                  Решение изменит только локальные демонстрационные данные.
                </p>
              </div>
              {action === "confirm" && (
                <div className="grid-2">
                  <label className="field">
                    Серьёзность
                    <select
                      className="select"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as Severity)}
                    >
                      {Object.entries(severities).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Приоритет
                    <select
                      className="select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                    >
                      {["P0", "P1", "P2", "P3"].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {action === "duplicate" && (
                <label className="field">
                  Канонический оригинал
                  <select
                    className="select"
                    value={originalId}
                    onChange={(e) => setOriginalId(e.target.value)}
                  >
                    <option value="">Выберите оригинальный отчёт</option>
                    {originals.map((r) => (
                      <option value={r.id} key={r.id}>
                        {reportCode(state, r)} · {r.title}
                      </option>
                    ))}
                  </select>
                  {!originals.length && (
                    <span className="muted text-sm">
                      В этом проекте пока нет подходящего оригинала.
                    </span>
                  )}
                </label>
              )}
              <label className="field">
                {action === "request-info"
                  ? "Что нужно уточнить?"
                  : action === "resolve"
                    ? "Как проверено исправление?"
                    : "Причина решения"}
                <textarea
                  className="textarea"
                  value={reason}
                  maxLength={2000}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Кратко и конкретно, не менее 10 символов"
                />
              </label>
              {actionError && (
                <p className="form-error" role="alert">
                  {actionError}
                </p>
              )}
              <div className="row">
                <button
                  className={
                    "btn " +
                    (["reject", "hide"].includes(action)
                      ? "btn-danger"
                      : "btn-primary")
                  }
                  type="submit"
                >
                  Сохранить решение
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setAction(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </main>
        <aside className="stack">
          <section className="card p-5 stack">
            <h2 className="font-semibold text-sm">Сведения об отчёте</h2>
            <div className="row between">
              <span className="muted text-sm">Статус</span>
              <StatusBadge status={report.status} />
            </div>
            <div className="row between">
              <span className="muted text-sm">Серьёзность</span>
              <SeverityBadge severity={report.severity} />
            </div>
            <div className="row between">
              <span className="muted text-sm">Приоритет</span>
              <span className="badge mono">{report.priority}</span>
            </div>
            <div className="row between">
              <span className="muted text-sm">Категория</span>
              <span className="text-sm">
                {categories[report.category] ?? report.category}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs muted mb-2">АВТОР</p>
              <Link className="row link" href={"/profile/" + author.handle}>
                <Avatar user={author} />
                <span className="text-sm font-medium">{author.name}</span>
              </Link>
            </div>
            <div>
              <p className="text-xs muted mb-2">ПРОЕКТ</p>
              <Link
                className="link font-medium text-sm"
                href={"/projects/" + project.slug}
              >
                {project.name} →
              </Link>
            </div>
            {report.assigneeId && (
              <div>
                <p className="text-xs muted mb-2">ОТВЕТСТВЕННЫЙ</p>
                <span className="text-sm">
                  {state.users.find((u) => u.id === report.assigneeId)?.name ??
                    "Не назначен"}
                </span>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
            <h2 className="font-semibold text-sm text-indigo-900">
              {rewarded(report)
                ? "Полезный вклад · 10 очков"
                : "Награда за полезный вклад"}
            </h2>
            <p className="text-sm leading-6 text-indigo-800 mt-2">
              {rewarded(report)
                ? "Отчёт подтверждён и учитывается в рейтинге. Повторное открытие не добавит очков."
                : report.roleAtSubmission && report.roleAtSubmission !== "USER"
                  ? "Отчёты сотрудников помогают проекту, но не участвуют в рейтинге."
                  : "10 очков начисляются после независимого подтверждения уникального бага."}
            </p>
            <Link
              className="text-sm font-semibold link inline-block mt-3"
              href="/leaderboard"
            >
              Как устроен рейтинг →
            </Link>
          </section>
          {actions.length > 0 && (
            <section className="card p-5 stack">
              <div>
                <h2 className="font-semibold text-sm">Работа с отчётом</h2>
                <p className="text-xs muted mt-1">
                  Действия демонстрационного сотрудника
                </p>
              </div>
              {actions.map((value) => (
                <button
                  key={value}
                  className={
                    "btn w-full " +
                    (value === "confirm" || value === "resolve"
                      ? "btn-primary"
                      : "btn-secondary")
                  }
                  onClick={() => openAction(value)}
                >
                  {actionLabels[value]}
                </button>
              ))}
            </section>
          )}
          {currentUser.role !== "USER" &&
            report.authorId === currentUser.id && (
              <div className="notice text-sm">
                Свой отчёт проверяет другой сотрудник.
              </div>
            )}
        </aside>
      </div>
    </div>
  );
}

function LocalImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="bg-slate-50 p-6 text-sm muted">
        Предпросмотр доступен в той вкладке, где добавлено изображение.
      </div>
    );
  return (
    // Локальный предпросмотр не отправляется на сервер.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="max-h-80 w-full object-contain bg-slate-50"
    />
  );
}

export function ReportEditor({
  id,
  projectId,
}: {
  id?: string;
  projectId?: string;
}) {
  const { state, currentUser } = useDemo();
  const report = id ? state.reports.find((r) => r.id === id) : undefined;
  if (id && (!report || report.authorId !== currentUser.id))
    return (
      <EmptyState
        title="Черновик недоступен"
        description="Редактировать можно только собственные отчёты."
        action={
          <Link className="btn btn-primary" href="/me/reports">
            Мои отчёты
          </Link>
        }
      />
    );
  if (report && !["DRAFT", "NEEDS_INFO"].includes(report.status))
    return (
      <EmptyState
        title="Отчёт уже отправлен"
        description="После отправки текст меняется только по запросу уточнений."
        action={
          <Link className="btn btn-primary" href={"/reports/" + report.id}>
            Открыть отчёт
          </Link>
        }
      />
    );
  if (report && state.projects.find((p) => p.id === report.projectId)?.archived)
    return (
      <EmptyState
        title="Проект в архиве"
        description="Изменения отчётов остановлены."
        action={
          <Link className="btn btn-primary" href={"/reports/" + report.id}>
            К отчёту
          </Link>
        }
      />
    );
  return (
    <EditorForm
      key={id ?? projectId ?? "new"}
      initial={report}
      projectId={projectId}
    />
  );
}

function EditorForm({
  initial,
  projectId,
}: {
  initial?: Report;
  projectId?: string;
}) {
  const { state, currentUser, update } = useDemo();
  const router = useRouter();
  const [project, setProject] = useState(
    initial?.projectId ??
      projectId ??
      state.projects.find((p) => !p.archived)?.id ??
      "",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "FUNCTIONAL");
  const [severity, setSeverity] = useState<Severity>(
    initial?.severity ?? "MEDIUM",
  );
  const [steps, setSteps] = useState(initial?.steps.join("\n") ?? "");
  const [expected, setExpected] = useState(initial?.expected ?? "");
  const [actual, setActual] = useState(initial?.actual ?? "");
  const [environment, setEnvironment] = useState(initial?.environment ?? "");
  const [response, setResponse] = useState("");
  const [attachments, setAttachments] = useState(initial?.attachments ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState("");
  const savedId = useRef<string | null>(initial?.id ?? null);
  const [baseline] = useState(() => ({
    project:
      initial?.projectId ??
      projectId ??
      state.projects.find((p) => !p.archived)?.id ??
      "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "FUNCTIONAL",
    severity: initial?.severity ?? "MEDIUM",
    steps: initial?.steps.join("\n") ?? "",
    expected: initial?.expected ?? "",
    actual: initial?.actual ?? "",
    environment: initial?.environment ?? "",
    attachments: (initial?.attachments ?? []).map((file) => ({ ...file })),
  }));
  const dirty =
    project !== baseline.project ||
    title !== baseline.title ||
    description !== baseline.description ||
    category !== baseline.category ||
    severity !== baseline.severity ||
    steps !== baseline.steps ||
    expected !== baseline.expected ||
    actual !== baseline.actual ||
    environment !== baseline.environment ||
    JSON.stringify(attachments) !== JSON.stringify(baseline.attachments) ||
    response.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const guardLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      )
        return;
      if (
        !window.confirm(
          "В отчёте есть несохранённые изменения. Покинуть страницу без сохранения?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty]);
  const stepList = steps
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const selectedProject = state.projects.find((p) => p.id === project);
  const similar = state.reports
    .filter(
      (r) =>
        r.projectId === project &&
        r.status !== "DRAFT" &&
        !r.hidden &&
        r.id !== initial?.id &&
        title.trim().length > 4 &&
        title
          .toLowerCase()
          .split(/\s+/)
          .some(
            (word) => word.length > 4 && r.title.toLowerCase().includes(word),
          ),
    )
    .slice(0, 3);

  function validate(submit: boolean) {
    const result: Record<string, string> = {};
    if (!selectedProject || selectedProject.archived)
      result.project = "Выберите активный проект.";
    if (title.length > 160 || (submit && title.trim().length < 10))
      result.title = "Заголовок должен содержать от 10 до 160 символов.";
    if (description.length > 5000)
      result.description = "Описание должно быть не длиннее 5000 символов.";
    if (
      stepList.length > 20 ||
      (submit &&
        (stepList.length < 1 ||
          stepList.some((s) => s.length < 3 || s.length > 500)))
    )
      result.steps = "Добавьте 1–20 шагов, каждый от 3 до 500 символов.";
    if (expected.length > 3000 || (submit && expected.trim().length < 10))
      result.expected = "Опишите ожидаемый результат: 10–3000 символов.";
    if (actual.length > 3000 || (submit && actual.trim().length < 10))
      result.actual = "Опишите фактический результат: 10–3000 символов.";
    if (environment.length > 1000 || (submit && !environment.trim()))
      result.environment =
        "Укажите устройство, ОС, браузер и версию приложения, если известны.";
    if (
      submit &&
      initial?.status === "NEEDS_INFO" &&
      response.trim().length < 10
    )
      result.response = "Ответьте на запрос модератора: не менее 10 символов.";
    if (currentUser.blocked)
      result.form =
        "Заблокированный демонстрационный профиль не может отправлять отчёты.";
    setErrors(result);
    return Object.keys(result).length === 0;
  }

  function save(submit: boolean) {
    if (!validate(submit)) return;
    const reportId = savedId.current ?? uid();
    savedId.current = reportId;
    const oldStatus = initial?.status ?? "DRAFT";
    const createdAt = initial?.createdAt ?? timestamp();
    const newStatus: Status = submit ? "SUBMITTED" : oldStatus;
    update(
      (draft) => {
        const existing = draft.reports.find((r) => r.id === reportId);
        if (existing && !["DRAFT", "NEEDS_INFO"].includes(existing.status))
          return;
        const number =
          existing?.number ||
          (submit
            ? Math.max(
                0,
                ...draft.reports
                  .filter((r) => r.projectId === project)
                  .map((r) => r.number),
              ) + 1
            : 0);
        const record: Report = {
          id: reportId,
          projectId: project,
          number,
          authorId: currentUser.id,
          roleAtSubmission:
            existing?.roleAtSubmission ?? (submit ? currentUser.role : null),
          title: title.trim(),
          description: description.trim(),
          category,
          status: newStatus,
          severity,
          priority: existing?.priority ?? "P2",
          steps: stepList,
          expected: expected.trim(),
          actual: actual.trim(),
          environment: environment.trim(),
          createdAt,
          updatedAt: timestamp(),
          hidden: existing?.hidden ?? false,
          attachments,
          comments: existing?.comments ?? [],
          events: existing?.events ?? [],
        };
        record.events.push({
          id: uid(),
          title: submit
            ? oldStatus === "NEEDS_INFO"
              ? "Отчёт отправлен повторно"
              : "Отчёт отправлен"
            : "Изменения сохранены",
          detail: submit
            ? response.trim() || "Данные переданы в демонстрационную очередь."
            : "Сохранено локально в этом браузере.",
          actorId: currentUser.id,
          createdAt: timestamp(),
        });
        if (submit && oldStatus === "NEEDS_INFO" && response.trim())
          record.comments.push({
            id: uid(),
            authorId: currentUser.id,
            body: response.trim(),
            createdAt: timestamp(),
          });
        if (existing) Object.assign(existing, record);
        else draft.reports.unshift(record);
      },
      submit
        ? "Отчёт отправлен в демонстрационную очередь"
        : "Черновик сохранён локально",
    );
    router.push("/reports/" + reportId);
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setFileError("");
    if (files.length + attachments.length > 3) {
      setFileError("К отчёту можно добавить до трёх изображений.");
      event.target.value = "";
      return;
    }
    const invalid = files.find(
      (file) =>
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      setFileError("Используйте PNG, JPEG или WebP размером до 5 MiB.");
      event.target.value = "";
      return;
    }
    setAttachments([
      ...attachments,
      ...files.map((file) => ({
        id: uid(),
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ]);
    event.target.value = "";
  }

  function fieldError(name: string) {
    return errors[name] ? (
      <span className="form-error" role="alert">
        {errors[name]}
      </span>
    ) : null;
  }

  return (
    <div className="stack max-w-5xl">
      <div className="row text-sm">
        <Link
          className="link"
          href={initial ? "/reports/" + initial.id : "/reports"}
        >
          ← {initial ? "К отчёту" : "К отчётам"}
        </Link>
      </div>
      <PageHeader
        eyebrow={
          initial?.status === "NEEDS_INFO"
            ? "Ответ на запрос модератора"
            : "Новый след"
        }
        title={initial ? "Дополнить отчёт" : "Расскажите об ошибке"}
        description="Хороший отчёт помогает воспроизвести проблему. Сначала опишите сценарий, затем добавьте детали."
      />
      <div className="notice">
        <strong>Демонстрационный режим.</strong> Данные сохраняются только в
        вашем браузере. Не добавляйте секреты и реальные персональные данные.
      </div>
      <form
        className="stack"
        data-dirty={dirty ? "true" : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          save(true);
        }}
        noValidate
      >
        <section className="card p-6 stack">
          <div className="row">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
              1
            </span>
            <h2 className="font-semibold">Основная информация</h2>
          </div>
          <label className="field">
            Проект *
            <select
              className="select"
              value={project}
              disabled={!!initial}
              onChange={(e) => setProject(e.target.value)}
              aria-invalid={!!errors.project}
            >
              {state.projects
                .filter((p) => !p.archived || p.id === project)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.archived ? " · архив" : ""}
                  </option>
                ))}
            </select>
            {fieldError("project")}
          </label>
          {selectedProject && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm muted leading-6">
              <strong className="text-slate-700">Правила проекта: </strong>
              {selectedProject.rules}
            </div>
          )}
          <label className="field">
            Заголовок *
            <input
              className="input"
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: фильтр по дате сбрасывается после обновления"
              aria-invalid={!!errors.title}
            />
            <span className="text-xs muted">
              {title.length}/160 · Кратко опишите, что происходит и где.
            </span>
            {fieldError("title")}
          </label>
          <div className="grid-2">
            <label className="field">
              Категория
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Предполагаемая серьёзность
              <select
                className="select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
              >
                {Object.entries(severities).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="text-xs muted">
                Окончательное решение принимает модератор.
              </span>
            </label>
          </div>
          <label className="field">
            Описание
            <textarea
              className="textarea"
              value={description}
              rows={3}
              maxLength={5000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Контекст и дополнительные наблюдения"
            />
            {fieldError("description")}
          </label>
        </section>
        {similar.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-sm text-amber-950">
              Возможно, об этом уже сообщали
            </h2>
            <p className="text-sm text-amber-900 mt-1">
              Посмотрите похожие отчёты перед отправкой. Дубликаты не приносят
              очков.
            </p>
            <div className="mt-3 space-y-2">
              {similar.map((r) => (
                <Link
                  className="block text-sm link text-amber-950"
                  key={r.id}
                  href={"/reports/" + r.id}
                >
                  {reportCode(state, r)} · {r.title} →
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="card p-6 stack">
          <div className="row">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
              2
            </span>
            <h2 className="font-semibold">Как воспроизвести</h2>
          </div>
          <label className="field">
            Шаги воспроизведения *
            <textarea
              className="textarea"
              value={steps}
              rows={5}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={
                "Открыть страницу аналитики\nВыбрать период за последний месяц\nОбновить страницу"
              }
              aria-invalid={!!errors.steps}
            />
            <span className="text-xs muted">
              Каждый шаг с новой строки. Максимум 20 шагов.
            </span>
            {fieldError("steps")}
          </label>
          <div className="grid-2">
            <label className="field">
              Ожидаемый результат *
              <textarea
                className="textarea"
                value={expected}
                rows={4}
                maxLength={3000}
                onChange={(e) => setExpected(e.target.value)}
                placeholder="Что должно было произойти?"
                aria-invalid={!!errors.expected}
              />
              {fieldError("expected")}
            </label>
            <label className="field">
              Фактический результат *
              <textarea
                className="textarea"
                value={actual}
                rows={4}
                maxLength={3000}
                onChange={(e) => setActual(e.target.value)}
                placeholder="Что произошло на самом деле?"
                aria-invalid={!!errors.actual}
              />
              {fieldError("actual")}
            </label>
          </div>
          <label className="field">
            Окружение *
            <input
              className="input"
              value={environment}
              maxLength={1000}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="Windows 11 · Chrome 141 · 1440 × 900 · версия 1.2"
              aria-invalid={!!errors.environment}
            />
            <span className="text-xs muted">
              Если параметр неизвестен, так и напишите.
            </span>
            {fieldError("environment")}
          </label>
        </section>
        <section className="card p-6 stack">
          <div className="row">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
              3
            </span>
            <h2 className="font-semibold">Изображения и уточнения</h2>
          </div>
          <label className="field">
            Скриншоты <span className="font-normal muted">(необязательно)</span>
            <input
              className="input cursor-pointer"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={addFiles}
            />
            <span className="text-xs muted">
              До 3 файлов по 5 MiB. Предпросмотр доступен в текущей вкладке;
              файлы никуда не отправляются.
            </span>
          </label>
          {fileError && (
            <p className="form-error" role="alert">
              {fileError}
            </p>
          )}
          {attachments.length > 0 && (
            <div className="grid-3">
              {attachments.map((file) => (
                <figure
                  className="rounded-lg border border-slate-200 overflow-hidden"
                  key={file.id}
                >
                  <LocalImage src={file.url} name={file.name} />
                  <figcaption className="p-3">
                    <p className="text-xs truncate muted">{file.name}</p>
                    <button
                      type="button"
                      className="link text-xs mt-2 text-rose-600"
                      onClick={() => {
                        setAttachments(
                          attachments.filter((f) => f.id !== file.id),
                        );
                        if (
                          file.url.startsWith("blob:") &&
                          !baseline.attachments.some(
                            (saved) => saved.url === file.url,
                          )
                        )
                          URL.revokeObjectURL(file.url);
                      }}
                    >
                      Убрать изображение
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          {initial?.status === "NEEDS_INFO" && (
            <label className="field">
              Ответ модератору *
              <textarea
                className="textarea"
                value={response}
                maxLength={2000}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder="Что уточнили и какие дополнительные данные проверили?"
              />
              {fieldError("response")}
            </label>
          )}
          <div className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-900 leading-6">
            За уникальный подтверждённый баг обычный пользователь получает 10
            очков. Сама отправка и количество скриншотов на награду не влияют.
          </div>
        </section>
        {Object.keys(errors).length > 0 && (
          <div role="alert" className="form-error">
            {errors.form ??
              "Проверьте отмеченные поля. Введённые данные остаются в форме."}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-xs muted">* Обязательные поля при отправке</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => save(false)}
            >
              {initial?.status === "NEEDS_INFO"
                ? "Сохранить изменения"
                : "Сохранить черновик"}
            </button>
            <button type="submit" className="btn btn-primary">
              {initial?.status === "NEEDS_INFO"
                ? "Отправить повторно"
                : "Отправить на проверку"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
