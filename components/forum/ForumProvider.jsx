"use client";

import { createContext, useContext, useRef, useState } from "react";

// Client-side notifications store for the forum. Phase 1 has no backend, so it's
// seeded with a couple of examples and can receive simulated events (e.g. a bot
// "replies" shortly after you post). Notifications only ever cover replies to you
// or comments on your post — never upvotes.
const ForumCtx = createContext(null);
export function useForum() {
  return useContext(ForumCtx);
}

const SEED = [
  { id: "seed-1", kind: "reply", who: "u/nightmonkey", snippet: "@you this is exactly it — saving this thread forever.", href: "/forum/1", time: "2m", read: false },
  { id: "seed-2", kind: "post-comment", who: "u/gwen_s", snippet: "Built one for my sister too — parts list incoming!", href: "/forum/5", time: "18m", read: false },
];

export function ForumProvider({ children }) {
  const [notifs, setNotifs] = useState(SEED);
  const seq = useRef(0);

  const add = (n) =>
    setNotifs((list) => [{ id: "live-" + seq.current++, time: "now", read: false, ...n }, ...list]);
  const markAllRead = () => setNotifs((list) => list.map((n) => ({ ...n, read: true })));

  const unread = notifs.reduce((a, n) => a + (n.read ? 0 : 1), 0);

  return (
    <ForumCtx.Provider value={{ notifs, unread, add, markAllRead }}>
      {children}
    </ForumCtx.Provider>
  );
}
