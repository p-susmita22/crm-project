import nodemailer from 'nodemailer';
import dns from 'dns';

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // Force IPv4 to prevent ENETUNREACH IPv6 errors
    auth: {
      user: process.env.SMTP_EMAIL || 'paridasusmita2003@gmail.com',
      pass: process.env.SMTP_PASSWORD || 'jxefavrtcwlvivel',
    },
    connectionTimeout: 5000,
    // Bulletproof custom lookup that forces IPv4 only
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },
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
  }
};

export default sendEmail;
