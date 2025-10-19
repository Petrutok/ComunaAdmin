import { EmailService } from '../lib/email-service';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testEmailFetch() {
  const emailService = new EmailService();
  
  try {
    console.log('Connecting to email server...');
    await emailService.connect();
    console.log('Connected successfully!');
    
    console.log('Fetching new emails...');
    const emails = await emailService.fetchNewEmails();
    console.log(`Found ${emails.length} new emails`);
    
    emails.forEach((email, index) => {
      console.log(`\nEmail ${index + 1}:`);
      console.log(`  From: ${email.from}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  Date: ${email.date}`);
      console.log(`  Attachments: ${email.attachments.length}`);
    });
    
    await emailService.disconnect();
    console.log('\nDisconnected from server');
  } catch (error) {
    console.error('Error:', error);
  }
}

testEmailFetch();