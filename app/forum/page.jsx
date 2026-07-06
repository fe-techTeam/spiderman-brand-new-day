/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import ImageSlot from "@/components/ImageSlot";
import SpiderAvatar from "@/components/SpiderAvatar";
import ShareButton from "@/components/forum/ShareButton";
import EmptyState from "@/components/forum/EmptyState";
import { THREADS } from "@/lib/forumData";

const RULES = [
  { n: "1", text: "Every identity belongs here. No gatekeeping the mask." },
  { n: "2", text: "Real stories only — this is what the Web actually looks like." },
  { n: "3", text: "Credit the creators. Reblog with love." },
  { n: "4", text: "Keep it spoiler-tagged until opening weekend." },
];

const SORT_DEFS = [
  { key: "new", label: "✦ New" }, { key: "top", label: "▲ Top" },
];

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "" + n);

export default function Forum() {
  const router = useRouter();
  const [sort, setSort] = useState("new");
  const [votes, setVotes] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [spoiler, setSpoiler] = useState(false);
  const [shown, setShown] = useState(6);

  const vote = (id, dir) =>
    setVotes((v) => ({ ...v, [id]: v[id] === dir ? undefined : dir }));
  const netVotes = (t) => t.votes + (votes[t.id] === "up" ? 1 : votes[t.id] === "down" ? -1 : 0);
  const closeCreate = () => { setCreateOpen(false); setSpoiler(false); };

  // sort only (community filter, search & thread-count removed per feedback)
  const list = THREADS.slice();
  if (sort === "top") list.sort((a, b) => netVotes(b) - netVotes(a));
  else list.sort((a, b) => b.id - a.id); // "new"
  const visible = list.slice(0, shown);

  const onCreate = () => setCreateOpen(true);

  return (
    <div style={s("position: relative; min-height: 100vh; background: radial-gradient(130% 80% at 82% -6%, #1c0512 0%, #0b0713 46%, #07060c 100%);")}>
      <img src="/assets/web.png" alt="" style={s("position: fixed; top: -14%; right: -10%; width: min(760px, 52vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none; z-index: 0;")} />

      {/* LAYOUT */}
      <div className="fm-layout" style={s("position: relative; z-index: 2; max-width: 1160px; margin: 0 auto; padding: clamp(20px, 3vh, 34px) clamp(18px, 3vw, 40px) 80px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: clamp(16px, 1.6vw, 26px); align-items: start;")}>

        {/* CENTER: feed */}
        <main style={s("display: flex; flex-direction: column; gap: 14px; min-width: 0;")}>
          {/* sort tabs — two plain tabs, no wrapping card */}
          <div style={s("display: flex; align-items: center; gap: 8px;")}>
            {SORT_DEFS.map((sd) => (
              <button key={sd.key} onClick={() => setSort(sd.key)} data-web-hover="true" style={s(`display: inline-flex; align-items: center; gap: 7px; border: 0; cursor: pointer; padding: 10px 20px; border-radius: 9px; background: ${sort === sd.key ? "linear-gradient(180deg, #ff3a4a, #c00014)" : "rgba(255,255,255,0.05)"}; color: ${sort === sd.key ? "#fff" : "rgba(255,255,255,0.6)"}; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; transition: background .2s ease, color .2s ease;`)}>{sd.label}</button>
            ))}
          </div>

          {/* create prompt */}
          <div className="fm-card" style={s("position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.24), rgba(255,40,60,0.3)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
            <div style={s("display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(150deg, rgba(16,18,34,0.96), rgba(9,10,20,0.97)); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
              <div style={s("flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center;")}>
                <SpiderAvatar size="54%" strokeWidth={4} />
              </div>
              <input onFocus={onCreate} placeholder="Share your story with the Web…" style={s("flex: 1; border: 0; outline: 0; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 11px 14px; color: #fff; font-family: inherit; font-size: 14px; min-width: 0;")} />
            </div>
          </div>

          {/* threads (or empty state when the Web has no posts) */}
          {visible.length === 0 ? (
            <EmptyState onCreate={onCreate} />
          ) : (
          <>
          {visible.map((t, i) => {
            const v = votes[t.id];
            return (
              <article key={t.id} onClick={() => router.push(`/forum/${t.id}`)} data-web-hover="true" className="fm-card" style={s(`cursor: pointer; position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.2), rgba(255,40,60,0.26)); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); animation: fm-rise .6s cubic-bezier(.16,.84,.3,1) both; animation-delay: ${i * 60}ms;`)}>
                <div style={s("display: flex; align-items: stretch; background: linear-gradient(150deg, rgba(16,18,34,0.97), rgba(9,10,20,0.98)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}>
                  {/* vote rail */}
                  <div style={s("flex-shrink: 0; width: 62px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 5px; padding: 16px 0; background: rgba(255,40,60,0.05); border-right: 1px solid rgba(255,255,255,0.06);")}>
                    <button onClick={(e) => { e.stopPropagation(); vote(t.id, "up"); }} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={v === "up" ? "#ff5a6a" : "none"} stroke={v === "up" ? "#ff5a6a" : "rgba(255,255,255,0.45)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
                    </button>
                    <span style={s(`font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 600; color: ${v === "up" ? "#ff5a6a" : v === "down" ? "#4d8bff" : "#fff"};`)}>{fmt(netVotes(t))}</span>
                    <button onClick={(e) => { e.stopPropagation(); vote(t.id, "down"); }} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; padding: 2px; line-height: 0;")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={v === "down" ? "#4d8bff" : "none"} stroke={v === "down" ? "#4d8bff" : "rgba(255,255,255,0.3)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-8h-4V5h-6v6H5z" /></svg>
                    </button>
                  </div>
                  {/* body */}
                  <div style={s("flex: 1; min-width: 0; padding: 16px 20px;")}>
                    <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 9px; font-size: 11.5px; color: rgba(255,255,255,0.5); flex-wrap: wrap;")}>
                      <span>Posted by {t.author}</span>
                      <span style={{ opacity: 0.5 }}>·</span><span>{t.time}</span>
                    </div>
                    <h3 style={s("font-size: clamp(17px, 1.7vw, 21px); font-weight: 500; color: #fff; line-height: 1.15; margin-bottom: 8px;")}>{t.title}</h3>
                    <p style={s("margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>{t.body}</p>
                    {t.hasImage && (
                      <ImageSlot placeholder="Fan creation" style="display: block; width: 100%; max-width: 460px; height: 240px; border-radius: 11px; overflow: hidden; background: #141018; margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.08);" />
                    )}
                    <div style={s("display: flex; align-items: center; gap: 10px; flex-wrap: wrap;")}>
                      <span style={s("display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.7);")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 01-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1121 11.5z" /></svg>{t.comments} Comments</span>
                      <ShareButton thread={t} stop />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {list.length > shown && (
            <div style={s("display: flex; justify-content: center; padding: 14px 0;")}>
              <button onClick={() => setShown((n) => n + 3)} data-web-hover="true" className="fm-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
                <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);")}>
                  <span style={s("position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 9px; padding: 13px 34px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="fm-sheen"></span>Load more stories</span>
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
              <input placeholder="An interesting title…" style={s("width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px; margin-bottom: 12px;")} />
              <textarea rows={4} placeholder="Tell the Web what happened…" style={s("width: 100%; box-sizing: border-box; resize: none; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 14px; line-height: 1.5; margin-bottom: 18px;")}></textarea>
              <div style={s("display: flex; align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap;")}>
                <button type="button" onClick={() => setSpoiler((v) => !v)} data-web-hover="true" style={s("display: inline-flex; align-items: center; gap: 10px; border: 0; background: transparent; cursor: pointer; padding: 6px 2px;")}>
                  <span style={s(`width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; border: 1.5px solid ${spoiler ? "#ff3a4a" : "rgba(255,255,255,0.3)"}; background: ${spoiler ? "linear-gradient(180deg,#ff3a4a,#c00014)" : "transparent"}; display: flex; align-items: center; justify-content: center; transition: border-color .18s ease, background .18s ease;`)}>
                    {spoiler && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span style={s("font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.75);")}>Mark as spoiler</span>
                </button>
                <div style={s("display: flex; align-items: center; gap: 12px;")}>
                <button onClick={closeCreate} data-web-hover="true" style={s("border: 0; background: transparent; color: rgba(255,255,255,0.6); font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; padding: 12px 16px;")}>Cancel</button>
                <button onClick={closeCreate} data-web-hover="true" className="fm-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
                  <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);")}>
                    <span style={s("position: relative; overflow: hidden; display: inline-flex; padding: 12px 26px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); color: #fff; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;")}><span className="fm-sheen"></span>Post to the Web</span>
                  </span>
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
