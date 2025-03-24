import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { name, email, message } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: "Name is required and must be a string" });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: "Valid email is required" });
  }
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Message is required and must be a string" });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ error: "Email service not properly configured" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Send email to admin
    const adminResponse = await resend.emails.send({
      from: "contact@novaedgetechnology.com", // Using your verified domain
      to: ["novaedgetech@gmail.com"], // Your verified email for testing
      subject: `New Contact Form Message from ${name}`,
      html: `
        <p>You received a new message from your website:</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });

    if (!adminResponse.data?.id) {
      console.error('Admin email failed:', adminResponse);
      throw new Error(adminResponse.error?.message || 'Failed to send admin email');
    }

    // Send confirmation email to client
    const clientResponse = await resend.emails.send({
      from: "contact@novaedgetechnology.com", // Using your verified domain
      to: [email],
      subject: "Thank you for contacting NovaEdge Technology",
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for contacting NovaEdge Technology. We have received your message and will get back to you shortly.</p>
        <p>Best regards,<br>NovaEdge Technology Team</p>
      `
    });

    if (!clientResponse.data?.id) {
      console.error('Client email failed:', clientResponse);
      throw new Error(clientResponse.error?.message || 'Failed to send client email');
    }

    return res.status(200).json({
      success: true,
      adminEmailId: adminResponse.data.id,
      clientEmailId: clientResponse.data.id
    });

  } catch (error) {
    console.error("Error sending emails:", error);
    return res.status(500).json({ 
      error: "Failed to send email",
      details: error.message,
    });
  }
}