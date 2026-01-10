import nodemailer from 'nodemailer';
import { query } from '../db/client.js'; 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function notifyContacts(userId, eventType, data) {
  console.log(`🔔 Notifying contacts for User ${userId}: ${eventType}`);

  try {
    // ---------------------------------------------------------
    // ✅ THE FIX: SMART LOOKUP
    // We join 'contacts' -> 'profiles' -> 'auth.users'
    // This finds the email even if you only saved their phone number.
    // ---------------------------------------------------------
    const sql = `
      SELECT 
        c.name,
        COALESCE(NULLIF(c.email, ''), au.email) as email
      FROM contacts c
      LEFT JOIN profiles p ON c.phone = p.phone_number
      LEFT JOIN auth.users au ON p.id = au.id
      WHERE c.user_id = $1
    `;

    const { rows: allContacts } = await query(sql, [userId]);

    // Filter out anyone who STILL has no email (unregistered users with no manual email)
    const validContacts = allContacts.filter(c => c.email && c.email.includes('@'));

    if (validContacts.length === 0) {
      console.log(`⚠️ Found contacts, but none have valid emails. Skipping.`);
      return;
    }

    console.log(`📧 Found ${validContacts.length} valid recipients.`);

    // ---------------------------------------------------------
    // 2. Prepare Email Content
    // ---------------------------------------------------------
    let subject = '';
    let htmlTemplate = '';

    switch (eventType) {
      case 'INCIDENT_STARTED':
        subject = `🚨 SOS: ${data.userName} needs help!`;
        const trackingLink = `${APP_URL}/track/${data.incidentId}`;
        const mapLink = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
        
        htmlTemplate = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #d32f2f; max-width: 600px; border-radius: 8px;">
            <h2 style="color: #d32f2f; text-transform: uppercase;">🚨 Emergency Alert</h2>
            <p><strong>${data.userName}</strong> has activated Aegis Emergency Recording.</p>
            
            <div style="background: #fff5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date(data.time).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${data.lat}, ${data.lng}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingLink}" style="background-color: #d32f2f; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 16px; display: inline-block;">
                🔴 VIEW LIVE FEED & MAP
              </a>
            </div>

            <p style="text-align: center;">
              <a href="${mapLink}" style="color: #555; text-decoration: underline;">Open in Google Maps</a>
            </p>
          </div>
        `;
        break;

      case 'DELETION_REQUESTED':
        subject = `🗳️ VOTE REQUIRED: ${data.userName} requested deletion`;
        const voteLink = `${APP_URL}/vote`;
        
        htmlTemplate = `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; border: 1px solid #ddd; max-width: 600px; border-radius: 8px;">
            <h2 style="color: #333;">Safety Consensus Needed</h2>
            <p><strong>${data.userName}</strong> has requested to delete an evidence file.</p>
            <div style="background: white; padding: 15px; border: 1px solid #eee; margin: 20px 0;">
              <p><strong>Reason:</strong> "${data.reason}"</p>
            </div>
            <div style="text-align: center;">
              <a href="${voteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                Go to Voting Portal
              </a>
            </div>
          </div>
        `;
        break;
    }

    // ---------------------------------------------------------
    // 3. Send Emails
    // ---------------------------------------------------------
    const emailPromises = validContacts.map(contact => {
      const personalizedHtml = htmlTemplate.replace('{{CONTACT_NAME}}', contact.name || 'Friend');
      return transporter.sendMail({
        from: `"Aegis Security" <${process.env.EMAIL_USER}>`,
        to: contact.email, 
        subject: subject,
        html: personalizedHtml
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const sentCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Sent ${sentCount}/${validContacts.length} alerts.`);

  } catch (err) {
    console.error("❌ Notification Service Error:", err);
  }
}