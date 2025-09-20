// server/mailer.js
const nodemailer = require('nodemailer');
const logger = require('./logger');

const provider = (process.env.MAIL_PROVIDER || 'gmail').toLowerCase();

function buildTransporter() {
  if (provider !== 'gmail') {
    throw new Error(`Unsupported MAIL_PROVIDER: ${provider}`);
  }

  if (!process.env.MAIL_USER || !process.env.MAIL_APP_PASS) {
    throw new Error('Missing MAIL_USER or MAIL_APP_PASS env vars');
  }

  // Strict Gmail (App Password) SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,          // SSL
    secure: true,       // true = use TLS/SSL
    auth: {
      user: process.env.MAIL_USER,        // e.g. dashrx10@gmail.com
      pass: process.env.MAIL_APP_PASS     // 16-char app password
    }
  });

  return transporter;
}

const transporter = buildTransporter();

async function sendQuoteEmail(data) {
  // Required headers
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  const to   = process.env.MAIL_TO   || process.env.MAIL_USER;

  if (!to) throw new Error('MAIL_TO not set');

  const subject = `New Quote Request — ${data.pharmacy_name || 'Unknown Pharmacy'}`;

  const lines = [
    `Pharmacy: ${data.pharmacy_name}`,
    `Contact: ${data.contact_person}`,
    `Email:   ${data.email}`,
    `Phone:   ${data.phone}`,
    `Address: ${data.address}`,
    `Weekly Deliveries: ${data.weekly_deliveries}`,
    ``,
    `Message:`,
    `${data.message || '(none)'}`
  ];

  try {
    const info = await transporter.sendMail({
      from,               // must be your Gmail address for Gmail SMTP
      to,                 // where you want to receive requests
      replyTo: data.email || undefined,   // user's email is safe in reply-to
      subject,
      text: lines.join('\n'),
      html: `<pre>${lines.map(l => String(l)).join('\n')}</pre>`
    });

    logger.success('Email sent', { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected });
    return { messageId: info.messageId, timestamp: new Date().toISOString() };

  } catch (err) {
    // Log everything useful from Nodemailer
    logger.error('sendQuoteEmail error', {
      code: err.code,
      responseCode: err.responseCode,
      command: err.command,
      message: err.message,
      stack: err.stack,
      response: err.response
    });
    throw err;
  }
}

module.exports = { sendQuoteEmail };