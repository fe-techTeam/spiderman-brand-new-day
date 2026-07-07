/* eslint-disable @next/next/no-img-element */
"use client";

// Fan Creations — public gallery of approved fan art plus an upload flow.
// Uploads are moderated: logged-in users see a "Your submissions" strip with
// per-item status. Upload requires login (openAuth) and a finished quiz.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { s } from "@/lib/style";
import { useSession } from "@/components/auth/SessionProvider";
import { portalApi } from "@/lib/portal/api";
import { relTime } from "@/lib/time";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const FIELD = "width: 100%; box-sizing: border-box; border: 0; outline: 0; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 9px; padding: 13px 15px; color: #fff; font-family: inherit; font-size: 15px;";
const LABEL = "display: block; margin-bottom: 6px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55);";

const STATUS = {
  pending: { label: "Pending", color: "#ffd23f", bg: "rgba(255,210,63,0.12)", border: "rgba(255,210,63,0.35)" },
  approved: { label: "Approved", color: "#7ee787", bg: "rgba(126,231,135,0.12)", border: "rgba(126,231,135,0.35)" },
  rejected: { label: "Rejected", color: "#ff5a6a", bg: "rgba(255,90,106,0.12)", border: "rgba(255,90,106,0.35)" },
  hidden: { label: "Hidden", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)" },
};

function StatusChip({ status }) {
  const def = STATUS[status] || STATUS.hidden;
  return (
    <span style={s(`display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: ${def.bg}; border: 1px solid ${def.border}; color: ${def.color}; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap;`)}>
      {def.label}
    </span>
  );
}

