// Quick email test for DashRx
require('dotenv').config();
const { sendQuoteEmail } = require('./server/mailer');

const testData = {
  pharmacy_name: "Detroit Test Pharmacy",
  contact_person: "Sarah Johnson",
  phone: "(313) 555-9876", 
  email: "sarah.johnson@detroitpharmacy.com",
  address: "456 Pharmacy Ave, Detroit, MI 48202",
  monthly_scripts: "100–500",
  message: "Hello, we are interested in partnering with DashRx for prescription delivery services. We handle approximately 300 prescriptions monthly and would like to learn more about your service offerings and pricing."
};

console.log('🧪 Testing Email Delivery...');
console.log('📧 Sending test email to: Dashrx10@gmail.com');
console.log('📋 Test pharmacy data:', testData.pharmacy_name);

sendQuoteEmail(testData)
  .then(result => {
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', result.messageId);
    console.log('⏰ Timestamp:', result.timestamp.detroit);
    console.log('\n📬 Check your Dashrx10@gmail.com inbox!');
    console.log('📄 Expected subject: New Pharmacy Quote Request — Detroit Test Pharmacy');
    console.log('📧 Reply-To: sarah.johnson@detroitpharmacy.com');
  })
  .catch(error => {
    console.error('\n❌ EMAIL FAILED!');
    console.error('Error:', error.message);
  });
