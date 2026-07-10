"use client";

// Global session context + the single AuthModal instance. Any page can call
// openAuth() to prompt login/register; after auth, users who haven't taken the
// avatar quiz are routed to /quiz.
//
// useSession() → { user, loading, refresh, openAuth(mode?), logout, authOpen }
//   user: null when logged out, else the /api/me DTO
//   openAuth("register" | "login")
//   authOpen: whether the auth modal is showing — pages that hijack scrolling
//   (the landing pager) pause while any popup is up

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/main/AuthModal";

const SessionContext = createContext({
  user: null,
  loading: true,
  refresh: () => {},
  openAuth: () => {},
  logout: () => {},
  authOpen: false,
});

export function useSession() {
  return useContext(SessionContext);
}

export default function SessionProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("register");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAuth = useCallback((mode = "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    // signing out from a members area (forum, MJ wall…) lands on the homepage —
    // a no-op when already there
    router.push("/");
    router.refresh();
  }, [router]);

  // Called by AuthModal after a successful signup/login.
  const onAuthed = useCallback(
    async (result) => {
      setAuthOpen(false);
      const me = await refresh();
      if (result?.needsQuiz || me?.needsQuiz) router.push("/quiz");
    },
    [refresh, router]
  );

  return (
    <SessionContext.Provider value={{ user, loading, refresh, openAuth, logout, authOpen }}>
      {children}
      {authOpen && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthOpen(false)}
          onAuthed={onAuthed}
        />
      )}
    </SessionContext.Provider>
  );
}
