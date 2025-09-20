const nodemailer = require('nodemailer');
const logger = require('./logger');

const required = ['MAIL_PROVIDER','MAIL_USER','MAIL_PASS','MAIL_FROM','MAIL_TO'];
for (const k of required) {
  if (!process.env[k]) logger.error('Mail config missing', { missingKey: k });
}

function makeTransport() {
  const provider = (process.env.MAIL_PROVIDER || 'gmail').toLowerCase();
  
  let transporter;
  switch (provider) {
    case 'gmail':
      logger.debug('Configuring Gmail transporter', {
        user: process.env.MAIL_USER,
        hasPassword: !!process.env.MAIL_PASS
      });

      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL
        auth: {
          user: process.env.MAIL_USER,  // e.g. Dashrx10@gmail.com
          pass: process.env.MAIL_PASS   // <-- use the Gmail App Password here
        },
        tls: {
          rejectUnauthorized: true
        }
      });
      break;
      
    default:
      throw new Error(`Unsupported MAIL_PROVIDER: ${provider}`);
  }
  
  return transporter;
}

let transporter;
try {
  transporter = makeTransport();
  logger.info('Email transporter initialized (gmail)');
} catch (e) {
  logger.error('Failed to init transporter', { err: e.message });
}

async function sendQuoteEmail(data) {
  // TEMP: dry-run mode to skip sending emails while testing the rest of the flow
  if (process.env.DRY_RUN === 'true') {
    logger.info('DRY_RUN mode enabled - skipping actual email send', {
      pharmacy: data.pharmacy_name,
      contact: data.contact_person,
      replyTo: data.email
    });
    
    return {
      success: true,
      messageId: 'DRY_RUN_' + Date.now(),
      timestamp: new Date().toISOString(),
      dryRun: true
    };
  }

  if (!transporter) {
    const err = new Error('Email transporter not initialized');
    err.code = 'MAIL_INIT';
    throw err;
  }

  const to = process.env.MAIL_TO;
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;

  const html = `
    <h2>New Quote Request</h2>
    <ul>
      <li><b>Pharmacy:</b> ${data.pharmacy_name}</li>
      <li><b>Contact:</b> ${data.contact_person}</li>
      <li><b>Email:</b> ${data.email}</li>
      <li><b>Phone:</b> ${data.phone}</li>
      <li><b>Address:</b> ${data.address}</li>
      <li><b>Estimated Weekly Scripts:</b> ${data.weekly_scripts_display || data.weekly_scripts}</li>
      <li><b>Notes:</b> ${data.message || '(none)'}</li>
    </ul>
  `;

  try {
    const info = await transporter.sendMail({
      to, from, replyTo: data.email,
      subject: `DashRx Quote – ${data.pharmacy_name}`,
      html,
    });
    return { messageId: info.messageId, timestamp: new Date().toISOString() };
  } catch (e) {
    logger.error('sendMail failed', { code: e.code, message: e.message });
    const err = new Error('MAIL_SEND_FAILED');
    err.code = e.code || 'MAIL_SEND_FAILED';
    throw err;
  }
}

module.exports = { sendQuoteEmail };