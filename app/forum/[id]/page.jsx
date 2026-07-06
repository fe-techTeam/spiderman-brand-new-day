/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { s } from "@/lib/style";
import ImageSlot from "@/components/ImageSlot";
import SpiderAvatar from "@/components/SpiderAvatar";
import ShareButton from "@/components/forum/ShareButton";
import { useForum } from "@/components/forum/ForumProvider";
import { getThread, commentsFor, ME } from "@/lib/forumData";

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "" + n);
const mentionOf = (author) => "@" + String(author).replace(/^u\//, "");
const BOTS = ["u/webhead", "u/miles_g", "u/gwen_s", "u/thwip_thwip", "u/queensfinest"];
const BOT_LINES = [
  "@you couldn't have said it better myself.",
  "@you this is the energy the Web needs.",
  "@you saving this — thanks for adding your voice.",
  "@you okay this actually gave me chills.",
];

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

function Votes({ base, wide }) {
  const [v, setV] = useState(null);
  const net = base + (v === "up" ? 1 : v === "down" ? -1 : 0);
  const toggle = (dir) => setV((cur) => (cur === dir ? null : dir));
  const sz = wide ? 20 : 14;
  return (
    <div style={s("display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.55);")}>
      <button onClick={() => toggle("up")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 0; line-height: 0;")}>
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill={v === "up" ? "#ff5a6a" : "none"} stroke={v === "up" ? "#ff5a6a" : "rgba(255,255,255,0.4)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
      </button>
      <span style={s(`font-family: 'Oswald', sans-serif; font-weight: 600; color: ${v === "up" ? "#ff5a6a" : v === "down" ? "#4d8bff" : "rgba(255,255,255,0.8)"};`)}>{fmt(net)}</span>
      <button onClick={() => toggle("down")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 0; line-height: 0;")}>
        <svg width={sz} height={sz} viewBox="0 0 24 24" fill={v === "down" ? "#4d8bff" : "none"} stroke={v === "down" ? "#4d8bff" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-8h-4V5h-6v6H5z" /></svg>
      </button>
    </div>
  );
}

function PostVoteRail({ base }) {
  const [v, setV] = useState(null);
  const net = base + (v === "up" ? 1 : v === "down" ? -1 : 0);
  const toggle = (dir) => setV((cur) => (cur === dir ? null : dir));
  return (
    <div style={s("flex-shrink: 0; width: 64px; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 18px 0; background: rgba(255,40,60,0.05); border-right: 1px solid rgba(255,255,255,0.06);")}>
      <button onClick={() => toggle("up")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={v === "up" ? "#ff5a6a" : "none"} stroke={v === "up" ? "#ff5a6a" : "rgba(255,255,255,0.45)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
      </button>
      <span style={s(`font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; color: ${v === "up" ? "#ff5a6a" : v === "down" ? "#4d8bff" : "#fff"};`)}>{fmt(net)}</span>
      <button onClick={() => toggle("down")} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
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
  const forum = useForum();
  const thread = getThread(id);

  const [roots, setRoots] = useState(() => {
    if (!thread) return [];
    const base = commentsFor(thread).map((c) => ({ ...c, replies: [] }));
    if (base[0]) {
      base[0].replies.push({ id: base[0].id + "-r0", author: "u/nightmonkey", time: "2m", body: "@you this is exactly it — saving this thread.", votes: 6 });
    }
    return base;
  });
  const [topDraft, setTopDraft] = useState("");
  const [openReplyId, setOpenReplyId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const seq = useRef(0);
  const botIdx = useRef(0);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const simulateNotify = () => {
    if (!forum) return;
    const who = BOTS[botIdx.current++ % BOTS.length];
    const line = BOT_LINES[seq.current % BOT_LINES.length];
    const t = setTimeout(() => {
      forum.add({ kind: "reply", who, snippet: line, href: `/forum/${id}` });
    }, 3500);
    timers.current.push(t);
  };

  const postTop = () => {
    if (!topDraft.trim()) return;
    setRoots((rs) => [{ id: "me-" + seq.current++, author: ME, time: "now", body: topDraft.trim(), votes: 1, replies: [] }, ...rs]);
    setTopDraft("");
    simulateNotify();
  };

  const openReply = (comment) => {
    setOpenReplyId(comment.id);
    setReplyDraft(mentionOf(comment.author) + " ");
  };

  const postReply = (rootId) => {
    if (!replyDraft.trim()) return;
    setRoots((rs) =>
      rs.map((r) =>
        r.id === rootId
          ? { ...r, replies: [...r.replies, { id: "me-" + seq.current++, author: ME, time: "now", body: replyDraft.trim(), votes: 1 }] }
          : r
      )
    );
    setOpenReplyId(null);
    setReplyDraft("");
    simulateNotify();
  };

  const total = roots.reduce((a, r) => a + 1 + r.replies.length, 0);

  const ReplyBox = ({ rootId }) => (
    <div style={s("margin-top: 10px;")}>
      <textarea autoFocus value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} rows={2} placeholder="Write a reply… use @ to mention someone" style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; padding: 10px 12px; color: #fff; font-family: inherit; font-size: 13.5px; line-height: 1.5;")}></textarea>
      <div style={s("display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;")}>
        <button onClick={() => { setOpenReplyId(null); setReplyDraft(""); }} data-web-hover="true" style={s("border: 0; background: transparent; color: rgba(255,255,255,0.55); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; padding: 8px 12px;")}>Cancel</button>
        <button onClick={() => postReply(rootId)} data-web-hover="true" className="fm-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
          <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);")}>
            <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 9px 20px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(9px 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%, 0 9px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;")}><span className="fm-sheen"></span>Reply</span>
          </span>
        </button>
      </div>
    </div>
  );

  const CommentRow = ({ c, rootId, small }) => (
    <div style={s("display: flex; gap: 12px;")}>
      <CommentAvatar small={small} />
      <div style={s("min-width: 0; flex: 1;")}>
        <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 12px; color: rgba(255,255,255,0.55); flex-wrap: wrap;")}>
          <span style={s(`font-family: 'Oswald', sans-serif; letter-spacing: 0.03em; color: ${c.author === ME ? "#ff8a96" : "rgba(255,255,255,0.85)"};`)}>{c.author}{c.author === ME ? " (you)" : ""}</span>
          <span style={{ opacity: 0.5 }}>·</span><span>{c.time}</span>
        </div>
        <p style={s("margin: 0 0 8px; font-size: 14px; line-height: 1.55; color: rgba(226,226,240,0.82);")}><Body text={c.body} /></p>
        <div style={s("display: flex; align-items: center; gap: 16px;")}>
          <Votes base={c.votes} />
          <button onClick={() => openReply(c)} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55); padding: 0;")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17l-5-5 5-5" /><path d="M20 18v-2a4 4 0 00-4-4H4" /></svg>Reply
          </button>
        </div>
        {openReplyId === c.id && <ReplyBox rootId={rootId} />}
      </div>
    </div>
  );

  return (
    <div style={s("position: relative; min-height: 100vh; background: radial-gradient(130% 80% at 82% -6%, #1c0512 0%, #0b0713 46%, #07060c 100%);")}>
      <img src="/assets/web.png" alt="" style={s("position: fixed; top: -14%; right: -10%; width: min(760px, 52vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none; z-index: 0;")} />

      <div style={s("position: relative; z-index: 2; max-width: 780px; margin: 0 auto; padding: clamp(18px, 3vh, 30px) clamp(16px, 4vw, 32px) 90px; display: flex; flex-direction: column; gap: 16px;")}>
        <Link href="/forum" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.55);")}>‹ Back to the Forum</Link>

        {!thread ? (
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
                <PostVoteRail base={thread.votes} />
                <div style={s("flex: 1; min-width: 0; padding: 18px 22px;")}>
                  <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; color: rgba(255,255,255,0.5); flex-wrap: wrap;")}>
                    <span>Posted by {thread.author}</span>
                    <span style={{ opacity: 0.5 }}>·</span><span>{thread.time}</span>
                  </div>
                  <h1 style={s("font-family: 'Oswald', sans-serif; font-weight: 500; font-size: clamp(22px, 3.4vw, 30px); line-height: 1.12; color: #fff; margin-bottom: 14px;")}>{thread.title}</h1>
                  <p style={s("margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: rgba(226,226,240,0.82); text-wrap: pretty;")}>{thread.body}</p>
                  {thread.hasImage && (
                    <ImageSlot placeholder="Fan creation" style="display: block; width: 100%; max-width: 520px; height: 300px; border-radius: 11px; overflow: hidden; background: #141018; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.08);" />
                  )}
                  <div style={s("display: flex; align-items: center; gap: 10px; flex-wrap: wrap;")}>
                    <span style={s("display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.7);")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 01-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1121 11.5z" /></svg>{total} Comments</span>
                    <ShareButton thread={thread} />
                  </div>
                </div>
              </div>
            </article>

            {/* ADD COMMENT */}
            <div className="fm-card" style={s("position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.24), rgba(255,40,60,0.3)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
              <div style={s("padding: 16px 18px; background: linear-gradient(150deg, rgba(16,18,34,0.96), rgba(9,10,20,0.97)); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
                <textarea value={topDraft} onChange={(e) => setTopDraft(e.target.value)} rows={3} placeholder="Add your voice to the Web… use @ to mention someone" style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 12px 14px; color: #fff; font-family: inherit; font-size: 14px; line-height: 1.5;")}></textarea>
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
            <div style={s("font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin: 8px 2px 0;")}>{total} Comments</div>
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
