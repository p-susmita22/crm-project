import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,       // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL || 'paridasusmita2003@gmail.com',
      pass: process.env.SMTP_PASSWORD || 'jxefavrtcwlvivel',
    },
    tls: {
      rejectUnauthorized: false, // allow self-signed certs in dev
    },
    connectionTimeout: 5000, // 5 seconds timeout
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'CRM Admin'}" <${process.env.FROM_EMAIL || 'paridasusmita2003@gmail.com'}>`,
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
    throw err; // Throw error so frontend knows it actually failed
  }
};

export default sendEmail;
