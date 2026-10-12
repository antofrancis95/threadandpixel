"use client";

import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, onAuthStateChanged, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApi, type Api } from "./api";

type AppContext = { auth: Auth; db: Firestore; api: Api; user: User | null; ready: boolean };

const Ctx = createContext<AppContext | null>(null);

export function Providers({
  firebaseConfig,
  apiUrl,
  children,
}: {
  firebaseConfig: FirebaseOptions;
  apiUrl: string;
  children: ReactNode;
}) {
  const services = useMemo(() => {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const auth = getAuth(app);
    return { auth, db: getFirestore(app), api: createApi(apiUrl, auth) };
  }, [firebaseConfig, apiUrl]);

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(services.auth, (u) => {
        setUser(u);
        setReady(true);
      }),
    [services.auth],
  );

  return <Ctx.Provider value={{ ...services, user, ready }}>{children}</Ctx.Provider>;
}

export function useApp(): AppContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}
