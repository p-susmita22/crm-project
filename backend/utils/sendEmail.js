import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  // Try port 465 first, fallback to 587
  const configs = [
    {
      host: process.env.SMTP_HOST || 'mail.multimaart.com',
      port: 465,
      secure: true, // SSL
    },
    {
      host: process.env.SMTP_HOST || 'mail.multimaart.com',
      port: 587,
      secure: false, // STARTTLS
    },
  ];

  const auth = {
    user: process.env.SMTP_EMAIL || 'info@multimaart.com',
    pass: process.env.SMTP_PASSWORD || 'Multimaart@1234',
  };

  for (const config of configs) {
    try {
      const transporter = nodemailer.createTransport({
        ...config,
        auth,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15000,  // increased from 5s to 15s
        greetingTimeout: 10000,    // add this too
        socketTimeout: 20000,      // and this
      });

      // Verify connection before sending
      await transporter.verify();

      const info = await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Multimaart CRM'}" <${process.env.FROM_EMAIL || 'info@multimaart.com'}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent via port ${config.port} | MessageId: ${info.messageId}`);
      return info;

    } catch (err) {
      console.warn(`⚠️  Port ${config.port} failed: ${err.message}`);
    }
  }

  // All configs failed — fallback log
  console.error('❌ All SMTP attempts failed.');
  console.log(`\n📧 ─────────────────────────────────────────────`);
  console.log(`📧 FALLBACK OTP EMAIL (could not send to ${to})`);
  console.log(`📧 Subject : ${subject}`);
  console.log(`📧 Content : ${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`);
  console.log(`📧 ─────────────────────────────────────────────\n`);
};

export default sendEmail;
