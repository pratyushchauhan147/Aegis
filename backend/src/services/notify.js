import nodemailer from 'nodemailer';

// Configure Transporter (Use Environment Variables in production!)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g., 'your-app@gmail.com'
    pass: process.env.EMAIL_PASS  // Generate Google App Password
  }
});

export async function notifyContacts(userId, eventType, data) {
  console.log(`🔔 Notifying contacts for User ${userId}: ${eventType}`);

  // 1. Fetch Contacts (Mock logic - in real app, query DB)
  // const contacts = await query('SELECT email FROM contacts WHERE user_id = $1', [userId]);
  // For MVP, we will just email the developer (YOU) to test it.
  const recipients = [process.env.TEST_EMAIL_RECIPIENT || data.userName]; 

  let subject = '';
  let text = '';
  let html = '';

  // 2. Craft Message
  switch (eventType) {
    case 'INCIDENT_STARTED':
      subject = '🚨 SOS: Emergency Recording Started';
      text = `User ${data.userName} has started recording at Lat: ${data.lat}, Lng: ${data.lng}. Check Dashboard.`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #red;">
          <h1 style="color: red;">🚨 SOS ALERT</h1>
          <p><strong>${data.userName}</strong> has activated an emergency recording.</p>
          <p><strong>Location:</strong> <a href="https://www.google.com/maps?q=${data.lat},${data.lng}">Open in Maps</a></p>
          <p>Tracking has begun. Video is securing to the cloud.</p>
        </div>
      `;
      break;

    case 'DELETION_REQUESTED':
      subject = '🗳️ VOTE REQUIRED: Safety Check';
      text = `User requested deletion for incident. Reason: "${data.reason}". Go to /vote to approve/reject.`;
      html = `
        <div style="font-family: sans-serif; padding: 20px; background: #f4f4f4;">
          <h2 style="color: #333;">Safety Consensus Needed</h2>
          <p>A user has requested to delete an evidence file.</p>
          <p><strong>Reason Given:</strong> "${data.reason}"</p>
          <br/>
          <a href="http://localhost:3000/vote?id=${data.requestId}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Voting Portal</a>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">If you suspect coercion, vote <strong>KEEP</strong>.</p>
        </div>
      `;
      break;
  }

  // 3. Send Email
  try {
    const info = await transporter.sendMail({
      from: '"Aegis Security" <noreply@aegis.app>',
      to: recipients.join(','),
      subject: subject,
      text: text,
      html: html
    });
    console.log("✅ Email sent: %s", info.messageId);
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
}