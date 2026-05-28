import { Resend } from 'resend';

const sendEmail = async ({ to, subject, html }) => {
  // Initialize lazily so dotenv has time to load process.env from server.js
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: `${process.env.FROM_NAME || 'Multimaart CRM'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to,
      subject,
      html,
    });

    if (error) throw new Error(error.message);

    console.log(`✅ Email sent to ${to} | ID: ${data.id}`);
    return data;

  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    console.log(`\n📧 ─────────────────────────────────────────────`);
    console.log(`📧 FALLBACK OTP EMAIL (could not send to ${to})`);
    console.log(`📧 Subject : ${subject}`);
    console.log(`📧 Content : ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log(`📧 ─────────────────────────────────────────────\n`);
  }
};

export default sendEmail;
