// AWS SES mailer — the email seam BACKEND.md §16.5 left open, now wired.
//
// Configuration (see .env.example):
//   SES_FROM_EMAIL        required to enable sending — a verified SES identity,
//                         e.g. `Spider-Man: Brand New Day <no-reply@spidermania.in>`
//   SES_REGION            optional, falls back to AWS_REGION
//   SES_ACCESS_KEY_ID     optional, falls back to AWS_ACCESS_KEY_ID, then to
//   SES_SECRET_ACCESS_KEY the SDK default chain (IAM role on EC2/ECS)
//
// While SES_FROM_EMAIL is unset, isEmailConfigured() is false and callers keep
// their previous dev behaviour (log + echo the link) — nothing breaks locally.
//
// Every outgoing email goes through renderBrandEmail() so the whole product
// speaks with one visual voice: the site's dark-cinematic theme (navy card,
// red accent, condensed uppercase headers). The layout is mobile-first HTML
// email — fluid single column, table-based (no flex/grid/clip-path in email
// clients), inline styles with bgcolor fallbacks where gradients are stripped
// (Outlook), 48px tap-height CTA that goes full-width on small screens.

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let client = null;
function ses() {
  if (!client) {
    const accessKeyId = process.env.SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    client = new SESv2Client({
      region: process.env.SES_REGION || process.env.AWS_REGION || "ap-south-1",
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }
  return client;
}

export function isEmailConfigured() {
  return !!process.env.SES_FROM_EMAIL;
}

export async function sendEmail({ to, subject, html, text }) {
  await ses().send(
    new SendEmailCommand({
      FromEmailAddress: process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
          },
        },
      },
    })
  );
}

/* ------------------------------------------------------------------ theme */

const PROD_URL = "https://spidermania.in";

/** Base URL for every link that goes out in an email (and for the reset-link
 *  echo in dev). SITE_URL wins so a server whose NEXT_PUBLIC_APP_URL is an
 *  internal address (e.g. localhost:8004 behind nginx) still mails public
 *  links; as a backstop, production never puts a localhost link in a
 *  recipient's inbox. */
export function emailBaseUrl() {
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const isProd = process.env.NODE_ENV === "production";
  if (!base) return isProd ? PROD_URL : "http://localhost:3000";
  if (isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(base)) return PROD_URL;
  return base;
}

