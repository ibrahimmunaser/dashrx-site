/**
 * Development Testing Snippets for DashRx Quote API
 * 
 * Paste these snippets into your browser console to test the endpoint
 */

// Test 1: Valid submission
console.log("🧪 Test 1: Valid submission");
fetch('/api/quote', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'Test User',
    email: 'test@example.com',
    phone: '3130000000',
    address: '123 Test St',
    monthly_scripts: '<25', // Note: server expects this field name
    message: '',
    company_website: '',
    consent: true,
    submission_time: Date.now()
  })
}).then(r => r.json()).then(data => {
  console.log('✅ Valid submission result:', data);
}).catch(err => {
  console.error('❌ Valid submission error:', err);
});

// Test 2: Missing required fields (should return 400)
console.log("🧪 Test 2: Missing required fields");
fetch('/api/quote', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    pharmacy_name: '',
    contact_person: '',
    email: 'invalid-email',
    phone: '',
    company_website: '',
    submission_time: Date.now()
  })
}).then(r => r.json()).then(data => {
  console.log('✅ Validation error result (expected 400):', data);
}).catch(err => {
  console.error('❌ Validation test error:', err);
});

// Test 3: Honeypot filled (should return 400)
console.log("🧪 Test 3: Honeypot spam detection");
fetch('/api/quote', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'Test User',
    email: 'test@example.com',
    phone: '3130000000',
    company_website: 'this-is-spam.com',
    consent: true,
    submission_time: Date.now()
  })
}).then(r => r.json()).then(data => {
  console.log('✅ Honeypot spam result (expected 400):', data);
}).catch(err => {
  console.error('❌ Honeypot test error:', err);
});

/**
 * Expected Response Codes:
 * 
 * 200 - Success: Form submitted successfully
 * 400 - Validation Error: Missing/invalid fields or spam detection
 * 429 - Rate Limited: Too many requests (5 per minute)
 * 500 - Server Error: Email sending failed or internal error
 * 
 * Response Format:
 * {
 *   "success": true/false,
 *   "message": "Descriptive message",
 *   "details": ["Array of specific errors"] // Only on validation errors
 * }
 */
