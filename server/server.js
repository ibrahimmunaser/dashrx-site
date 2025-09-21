const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const logger = require('./logger');
const { configureSecurity } = require('./security');
const { apiLimiter, quoteLimiter } = require('./rateLimit');
const { validateQuotePayload, detectSpam } = require('./validators');
const { sendQuoteEmail } = require('./mailer');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.logRequest(req);
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    logger.logResponse(req, res, responseTime);
    originalEnd.apply(this, args);
  };
  
  next();
});

// Security configuration
logger.info('Configuring security middleware');
configureSecurity(app);

// CORS configuration
logger.info('Configuring CORS policy');
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true, // Only allow same-origin in production
  credentials: false
}));

// Body parsing middleware
logger.info('Configuring body parsing middleware');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 1) Health check FIRST (before limiter)
app.get('/api/health', (req, res) => {
  logger.info('Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 2) THEN apply rate limiting to the rest of /api
logger.info('Applying rate limiting to API routes');
app.use('/api/', apiLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Serve success page
app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/success.html'));
});

// Serve error page
app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/error.html'));
});

// Privacy policy page
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/privacy.html'));
});

// Terms of service page
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/terms.html'));
});

// Logo transparency test page
app.get('/logo-test', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/logo-test.html'));
});

// Quote form submission endpoint
app.post('/api/quote', quoteLimiter, async (req, res) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    logger.info(`Quote form submission received [${requestId}]`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length')
    });
    
    // Basic request validation
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.validation(`Empty request body [${requestId}]`);
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }

    logger.debug(`Request payload received [${requestId}]`, {
      pharmacy_name: req.body.pharmacy_name,
      contact_person: req.body.contact_person,
      email: req.body.email,
      phone: req.body.phone,
      hasMessage: !!req.body.message,
      honeypot: req.body.company_website
    });

    // Server safety net - honeypot check
    if (typeof req.body.company_website === 'string' && req.body.company_website.trim() !== '') {
      logger.security(`Spam honeypot hit [${requestId}]`, { value: req.body.company_website });
      return res.status(400).json({ success: false, error: 'Submission rejected' });
    }

    // Back-compat: accept either monthly_scripts or weekly_scripts
    if (req.body.monthly_scripts && !req.body.weekly_scripts) {
      req.body.weekly_scripts = req.body.monthly_scripts;
    }

    // Validate and sanitize input
    const validation = validateQuotePayload(req.body);
    if (!validation.valid) {
      logger.validation(`Validation failed [${requestId}]`, validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
    }

    logger.success(`Validation passed [${requestId}]`);

    // Additional spam detection
    const spamIndicators = detectSpam(validation.sanitized);
    if (spamIndicators.length > 0) {
      logger.security(`Spam detected [${requestId}]`, spamIndicators);
      return res.status(400).json({
        success: false,
        error: 'Submission rejected',
        details: ['Content appears to be spam']
      });
    }

    // Time-based spam check (if submission timestamp is provided)
    const submissionTime = req.body.submission_time;
    if (submissionTime) {
      const timeDiff = Date.now() - parseInt(submissionTime);
      logger.debug(`Submission timing check [${requestId}]`, {
        submissionTime: new Date(parseInt(submissionTime)).toISOString(),
        timeDiff: `${timeDiff}ms`,
        isValid: timeDiff >= 2000
      });
      
      if (timeDiff < 2000) { // Less than 2 seconds
        logger.security(`Submission too fast - possible bot [${requestId}]`, {
          timeDiff: `${timeDiff}ms`,
          threshold: '2000ms'
        });
        return res.status(400).json({
          success: false,
          error: 'Please take your time filling out the form'
        });
      }
    }

    // Send email
    logger.email(`Attempting to send quote email [${requestId}]`, {
      to: 'Dashrx10@gmail.com',
      pharmacy: validation.sanitized.pharmacy_name,
      contact: validation.sanitized.contact_person,
      replyTo: validation.sanitized.email
    });
    
    const emailResult = await sendQuoteEmail(validation.sanitized);
    
    logger.success(`Quote email sent successfully [${requestId}]`, {
      messageId: emailResult.messageId,
      timestamp: emailResult.timestamp
    });
    
    res.json({
      success: true,
      message: 'Quote request submitted successfully',
      timestamp: emailResult.timestamp
    });

  } catch (error) {
    logger.error(`Quote submission error [${requestId}]`, {
      code: error.code || null,
      error: error.message,
      stack: error.stack?.split('\n').slice(0,3).join(' | '),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again or contact us directly.',
      contactInfo: { phone: '(313) 333-2133', email: 'dashrx10@gmail.com' }
    });
  }
});


// Log download endpoint
app.get('/api/logs/download', (req, res) => {
  try {
    logger.info('Log download requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    const combinedLogs = logger.getCombinedLogs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dashrx-logs-${timestamp}.txt`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(combinedLogs, 'utf8'));
    
    logger.success('Log download completed', {
      filename,
      size: `${(Buffer.byteLength(combinedLogs, 'utf8') / 1024).toFixed(2)} KB`
    });
    
    res.send(combinedLogs);
  } catch (error) {
    logger.error('Log download failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to download logs'
    });
  }
});

// Log info endpoint (for frontend to check log status)
app.get('/api/logs/info', (req, res) => {
  try {
    const logFiles = logger.getLogFiles();
    const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
    
    logger.debug('Log info requested');
    
    res.json({
      success: true,
      files: logFiles.length,
      totalSize: totalSize,
      totalSizeFormatted: `${(totalSize / 1024).toFixed(2)} KB`,
      latestLog: logFiles[0] ? {
        name: logFiles[0].name,
        size: `${(logFiles[0].size / 1024).toFixed(2)} KB`,
        modified: logFiles[0].modified
      } : null
    });
  } catch (error) {
    logger.error('Log info request failed', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get log info'
    });
  }
});

// Clear logs endpoint (for debugging)
app.post('/api/logs/clear', (req, res) => {
  try {
    logger.warn('Log clear requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    const clearedCount = logger.clearLogs();
    
    res.json({
      success: true,
      message: `Cleared ${clearedCount} log files`,
      clearedFiles: clearedCount
    });
  } catch (error) {
    logger.error('Log clear failed', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs'
    });
  }
});

// Quick mailer test endpoint (add above the /api/* 404 handler)
app.get('/api/test-email', async (req, res) => {
  try {
    const result = await sendQuoteEmail({
      pharmacy_name: 'Test Pharmacy',
      contact_person: 'Test User',
      email: 'test@example.com',
      phone: '+10000000000',
      address: '123 Test St',
      weekly_scripts: { code: null, display: 'Not specified' },
      message: 'This is a test email from /api/test-email.',
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    });

    res.json({ success: true, messageId: result.messageId, at: result.timestamp });
  } catch (err) {
    // Surface SMTP details to help debug
    res.status(500).json({
      success: false,
      error: err.message,
      code: err.code || null,
      response: err.response || null
    });
  }
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Handle all other routes - serve index.html for SPA-like behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(500).json({
    success: false,
    error: 'Something went wrong',
    contactInfo: {
      phone: '(313) 333-2133',
      email: 'dashrx10@gmail.com'
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.success(`DashRx server running on port ${PORT}`);
  logger.info(`Mail provider: ${process.env.MAIL_PROVIDER || 'gmail'}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`Local URL: http://localhost:${PORT}`);
  }
  
  logger.info('Server startup complete - ready to accept requests');
});

module.exports = app;
