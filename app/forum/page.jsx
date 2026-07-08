/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import ForumGate from "@/components/forum/ForumGate";
import SpiderAvatar from "@/components/SpiderAvatar";
import ShareButton from "@/components/forum/ShareButton";
import EmptyState from "@/components/forum/EmptyState";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";
import { relTime, fmtCount } from "@/lib/time";

const RULES = [
  { n: "1", text: "Every identity belongs here. No gatekeeping the mask." },
  { n: "2", text: "Real stories only — this is what the Web actually looks like." },
  { n: "3", text: "Keep it spoiler-tagged until opening weekend." },
];

const SORT_DEFS = [
  { key: "top", label: "▲ Top" }, { key: "new", label: "✦ New" },
];

const snippet = (text, max = 220) => {
  const t = String(text || "");
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
};

export default function Forum() {
  const router = useRouter();
  const { user, loading: sessionLoading, openAuth } = useSession();

  const [sort, setSort] = useState("top");
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());
  const [showSpoilers, setShowSpoilers] = useState(false);

  // the global spoiler preference survives navigation (thread pages read it too)
  useEffect(() => {
    try { setShowSpoilers(localStorage.getItem("bnd_show_spoilers") === "1"); } catch {}
  }, []);
  const toggleSpoilers = () =>
    setShowSpoilers((v) => {
      const next = !v;
      try { localStorage.setItem("bnd_show_spoilers", next ? "1" : "0"); } catch {}
      if (!next) setRevealed(new Set()); // turning it off re-hides one-off reveals too
      return next;
    });

  const [createOpen, setCreateOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false); // mobile-only rules popup
  const [spoiler, setSpoiler] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Initial load + reload on sort change (reset list). The forum is
  // members-only: nothing is fetched until the session has a user, and a
  // login mid-visit (via the gate) fetches fresh with the member's votes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingInitial(true);
    setPosts([]);
    setNextCursor(null);
    setHasMore(false);
    portalApi(`/forum/posts?sort=${sort}&limit=6`)
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts || []);
        setNextCursor(data.nextCursor || null);
        setHasMore(!!data.hasMore);
      })
      .catch((err) => { if (!cancelled) console.error(err); })
      .finally(() => { if (!cancelled) setLoadingInitial(false); });
    return () => { cancelled = true; };
  }, [sort, user?.id]);

  const loadMore = async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await portalApi(`/forum/posts?sort=${sort}&cursor=${encodeURIComponent(nextCursor)}&limit=3`);
      setPosts((list) => [...list, ...(data.posts || [])]);
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const patchPost = (id, patch) =>
    setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // direction sent to the API is the DESIRED final state (same dir → null).
  const vote = async (post, dir) => {
    if (!user) { openAuth("login"); return; }
    const direction = post.myVote === dir ? null : dir;
    const prev = { score: post.score, myVote: post.myVote };
    const val = (v) => (v === "up" ? 1 : v === "down" ? -1 : 0);
    patchPost(post.id, { score: post.score + (val(direction) - val(post.myVote)), myVote: direction });
    try {
      const res = await portalApi(`/forum/posts/${post.id}/vote`, { method: "POST", body: { direction } });
      patchPost(post.id, { score: res.score, myVote: res.myVote });
    } catch (err) {
      if (err.code === "quiz_required") { window.location.assign("/quiz"); return; }
      patchPost(post.id, prev);
      console.error(err);
    }
  };

  const toggleReveal = (id) =>
    setRevealed((prevSet) => {
      const next = new Set(prevSet);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const onCreate = () => {
    if (!user) { openAuth("login"); return; }
    setCreateOpen(true);
  };
  const closeCreate = () => {
    setCreateOpen(false); setSpoiler(false); setTitle(""); setBodyText(""); setCreateError(""); setMediaFiles([]);
  };

  // Client-side mirror of the server caps (5 MB images / 50 MB videos, max 4).
  const addMediaFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    setCreateError("");
    setMediaFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= 4) { setCreateError("At most 4 attachments per post"); break; }
        const isVideo = f.type.startsWith("video/");
        const capMb = isVideo ? 50 : 5;
        if (f.size > capMb * 1024 * 1024) {
          setCreateError(`${f.name} is too large (max ${capMb} MB for ${isVideo ? "videos" : "images"})`);
          continue;
        }
        next.push(f);
      }
      return next;
    });
  };

  const submitCreate = async () => {
    if (!user) { openAuth("login"); return; }
    if (submitting) return;
    setSubmitting(true);
    setCreateError("");
    try {
      let data;
      if (mediaFiles.length) {
        const fd = new FormData();
        fd.append("title", title);
        fd.append("body", bodyText);
        fd.append("isSpoiler", spoiler ? "true" : "false");
        for (const f of mediaFiles) fd.append("media", f);
        data = await portalApi("/forum/posts", { method: "POST", formData: fd });
      } else {
        data = await portalApi("/forum/posts", {
          method: "POST",
          body: { title, body: bodyText, isSpoiler: spoiler },
        });
      }
      setPosts((list) => [data.post, ...list]);
      closeCreate();
    } catch (err) {
      if (err.code === "quiz_required") { window.location.assign("/quiz"); return; }
      setCreateError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // members-only: shared links land on the onboarding gate until logged in
  if (!sessionLoading && !user) {
    return (
      <div style={s("position: relative; min-height: 100vh; background: radial-gradient(130% 80% at 82% -6%, #1c0512 0%, #0b0713 46%, #07060c 100%);")}>
        <img src="/assets/web.png" alt="" style={s("position: fixed; top: -14%; right: -10%; width: min(760px, 52vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none; z-index: 0;")} />
        <ForumGate onJoin={() => openAuth("register")} onLogin={() => openAuth("login")} />
      </div>
    );
  }

  return (
    <div style={s("position: relative; min-height: 100vh; background: radial-gradient(130% 80% at 82% -6%, #1c0512 0%, #0b0713 46%, #07060c 100%);")}>
      <img src="/assets/web.png" alt="" style={s("position: fixed; top: -14%; right: -10%; width: min(760px, 52vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none; z-index: 0;")} />

      {/* LAYOUT */}
      <div className="fm-layout" style={s("position: relative; z-index: 2; max-width: 1160px; margin: 0 auto; padding: clamp(20px, 3vh, 34px) clamp(18px, 3vw, 40px) 80px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: clamp(16px, 1.6vw, 26px); align-items: start;")}>

        {/* CENTER: feed */}
        <main style={s("display: flex; flex-direction: column; gap: 14px; min-width: 0;")}>
          {/* sort tabs — two plain tabs + the permanent global spoiler toggle */}
          <div className="fm-sortbar" style={s("display: flex; align-items: center; gap: 8px;")}>
            {SORT_DEFS.map((sd) => (
              <button key={sd.key} onClick={() => setSort(sd.key)} data-web-hover="true" style={s(`display: inline-flex; align-items: center; gap: 7px; border: 0; cursor: pointer; padding: 10px 20px; border-radius: 9px; background: ${sort === sd.key ? "linear-gradient(180deg, #ff3a4a, #c00014)" : "rgba(255,255,255,0.05)"}; color: ${sort === sd.key ? "#fff" : "rgba(255,255,255,0.6)"}; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; transition: background .2s ease, color .2s ease;`)}>{sd.label}</button>
            ))}
            <button onClick={toggleSpoilers} data-web-hover="true" aria-pressed={showSpoilers} title={showSpoilers ? "Hide spoilers" : "Show spoilers"} style={s(`margin-left: auto; display: inline-flex; align-items: center; gap: 9px; border: 1px solid ${showSpoilers ? "rgba(255,60,74,0.5)" : "rgba(255,255,255,0.16)"}; cursor: pointer; padding: 8px 14px; border-radius: 999px; background: ${showSpoilers ? "rgba(255,40,60,0.1)" : "rgba(255,255,255,0.04)"}; color: ${showSpoilers ? "#ff8a95" : "rgba(255,255,255,0.6)"}; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; transition: background .2s ease, border-color .2s ease, color .2s ease;`)}>
              {showSpoilers ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c1-3.8 5-7.7 10-7.7S21 8.2 22 12c-1 3.8-5 7.7-10 7.7S3 15.8 2 12z" /><circle cx="12" cy="12" r="2.6" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 4.5A9.9 9.9 0 0112 4.3c5 0 9 3.9 10 7.7-.4 1.4-1.2 2.8-2.3 3.9M6.3 6.4C4.2 7.8 2.7 9.8 2 12c1 3.8 5 7.7 10 7.7 1.4 0 2.8-.3 4-.8" /></svg>
              )}
              <span className="fm-spoiler-label">Spoilers {showSpoilers ? "shown" : "hidden"}</span>
              <span aria-hidden="true" style={s(`width: 26px; height: 15px; border-radius: 999px; flex-shrink: 0; background: ${showSpoilers ? "linear-gradient(180deg, #ff3a4a, #c00014)" : "rgba(255,255,255,0.14)"}; position: relative; transition: background .2s ease;`)}>
                <span style={s(`position: absolute; top: 2px; left: ${showSpoilers ? "13px" : "2px"}; width: 11px; height: 11px; border-radius: 50%; background: #fff; transition: left .2s ease;`)}></span>
              </span>
            </button>
            {/* phones: the sidebar is hidden, so the rules live behind this icon */}
            <button onClick={() => setRulesOpen(true)} data-web-hover="true" aria-label="Web Rules" title="Web Rules" className="fm-rules-btn" style={s("align-items: center; justify-content: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); cursor: pointer; padding: 0;")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /></svg>
            </button>
          </div>

          {/* create prompt (desktop only — phones get the floating + button) */}
          <div className="fm-card fm-prompt" style={s("position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.24), rgba(255,40,60,0.3)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
            <div style={s("display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(150deg, rgba(16,18,34,0.96), rgba(9,10,20,0.97)); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
              <div style={s("flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center;")}>
                <SpiderAvatar size="54%" strokeWidth={4} />
              </div>
              <input onFocus={(e) => { e.target.blur(); onCreate(); }} placeholder="Share your story with the Web…" style={s("flex: 1; border: 0; outline: 0; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 11px 14px; color: #fff; font-family: inherit; font-size: 14px; min-width: 0;")} />
            </div>
          </div>

          {/* threads (or loading / empty state when the Web has no posts) */}
          {loadingInitial ? (
            <p style={s("margin: 0; padding: 34px 0; text-align: center; font-size: 13px; letter-spacing: 0.08em; color: rgba(226,226,240,0.6);")}>Loading the Web…</p>
          ) : posts.length === 0 ? (
            <EmptyState onCreate={onCreate} />
          ) : (
          <>
          {posts.map((t, i) => {
            const v = t.myVote;
            const isRevealed = showSpoilers || revealed.has(t.id);
            const blurred = t.isSpoiler && !isRevealed;
            return (
              <article key={t.id} onClick={() => router.push(`/forum/${t.id}`)} data-web-hover="true" className="fm-card" style={s(`cursor: pointer; position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.2), rgba(255,40,60,0.26)); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); animation: fm-rise .6s cubic-bezier(.16,.84,.3,1) both; animation-delay: ${Math.min(i, 8) * 60}ms;`)}>
                <div style={s("display: flex; align-items: stretch; background: linear-gradient(150deg, rgba(16,18,34,0.97), rgba(9,10,20,0.98)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
                  {/* vote rail */}
                  <div className="fm-vote" style={s("flex-shrink: 0; width: 62px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 5px; padding: 16px 0; background: rgba(255,40,60,0.05); border-right: 1px solid rgba(255,255,255,0.06);")}>
                    <button onClick={(e) => { e.stopPropagation(); vote(t, "up"); }} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={v === "up" ? "#ff5a6a" : "none"} stroke={v === "up" ? "#ff5a6a" : "rgba(255,255,255,0.45)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
                    </button>
                    <span style={s(`font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 600; color: ${v === "up" ? "#ff5a6a" : v === "down" ? "#4d8bff" : "#fff"};`)}>{fmtCount(t.score)}</span>
                    <button onClick={(e) => { e.stopPropagation(); vote(t, "down"); }} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={v === "down" ? "#4d8bff" : "none"} stroke={v === "down" ? "#4d8bff" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-8h-4V5h-6v6H5z" /></svg>
                    </button>
                  </div>
                  {/* body */}
                  <div className="fm-post-body" style={s("flex: 1; min-width: 0; padding: 16px 20px;")}>
                    <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 9px; font-size: 11.5px; color: rgba(255,255,255,0.5); flex-wrap: wrap;")}>
                      {t.author?.avatarPic && (
                        <img src={t.author.avatarPic} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,60,74,0.45)", flexShrink: 0 }} />
                      )}
                      <span>Posted by u/{t.author?.username}</span>
                      <span style={{ opacity: 0.5 }}>·</span><span>{relTime(t.createdAt)}</span>
                      {t.editedAt && (
                        <>
                          <span style={{ opacity: 0.5 }}>·</span>
                          <span style={s("font-style: italic; color: rgba(255,255,255,0.45);")}>edited {relTime(t.editedAt)}</span>
                        </>
                      )}
                      {t.flair && (
                        <span style={s("display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: rgba(255,40,60,0.12); border: 1px solid rgba(255,60,74,0.35); color: #ff8a95; font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;")}>{t.flair}</span>
                      )}
                      {t.isSpoiler && isRevealed && !showSpoilers && (
                        <button onClick={(e) => { e.stopPropagation(); toggleReveal(t.id); }} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(255,60,74,0.35); cursor: pointer; padding: 3px 10px; border-radius: 999px; background: transparent; color: #ff8a95; font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;")}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 4.5A9.9 9.9 0 0112 4.3c5 0 9 3.9 10 7.7-.4 1.4-1.2 2.8-2.3 3.9M6.3 6.4C4.2 7.8 2.7 9.8 2 12c1 3.8 5 7.7 10 7.7 1.4 0 2.8-.3 4-.8" /></svg>
                          Hide spoiler
                        </button>
                      )}
                    </div>
                    <h3 style={s(`font-size: clamp(17px, 1.7vw, 21px); font-weight: 500; color: #fff; line-height: 1.15; margin-bottom: 8px; ${blurred ? "filter: blur(6px); user-select: none;" : ""}`)}>{t.title}</h3>
                    {t.isSpoiler ? (
                      <div onClick={(e) => { if (!showSpoilers) { e.stopPropagation(); toggleReveal(t.id); } }} style={s("position: relative; margin: 0 0 14px;")}>
                        <p className="fm-snippet" style={s(`margin: 0; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty; ${blurred ? "filter: blur(6px); user-select: none;" : ""}`)}>{snippet(t.body)}</p>
                        {blurred && (
                          <span style={s("position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; background: rgba(12,10,22,0.85); border: 1px solid rgba(255,60,74,0.45); color: #ff8a95; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap;")}>Spoiler — tap to reveal</span>
                        )}
                      </div>
                    ) : (
                      <p className="fm-snippet" style={s("margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>{snippet(t.body)}</p>
                    )}
                    {t.media?.length > 0 && (
                      <div className="fm-media" style={s(`position: relative; margin: 0 0 14px; max-width: 460px; border-radius: 11px; overflow: hidden; background: #141018; border: 1px solid rgba(255,255,255,0.08); ${blurred ? "filter: blur(14px);" : ""}`)}>
                        {t.media[0].kind === "video" ? (
                          <video src={t.media[0].url} controls preload="metadata" onClick={(e) => e.stopPropagation()} style={s("display: block; width: 100%; max-height: 300px; background: #000;")} />
                        ) : (
                          <img src={t.media[0].url} alt="" loading="lazy" style={s("display: block; width: 100%; max-height: 300px; object-fit: cover;")} />
                        )}
                        {t.media.length > 1 && (
                          <span style={s("position: absolute; top: 8px; right: 8px; padding: 3px 9px; border-radius: 999px; background: rgba(9,10,20,0.8); color: rgba(255,255,255,0.85); font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.08em;")}>+{t.media.length - 1} more</span>
                        )}
                      </div>
                    )}
                    <div style={s("display: flex; align-items: center; gap: 10px; flex-wrap: wrap;")}>
                      <span style={s("display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.7);")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 01-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1121 11.5z" /></svg>{fmtCount(t.commentCount)} Comments</span>
                      <ShareButton thread={t} stop />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {hasMore && (
            <div style={s("display: flex; justify-content: center; padding: 14px 0;")}>
              <button onClick={loadMore} disabled={loadingMore} data-web-hover="true" className="fm-cta" style={s(`position: relative; border: 0; padding: 0; background: transparent; cursor: ${loadingMore ? "default" : "pointer"}; opacity: ${loadingMore ? "0.7" : "1"};`)}>
                <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);")}>
                  <span style={s("position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 9px; padding: 13px 34px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="fm-sheen"></span>{loadingMore ? "Loading…" : "Load more stories"}</span>
                </span>
              </button>
            </div>
          )}
          </>
          )}
        </main>

        {/* RIGHT: sidebar */}
        <aside className="fm-right" style={s("position: sticky; top: 92px; display: flex; flex-direction: column; gap: 16px;")}>
          {/* about */}
          <div style={s("position: relative; padding: 1px; background: linear-gradient(150deg, rgba(255,40,60,0.5), rgba(120,150,220,0.35)); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);")}>
            <div style={s("background: linear-gradient(150deg, rgba(20,10,18,0.96), rgba(9,10,20,0.97)); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); padding: 18px 18px 20px;")}>
              <h3 style={s("font-size: 16px; color: #fff; margin-bottom: 10px;")}>The Spider-Verse Forum</h3>
              <p style={s("margin: 0 0 16px; font-size: 13px; line-height: 1.55; color: rgba(226,226,240,0.7);")}>Where the whole Web talks. Real people, real identities, real stories. Pick a thread and add your voice.</p>
              <button onClick={onCreate} data-web-hover="true" className="fm-cta" style={s("width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
                <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                  <span style={s("position: relative; overflow: hidden; display: block; text-align: center; padding: 12px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase;")}><span className="fm-sheen"></span>Create Post</span>
                </span>
              </button>
            </div>
          </div>

          {/* rules */}
          <div style={s("padding: 16px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;")}>
            <h3 style={s("font-size: 13px; letter-spacing: 0.16em; color: rgba(255,255,255,0.85); margin-bottom: 12px;")}>Web Rules</h3>
            {RULES.map((r) => (
              <div key={r.n} style={s("display: flex; gap: 10px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: rgba(226,226,240,0.66);")}><span style={s("font-family: 'Oswald', sans-serif; color: #ff5a6a; flex-shrink: 0;")}>{r.n}</span><span>{r.text}</span></div>
            ))}
          </div>
        </aside>
      </div>

      {/* CREATE POST MODAL */}
      {createOpen && (
        <div onClick={closeCreate} style={s("position: fixed; inset: 0; z-index: 90; background: rgba(4,4,10,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fm-rise .3s ease both;")}>
          <div onClick={(e) => e.stopPropagation()} style={s("position: relative; width: min(560px, 100%); padding: 2px; background: linear-gradient(150deg, #ff2233, #8b000d); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 100px rgba(0,0,0,0.6);")}>
            <div style={s("background: linear-gradient(150deg, rgba(18,12,20,0.98), rgba(9,8,14,0.99)); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: 30px 32px;")}>
              <h3 style={s("font-size: 22px; color: #fff; margin-bottom: 6px;")}>Share your story</h3>
              <p style={s("margin: 0 0 20px; font-size: 13px; color: rgba(226,226,240,0.6);")}>Post to the Web and let the Verse hear you.</p>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="An interesting title…" style={s("width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px; margin-bottom: 12px;")} />
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={4} placeholder="Tell the Web what happened…" style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 14px; line-height: 1.5; margin-bottom: 12px;")}></textarea>

              {/* photo / video attachments (max 4 · images ≤5MB · videos ≤50MB) */}
              <div style={s("margin-bottom: 14px;")}>
                <label data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border: 1px dashed rgba(255,255,255,0.25); border-radius: 9px; cursor: pointer; color: rgba(255,255,255,0.7); font-family: 'Oswald', sans-serif; font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase;")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  Add photo / video
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    multiple
                    onChange={(e) => { addMediaFiles(e.target.files); e.target.value = ""; }}
                    style={s("display: none;")}
                  />
                </label>
                {mediaFiles.length > 0 && (
                  <div style={s("display: flex; flex-direction: column; gap: 6px; margin-top: 10px;")}>
                    {mediaFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} style={s("display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-size: 12.5px; color: rgba(226,226,240,0.8);")}>
                        <span style={s("color: #ff8a95; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; flex-shrink: 0;")}>{f.type.startsWith("video/") ? "video" : "image"}</span>
                        <span style={s("min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{f.name}</span>
                        <span style={s("flex-shrink: 0; color: rgba(255,255,255,0.45);")}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button type="button" onClick={() => setMediaFiles((prev) => prev.filter((_, j) => j !== i))} data-web-hover="true" aria-label="Remove attachment" style={s("margin-left: auto; flex-shrink: 0; border: 0; background: transparent; color: rgba(255,255,255,0.55); font-size: 15px; cursor: pointer; line-height: 1; padding: 2px 4px;")}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {createError && (
                <p style={s("margin: -8px 0 14px; font-size: 12.5px; line-height: 1.4; color: #ff5a6a;")}>{createError}</p>
              )}
              <div style={s("display: flex; align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap;")}>
                <button type="button" onClick={() => setSpoiler((v) => !v)} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 10px; border: 0; background: transparent; cursor: pointer; padding: 6px 2px;")}>
                  <span style={s(`width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; border: 1.5px solid ${spoiler ? "#ff3a4a" : "rgba(255,255,255,0.3)"}; background: ${spoiler ? "linear-gradient(180deg,#ff3a4a,#c00014)" : "transparent"}; display: flex; align-items: center; justify-content: center; transition: border-color .18s ease, background .18s ease;`)}>
                    {spoiler && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span style={s("font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.75);")}>Mark as spoiler</span>
                </button>
                <div style={s("display: flex; align-items: center; gap: 12px;")}>
                <button onClick={closeCreate} data-web-hover="true" style={s("border: 0; background: transparent; color: rgba(255,255,255,0.6); font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; padding: 12px 16px;")}>Cancel</button>
                <button onClick={submitCreate} disabled={submitting} data-web-hover="true" className="fm-cta" style={s(`position: relative; border: 0; padding: 0; background: transparent; cursor: ${submitting ? "default" : "pointer"}; opacity: ${submitting ? "0.7" : "1"};`)}>
                  <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                    <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 12px 26px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;")}><span className="fm-sheen"></span>{submitting ? "Posting…" : "Post to the Web"}</span>
                  </span>
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEB RULES POPUP (phones — opened from the sortbar shield icon) */}
      {rulesOpen && (
        <div onClick={() => setRulesOpen(false)} style={s("position: fixed; inset: 0; z-index: 90; background: rgba(4,4,10,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fm-rise .3s ease both;")}>
          <div onClick={(e) => e.stopPropagation()} style={s("position: relative; width: min(400px, 100%); padding: 2px; background: linear-gradient(150deg, rgba(255,40,60,0.55), rgba(120,150,220,0.4)); clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); box-shadow: 0 40px 100px rgba(0,0,0,0.6);")}>
            <div style={s("background: linear-gradient(150deg, rgba(20,10,18,0.97), rgba(9,10,20,0.98)); clip-path: polygon(19px 0, 100% 0, 100% calc(100% - 19px), calc(100% - 19px) 100%, 0 100%, 0 19px); padding: 24px 24px 18px;")}>
              <h3 style={s("display: flex; align-items: center; gap: 9px; font-size: 14px; letter-spacing: 0.16em; text-transform: uppercase; color: #fff; margin-bottom: 12px;")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5a6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /></svg>
                Web Rules
              </h3>
              {RULES.map((r) => (
                <div key={r.n} style={s("display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.06); font-size: 13px; line-height: 1.5; color: rgba(226,226,240,0.72);")}><span style={s("font-family: 'Oswald', sans-serif; color: #ff5a6a; flex-shrink: 0;")}>{r.n}</span><span>{r.text}</span></div>
              ))}
            </div>
            <button onClick={() => setRulesOpen(false)} aria-label="Close" data-web-hover="true" style={s("position: absolute; top: 12px; right: 12px; z-index: 3; width: 34px; height: 34px; border-radius: 50%; border: 0; background: linear-gradient(180deg, #ff3a4a, #c00014); color: #fff; font-size: 18px; cursor: pointer; box-shadow: 0 8px 22px rgba(0,0,0,0.5); font-family: inherit; line-height: 1; display: flex; align-items: center; justify-content: center;")}>×</button>
          </div>
        </div>
      )}

      {/* phones: floating create button — the one-tap way to post */}
      <button onClick={onCreate} aria-label="Create post" data-web-hover="true" className="fm-fab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
