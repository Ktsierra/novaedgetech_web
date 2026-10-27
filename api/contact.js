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

  try {
    // One email, to NovaEdge only. There is deliberately no auto-reply to the address typed into the form:
    // anyone could aim a NovaEdge-branded email at a stranger with it. Reply-To lets you answer them directly.
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [CONTACT_TO],
      replyTo: email,
      subject: `New website enquiry from ${name}`,
      text: `You received a new message from your website:\n\nName: ${name}\nEmail: ${email}\n\n${message}\n`,
      html: `
        <p>You received a new message from your website:</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\r?\n/g, "<br>")}</p>
      `,
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
