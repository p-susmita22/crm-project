import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'paridasusmita2003@gmail.com',
        pass: process.env.SMTP_PASSWORD // User needs to set this in .env
      }
    });

    const mailOptions = {
      from: '"Multimaart CRM" <paridasusmita2003@gmail.com>',
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
