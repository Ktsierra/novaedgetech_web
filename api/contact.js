import { Resend } from "resend";

// where website enquiries are delivered
const CONTACT_TO = "jose.sierra@novaedgetechnology.com";
const FROM = "NovaEdge Website <contact@novaedgetechnology.com>";

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** everything the visitor typed goes into the email as text, never as markup */
export const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** single line, no control characters (it ends up in the subject header) */
const oneLine = (s) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

/** approximate place from Vercel's IP geolocation headers (city names arrive URL-encoded) */
const placeFrom = (headers = {}) => {
  const dec = (v) => { try { return v ? decodeURIComponent(String(v)) : ""; } catch { return ""; } };
  return [dec(headers["x-vercel-ip-city"]), dec(headers["x-vercel-ip-country-region"]), dec(headers["x-vercel-ip-country"])]
    .filter(Boolean).join(", ");
};

/**
 * The enquiry email: table layout + inline styles (what Gmail / Outlook / Apple Mail all render), no images.
 * Every visitor-supplied value is escaped before it gets here.
 */
export const enquiryHtml = ({ name, email, message, preview, place, when }) => {
  const row = (label, value) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e6ebf2;width:96px;vertical-align:top;font:600 11px/1.6 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7a8699">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e6ebf2;vertical-align:top;font:15px/1.5 Arial,sans-serif;color:#0e1621">${value}</td>
          </tr>`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef2f7">
  <div style="display:none;max-height:0;overflow:hidden">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(14,22,33,.08)">
        <tr><td style="background:#0e1621;padding:22px 28px;border-bottom:3px solid #00e5ff">
          <span style="font:800 20px/1 Arial,sans-serif;letter-spacing:.02em;color:#ffffff">NOVA</span><span style="font:800 20px/1 Arial,sans-serif;letter-spacing:.02em;color:#00e5ff">EDGE</span>
          <div style="margin-top:6px;font:600 10px/1 Arial,sans-serif;letter-spacing:.32em;color:#8b98ad">TECHNOLOGY</div>
        </td></tr>
        <tr><td style="padding:28px 28px 8px">
          <div style="font:600 11px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#00a9c2">New website enquiry</div>
          <h1 style="margin:10px 0 0;font:700 22px/1.3 Arial,sans-serif;color:#0e1621">${name} wants to talk</h1>
        </td></tr>
        <tr><td style="padding:12px 28px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Name", name)}${row("Email", `<a href="mailto:${email}" style="color:#0a7f94;text-decoration:none">${email}</a>`)}${place ? row("From", place) : ""}${row("Received", when)}
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px 0">
          <div style="font:600 11px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#7a8699">Message</div>
          <div style="margin-top:10px;padding:16px 18px;background:#f5f8fb;border-left:3px solid #00e5ff;border-radius:6px;font:15px/1.6 Arial,sans-serif;color:#0e1621">${message.replace(/\r?\n/g, "<br>")}</div>
        </td></tr>
        <tr><td style="padding:26px 28px 30px">
          <a href="mailto:${email}?subject=${encodeURIComponent("Re: your NovaEdge enquiry")}" style="display:inline-block;padding:12px 22px;background:#00e5ff;border-radius:8px;font:700 14px/1 Arial,sans-serif;color:#0e1621;text-decoration:none">Reply to ${name}</a>
          <div style="margin-top:10px;font:12px/1.5 Arial,sans-serif;color:#7a8699">Or just hit Reply: it goes straight to ${email}.</div>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f5f8fb;border-top:1px solid #e6ebf2;font:12px/1.5 Arial,sans-serif;color:#7a8699">
          Sent from the contact form on <a href="https://novaedgetechnology.com" style="color:#0a7f94;text-decoration:none">novaedgetechnology.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const body = req.body ?? {};
  const name = typeof body.name === "string" ? oneLine(body.name) : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || name.length > LIMITS.name) {
    return res.status(400).json({ error: `Name is required (up to ${LIMITS.name} characters)` });
  }
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!message || message.length > LIMITS.message) {
    return res.status(400).json({ error: `Message is required (up to ${LIMITS.message} characters)` });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return res.status(500).json({ error: "Email service not properly configured" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const place = placeFrom(req.headers);
  // NovaEdge is in South Florida: show the time there
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date()) + " ET";

  try {
    // One email, to NovaEdge only. There is deliberately no auto-reply to the address typed into the form:
    // anyone could aim a NovaEdge-branded email at a stranger with it. Reply-To lets you answer them directly.
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [CONTACT_TO],
      replyTo: email,
      subject: `New website enquiry from ${name}`,
      text: `New website enquiry\n\nName: ${name}\nEmail: ${email}\n${place ? `From: ${place}\n` : ""}Received: ${when}\n\n${message}\n\nReply to this email to answer ${name} directly.\n`,
      html: enquiryHtml({ name: escapeHtml(name), email: escapeHtml(email), message: escapeHtml(message), preview: escapeHtml(message.slice(0, 120)), place: escapeHtml(place), when }),
    });

    if (error || !data?.id) {
      console.error("Contact email failed:", error);
      return res.status(502).json({ error: "Failed to send email" });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error sending contact email:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
