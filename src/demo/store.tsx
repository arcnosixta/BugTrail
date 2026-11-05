"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { createInitialState } from "./data";
import { DemoState, Role, User } from "./model";

type DemoContextType = {
  state: DemoState;
  currentUser: User;
  ready: boolean;
  toast: string;
  setRole: (role: Role) => void;
  update: (fn: (draft: DemoState) => void, message?: string) => void;
  notify: (message: string) => void;
  reset: () => void;
};
const Context = createContext<DemoContextType | null>(null);
const STORAGE = "bugtrail-demo-v1";
const initialState = createInitialState();
let memoryState = initialState;
let loaded = false;
const listeners = new Set<() => void>();

function getSnapshot() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const value = JSON.parse(raw) as DemoState;
        if (
          Array.isArray(value.users) &&
          Array.isArray(value.projects) &&
          Array.isArray(value.reports) &&
          Array.isArray(value.notifications) &&
          Array.isArray(value.audit) &&
          value.users.some((user) => user.id === value.sessionUserId)
        ) {
          memoryState = value;
        }
      }
    } catch {
      memoryState = initialState;
    }
  }
  return memoryState;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: DemoState) {
  memoryState = next;
  let persisted = true;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next));
  } catch {
    persisted = false;
  }
  listeners.forEach((listener) => listener());
  return persisted;
}

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialState,
  );
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string) => setToast(message), []);
  const update = useCallback(
    (fn: (draft: DemoState) => void, message?: string) => {
      const next = structuredClone(getSnapshot());
      fn(next);
      const persisted = publish(next);
      if (!persisted)
        setToast(
          "Хранилище браузера недоступно. Изменения действуют до обновления страницы.",
        );
      else if (message) setToast(message);
    },
    [],
  );

  const setRole = useCallback((role: Role) => {
    const current = getSnapshot();
    const preferred = { USER: "anna", MODERATOR: "mikhail", ADMIN: "elena" }[
      role
    ];
    const user =
      current.users.find(
        (item) => item.id === preferred && item.role === role && !item.blocked,
      ) ?? current.users.find((item) => item.role === role && !item.blocked);
    if (!user) {
      setToast(
        "Активного профиля этой роли нет. Восстановите демоданные в настройках.",
      );
      return;
    }
    const persisted = publish({ ...current, sessionUserId: user.id });
    setToast(
      persisted
        ? "Демонстрационный профиль переключён"
        : "Профиль переключён до обновления страницы: хранилище недоступно.",
    );
  }, []);

  const reset = useCallback(() => {
    const persisted = publish(createInitialState());
    setToast(
      persisted
        ? "Демонстрационные данные восстановлены"
        : "Демо сброшено в текущей вкладке: хранилище недоступно.",
    );
  }, []);
  const currentUser =
    state.users.find((user) => user.id === state.sessionUserId) ??
    state.users[0];
  return (
    <Context.Provider
      value={{
        state,
        currentUser,
        ready,
        toast,
        setRole,
        update,
        notify,
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProvider required");
  return context;
}
