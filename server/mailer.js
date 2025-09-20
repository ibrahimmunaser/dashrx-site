const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email service for sending quote requests to DashRx
 * Supports Gmail (default), SendGrid, and Mailgun providers
 */

class MailerService {
  constructor() {
    this.transporter = null;
    this.provider = process.env.MAIL_PROVIDER || 'gmail';
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on provider
   */
  initializeTransporter() {
    try {
      logger.info(`Initializing email transporter for provider: ${this.provider}`);
      
      const provider = (process.env.MAIL_PROVIDER || 'gmail').toLowerCase();
      
      switch (provider) {
        case 'gmail':
          const user = process.env.MAIL_USER || process.env.GMAIL_USER;
          const pass = process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.MAIL_APP_PASS;
          
          logger.debug('Configuring Gmail transporter', {
            user: user,
            hasPassword: !!pass
          });
          
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
          });
          break;

        case 'sendgrid':
          logger.debug('Configuring SendGrid transporter', {
            hasApiKey: !!process.env.SENDGRID_API_KEY
          });
          
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY
            }
          });
          break;

        case 'mailgun':
          logger.debug('Configuring Mailgun transporter', {
            domain: process.env.MAILGUN_DOMAIN,
            hasApiKey: !!process.env.MAILGUN_API_KEY
          });
          
          this.transporter = nodemailer.createTransport({
            host: 'smtp.mailgun.org',
            port: 587,
            secure: false,
            auth: {
              user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
              pass: process.env.MAILGUN_API_KEY
            }
          });
          break;

        default:
          throw new Error(`Unsupported mail provider: ${this.provider}`);
      }
      
      logger.success(`Email transporter initialized successfully for ${this.provider}`);
    } catch (error) {
      logger.error('Failed to initialize email transporter', {
        provider: this.provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format timestamp for America/Detroit timezone
   */
  formatTimestamp() {
    const now = new Date();
    
    // UTC timestamp
    const utc = now.toISOString();
    
    // Detroit timezone (America/Detroit)
    const detroit = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    return {
      utc,
      detroit: `${detroit} EST/EDT`
    };
  }

  /**
   * Build email content from quote data
   */
  buildEmailContent(data) {
    const timestamp = this.formatTimestamp();
    
    const subject = `New Delivery Quote Request — ${data.pharmacy_name}`;
    
    const textBody = `
DashRx Delivery Quote Request
============================

PHARMACY INFORMATION:
Pharmacy Name: ${data.pharmacy_name}
Contact Person: ${data.contact_person}
Phone: ${data.phone}
Email: ${data.email}
Address: ${data.address || 'Not provided'}

BUSINESS DETAILS:
Estimated Weekly Deliveries: ${data.monthly_scripts || 'Not specified'}

ADDITIONAL NOTES:
${data.message || 'No additional notes provided'}

SUBMISSION DETAILS:
Submitted: ${timestamp.detroit}
UTC Time: ${timestamp.utc}
Form Source: DashRx Partner Website

----
Reply directly to this email to respond to ${data.contact_person} at ${data.email}
For urgent matters, call them at ${data.phone}
    `.trim();

    return { subject, textBody };
  }

  /**
   * Send quote email to DashRx team
   */
  async sendQuoteEmail(data) {
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

    if (!this.transporter) {
      logger.error('Email transporter not initialized');
      throw new Error('Email transporter not initialized');
    }

    logger.info('Building email content', {
      pharmacy: data.pharmacy_name,
      contact: data.contact_person,
      replyTo: data.email
    });

    const { subject, textBody } = this.buildEmailContent(data);

    // Use flexible from/to configuration with proper fallbacks
    const user = process.env.MAIL_USER || process.env.GMAIL_USER;
    const from = process.env.MAIL_FROM || user; // IMPORTANT: default to the same gmail user
    const to = process.env.MAIL_TO || user;

    const mailOptions = {
      from,
      to,
      replyTo: data.email,
      subject: subject,
      text: textBody,
      // Add headers for better email client handling
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'DashRx Partner Website'
      }
    };

    logger.debug('Email options prepared', {
      from: mailOptions.from,
      to: mailOptions.to,
      replyTo: mailOptions.replyTo,
      subject: mailOptions.subject,
      bodyLength: textBody.length
    });

    try {
      logger.info('Sending email via transporter...');
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.success('Quote email sent successfully', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });
      
      return {
        success: true,
        messageId: info.messageId,
        timestamp: this.formatTimestamp()
      };
    } catch (error) {
      logger.error('Failed to send quote email', {
        error: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack
      });
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      await this.transporter.verify();
      return { success: true, provider: this.provider };
    } catch (error) {
      console.error('Email configuration test failed:', error);
      throw new Error(`Email test failed: ${error.message}`);
    }
  }
}

// Export singleton instance
const mailerService = new MailerService();

module.exports = {
  sendQuoteEmail: (data) => mailerService.sendQuoteEmail(data),
  testConnection: () => mailerService.testConnection()
};
