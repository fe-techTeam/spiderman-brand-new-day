"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";

// Notifications store for the forum, backed by /api/me/notifications.
// Logged out → empty list, no fetching. Logged in → fetch on mount, every 30s,
// and on window focus. `time` is the raw ISO string from the API; the header
// formats it with relTime() at render time.
const ForumCtx = createContext(null);
export function useForum() {
  return useContext(ForumCtx);
}

export function ForumProvider({ children }) {
  const { user } = useSession();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  // Sequence guard: stale in-flight responses (e.g. resolved after logout or
  // after an optimistic markAllRead) are dropped.
  const seq = useRef(0);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    const ticket = ++seq.current;
    try {
      const data = await portalApi("/me/notifications");
      if (ticket !== seq.current) return;
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {
      // Keep whatever we have; the next poll/focus will retry.
    }
  }, []);

  useEffect(() => {
    // Session changed (login/logout/switch): drop any in-flight response from
    // the previous session and start clean before the fresh fetch lands.
    seq.current++;
    setNotifs([]);
    setUnread(0);
    if (!userId) return;
    load();
    const timer = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, load]);

  const markAllRead = useCallback(() => {
    // Optimistic: zero the badge and mark rows read, then tell the server.
    seq.current++;
    setNotifs((list) => list.map((n) => (n.read ? n : { ...n, read: true })));
    setUnread(0);
    portalApi("/me/notifications/read-all", { method: "POST" }).catch(() => {});
  }, []);

  // Legacy no-op kept so any remaining Phase 1 call sites don't crash.
  const add = useCallback(() => {}, []);

  return (
    <ForumCtx.Provider value={{ notifs, unread, add, markAllRead }}>
      {children}
    </ForumCtx.Provider>
  );
}
