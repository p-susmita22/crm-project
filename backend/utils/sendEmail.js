import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'multimaart.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true, // Must be true for port 465
    auth: {
      user: process.env.SMTP_EMAIL || 'info@multimaart.com',
      pass: process.env.SMTP_PASSWORD || 'Multimaart@1234',
    },
    tls: {
      rejectUnauthorized: false, // Critical for cPanel Webmail servers
    },
    connectionTimeout: 5000,
  });

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'CRM Admin'}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    // Fallback: log OTP to terminal so you can test even without email
    console.error('❌ Email send failed:', err.message);
    console.log(`\n📧 ─────────────────────────────────────────────`);
    console.log(`📧 FALLBACK OTP EMAIL (could not send to ${to})`);
    console.log(`📧 Subject : ${subject}`);
    console.log(`📧 Content : ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log(`📧 ─────────────────────────────────────────────\n`);
  }
};

export default sendEmail;