const T = {
  canvas: "#06080f",
  card: "#0c1224",
  cardGradient: "linear-gradient(160deg, #0d1630 0%, #070a18 58%, #140816 100%)",
  border: "#242a44",
  red: "#d6021a",
  redBright: "#ff3a4a",
  redDeep: "#8b000d",
  redSoft: "#ff6b79",
  text: "#c7cade",
  muted: "#8b8fa8",
  faint: "#5c6078",
  headFont: "'Oswald', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  bodyFont: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

/**
 * Shared branded shell for ALL product emails — pass content, get a full
 * mobile-first HTML document in the site's theme. New email types (welcome,
 * verification, notifications) should compose this instead of hand-rolling
 * markup.
 *
 * @param {object} opts
 * @param {string} opts.title        big uppercase heading
 * @param {string} opts.preheader    inbox preview line (hidden in the body)
 * @param {string} [opts.eyebrow]    small red kicker above the title
 * @param {string} opts.bodyHtml     one or more <p> blocks (pre-styled or plain)
 * @param {string} [opts.ctaLabel]   button text — omit for no button
 * @param {string} [opts.ctaUrl]     button target
 * @param {string} [opts.footnoteHtml] small muted print under the CTA
 */
export function renderBrandEmail({ title, preheader = "", eyebrow = "Brand New Day", bodyHtml, ctaLabel, ctaUrl, footnoteHtml = "" }) {
  const site = emailBaseUrl();

  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:26px 0 6px; width:100%; max-width:300px;">
        <tr>
          <td align="center" bgcolor="${T.red}" style="border-radius:10px; background-image:linear-gradient(180deg, ${T.redBright} 0%, #c00014 100%);">
            <a href="${ctaUrl}" style="display:block; padding:16px 24px; font-family:${T.headFont}; font-size:14px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:#ffffff; text-decoration:none;">${ctaLabel}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${title}</title>
  <style>
    /* Oswald renders in Apple Mail / iOS (the bulk of mobile opens); everyone
       else falls back to the condensed system stack. */
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap');
    a { color: ${T.redSoft}; }
    @media only screen and (max-width: 480px) {
      .em-shell { padding: 22px 12px 28px !important; }
      .em-pad   { padding: 30px 22px 26px !important; }
      .em-title { font-size: 25px !important; }
      .em-cta   { max-width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:${T.canvas}; -webkit-text-size-adjust:100%;" bgcolor="${T.canvas}">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.canvas}" style="background:${T.canvas};">
    <tr>
      <td align="center" class="em-shell" style="padding:36px 16px 44px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;">

          <!-- card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${T.card}" style="border:1px solid ${T.border}; border-radius:14px; background-color:${T.card}; background-image:${T.cardGradient};">
                <!-- red accent bar -->
                <tr>
                  <td height="4" bgcolor="${T.red}" style="height:4px; line-height:4px; font-size:4px; border-radius:14px 14px 0 0; background-image:linear-gradient(90deg, ${T.redBright} 0%, ${T.redDeep} 70%, transparent 100%);">&#8202;</td>
                </tr>
                <tr>
                  <td class="em-pad" style="padding:36px 34px 30px;">
                    <!-- eyebrow -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
                      <tr>
                        <td width="34" style="width:34px; vertical-align:middle;">
                          <table role="presentation" width="34" cellpadding="0" cellspacing="0" border="0"><tr>
                            <td height="2" bgcolor="${T.redSoft}" style="height:2px; line-height:2px; font-size:2px; background-image:linear-gradient(90deg, transparent, ${T.redSoft});">&#8202;</td>
                          </tr></table>
                        </td>
                        <td style="padding-left:10px; font-family:${T.headFont}; font-size:11px; font-weight:500; letter-spacing:0.32em; text-transform:uppercase; color:${T.redSoft}; white-space:nowrap;">${eyebrow}</td>
                      </tr>
                    </table>

                    <h1 class="em-title" style="margin:0 0 18px; font-family:${T.headFont}; font-size:29px; line-height:1.08; font-weight:600; letter-spacing:0.02em; text-transform:uppercase; color:#ffffff;">${title}</h1>

                    ${bodyHtml}
                    ${cta}
                    ${footnoteHtml ? `<div style="margin:22px 0 0; padding-top:18px; border-top:1px solid ${T.border}; font-family:${T.bodyFont}; font-size:12px; line-height:1.6; color:${T.muted};">${footnoteHtml}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td align="center" style="padding:22px 18px 0; font-family:${T.bodyFont}; font-size:11px; line-height:1.7; color:${T.faint};">
              Every Brand New Day starts with someone like you.<br/>
              <a href="${site}" style="color:${T.muted}; text-decoration:underline;">${site.replace(/^https?:\/\//, "")}</a>
              &nbsp;·&nbsp; Spider-Man: Brand New Day
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Convenience for renderBrandEmail bodies — a themed paragraph.
export function emailParagraph(inner) {
  return `<p style="margin:0 0 18px; font-family:${T.bodyFont}; font-size:15px; line-height:1.65; color:${T.text};">${inner}</p>`;
}

/* ------------------------------------------------------------- templates */

export async function sendPasswordResetEmail({ to, resetUrl, admin = false }) {
  const who = admin ? "Admin Console" : "Spider-Man: Brand New Day";
  const subject = admin
    ? "Reset your admin password — Spider-Man: Brand New Day"
    : "Reset your password — Spider-Man: Brand New Day";

  const html = renderBrandEmail({
    title: "Reset your password",
    eyebrow: admin ? "Admin Console" : "Swing In",
    preheader: "Your reset link is inside — it's valid for 30 minutes.",
    bodyHtml:
      emailParagraph(`Someone asked to reset the ${who} password for this email address.`) +
      emailParagraph(`Hit the button below to choose a new one. The link is valid for <strong style="color:#ffffff;">30 minutes</strong> and works once.`),
    ctaLabel: "Reset password",
    ctaUrl: resetUrl,
    footnoteHtml: `If the button doesn't work, paste this link into your browser:<br/>
      <a href="${resetUrl}" style="color:${T.redSoft}; word-break:break-all;">${resetUrl}</a><br/><br/>
      Didn't ask for this? Ignore this email — your password stays unchanged.`,
  });

  const text = `Someone asked to reset the ${who} password for this email address.

Reset it here (link is valid for 30 minutes, single use):
${resetUrl}

If you didn't ask for this, ignore this email — your password stays unchanged.`;

  await sendEmail({ to, subject, html, text });
}
