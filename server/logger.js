/**
 * Comprehensive logging system for DashRx
 * Handles file logging, console output, and log management
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.logFile = path.join(this.logDir, 'dashrx.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    
    this.ensureLogDirectory();
    this.startSession();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Start a new logging session
   */
  startSession() {
    const sessionStart = this.formatTimestamp();
    const separator = '='.repeat(80);
    const sessionInfo = `
${separator}
🚀 DASHRX SERVER SESSION STARTED
${separator}
Timestamp: ${sessionStart}
Node Version: ${process.version}
Platform: ${process.platform}
Environment: ${process.env.NODE_ENV || 'development'}
Mail Provider: ${process.env.MAIL_PROVIDER || 'gmail'}
${separator}
`;
    
    this.writeToFile(sessionInfo);
    console.log('📝 Logging system initialized');
    console.log(`📁 Log file: ${this.logFile}`);
  }

  /**
   * Format timestamp for logs
   */
  formatTimestamp() {
    const now = new Date();
    
    // UTC timestamp
    const utc = now.toISOString();
    
    // Detroit timezone
    const detroit = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false
    }).format(now);

    return `${detroit} EST/EDT (${utc})`;
  }

  /**
   * Write log entry to file
   */
  writeToFile(message) {
    try {
      // Check if log rotation is needed
      this.rotateLogsIfNeeded();
      
      fs.appendFileSync(this.logFile, message + '\n', 'utf8');
    } catch (error) {
      console.error('❌ Failed to write to log file:', error.message);
    }
  }

  /**
   * Rotate logs if file gets too large
   */
  rotateLogsIfNeeded() {
    try {
      if (!fs.existsSync(this.logFile)) return;
      
      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        // Rotate existing log files
        for (let i = this.maxLogFiles - 1; i >= 1; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;
          
          if (fs.existsSync(oldFile)) {
            if (i === this.maxLogFiles - 1) {
              fs.unlinkSync(oldFile); // Delete oldest
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
        
        // Move current log to .1
        fs.renameSync(this.logFile, `${this.logFile}.1`);
        
        this.log('info', 'Log file rotated due to size limit');
      }
    } catch (error) {
      console.error('❌ Log rotation failed:', error.message);
    }
  }

  /**
   * Main logging method
   */
  log(level, message, data = null) {
    const timestamp = this.formatTimestamp();
    const levelEmoji = this.getLevelEmoji(level);
    const levelText = level.toUpperCase().padEnd(7);
    
    let logEntry = `[${timestamp}] ${levelEmoji} ${levelText} ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        logEntry += '\n' + JSON.stringify(data, null, 2);
      } else {
        logEntry += ` | Data: ${data}`;
      }
    }
    
    // Write to file
    this.writeToFile(logEntry);
    
    // Console output with colors
    this.consoleOutput(level, message, data, timestamp);
  }

  /**
   * Get emoji for log level
   */
  getLevelEmoji(level) {
    const emojis = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      success: '✅',
      request: '📥',
      response: '📤',
      email: '📧',
      security: '🔒',
      validation: '✔️',
      database: '💾',
      performance: '⚡'
    };
    return emojis[level] || 'ℹ️';
  }

  /**
   * Console output with colors
   */
  consoleOutput(level, message, data, timestamp) {
    const colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
      success: '\x1b[32m', // Green
      request: '\x1b[34m', // Blue
      response: '\x1b[34m',// Blue
      email: '\x1b[36m',   // Cyan
      security: '\x1b[31m',// Red
      validation: '\x1b[33m', // Yellow
      database: '\x1b[35m',// Magenta
      performance: '\x1b[32m' // Green
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || colors.info;
    const emoji = this.getLevelEmoji(level);
    
    console.log(`${color}${emoji} [${timestamp.split(' ')[1]}] ${message}${reset}`);
    
    if (data && (level === 'error' || level === 'debug')) {
      console.log(color + JSON.stringify(data, null, 2) + reset);
    }
  }

  /**
   * Convenience methods for different log levels
   */
  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  success(message, data = null) {
    this.log('success', message, data);
  }

  request(message, data = null) {
    this.log('request', message, data);
  }

  response(message, data = null) {
    this.log('response', message, data);
  }

  email(message, data = null) {
    this.log('email', message, data);
  }

  security(message, data = null) {
    this.log('security', message, data);
  }

  validation(message, data = null) {
    this.log('validation', message, data);
  }

  database(message, data = null) {
    this.log('database', message, data);
  }

  performance(message, data = null) {
    this.log('performance', message, data);
  }

  /**
   * Log HTTP request details
   */
  logRequest(req) {
    const requestData = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    };
    
    this.request(`${req.method} ${req.url}`, requestData);
  }

  /**
   * Log HTTP response details
   */
  logResponse(req, res, responseTime) {
    const responseData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
    
    const level = res.statusCode >= 400 ? 'error' : 'response';
    this.log(level, `${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`, responseData);
  }

  /**
   * Get all log files for download
   */
  getLogFiles() {
    try {
      const files = [];
      
      // Main log file
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        files.push({
          name: 'dashrx.log',
          path: this.logFile,
          size: stats.size,
          modified: stats.mtime
        });
      }
      
      // Rotated log files
      for (let i = 1; i <= this.maxLogFiles; i++) {
        const rotatedFile = `${this.logFile}.${i}`;
        if (fs.existsSync(rotatedFile)) {
          const stats = fs.statSync(rotatedFile);
          files.push({
            name: `dashrx.log.${i}`,
            path: rotatedFile,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      return files.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      this.error('Failed to get log files', { error: error.message });
      return [];
    }
  }

  /**
   * Get combined log content for download
   */
  getCombinedLogs() {
    try {
      const files = this.getLogFiles();
      let combinedContent = '';
      
      combinedContent += `DashRx Server Logs - Downloaded: ${this.formatTimestamp()}\n`;
      combinedContent += '='.repeat(80) + '\n\n';
      
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          combinedContent += `\n${'='.repeat(40)}\n`;
          combinedContent += `LOG FILE: ${file.name}\n`;
          combinedContent += `SIZE: ${(file.size / 1024).toFixed(2)} KB\n`;
          combinedContent += `MODIFIED: ${file.modified.toISOString()}\n`;
          combinedContent += '='.repeat(40) + '\n\n';
          
          const content = fs.readFileSync(file.path, 'utf8');
          combinedContent += content + '\n\n';
        }
      });
      
      return combinedContent;
    } catch (error) {
      this.error('Failed to get combined logs', { error: error.message });
      return `Error reading logs: ${error.message}`;
    }
  }

  /**
   * Clear all log files
   */
  clearLogs() {
    try {
      const files = this.getLogFiles();
      let cleared = 0;
      
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          cleared++;
        }
      });
      
      this.info(`Cleared ${cleared} log files`);
      this.startSession(); // Start new session after clearing
      
      return cleared;
    } catch (error) {
      this.error('Failed to clear logs', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