export default function FanArtPage() {
  const { user, openAuth } = useSession();
  const [gallery, setGallery] = useState({ items: [], nextCursor: null });
  const [state, setState] = useState("loading"); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [mine, setMine] = useState(null);

  // upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [file, setFile] = useState(null);
  const [fileErr, setFileErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const loadGallery = useCallback(async () => {
    setState("loading");
    try {
      const data = await portalApi("/fan-art?limit=12");
      setGallery({ items: data.items, nextCursor: data.nextCursor });
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const refreshMine = useCallback(() => {
    portalApi("/me/fan-art")
      .then((data) => setMine(data.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refreshMine();
    else setMine(null);
  }, [user, refreshMine]);

  const loadMore = async () => {
    if (!gallery.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await portalApi(`/fan-art?limit=12&cursor=${encodeURIComponent(gallery.nextCursor)}`);
      setGallery((g) => ({ items: [...g.items, ...data.items], nextCursor: data.nextCursor }));
    } catch {
      // keep current page; the button stays available to retry
    }
    setLoadingMore(false);
  };

  const openUpload = () => {
    if (!user) {
      openAuth("login");
      return;
    }
    setForm({ title: "", description: "" });
    setFile(null);
    setFileErr("");
    setSubmitErr("");
    setUploaded(false);
    setUploadOpen(true);
  };

  const closeUpload = () => setUploadOpen(false);

  const onFile = (e) => {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    if (picked.size > MAX_IMAGE_BYTES) {
      setFile(null);
      setFileErr("That image is over 5MB — shrink it and try again.");
      e.target.value = "";
      return;
    }
    setFileErr("");
    setFile(picked);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!file) {
      setFileErr("Choose an image to upload.");
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("image", file);
      await portalApi("/fan-art", { method: "POST", formData: fd });
      setUploaded(true);
      refreshMine();
    } catch (err) {
      if (err.code === "quiz_required") {
        window.location.href = "/quiz";
        return;
      }
      setSubmitErr(err.message || "Upload failed — try again.");
    }
    setSubmitting(false);
  };

  const uploadCta = (
    <button onClick={openUpload} data-web-hover="true" className="bnd-cta" style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
      <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
        <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 14px 30px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Upload your art</span>
      </span>
    </button>
  );

  return (
    <div style={s("position: relative; min-height: 100vh; overflow: hidden; background: radial-gradient(130% 90% at 80% -10%, #1c0512 0%, #0b0713 45%, #06080f 100%); padding: clamp(24px, 4vh, 44px) clamp(18px, 4vw, 48px) 96px;")}>
      <img src="/assets/web.png" alt="" style={s("position: absolute; top: -12%; left: -8%; width: min(720px, 60vw); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />
      <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -18%; right: -10%; width: min(680px, 56vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />

      <div style={s("position: relative; z-index: 2; max-width: 1080px; margin: 0 auto;")}>
        {/* back link */}
        <div style={s("margin-bottom: clamp(28px, 5vh, 44px);")}>
          <Link href="/" data-web-hover="true" className="bnd-cta" style={s("display: inline-block; text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
            <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
              <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 13px 28px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>‹ Back to the Web</span>
            </span>
          </Link>
        </div>

        {/* header */}
        <header style={s("display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: clamp(28px, 5vh, 42px);")}>
          <div style={s("max-width: 640px;")}>
            <div style={s("display: inline-flex; align-items: center; gap: 12px; margin-bottom: 14px;")}>
              <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff1f33, transparent);")}></span>
              <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.36em; text-transform: uppercase; color: #ff5a6a;")}>Fan Hub</span>
            </div>
            <h1 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 5vw, 54px); line-height: 0.98; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7), 0 0 70px rgba(214,2,26,0.22);")}>Fan Creations</h1>
            <p style={s("margin: 14px 0 0; font-size: clamp(13px, 1.5vw, 16px); line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>Art from every corner of the Web — hung here for the whole Verse to see.</p>
          </div>
          {uploadCta}
        </header>

        {/* your submissions strip (logged-in only) */}
        {user && mine && mine.length > 0 && (
          <section style={s("margin: 0 0 30px; padding: 16px 20px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;")}>
            <h2 style={s("margin: 0 0 12px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.6);")}>Your submissions</h2>
            <div style={s("display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px;")}>
              {mine.map((f) => (
                <div key={f.id} style={s("flex: 0 0 180px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px;")}>
                  <img src={f.imageUrl} alt={f.title} loading="lazy" style={s("width: 100%; height: 100px; object-fit: cover; border-radius: 8px; display: block; background: #141018;")} />
                  <div style={s("font-family: 'Oswald', sans-serif; font-size: 13px; color: #fff; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{f.title}</div>
                  <div style={s("display: flex; align-items: center; justify-content: space-between; gap: 8px;")}>
                    <StatusChip status={f.status} />
                    <span style={s("font-size: 11px; color: rgba(255,255,255,0.4);")}>{relTime(f.created_at)}</span>
                  </div>
                  {f.status === "rejected" && f.rejection_reason && (
                    <p style={s("margin: 0; font-size: 11px; line-height: 1.45; color: rgba(255,255,255,0.45);")}>{f.rejection_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {state === "loading" && (
          <p style={s("margin: 0; padding: 48px 0; text-align: center; font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.45);")}>Threading the web…</p>
        )}

        {state === "error" && (
          <div style={s("padding: 48px 24px; text-align: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px;")}>
            <p style={s("margin: 0 0 14px; font-size: 15px; color: rgba(226,226,240,0.7);")}>The gallery slipped out of reach. Give it another shot.</p>
            <button onClick={loadGallery} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; padding: 4px 0;")}>Retry ›</button>
          </div>
        )}

        {state === "ready" && gallery.items.length === 0 && (
          <div style={s("padding: 60px 24px; text-align: center; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.14); border-radius: 14px;")}>
            <p style={s("margin: 0 0 16px; font-size: 15px; color: rgba(226,226,240,0.7);")}>No art on the web yet — be the first to hang something.</p>
            <button onClick={openUpload} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; padding: 4px 0;")}>Upload your art ›</button>
          </div>
        )}

        {state === "ready" && gallery.items.length > 0 && (
          <>
            <div style={s("display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; align-items: start;")}>
              {gallery.items.map((item) => (
                <article key={item.id} style={s("background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 12px 12px 16px; display: flex; flex-direction: column; gap: 10px;")}>
                  <img src={item.imageUrl} alt={item.title} loading="lazy" style={s("width: 100%; height: 220px; object-fit: cover; border-radius: 10px; display: block; background: #141018;")} />
                  <h3 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; color: #fff; line-height: 1.2;")}>{item.title}</h3>
                  {item.description && (
                    <p style={s("margin: 0; font-size: 13px; line-height: 1.55; color: rgba(226,226,240,0.65); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;")}>{item.description}</p>
                  )}
                  <div style={s("margin-top: auto; font-size: 12px; color: rgba(255,255,255,0.45);")}>u/{item.author.username} <span style={{ opacity: 0.6 }}>·</span> {relTime(item.createdAt)}</div>
                </article>
              ))}
            </div>

            {gallery.nextCursor && (
              <div style={s("display: flex; justify-content: center; padding: 28px 0 0;")}>
                <button onClick={loadMore} disabled={loadingMore} data-web-hover="true" style={s(`border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); border-radius: 999px; padding: 12px 30px; cursor: pointer; font-family: 'Oswald', sans-serif; font-size: 12.5px; letter-spacing: 0.2em; text-transform: uppercase; opacity: ${loadingMore ? "0.6" : "1"}; transition: opacity .2s ease;`)}>
                  {loadingMore ? "Loading…" : "Load more ›"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {uploadOpen && (
        <div onClick={closeUpload} style={s("position: fixed; inset: 0; z-index: 110; background: rgba(4,4,10,0.82); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: clamp(16px, 4vw, 32px); animation: bnd-word-rise 320ms cubic-bezier(.2,.7,.2,1) both;")}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            style={s("position: relative; width: min(440px, 100%); max-height: 92vh; overflow-y: auto; padding: 2px; background: linear-gradient(135deg, rgba(120,150,220,0.4) 0%, rgba(255,40,60,0.55) 50%, rgba(120,150,220,0.25) 100%); clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); box-shadow: 0 40px 110px rgba(0,0,0,0.7), 0 0 70px rgba(30,50,110,0.3);")}
          >
            <div style={s("position: relative; background: linear-gradient(160deg, rgba(11,17,34,0.98) 0%, rgba(6,9,20,0.99) 55%, rgba(14,9,20,0.98) 100%); clip-path: polygon(23px 0, 100% 0, 100% calc(100% - 23px), calc(100% - 23px) 100%, 0 100%, 0 23px); padding: clamp(26px, 5vw, 36px) clamp(24px, 5vw, 34px) clamp(28px, 5vw, 34px);")}>
              <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -40px; right: -40px; width: 220px; opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

              <button type="button" onClick={closeUpload} aria-label="Close" style={s("position: absolute; top: 12px; right: 14px; z-index: 5; width: 32px; height: 32px; border: 0; background: transparent; color: rgba(255,255,255,0.6); font-size: 22px; cursor: pointer; line-height: 1;")}>×</button>

              <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 8px;")}>
                <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Fan Hub</span>
              </div>
              <h2 style={s("margin: 0 0 20px; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 6vw, 32px); line-height: 1; font-weight: 500; text-transform: uppercase; color: #fff;")}>Upload your art</h2>

              {uploaded ? (
                <div style={s("display: flex; flex-direction: column; align-items: flex-start; gap: 16px; animation: bnd-word-rise 500ms cubic-bezier(.2,.7,.2,1) both;")}>
                  <div style={s("display: inline-flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; color: #fff;")}>
                    <span style={s("width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); color: #6b2a00; display: flex; align-items: center; justify-content: center; font-size: 20px;")}>✓</span>
                    Uploaded!
                  </div>
                  <p style={s("margin: 0; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.72);")}>Uploaded! Your art appears once approved.</p>
                  <button type="button" onClick={closeUpload} data-web-hover="true" style={s("border: 0; background: transparent; cursor: pointer; color: #ff5a6a; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; padding: 4px 0;")}>Close ›</button>
                </div>
              ) : (
                <>
                  <div style={s("margin-bottom: 14px;")}>
                    <label style={s(LABEL)}>Title</label>
                    <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} type="text" placeholder="Name your creation" required style={s(FIELD)} />
                  </div>
                  <div style={s("margin-bottom: 14px;")}>
                    <label style={s(LABEL)}>Description</label>
                    <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Tell the Web about it (optional)" style={s(FIELD + " resize: none; line-height: 1.5;")}></textarea>
                  </div>
                  <div style={s("margin-bottom: 22px;")}>
                    <label style={s(LABEL)}>Image</label>
                    <label data-web-hover="true" style={s(FIELD + " display: flex; align-items: center; gap: 10px; cursor: pointer;")}>
                      <input type="file" accept="image/*" onChange={onFile} style={s("display: none;")} />
                      <span style={s(`overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${file ? "#fff" : "rgba(255,255,255,0.45)"};`)}>{file ? file.name : "Choose an image…"}</span>
                    </label>
                    <p style={s("margin: 6px 0 0; font-size: 11px; color: rgba(255,255,255,0.4);")}>PNG or JPG, up to 5MB.</p>
                    {fileErr && <p style={s("margin: 6px 0 0; font-size: 13px; color: #ff5a6a;")}>{fileErr}</p>}
                  </div>

                  {submitErr && <p style={s("margin: 0 0 14px; font-size: 13px; color: #ff5a6a;")}>{submitErr}</p>}

                  <button type="submit" disabled={submitting} data-web-hover="true" className="bnd-cta" style={s(`width: 100%; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit; opacity: ${submitting ? "0.7" : "1"};`)}>
                    <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 12px 30px rgba(255,34,51,0.35);")}>
                      <span className="bnd-cta-inner" style={s("display: block; text-align: center; padding: 15px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>{submitting ? "Uploading…" : "Hang it on the web"}</span>
                    </span>
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
