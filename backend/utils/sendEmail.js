import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'CRM Admin'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);
    return info;

  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    console.log(`\n📧 ─────────────────────────────────────────────`);
    console.log(`📧 FALLBACK EMAIL (could not send to ${to})`);
    console.log(`📧 Subject : ${subject}`);
    console.log(`📧 Content : ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log(`📧 ─────────────────────────────────────────────\n`);
  }
};

export default sendEmail;
