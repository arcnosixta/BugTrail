"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Avatar, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { useDemo } from "@/demo/store";
import {
  canView,
  levelFor,
  pointsFor,
  reportCode,
  rewarded,
  roles,
  shortDate,
  usefulCount,
} from "@/demo/model";

const authCopy: Record<string, { title: string; description: string }> = {
  "sign-in": {
    title: "С возвращением",
    description: "Хорошие продукты начинаются с внимательных людей.",
  },
  "sign-up": {
    title: "Оставьте свой след",
    description: "Находите ошибки. Помогайте проектам становиться лучше.",
  },
  "forgot-password": {
    title: "Забыли пароль?",
    description: "Покажем, как будет работать восстановление доступа.",
  },
  "reset-password": {
    title: "Новый пароль",
    description: "Создайте надёжный пароль для вашей учётной записи.",
  },
  "verify-email": {
    title: "Проверьте почту",
    description: "Подтверждение адреса помогает сделать сообщество надёжнее.",
  },
};

export function AuthPage({ mode }: { mode: string }) {
  const { setRole, notify } = useDemo();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [expired, setExpired] = useState(false);
  const copy = authCopy[mode] ?? authCopy["sign-in"];
  const isRegistration = mode === "sign-up";
  const hasPassword =
    mode === "sign-in" || isRegistration || mode === "reset-password";
  const hasEmail = mode !== "reset-password" && mode !== "verify-email";

  function enterDemo() {
    setPassword("");
    setConfirmPassword("");
    setRole("USER");
    router.push("/dashboard");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (
      hasEmail &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    ) {
      setError("Введите корректный email, например anna@example.test.");
      return;
    }
    if (isRegistration && name.trim().length < 2) {
      setError("Укажите имя не короче двух символов.");
      return;
    }
    if (hasPassword && (password.length < 12 || password.length > 128)) {
      setError("Пароль должен содержать от 12 до 128 символов.");
      return;
    }
    if (mode === "reset-password" && password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }
    if (isRegistration && !agreed) {
      setError("Подтвердите, что понимаете условия демонстрационного режима.");
      return;
    }
    setPassword("");
    setConfirmPassword("");
    if (mode === "sign-in") {
      enterDemo();
      return;
    }
    setCompleted(true);
    notify(
      isRegistration
        ? "Форма проверена. Вы находитесь в демонстрационном режиме."
        : "Демонстрационный сценарий завершён.",
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-6 lg:grid-cols-[.9fr_1.1fr] lg:py-12">
      <div className="flex flex-col justify-between rounded-2xl bg-slate-950 p-8 text-white lg:p-10">
        <div>
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-white"
          >
            BugTrail<span className="text-indigo-400">.</span>
          </Link>
          <p className="mt-14 text-xs font-medium uppercase tracking-[.2em] text-indigo-300">
            Качество — общее дело
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
            Каждая найденная ошибка —<br />
            шаг вперёд.
          </h2>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            Здесь важен не объём отправленных сообщений, а воспроизводимая
            проблема, которая помогает реальному продукту.
          </p>
        </div>
        <div className="mt-12 border-t border-white/15 pt-6">
          <div className="flex -space-x-2">
            {["АС", "ДК", "СБ"].map((initials, i) => (
              <span
                key={initials}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-950 text-xs font-semibold"
                style={{ background: ["#6366f1", "#0d9488", "#c2783d"][i] }}
              >
                {initials}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            Три роли. Один понятный процесс.
            <br />
            От первого отчёта до проверенного исправления.
          </p>
        </div>
      </div>

      <div className="card p-6 sm:p-9">
        <p className="eyebrow">Ваше рабочее пространство</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="muted mt-3 text-sm leading-6">{copy.description}</p>
        <div className="notice my-6 text-sm">
          Демонстрационный режим. Данные не отправляются на сервер, аккаунт не
          создаётся, письма не отправляются. Используйте вымышленные данные.
        </div>

        {mode === "verify-email" ? (
          <div className="stack">
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-xl text-indigo-600">
                {expired ? "!" : "@"}
              </div>
              <h2 className="font-semibold">
                {completed
                  ? "Адрес подтверждён в демо"
                  : expired
                    ? "Ссылка больше не действует"
                    : "Всё почти готово"}
              </h2>
              <p className="muted mt-2 text-sm leading-6">
                {completed
                  ? "Можно перейти к отчётам и попробовать основные сценарии."
                  : expired
                    ? "В полной версии можно будет запросить новое письмо с ограничением частоты."
                    : "В полной версии на указанный email придёт одноразовая ссылка. Сейчас можно посмотреть результат подтверждения."}
              </p>
            </div>
            {completed ? (
              <button className="btn btn-primary w-full" onClick={enterDemo}>
                Открыть рабочее пространство
              </button>
            ) : (
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  if (expired) {
                    setExpired(false);
                    notify(
                      "Новая ссылка показана в демо. Письмо не отправлялось.",
                    );
                  } else setCompleted(true);
                }}
              >
                {expired
                  ? "Запросить новую ссылку в демо"
                  : "Подтвердить адрес в демо"}
              </button>
            )}
            {!completed && (
              <button
                className="btn btn-ghost w-full"
                onClick={() => setExpired((value) => !value)}
              >
                {expired
                  ? "Посмотреть действующую ссылку"
                  : "Посмотреть истёкшую ссылку"}
              </button>
            )}
          </div>
        ) : completed ? (
          <div className="stack">
            <div className="rounded-xl bg-emerald-50 p-5">
              <h2 className="font-semibold text-emerald-900">
                {mode === "forgot-password"
                  ? "Запрос принят"
                  : mode === "reset-password"
                    ? "Пароль проверен"
                    : "Форма готова"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {mode === "forgot-password"
                  ? "В полной версии ответ будет одинаковым для любого адреса. Если аккаунт существует, на него придёт ссылка. Сейчас письмо не отправлялось."
                  : mode === "reset-password"
                    ? "В демо пароль не сохранён. В полной версии после его смены старые сессии будут отозваны."
                    : "Регистрация показана без создания аккаунта. Продолжите в синтетическом профиле Анны."}
              </p>
            </div>
            {isRegistration && (
              <Link href="/verify-email" className="btn btn-primary w-full">
                Посмотреть подтверждение email
              </Link>
            )}
            {mode === "forgot-password" && (
              <Link href="/reset-password" className="btn btn-primary w-full">
                Посмотреть смену пароля
              </Link>
            )}
            {!isRegistration && mode !== "forgot-password" && (
              <button className="btn btn-primary w-full" onClick={enterDemo}>
                Продолжить в демо
              </button>
            )}
            <Link className="btn btn-secondary w-full" href="/sign-in">
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="stack" noValidate>
            {isRegistration && (
              <label className="field">
                Имя
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={60}
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                />
              </label>
            )}
            {hasEmail && (
              <label className="field">
                Email
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  placeholder="anna@example.test"
                  autoComplete="off"
                />
              </label>
            )}
            {hasPassword && (
              <label className="field">
                {mode === "reset-password" ? "Новый пароль" : "Пароль"}
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  autoComplete="off"
                  placeholder="Не менее 12 символов"
                />
                <span className="muted text-xs font-normal">
                  Не вводите пароль от реального аккаунта.
                </span>
              </label>
            )}
            {mode === "reset-password" && (
              <label className="field">
                Повторите пароль
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  maxLength={128}
                  autoComplete="off"
                />
              </label>
            )}
            {isRegistration && (
              <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span>
                  Я понимаю, что это демо, и использую только вымышленные
                  данные.
                </span>
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="btn btn-primary w-full" type="submit">
              {isRegistration
                ? "Продолжить регистрацию в демо"
                : mode === "forgot-password"
                  ? "Показать восстановление"
                  : mode === "reset-password"
                    ? "Проверить новый пароль"
                    : "Войти в демо"}
            </button>
            {mode === "sign-in" && (
              <Link
                href="/forgot-password"
                className="link text-center text-sm"
              >
                Забыли пароль?
              </Link>
            )}
          </form>
        )}

        <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          {mode === "sign-in" ? (
            <>
              Впервые здесь?{" "}
              <Link className="link" href="/sign-up">
                Создать демопрофиль
              </Link>
            </>
          ) : (
            <Link className="link" href="/sign-in">
              Уже есть аккаунт? Войти
            </Link>
          )}
        </div>
        <button
          className="mt-4 w-full text-center text-sm text-slate-500 underline decoration-slate-300 underline-offset-4"
          onClick={enterDemo}
        >
          Открыть демо без заполнения формы
        </button>
      </div>
    </div>
  );
}

const achievements = [
  {
    name: "Первый след",
    description: "1 полезный отчёт",
    target: 1,
    mark: "01",
  },
  {
    name: "Следопыт",
    description: "5 полезных отчётов",
    target: 5,
    mark: "05",
  },
  {
    name: "Охотник за багами",
    description: "20 полезных отчётов",
    target: 20,
    mark: "20",
  },
];

export function ProfilePage({ handle }: { handle: string }) {
  const { state, currentUser } = useDemo();
  const user = state.users.find(
    (item) => item.handle === decodeURIComponent(handle),
  );
  if (!user || user.blocked)
    return (
      <EmptyState
        title="Профиль недоступен"
        description="Участник не найден или его профиль недоступен."
        action={
          <Link className="btn btn-secondary" href="/leaderboard">
            Вернуться к рейтингу
          </Link>
        }
      />
    );
  const points = pointsFor(state, user.id);
  const useful = usefulCount(state, user.id);
  const projectCount = new Set(
    state.reports
      .filter((report) => report.authorId === user.id && rewarded(report))
      .map((report) => report.projectId),
  ).size;
  const reports = state.reports
    .filter(
      (report) =>
        report.authorId === user.id &&
        report.status !== "DRAFT" &&
        canView(state, currentUser, report),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="stack">
      <PageHeader
        eyebrow="Участники"
        title="Профиль"
        description="Вклад, который помогает продуктам становиться лучше."
        actions={
          currentUser.id === user.id ? (
            <Link className="btn btn-secondary" href="/settings">
              Настройки профиля
            </Link>
          ) : undefined
        }
      />
      <section className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-100 via-slate-50 to-emerald-50" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar user={user} />
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="muted mt-1 text-sm">
                @{user.handle} · {roles[user.role]}
              </p>
            </div>
          </div>
          <div className="rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            Уровень {levelFor(points)}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-100">
          {[
            ["Очков", points],
            ["Полезных отчётов", useful],
            ["Проектов с вкладом", projectCount],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="border-r border-slate-100 p-4 last:border-0 sm:p-6"
            >
              <div className="text-2xl font-semibold tracking-tight">
                {value}
              </div>
              <div className="muted mt-1 text-xs sm:text-sm">{label}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="card p-6">
        <div className="row between">
          <h2 className="text-lg font-semibold">Достижения</h2>
          <Link className="link text-sm" href="/leaderboard">
            Как начисляются очки
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {achievements.map((item) => (
            <Achievement
              key={item.name}
              name={item.name}
              description={item.description}
              mark={item.mark}
              active={useful >= item.target}
              progress={Math.min(useful, item.target) + " / " + item.target}
            />
          ))}
          <Achievement
            name="Исследователь"
            description="Вклад в 3 разных проекта"
            mark="03"
            active={projectCount >= 3}
            progress={Math.min(projectCount, 3) + " / 3"}
          />
        </div>
        <p className="muted mt-4 text-xs leading-6">
          Значки учитывают только действующие подтверждённые отчёты. Отмена
          подтверждения может изменить прогресс.
        </p>
      </section>
      <section className="card">
        <div className="card-header row between">
          <h2 className="font-semibold">Отчёты участника</h2>
          <span className="muted text-sm">{reports.length}</span>
        </div>
        {reports.length ? (
          reports.map((report) => (
            <Link
              key={report.id}
              href={"/reports/" + report.id}
              className="list-item flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="mono text-xs text-slate-400">
                  {reportCode(state, report)}
                </span>
                <p className="mt-1 font-medium text-slate-800">
                  {report.title}
                </p>
              </div>
              <StatusBadge status={report.status} />
            </Link>
          ))
        ) : (
          <EmptyState
            title="Пока без опубликованных отчётов"
            description="Первый полезный вклад начинается с понятного описания проблемы."
          />
        )}
      </section>
    </div>
  );
}

function Achievement({
  name,
  description,
  mark,
  active,
  progress,
}: {
  name: string;
  description: string;
  mark: string;
  active: boolean;
  progress: string;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (active
          ? "border-indigo-100 bg-indigo-50/50"
          : "border-slate-200 bg-slate-50/50")
      }
    >
      <div
        className={
          "mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold " +
          (active ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")
        }
      >
        {mark}
      </div>
      <h3 className="text-sm font-semibold">{name}</h3>
      <p className="muted mt-1 text-xs leading-5">{description}</p>
      <p
        className={
          "mt-3 text-xs font-medium " +
          (active ? "text-indigo-600" : "text-slate-500")
        }
      >
        {active ? "Получено" : progress}
      </p>
    </div>
  );
}

export function LeaderboardPage() {
  const { state, currentUser } = useDemo();
  const [query, setQuery] = useState("");
  const ranked = state.users
    .filter(
      (user) =>
        user.role === "USER" && !user.blocked && pointsFor(state, user.id) > 0,
    )
    .sort(
      (a, b) =>
        pointsFor(state, b.id) - pointsFor(state, a.id) ||
        usefulCount(state, b.id) - usefulCount(state, a.id) ||
        a.id.localeCompare(b.id),
    );
  const filtered = ranked.filter((user) =>
    (user.name + " " + user.handle).toLowerCase().includes(query.toLowerCase()),
  );
  const position = ranked.findIndex((user) => user.id === currentUser.id);
  return (
    <div className="stack">
      <PageHeader
        eyebrow="Сообщество"
        title="Те, кто делает лучше"
        description="Рейтинг полезного вклада за всё время. Здесь качество важнее количества."
      />
      <div className="grid-3">
        <div className="card p-5">
          <p className="muted text-sm">Участников в рейтинге</p>
          <p className="mt-3 text-3xl font-semibold">{ranked.length}</p>
        </div>
        <div className="card p-5">
          <p className="muted text-sm">Ваш подтверждённый вклад</p>
          <p className="mt-3 text-3xl font-semibold">
            {pointsFor(state, currentUser.id)}{" "}
            <span className="text-sm font-normal text-slate-500">очков</span>
          </p>
        </div>
        <div className="card p-5">
          <p className="muted text-sm">Ваше место</p>
          <p className="mt-3 text-3xl font-semibold">
            {position < 0 ? "—" : String(position + 1).padStart(2, "0")}
          </p>
          <p className="muted mt-2 text-xs">
            {currentUser.role !== "USER"
              ? "Сотрудники не участвуют в рейтинге"
              : "Только действующие подтверждения"}
          </p>
        </div>
      </div>
      <section className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Рейтинг участников</h2>
            <p className="muted mt-1 text-xs">
              Подтверждённые уникальные ошибки
            </p>
          </div>
          <label className="field max-w-xs">
            <span className="sr-only">Найти участника</span>
            <input
              className="input"
              placeholder="Найти участника..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Место</th>
                <th>Участник</th>
                <th>Уровень</th>
                <th>Полезные отчёты</th>
                <th>Очки</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className={
                    user.id === currentUser.id ? "bg-indigo-50/50" : ""
                  }
                >
                  <td>
                    <span
                      className={
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold " +
                        (ranked.indexOf(user) === 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-500")
                      }
                    >
                      {ranked.indexOf(user) + 1}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={"/profile/" + user.handle}
                      className="flex items-center gap-3"
                    >
                      <Avatar user={user} />
                      <span>
                        <span className="block font-medium">
                          {user.name}
                          {user.id === currentUser.id && (
                            <span className="ml-2 text-xs text-indigo-600">
                              Вы
                            </span>
                          )}
                        </span>
                        <span className="muted text-xs">@{user.handle}</span>
                      </span>
                    </Link>
                  </td>
                  <td>{levelFor(pointsFor(state, user.id))}</td>
                  <td>{usefulCount(state, user.id)}</td>
                  <td className="font-semibold text-indigo-600">
                    {pointsFor(state, user.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState
            title="Участники не найдены"
            description={
              query
                ? "Попробуйте другое имя или псевдоним."
                : "После первого подтверждения здесь появится полезный вклад."
            }
          />
        )}
      </section>
      <section className="card border-l-4 border-l-indigo-500 p-6">
        <p className="eyebrow">Прозрачные правила</p>
        <h2 className="mt-2 text-lg font-semibold">
          Один полезный отчёт — 10 очков
        </h2>
        <p className="muted mt-3 max-w-3xl text-sm leading-7">
          Очки появляются после проверки уникального бага. Отправки, комментарии
          и повторное открытие ничего не добавляют. При ошибочном подтверждении
          награда отменяется. Серьёзность ошибки не увеличивает вознаграждение.
        </p>
      </section>
    </div>
  );
}

export function NotificationsPage() {
  const { state, currentUser, update } = useDemo();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const items = state.notifications
    .filter((item) => item.userId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = items.filter((item) => !item.read).length;
  const visible = items.filter((item) => filter === "all" || !item.read);
  function markRead(id: string) {
    update((draft) => {
      const item = draft.notifications.find(
        (item) => item.id === id && item.userId === currentUser.id,
      );
      if (item) item.read = true;
    });
  }
  return (
    <div className="stack">
      <PageHeader
        eyebrow="Личный кабинет"
        title="Уведомления"
        description="Решения по вашим отчётам и важные обновления."
        actions={
          <button
            className="btn btn-secondary"
            disabled={!unread}
            onClick={() =>
              update((draft) => {
                draft.notifications
                  .filter((item) => item.userId === currentUser.id)
                  .forEach((item) => {
                    item.read = true;
                  });
              }, "Все уведомления отмечены прочитанными")
            }
          >
            Прочитать все
          </button>
        }
      />
      <div className="tabs" role="tablist" aria-label="Фильтр уведомлений">
        <button
          role="tab"
          aria-selected={filter === "all"}
          className={"tab " + (filter === "all" ? "active" : "")}
          onClick={() => setFilter("all")}
        >
          Все <span className="ml-1 text-slate-400">{items.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={filter === "unread"}
          className={"tab " + (filter === "unread" ? "active" : "")}
          onClick={() => setFilter("unread")}
        >
          Непрочитанные <span className="ml-1 text-indigo-500">{unread}</span>
        </button>
      </div>
      <div className="card">
        {visible.length ? (
          visible.map((item) => (
            <article
              key={item.id}
              className={
                "list-item flex gap-4 " + (!item.read ? "bg-indigo-50/30" : "")
              }
            >
              <span
                className={
                  "mt-2 h-2 w-2 shrink-0 rounded-full " +
                  (!item.read ? "bg-indigo-500" : "bg-slate-200")
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <time className="muted text-xs" dateTime={item.createdAt}>
                    {shortDate(item.createdAt)}
                  </time>
                </div>
                <p className="muted mt-2 text-sm leading-6">
                  {item.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {item.reportId && (
                    <Link
                      className="link text-sm"
                      href={"/reports/" + item.reportId}
                      onClick={() => markRead(item.id)}
                    >
                      Открыть отчёт →
                    </Link>
                  )}
                  {!item.read && (
                    <button
                      className="text-sm text-slate-500 underline-offset-4 hover:underline"
                      onClick={() => markRead(item.id)}
                    >
                      Отметить прочитанным
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title={filter === "unread" ? "Всё прочитано" : "Пока тихо"}
            description="Здесь появятся запросы уточнений, решения и сообщения о подтверждённом вкладе."
            action={
              <Link className="btn btn-secondary" href="/me/reports">
                К моим отчётам
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { currentUser } = useDemo();
  return <SettingsForm key={currentUser.id} />;
}

function SettingsForm() {
  const { state, currentUser, update, reset, notify } = useDemo();
  const router = useRouter();
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle);
  const [error, setError] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    const nextHandle = handle.trim().toLowerCase();
    if (nextName.length < 2 || nextName.length > 60) {
      setError("Имя должно содержать от 2 до 60 символов.");
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(nextHandle)) {
      setError("Псевдоним: 3–24 латинских символа, цифры или подчёркивание.");
      return;
    }
    if (
      ["admin", "settings", "support", "moderator", "bugtrail"].includes(
        nextHandle,
      )
    ) {
      setError("Этот псевдоним зарезервирован.");
      return;
    }
    if (
      state.users.some(
        (user) =>
          user.id !== currentUser.id &&
          user.handle.toLowerCase() === nextHandle,
      )
    ) {
      setError("Этот псевдоним уже занят.");
      return;
    }
    setError("");
    update((draft) => {
      const user = draft.users.find((user) => user.id === currentUser.id);
      if (user) {
        user.name = nextName;
        user.handle = nextHandle;
      }
    }, "Профиль сохранён в этом браузере");
  }

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Личный кабинет"
        title="Настройки"
        description="Ваш профиль и параметры демонстрационного пространства."
      />
      <div className="detail-grid">
        <section className="card p-6">
          <div className="mb-6 flex items-center gap-3">
            <Avatar user={currentUser} />
            <div>
              <h2 className="font-semibold">Личные данные</h2>
              <p className="muted mt-1 text-xs">Видны другим участникам демо</p>
            </div>
          </div>
          <form onSubmit={save} className="stack" noValidate>
            <label className="field">
              Имя
              <input
                className="input"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="field">
              Псевдоним
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm text-slate-400">
                  @
                </span>
                <input
                  className="input pl-8"
                  value={handle}
                  maxLength={24}
                  onChange={(event) => setHandle(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <span className="muted text-xs font-normal">
                Латинские буквы, цифры и подчёркивание.
              </span>
            </label>
            <label className="field">
              Email
              <input
                className="input bg-slate-50 text-slate-500"
                value={currentUser.email}
                readOnly
              />
              <span className="muted text-xs font-normal">
                Синтетический адрес, почтовая отправка отключена.
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary" type="submit">
                Сохранить изменения
              </button>
              <Link
                className="btn btn-secondary"
                href={"/profile/" + currentUser.handle}
              >
                Мой профиль
              </Link>
            </div>
          </form>
        </section>
        <div className="stack">
          <section className="card p-6">
            <p className="eyebrow">Безопасность</p>
            <h2 className="mt-2 font-semibold">Это локальное демо</h2>
            <p className="muted mt-3 text-sm leading-7">
              Выбранный профиль, отчёты и действия хранятся в этом браузере.
              Настоящей авторизации и серверной проверки прав пока нет. Не
              вводите реальные пароли и личные данные.
            </p>
            <Link className="btn btn-secondary mt-4" href="/reset-password">
              Посмотреть смену пароля
            </Link>
          </section>
          <section className="card p-6">
            <p className="eyebrow">Демонстрационные данные</p>
            <h2 className="mt-2 font-semibold">Начать с чистого листа</h2>
            <p className="muted mt-3 text-sm leading-7">
              Сброс удалит локальные изменения и вернёт исходные проекты, отчёты
              и профили. Действие нельзя отменить.
            </p>
            {resetConfirmation ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-red-700">
                  Восстановить исходный набор?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      reset();
                      setResetConfirmation(false);
                      setError("");
                      router.push("/dashboard");
                    }}
                  >
                    Да, сбросить демо
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setResetConfirmation(false)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-secondary mt-4"
                onClick={() => setResetConfirmation(true)}
              >
                Сбросить демоданные
              </button>
            )}
          </section>
          <button
            className="btn btn-ghost"
            onClick={() =>
              notify(
                "Сетевые запросы не выполняются. Изменения доступны только в этом браузере.",
              )
            }
          >
            Где хранятся мои изменения?
          </button>
        </div>
      </div>
    </div>
  );
}
