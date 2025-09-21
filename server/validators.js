/**
 * Input validation and sanitization utilities
 * Ensures data integrity and security for form submissions
 */

const logger = require('./logger');

/**
 * Normalize weekly scripts value - handles tokens and legacy display strings
 */
const normalizeWeeklyScripts = (val) => {
  if (!val) return { token: 'lt25', display: 'Less than 25' };
  const v = String(val).trim();

  // Accept tokens first
  if (v === 'lt25')     return { token: 'lt25',     display: 'Less than 25' };
  if (v === '25to125')  return { token: '25to125',  display: '25 to 125' };
  if (v === 'gt125')    return { token: 'gt125',    display: 'More than 125' };

  // Accept legacy display strings (hyphen or EN/EM dash)
  const clean = v.replace(/\u2013|\u2014/g, '-'); // en/em dash → hyphen
  if (/^less\s+than\s+25$/i.test(clean))                  return { token: 'lt25',    display: 'Less than 25' };
  if (/^(25\s*-\s*125|25\s*to\s*125)$/i.test(clean))      return { token: '25to125', display: '25 to 125' };
  if (/^more\s+than\s+125$/i.test(clean))                 return { token: 'gt125',   display: 'More than 125' };

  return { token: 'lt25', display: 'Less than 25' };
};

/**
 * Validates email format using RFC-compliant regex
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates US phone number formats
 * Accepts various formats: (313) 333-2133, 313-333-2133, 3133332133, etc.
 */
function isValidPhoneUS(phone) {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // US phone numbers should have 10 digits (area code + number)
  // Or 11 digits starting with 1 (country code)
  if (digits.length === 10) {
    return /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits);
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return /^1[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits);
  }
  
  return false;
}

/**
 * Sanitizes text input by removing HTML tags and trimming whitespace
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .trim();
}

/**
 * Validates weekly delivery volume selection
 */
function isValidMonthlyScripts(volume) {
  if (!volume || typeof volume !== 'string') return false;
  
  // Handle various formats that might be received
  const validPatterns = [
    '<25',            // Less than 25
    '25–125',         // 25 to 125 (en-dash)
    '25-125',         // 25 to 125 (regular dash)
    '25125',          // 25125 (no dash - common encoding issue)
    '25 to 125',      // 25 to 125 (spelled out)
    '>125'            // More than 125
  ];
  
  // Normalize the input for comparison
  const normalized = volume.trim().toLowerCase();
  
  // Check direct matches first
  if (validPatterns.some(pattern => 
    pattern.toLowerCase() === normalized || 
    pattern.replace(/[-–—]/g, '') === normalized.replace(/[-–—\s]/g, '')
  )) {
    return true;
  }
  
  // Special case: if it's "100500" or similar, treat as "100-500"
  if (/^100\s*[-–—]?\s*500$/.test(normalized) || normalized === '100500') {
    return true;
  }
  
  return false;
}

/**
 * Validates the complete quote form payload
 */
function validateQuotePayload(payload) {
  const errors = [];
  
  // Required fields validation
  if (!payload.pharmacy_name || !sanitizeText(payload.pharmacy_name)) {
    errors.push('Pharmacy name is required');
  }
  
  if (!payload.contact_person || !sanitizeText(payload.contact_person)) {
    errors.push('Contact person is required');
  }
  
  if (!payload.phone || !isValidPhoneUS(payload.phone)) {
    errors.push('Valid US phone number is required');
  }
  
  if (!payload.email || !isValidEmail(payload.email)) {
    errors.push('Valid email address is required');
  }
  
  // Weekly scripts normalization
  const scriptsNorm = normalizeWeeklyScripts(payload.weekly_scripts || payload.weekly_scripts_display);
  logger.debug('Weekly scripts normalization', {
    input: payload.weekly_scripts,
    inputDisplay: payload.weekly_scripts_display,
    normalized: scriptsNorm
  });
  if (!scriptsNorm.token) {
    errors.push('Invalid weekly delivery volume selected');
  }
  
  if (payload.message && payload.message.length > 2000) {
    errors.push('Message must be 2000 characters or less');
  }
  
  // Honeypot check (should be empty) - more intelligent detection
  if (payload.company_website && payload.company_website.trim() !== '') {
    const honeypotValue = payload.company_website.trim();
    
    logger.debug('Honeypot field filled', {
      value: honeypotValue,
      length: honeypotValue.length
    });
    
    // Allow common autofill values that browsers might insert
    const allowedAutofillValues = [
      'http://',
      'https://',
      'www.',
      'example.com',
      'test.com',
      'localhost',
      'projectjannahyemen'
    ];
    
    // Check if it's likely autofill vs. actual spam
    const isLikelyAutofill = allowedAutofillValues.some(allowed => 
      honeypotValue.toLowerCase().includes(allowed.toLowerCase())
    ) || honeypotValue.length < 10; // Short values are likely accidental
    
    if (!isLikelyAutofill) {
      logger.security('Honeypot triggered - likely spam', {
        value: honeypotValue,
        length: honeypotValue.length
      });
      errors.push('Spam detection triggered');
    } else {
      logger.debug('Honeypot filled but appears to be autofill, allowing submission', {
        value: honeypotValue
      });
    }
  }
  
  // Sanitize all text fields
  const sanitized = {
    pharmacy_name: sanitizeText(payload.pharmacy_name),
    contact_person: sanitizeText(payload.contact_person),
    phone: sanitizeText(payload.phone),
    email: sanitizeText(payload.email),
    address: sanitizeText(payload.address || ''),
    city: sanitizeText(payload.city || ''),
    state: sanitizeText(payload.state || ''),
    weekly_scripts: scriptsNorm.token,
    weekly_scripts_display: scriptsNorm.display,
    message: sanitizeText(payload.message || ''),
    company_website: sanitizeText(payload.company_website || '')
  };
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Basic spam detection checks
 */
function detectSpam(payload) {
  const spamIndicators = [];
  
  // Check for excessive links in message
  const linkCount = (payload.message || '').match(/https?:\/\/[^\s]+/g)?.length || 0;
  if (linkCount > 2) {
    spamIndicators.push('Too many links in message');
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b(?:viagra|cialis|casino|lottery|winner|congratulations)\b/i,
    /\$\d+.*(?:million|thousand)/i,
    /click here/i
  ];
  
  const messageText = (payload.message || '').toLowerCase();
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(messageText)) {
      spamIndicators.push('Suspicious content detected');
    }
  });
  
  return spamIndicators;
}

module.exports = {
  isValidEmail,
  isValidPhoneUS,
  sanitizeText,
  isValidMonthlyScripts,
  validateQuotePayload,
  detectSpam
};
