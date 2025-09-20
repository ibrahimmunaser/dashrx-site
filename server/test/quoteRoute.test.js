/**
 * Test suite for quote route functionality
 * Tests form validation, security measures, and email delivery
 */

const http = require('http');
const app = require('../server');

// Simple test framework (no external dependencies)
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Starting DashRx Quote Route Tests\n');
    
    // Start server for testing
    const server = app.listen(0); // Use random available port
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    
    console.log(`📡 Test server running on port ${port}\n`);

    for (const test of this.tests) {
      try {
        console.log(`⏳ ${test.name}`);
        await test.testFn(baseUrl);
        this.passed++;
        console.log(`✅ ${test.name}\n`);
      } catch (error) {
        this.failed++;
        console.error(`❌ ${test.name}`);
        console.error(`   Error: ${error.message}\n`);
      }
    }

    // Close server
    server.close();

    // Print summary
    console.log('📊 Test Summary');
    console.log('================');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total:  ${this.tests.length}`);
    
    if (this.failed > 0) {
      console.log('\n💡 Some tests failed. Check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }
  }
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData,
            rawBody: data
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test helper functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
  }
}

// Create test runner
const runner = new TestRunner();

// Test: Health check endpoint
runner.test('Health check endpoint responds correctly', async (baseUrl) => {
  const response = await makeRequest(`${baseUrl}/api/health`);
  
  assertEqual(response.statusCode, 200, 'Health check should return 200');
  assert(response.body && response.body.status === 'healthy', 'Health check should return healthy status');
});

// Test: Valid quote submission
runner.test('Valid quote submission succeeds', async (baseUrl) => {
  const validPayload = {
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'John Doe',
    phone: '(313) 333-2133',
    email: 'test@testpharmacy.com',
    address: '123 Main St, Detroit, MI 48201',
    monthly_scripts: '100–500',
    message: 'We are interested in your delivery services.',
    company_website: '', // Honeypot should be empty
    submission_time: Date.now() - 3000 // 3 seconds ago
  };

  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(validPayload)
  });

  // Note: This might fail if email is not configured, but validation should pass
  assert(
    response.statusCode === 200 || (response.statusCode === 500 && response.body.error.includes('Email')),
    'Valid submission should succeed or fail only due to email configuration'
  );
});

// Test: Missing required fields
runner.test('Missing required fields are rejected', async (baseUrl) => {
  const invalidPayload = {
    pharmacy_name: '', // Missing required field
    contact_person: 'John Doe',
    phone: '(313) 333-2133',
    email: 'test@testpharmacy.com'
  };

  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidPayload)
  });

  assertEqual(response.statusCode, 400, 'Missing required fields should return 400');
  assert(response.body && response.body.success === false, 'Response should indicate failure');
  assert(response.body.details && response.body.details.length > 0, 'Should provide validation error details');
});

// Test: Invalid email format
runner.test('Invalid email format is rejected', async (baseUrl) => {
  const invalidPayload = {
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'John Doe',
    phone: '(313) 333-2133',
    email: 'invalid-email-format', // Invalid email
    company_website: ''
  };

  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidPayload)
  });

  assertEqual(response.statusCode, 400, 'Invalid email should return 400');
  assert(response.body && response.body.success === false, 'Response should indicate failure');
});

// Test: Invalid phone format
runner.test('Invalid phone format is rejected', async (baseUrl) => {
  const invalidPayload = {
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'John Doe',
    phone: '123', // Invalid phone
    email: 'test@testpharmacy.com',
    company_website: ''
  };

  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidPayload)
  });

  assertEqual(response.statusCode, 400, 'Invalid phone should return 400');
  assert(response.body && response.body.success === false, 'Response should indicate failure');
});

// Test: Honeypot spam detection
runner.test('Honeypot field triggers spam detection', async (baseUrl) => {
  const spamPayload = {
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'John Doe',
    phone: '(313) 333-2133',
    email: 'test@testpharmacy.com',
    company_website: 'https://spam-site.com', // Honeypot filled - should be rejected
    message: 'This is spam'
  };

  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(spamPayload)
  });

  assertEqual(response.statusCode, 400, 'Honeypot spam should return 400');
  assert(response.body && response.body.success === false, 'Response should indicate failure');
});

// Test: Rate limiting
runner.test('Rate limiting prevents spam requests', async (baseUrl) => {
  const payload = {
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'John Doe',
    phone: '(313) 333-2133',
    email: 'test@testpharmacy.com',
    company_website: '',
    submission_time: Date.now() - 3000
  };

  // Make multiple rapid requests
  const promises = [];
  for (let i = 0; i < 6; i++) { // Exceed rate limit of 3 per minute
    promises.push(
      makeRequest(`${baseUrl}/api/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
    );
  }

  const responses = await Promise.all(promises);
  
  // At least one request should be rate limited
  const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
  assert(rateLimitedResponses.length > 0, 'Rate limiting should block excessive requests');
});

// Test: Message length validation
runner.test('Message length validation works', async (baseUrl) => {
  const longMessage = 'a'.repeat(2001); // Exceed 2000 character limit
  
  const invalidPayload = {
    pharmacy_name: 'Test Pharmacy',
    contact_person: 'John Doe',
    phone: '(313) 333-2133',
    email: 'test@testpharmacy.com',
    message: longMessage,
    company_website: ''
  };

  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invalidPayload)
  });

  assertEqual(response.statusCode, 400, 'Overly long message should return 400');
  assert(response.body && response.body.success === false, 'Response should indicate failure');
});

// Test: Empty request body
runner.test('Empty request body is rejected', async (baseUrl) => {
  const response = await makeRequest(`${baseUrl}/api/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: ''
  });

  assertEqual(response.statusCode, 400, 'Empty request should return 400');
});

// Test: Security headers
runner.test('Security headers are present', async (baseUrl) => {
  const response = await makeRequest(`${baseUrl}/`);
  
  assert(response.headers['x-content-type-options'], 'X-Content-Type-Options header should be present');
  assert(response.headers['x-frame-options'], 'X-Frame-Options header should be present');
  assert(!response.headers['x-powered-by'], 'X-Powered-By header should be removed');
});

// Test: 404 handling for invalid API routes
runner.test('Invalid API routes return 404', async (baseUrl) => {
  const response = await makeRequest(`${baseUrl}/api/nonexistent`);
  
  assertEqual(response.statusCode, 404, 'Invalid API route should return 404');
  assert(response.body && response.body.success === false, 'Response should indicate failure');
});

// Test: Static file serving
runner.test('Static files are served correctly', async (baseUrl) => {
  const response = await makeRequest(`${baseUrl}/robots.txt`);
  
  assertEqual(response.statusCode, 200, 'Static file should be served');
  assert(response.rawBody.includes('User-agent'), 'robots.txt should contain proper content');
});

// Test: Main page loads
runner.test('Main page loads successfully', async (baseUrl) => {
  const response = await makeRequest(`${baseUrl}/`);
  
  assertEqual(response.statusCode, 200, 'Main page should load');
  assert(response.rawBody.includes('DashRx'), 'Page should contain DashRx branding');
  assert(response.rawBody.includes('The Missing Link'), 'Page should contain tagline');
});

// Run all tests
if (require.main === module) {
  runner.run().catch(console.error);
}

module.exports = { TestRunner, makeRequest, assert, assertEqual };
