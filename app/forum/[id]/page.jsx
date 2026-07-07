/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { s } from "@/lib/style";
import SpiderAvatar from "@/components/SpiderAvatar";
import ShareButton from "@/components/forum/ShareButton";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";
import { relTime, fmtCount } from "@/lib/time";

const mentionOf = (author) => "@" + String(author).replace(/^u\//, "");
const voteVal = (v) => (v === "up" ? 1 : v === "down" ? -1 : 0);

// Render a comment body with @mentions highlighted.
function Body({ text }) {
  const parts = String(text).split(/(@[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={i} style={{ color: "#ff8a96", fontWeight: 600 }}>{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function Votes({ score, myVote, onVote, wide }) {
  const v = myVote;
  const sz = wide ? 20 : 14;
  return (
    <div style={s("display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.55);")}>
      <button onClick={() => onVote("up")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 0; line-height: 0;")}>
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill={v === "up" ? "#ff5a6a" : "none"} stroke={v === "up" ? "#ff5a6a" : "rgba(255,255,255,0.4)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
      </button>
      <span style={s(`font-family: 'Oswald', sans-serif; font-weight: 600; color: ${v === "up" ? "#ff5a6a" : v === "down" ? "#4d8bff" : "rgba(255,255,255,0.8)"};`)}>{fmtCount(score)}</span>
      <button onClick={() => onVote("down")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 0; line-height: 0;")}>
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill={v === "down" ? "#4d8bff" : "none"} stroke={v === "down" ? "#4d8bff" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-8h-4V5h-6v6H5z" /></svg>
      </button>
    </div>
  );
}

function PostVoteRail({ score, myVote, onVote }) {
  const v = myVote;
  return (
    <div style={s("flex-shrink: 0; width: 64px; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 18px 0; background: rgba(255,40,60,0.05); border-right: 1px solid rgba(255,255,255,0.06);")}>
      <button onClick={() => onVote("up")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={v === "up" ? "#ff5a6a" : "none"} stroke={v === "up" ? "#ff5a6a" : "rgba(255,255,255,0.45)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
      </button>
      <span style={s(`font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; color: ${v === "up" ? "#ff5a6a" : v === "down" ? "#4d8bff" : "#fff"};`)}>{fmtCount(score)}</span>
      <button onClick={() => onVote("down")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={v === "down" ? "#4d8bff" : "none"} stroke={v === "down" ? "#4d8bff" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-8h-4V5h-6v6H5z" /></svg>
      </button>
    </div>
  );
}

function CommentAvatar({ small }) {
  const d = small ? 30 : 34;
  return (
    <div style={s(`flex-shrink: 0; width: ${d}px; height: ${d}px; border-radius: 9px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center;`)}>
      <SpiderAvatar size="54%" strokeWidth={4} />
    </div>
  );
}

export default function ForumPost() {
  const { id } = useParams();
  const router = useRouter();
  const { user, openAuth } = useSession();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  // owner (author) actions: inline edit + two-step delete
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerErr, setOwnerErr] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [roots, setRoots] = useState([]);
  const [total, setTotal] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [topDraft, setTopDraft] = useState("");
  const [topErr, setTopErr] = useState("");
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyErr, setReplyErr] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const commentsP = portalApi(`/forum/posts/${id}/comments`).catch(() => null);
      try {
        const { post: p } = await portalApi(`/forum/posts/${id}`);
        if (cancelled) return;
        setPost(p);
        // respect the forum's global spoiler toggle
        try { setRevealed(localStorage.getItem("bnd_show_spoilers") === "1"); } catch { setRevealed(false); }
        const c = await commentsP;
        if (cancelled) return;
        if (c) {
          setRoots(c.comments);
          setTotal(c.total);
        }
      } catch {
        if (!cancelled) setPost(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Patch one comment (root or reply) in the tree.
  const updateComment = (cid, patch) =>
    setRoots((rs) =>
      rs.map((r) => {
        if (r.id === cid) return { ...r, ...patch(r) };
        if (r.replies.some((rep) => rep.id === cid)) {
          return { ...r, replies: r.replies.map((rep) => (rep.id === cid ? { ...rep, ...patch(rep) } : rep)) };
        }
        return r;
      })
    );

  // Optimistic desired-direction voting: send the final state, reconcile with the server.
  const votePost = async (dir) => {
    if (!user) return openAuth("login");
    if (!post) return;
    const desired = post.myVote === dir ? null : dir;
    const prev = { score: post.score, myVote: post.myVote };
    setPost((p) => (p ? { ...p, score: p.score + voteVal(desired) - voteVal(p.myVote), myVote: desired } : p));
    try {
      const res = await portalApi(`/forum/posts/${id}/vote`, { method: "POST", body: { direction: desired } });
      setPost((p) => (p ? { ...p, score: res.score, myVote: res.myVote } : p));
    } catch (err) {
      if (err.code === "quiz_required") { window.location.href = "/quiz"; return; }
      setPost((p) => (p ? { ...p, ...prev } : p));
    }
  };

  const voteComment = async (c, dir) => {
    if (!user) return openAuth("login");
    const desired = c.myVote === dir ? null : dir;
    const prev = { score: c.score, myVote: c.myVote };
    updateComment(c.id, (cur) => ({ score: cur.score + voteVal(desired) - voteVal(cur.myVote), myVote: desired }));
    try {
      const res = await portalApi(`/forum/comments/${c.id}/vote`, { method: "POST", body: { direction: desired } });
      updateComment(c.id, () => ({ score: res.score, myVote: res.myVote }));
    } catch (err) {
      if (err.code === "quiz_required") { window.location.href = "/quiz"; return; }
      updateComment(c.id, () => prev);
    }
  };

  const isMine = !!user && !!post && post.author.username === user.username;

  const startEdit = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setOwnerErr("");
    setDeleteArmed(false);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (ownerBusy) return;
    setOwnerBusy(true);
    setOwnerErr("");
    try {
      const { post: p } = await portalApi(`/forum/posts/${id}`, {
        method: "PATCH",
        body: { title: editTitle, body: editBody },
      });
      setPost(p); // server copy carries the new editedAt
      setEditing(false);
    } catch (err) {
      setOwnerErr(err.message);
    } finally {
      setOwnerBusy(false);
    }
  };

  // First click arms the button ("Really delete?"), second click deletes.
  const deletePost = async () => {
    if (!deleteArmed) { setDeleteArmed(true); return; }
    if (ownerBusy) return;
    setOwnerBusy(true);
    setOwnerErr("");
    try {
      await portalApi(`/forum/posts/${id}`, { method: "DELETE" });
      router.replace("/forum");
    } catch (err) {
      setOwnerErr(err.message);
      setDeleteArmed(false);
      setOwnerBusy(false);
    }
  };

  const postTop = async () => {
    const text = topDraft.trim();
    if (!text) return;
    if (!user) return openAuth("login");
    if (submitting.current) return;
    submitting.current = true;
    setTopErr("");
    try {
      const { comment } = await portalApi(`/forum/posts/${id}/comments`, { method: "POST", body: { body: text } });
      setRoots((rs) => [comment, ...rs]);
      setTotal((t) => t + 1);
      setTopDraft("");
    } catch (err) {
      if (err.code === "quiz_required") { window.location.href = "/quiz"; return; }
      setTopErr(err.message);
    } finally {
      submitting.current = false;
    }
  };

  const openReply = (comment) => {
    setOpenReplyId(comment.id);
    setReplyErr("");
    setReplyDraft(mentionOf("u/" + comment.author.username) + " ");
  };

  const postReply = async (rootId) => {
    const text = replyDraft.trim();
    if (!text) return;
    if (!user) return openAuth("login");
    if (submitting.current) return;
    submitting.current = true;
    setReplyErr("");
    try {
      const { reply } = await portalApi(`/forum/comments/${rootId}/replies`, { method: "POST", body: { body: text } });
      setRoots((rs) => rs.map((r) => (r.id === rootId ? { ...r, replies: [...r.replies, reply] } : r)));
      setTotal((t) => t + 1);
      setOpenReplyId(null);
      setReplyDraft("");
    } catch (err) {
      if (err.code === "quiz_required") { window.location.href = "/quiz"; return; }
      setReplyErr(err.message);
    } finally {
      submitting.current = false;
    }
  };

  const ReplyBox = ({ rootId }) => (
    <div style={s("margin-top: 10px;")}>
      <textarea autoFocus value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} rows={2} placeholder="Write a reply… use @ to mention someone" style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; padding: 10px 12px; color: #fff; font-family: inherit; font-size: 13.5px; line-height: 1.5;")}></textarea>
      {replyErr && <div style={s("margin-top: 6px; font-size: 12px; color: #ff8a96;")}>{replyErr}</div>}
      <div style={s("display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;")}>
        <button onClick={() => { setOpenReplyId(null); setReplyDraft(""); setReplyErr(""); }} data-web-hover="true" style={s("border: 0; background: transparent; color: rgba(255,255,255,0.55); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; padding: 8px 12px;")}>Cancel</button>
        <button onClick={() => postReply(rootId)} data-web-hover="true" className="fm-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
          <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);")}>
            <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 9px 20px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;")}><span className="fm-sheen"></span>Reply</span>
          </span>
        </button>
      </div>
    </div>
  );

  const CommentRow = ({ c, rootId, small }) => {
    const isMe = c.author.username === user?.username;
    return (
      <div style={s("display: flex; gap: 12px;")}>
        <CommentAvatar small={small} />
        <div style={s("min-width: 0; flex: 1;")}>
          <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12px; color: rgba(255,255,255,0.55); flex-wrap: wrap;")}>
            <span style={s(`font-family: 'Oswald', sans-serif; letter-spacing: 0.03em; color: ${isMe ? "#ff8a96" : "rgba(255,255,255,0.85)"};`)}>{"u/" + c.author.username}{isMe ? " (you)" : ""}</span>
            <span style={{ opacity: 0.5 }}>·</span><span>{relTime(c.createdAt)}</span>
          </div>
          <p style={s("margin: 0 0 8px; font-size: 14px; line-height: 1.55; color: rgba(226,226,240,0.82);")}><Body text={c.body} /></p>
          <div style={s("display: flex; align-items: center; gap: 16px;")}>
            <Votes score={c.score} myVote={c.myVote} onVote={(dir) => voteComment(c, dir)} />
            <button onClick={() => openReply(c)} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55); padding: 0;")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17l-5-5 5-5" /><path d="M20 18v-2a4 4 0 00-4-4H4" /></svg>Reply
            </button>
          </div>
          {openReplyId === c.id && <ReplyBox rootId={rootId} />}
        </div>
      </div>
    );
  };

  return (
    <div style={s("position: relative; min-height: 100vh; background: radial-gradient(130% 80% at 82% -6%, #1c0512 0%, #0b0713 46%, #07060c 100%);")}>
      <img src="/assets/web.png" alt="" style={s("position: fixed; top: -14%; right: -10%; width: min(760px, 52vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none; z-index: 0;")} />

      <div style={s("position: relative; z-index: 2; max-width: 780px; margin: 0 auto; padding: clamp(18px, 3vh, 30px) clamp(16px, 4vw, 32px) 90px; display: flex; flex-direction: column; gap: 16px;")}>
        <Link href="/forum" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.55);")}>‹ Back to the Forum</Link>

        {loading ? null : !post ? (
          <div style={s("padding: 60px 24px; text-align: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;")}>
            <h1 style={s("font-family: 'Oswald', sans-serif; font-size: 28px; color: #fff; margin-bottom: 10px;")}>Thread not found</h1>
            <p style={s("margin: 0 0 20px; font-size: 14px; color: rgba(226,226,240,0.6);")}>This story may have swung off into another part of the Web.</p>
            <Link href="/forum" data-web-hover="true" className="link-hover-red" style={s("font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #ff5a6a; text-decoration: none;")}>Return to the Forum ›</Link>
          </div>
        ) : (
          <>
            {/* POST */}
            <article className="fm-card" style={s("position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.2), rgba(255,40,60,0.26)); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);")}>
              <div style={s("display: flex; align-items: stretch; background: linear-gradient(150deg, rgba(16,18,34,0.97), rgba(9,10,20,0.98)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
                <PostVoteRail score={post.score} myVote={post.myVote} onVote={votePost} />
                <div style={s("flex: 1; min-width: 0; padding: 18px 22px;")}>
                  <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; color: rgba(255,255,255,0.5); flex-wrap: wrap;")}>
                    <span>Posted by u/{post.author.username}</span>
                    <span style={{ opacity: 0.5 }}>·</span><span>{relTime(post.createdAt)}</span>
                    {post.editedAt && (
                      <>
                        <span style={{ opacity: 0.5 }}>·</span>
                        <span style={s("font-style: italic; color: rgba(255,255,255,0.45);")}>edited {relTime(post.editedAt)}</span>
                      </>
                    )}
                    {isMine && !editing && (
                      <span style={s("margin-left: auto; display: inline-flex; align-items: center; gap: 14px;")}>
                        <button onClick={startEdit} data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; cursor: pointer; padding: 0; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55); transition: color 200ms ease;")}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>Edit
                        </button>
                        <button onClick={deletePost} data-web-hover="true" style={s(`display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; cursor: pointer; padding: 0; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${deleteArmed ? "#ff5a6a" : "rgba(255,255,255,0.55)"}; transition: color 200ms ease;`)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>{deleteArmed ? "Really delete?" : "Delete"}
                        </button>
                      </span>
                    )}
                  </div>
                  {ownerErr && !editing && <div style={s("margin: -4px 0 10px; font-size: 12px; color: #ff8a96;")}>{ownerErr}</div>}
                  {editing ? (
                    <div style={s("margin-bottom: 16px;")}>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="An interesting title…" style={s("width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 15px; margin-bottom: 10px;")} />
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} placeholder="Tell the Web what happened…" style={s("width: 100%; box-sizing: border-box; resize: vertical; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 14px; line-height: 1.6;")}></textarea>
                      {ownerErr && <div style={s("margin-top: 8px; font-size: 12px; color: #ff8a96;")}>{ownerErr}</div>}
                      <div style={s("display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;")}>
                        <button onClick={() => { setEditing(false); setOwnerErr(""); }} data-web-hover="true" style={s("border: 0; background: transparent; color: rgba(255,255,255,0.55); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; padding: 8px 12px;")}>Cancel</button>
                        <button onClick={saveEdit} disabled={ownerBusy} data-web-hover="true" className="fm-cta" style={s(`position: relative; border: 0; padding: 0; background: transparent; cursor: ${ownerBusy ? "default" : "pointer"}; opacity: ${ownerBusy ? "0.7" : "1"};`)}>
                          <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);")}>
                            <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 9px 20px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;")}><span className="fm-sheen"></span>{ownerBusy ? "Saving…" : "Save changes"}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                  <>
                  <h1 style={s("font-family: 'Oswald', sans-serif; font-weight: 500; font-size: clamp(22px, 3.4vw, 30px); line-height: 1.12; color: #fff; margin-bottom: 14px;")}>{post.title}</h1>
                  {post.isSpoiler && !revealed ? (
                    <div style={s("position: relative; margin: 0 0 16px;")}>
                      <p style={s("margin: 0; font-size: 15px; line-height: 1.65; color: rgba(226,226,240,0.82); text-wrap: pretty; filter: blur(8px); user-select: none; pointer-events: none;")}>{post.body}</p>
                      <div style={s("position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;")}>
                        <button onClick={() => setRevealed(true)} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255,60,74,0.4); background: rgba(9,10,20,0.85); cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #ff8a96;")}>Spoiler — tap to reveal</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.isSpoiler && (
                        <button onClick={() => setRevealed(false)} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 5px; margin: 0 0 10px; border: 1px solid rgba(255,60,74,0.35); cursor: pointer; padding: 4px 12px; border-radius: 999px; background: transparent; color: #ff8a95; font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase;")}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.9 4.5A9.9 9.9 0 0112 4.3c5 0 9 3.9 10 7.7-.4 1.4-1.2 2.8-2.3 3.9M6.3 6.4C4.2 7.8 2.7 9.8 2 12c1 3.8 5 7.7 10 7.7 1.4 0 2.8-.3 4-.8" /></svg>
                          Hide spoiler
                        </button>
                      )}
                      <p style={s("margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: rgba(226,226,240,0.82); text-wrap: pretty;")}>{post.body}</p>
                    </>
                  )}
                  </>
                  )}
                  {post.media?.length > 0 && (
                    <div style={s(`display: flex; flex-direction: column; gap: 12px; margin: 0 0 16px; ${post.isSpoiler && !revealed ? "filter: blur(16px); pointer-events: none;" : ""}`)}>
                      {post.media.map((m) =>
                        m.kind === "video" ? (
                          <video key={m.id} src={m.url} controls preload="metadata" style={s("display: block; width: 100%; max-width: 560px; max-height: 380px; border-radius: 11px; background: #000; border: 1px solid rgba(255,255,255,0.08);")} />
                        ) : (
                          <img key={m.id} src={m.url} alt="" loading="lazy" style={s("display: block; width: 100%; max-width: 560px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.08);")} />
                        )
                      )}
                    </div>
                  )}
                  <div style={s("display: flex; align-items: center; gap: 10px; flex-wrap: wrap;")}>
                    <span style={s("display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.7);")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 01-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1121 11.5z" /></svg>{fmtCount(total)} Comments</span>
                    <ShareButton thread={post} />
                  </div>
                </div>
              </div>
            </article>

            {/* ADD COMMENT */}
            <div className="fm-card" style={s("position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.24), rgba(255,40,60,0.3)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
              <div style={s("padding: 16px 18px; background: linear-gradient(150deg, rgba(16,18,34,0.96), rgba(9,10,20,0.97)); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
                <textarea value={topDraft} onChange={(e) => setTopDraft(e.target.value)} rows={3} placeholder="Add your voice to the Web… use @ to mention someone" style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 14px; line-height: 1.5;")}></textarea>
                {topErr && <div style={s("margin-top: 8px; font-size: 12px; color: #ff8a96;")}>{topErr}</div>}
                <div style={s("display: flex; justify-content: flex-end; margin-top: 12px;")}>
                  <button onClick={postTop} data-web-hover="true" className="fm-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
                    <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                      <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 11px 26px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.14em; text-transform: uppercase;")}><span className="fm-sheen"></span>Comment</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* COMMENTS */}
            <div style={s("font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin: 8px 2px 0;")}>{fmtCount(total)} Comments</div>
            <div style={s("display: flex; flex-direction: column; gap: 10px;")}>
              {roots.length === 0 && (
                <div style={s("padding: 30px 18px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12); border-radius: 12px; color: rgba(255,255,255,0.6); font-size: 14px;")}>No comments yet — be the first to add your voice to the Web.</div>
              )}
              {roots.map((r) => (
                <div key={r.id} style={s("padding: 16px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;")}>
                  <CommentRow c={r} rootId={r.id} />
                  {r.replies.length > 0 && (
                    <div style={s("margin-top: 14px; padding-left: 16px; border-left: 2px solid rgba(255,60,74,0.25); display: flex; flex-direction: column; gap: 14px;")}>
                      {r.replies.map((rep) => (
                        <CommentRow key={rep.id} c={rep} rootId={r.id} small />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
