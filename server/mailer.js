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

  // Format timestamps
  const now = new Date();
  const estTime = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: '2-digit',
    day: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const utcTime = now.toISOString();

  // Normalize phone number (remove non-digits except +)
  const normalizedPhone = data.phone ? data.phone.replace(/[^\d+]/g, '') : '';
  
  // Get weekly deliveries display text
  const scriptsDisplay = (data.weekly_scripts && data.weekly_scripts.display) || data.weekly_scripts_display || 'Not specified';
  
  // Build complete address
  const fullAddress = data.address || 'Not provided';

  const emailBody = `DashRx Delivery Quote Request
============================

PHARMACY INFORMATION:
Pharmacy Name: ${data.pharmacy_name || 'Not provided'}
Contact Person: ${data.contact_person || 'Not provided'}
Phone: ${normalizedPhone || 'Not provided'}
Email: ${data.email || 'Not provided'}
Address: ${fullAddress}
City: ${data.city || '—'}
State: ${data.state || '—'}

BUSINESS DETAILS:
Estimated Weekly Deliveries: ${scriptsDisplay}

ADDITIONAL NOTES:
${data.message || 'No additional notes provided'}

SUBMISSION DETAILS:
Submitted: ${estTime} EST/EDT
UTC Time: ${utcTime}
Form Source: DashRx Partner Website
${data.ip ? `Client IP: ${data.ip}` : ''}

----
Reply directly to this email to respond to ${data.contact_person || 'the contact person'} at ${data.email || 'their email'}
${normalizedPhone ? `For urgent matters, call them at ${normalizedPhone}` : ''}`;

  try {
    const info = await transporter.sendMail({
      to, 
      from, 
      replyTo: data.email,
      subject: `New Quote Request — ${data.pharmacy_name || 'Unknown Pharmacy'}`,
      text: emailBody,
      html: `<pre style="font-family: monospace; white-space: pre-wrap;">${emailBody}</pre>`
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