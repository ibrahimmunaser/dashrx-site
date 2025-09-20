const http = require('http');

const testData = JSON.stringify({
  pharmacy_name: "Metro Detroit Test Pharmacy",
  contact_person: "John Smith", 
  phone: "(313) 555-0123",
  email: "john.smith@testpharmacy.com",
  address: "123 Main Street, Detroit, MI 48201",
  monthly_scripts: "100–500",
  message: "We are interested in your delivery services for our pharmacy. We serve about 200 customers per month and would like to discuss partnership opportunities.",
  company_website: "",
  submission_time: Date.now() - 3000
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/quote',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🧪 Testing DashRx Quote Form...');
console.log('📋 Submitting test pharmacy data...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n✅ Response received:');
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', data);
    
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('\n🎉 SUCCESS! Email should be sent to Dashrx10@gmail.com');
        console.log('📧 Expected subject: New Pharmacy Quote Request — Metro Detroit Test Pharmacy');
        console.log('📧 Reply-To: john.smith@testpharmacy.com');
      } else {
        console.log('\n❌ Submission failed:', response.error);
        if (response.details) {
          console.log('Details:', response.details);
        }
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(testData);
req.end();
