import nodemailer from "nodemailer";

let cachedTransporter = null;

/**
 * Get or initialize the singleton Nodemailer transporter.
 */
export function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const user = process.env.EMAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    console.warn("[MAILER] EMAIL_USERNAME or EMAIL_PASSWORD not set in environment variables.");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ""), // clean any spaces from Google App Password
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return cachedTransporter;
}

/**
 * Verify SMTP connection and credentials.
 */
export async function verifySmtpConnection() {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      configured: false,
      message: "SMTP credentials (EMAIL_USERNAME / EMAIL_PASSWORD) not configured in .env.local",
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      configured: true,
      sender: process.env.EMAIL_USERNAME,
      message: "SMTP connection verified successfully. Ready to send emails.",
    };
  } catch (error) {
    console.error("[MAILER] SMTP verification failed:", error);
    return {
      success: false,
      configured: true,
      sender: process.env.EMAIL_USERNAME,
      message: error.message || "Failed to authenticate with SMTP server",
    };
  }
}

/**
 * Common HTML wrapper with GDG on Campus styling
 */
function wrapEmailHtml({ title, preheader, bodyHtml, ctaText, ctaUrl, footerNote }) {
  const portalUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const targetCtaUrl = ctaUrl || `${portalUrl}/profile`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 40px 12px;
      box-sizing: border-box;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
    }
    .header {
      background: #090d16;
      padding: 24px 32px;
      border-bottom: 1px solid #334155;
      text-align: left;
    }
    .badge {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      line-height: 1.3;
    }
    .content {
      padding: 32px;
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .content p {
      margin: 0 0 18px 0;
    }
    .highlight-box {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid #334155;
      border-left: 4px solid #38bdf8;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      color: #f1f5f9;
    }
    .cta-btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 12px 0 24px 0;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .footer {
      background: #090d16;
      padding: 20px 32px;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="badge">GDG on Campus // Recruitment Portal</div>
        <h1 class="title">${title}</h1>
      </div>
      <div class="content">
        ${bodyHtml}
        ${ctaText ? `<a href="${targetCtaUrl}" class="cta-btn" target="_blank">${ctaText} &rarr;</a>` : ""}
      </div>
      <div class="footer">
        ${footerNote || "This is an automated notification from Google Developer Groups on Campus (VIT)."}
        <br>Candidate Portal: <a href="${portalUrl}">${portalUrl}</a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch decision email for Round 1, Round 2, or Round 3
 */
export async function sendDecisionEmail({ to, candidateName, department, round, decision, details = {} }) {
  const transporter = getTransporter();
  const portalUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const name = candidateName || "Candidate";
  const dept = department || "Department";

  if (!transporter) {
    console.log(`[DRY RUN - DECISION EMAIL] To: ${to}, Round: ${round}, Decision: ${decision}`);
    return {
      success: true,
      simulated: true,
      message: "Email dispatch simulated (SMTP credentials not configured)",
    };
  }

  let subject = "";
  let preheader = "";
  let bodyHtml = "";
  let ctaText = "Go to Candidate Portal";
  let ctaUrl = `${portalUrl}/profile`;

  if (round === "round1") {
    if (decision === "shortlisted") {
      subject = `🎉 Shortlisted: Round 1 Result for ${dept} | GDG on Campus`;
      preheader = `Congratulations ${name}! You have been shortlisted for ${dept}. Round 2 practical tasks are now live.`;
      bodyHtml = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>We are excited to share that your application for the <strong>${dept}</strong> department has successfully cleared Round 1 (Initial Screening)!</p>
        <div class="highlight-box">
          <strong>Department:</strong> ${dept}<br>
          <strong>Status:</strong> SHORTLISTED FOR ROUND 2<br>
          <strong>Next Step:</strong> Practical Technical/Creative Challenge
        </div>
        <p>Your Round 2 task prompt is now accessible directly on your candidate profile. Please ensure you complete and submit your task deliverables before the departmental deadline.</p>
      `;
      ctaText = "View Round 2 Task & Submit";
    } else {
      subject = `Application Update: ${dept} | GDG on Campus`;
      preheader = `Thank you for applying to GDG on Campus, ${name}. Here is an update on your application.`;
      bodyHtml = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for your interest in joining <strong>GDG on Campus</strong> and for taking the time to submit your application for the <strong>${dept}</strong> department.</p>
        <p>After careful evaluation of a highly competitive applicant pool, we regret to inform you that we will not be moving forward with your application for this department in the current recruitment cycle.</p>
        <p>We strongly encourage you to participate in our open workshops, hackathons, and technical sessions, and we welcome your application in future recruitments.</p>
      `;
      ctaText = "View Application Status";
    }
  } else if (round === "round2") {
    if (decision === "cleared") {
      subject = `⚡ Round 2 Cleared: Book Your Interview for ${dept} | GDG on Campus`;
      preheader = `Congratulations ${name}! You cleared Round 2 for ${dept}. Self-schedule your interview now.`;
      bodyHtml = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>Congratulations! Your Round 2 task submission for <strong>${dept}</strong> has been reviewed and cleared by our team leads.</p>
        <div class="highlight-box">
          <strong>Department:</strong> ${dept}<br>
          <strong>Status:</strong> ROUND 2 CLEARED &rarr; ROUND 3 INTERVIEW<br>
          <strong>Action Required:</strong> Pick a 15-Minute Interview Slot
        </div>
        <p>You can now self-schedule your cumulative 15-minute personal interview on your candidate profile. Slots are first-come, first-served.</p>
      `;
      ctaText = "Self-Schedule Interview Slot";
    } else {
      subject = `Round 2 Evaluation Update: ${dept} | GDG on Campus`;
      preheader = `Thank you for completing the Round 2 practical evaluation for ${dept}.`;
      bodyHtml = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for dedicating your time and effort to completing the Round 2 task for <strong>${dept}</strong>.</p>
        <p>After evaluating all submissions, we are unable to advance your application to the final interview stage. Our leads were impressed with your enthusiasm, and we hope to see you at our campus tech events.</p>
      `;
      ctaText = "View Candidate Profile";
    }
  } else if (round === "round3") {
    if (decision === "selected" || decision === "accepted") {
      subject = `🏆 Welcome to the Team! Official Offer for ${dept} | GDG on Campus`;
      preheader = `Congratulations ${name}! You have been selected to join GDG on Campus.`;
      bodyHtml = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>On behalf of the entire lead team at <strong>Google Developer Groups on Campus</strong>, we are thrilled to offer you a position as an official member in the <strong>${dept}</strong> department!</p>
        <div class="highlight-box">
          <strong>Department:</strong> ${dept}<br>
          <strong>Final Status:</strong> SELECTED / OFFER EXTENDED 🚀<br>
          <strong>Welcome:</strong> Official GDG on Campus Core Team
        </div>
        <p>Your performance across screening, practical trials, and personal interviews demonstrated exceptional technical capability and cultural alignment. Welcome to the family!</p>
        <p>Keep an eye on your institutional email for onboarding schedules and chapter group invitations.</p>
      `;
      ctaText = "Go to Member Dashboard";
    } else {
      subject = `Final Interview Outcome: ${dept} | GDG on Campus`;
      preheader = `Thank you for interviewing with GDG on Campus, ${name}.`;
      bodyHtml = `
        <p>Dear <strong>${name}</strong>,</p>
        <p>Thank you for taking the time to interview with the <strong>${dept}</strong> team at GDG on Campus.</p>
        <p>While we were impressed with your profile and interview, due to team size constraints we are unable to extend an offer this term. We truly appreciate the passion you brought throughout the recruitment process.</p>
      `;
      ctaText = "View Profile";
    }
  }

  const html = wrapEmailHtml({
    title: subject,
    preheader,
    bodyHtml,
    ctaText,
    ctaUrl,
  });

  const mailOptions = {
    from: `"GDG on Campus" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    simulated: false,
  };
}

/**
 * Dispatch automated booking confirmation email when student reserves an interview slot
 */
export async function sendInterviewConfirmationEmail({ to, candidateName, department, slotDetails }) {
  const transporter = getTransporter();
  const portalUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const name = candidateName || "Candidate";
  const dept = department || "Department";

  if (!transporter) {
    console.log(`[DRY RUN - INTERVIEW CONFIRMATION] To: ${to}, Dept: ${dept}, Slot: ${slotDetails?.slotLabel}`);
    return { success: true, simulated: true };
  }

  const date = slotDetails.date || "Scheduled Date";
  const time = slotDetails.slotTime || slotDetails.slotLabel || `${slotDetails.startTime} - ${slotDetails.endTime}`;
  const meetLink = slotDetails.meetingLink || slotDetails.meetLink || "";

  const subject = `🗓️ Confirmed: Your GDG Interview for ${dept} on ${date} (${time})`;
  const preheader = `Your 15-minute GDG interview for ${dept} is confirmed for ${date} at ${time}.`;

  const bodyHtml = `
    <p>Dear <strong>${name}</strong>,</p>
    <p>Your 15-minute personal interview for the <strong>${dept}</strong> department has been successfully booked.</p>
    <div class="highlight-box">
      <strong>Department:</strong> ${dept}<br>
      <strong>Date:</strong> ${date}<br>
      <strong>Time:</strong> ${time} (15 Minutes)<br>
      <strong>Venue:</strong> Google Meet (Virtual)<br>
      ${meetLink ? `<strong>Meet Link:</strong> <a href="${meetLink}" style="color:#38bdf8;" target="_blank">${meetLink}</a>` : "<strong>Meet Link:</strong> Available on your candidate portal"}
    </div>
    <p><strong>Interview Guidelines:</strong></p>
    <ul style="margin: 0 0 18px 0; padding-left: 20px; color: #cbd5e1;">
      <li>Please join the meeting link 5 minutes before your scheduled start time.</li>
      <li>Ensure you are in a quiet environment with a working camera and microphone.</li>
      <li>Have your Round 2 task deliverables and portfolio ready for screen sharing.</li>
    </ul>
  `;

  const html = wrapEmailHtml({
    title: `Interview Booking Confirmed`,
    preheader,
    bodyHtml,
    ctaText: "Open Candidate Profile",
    ctaUrl: `${portalUrl}/profile`,
  });

  const mailOptions = {
    from: `"GDG on Campus" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    simulated: false,
  };
}

/**
 * Dispatch batch custom announcement email
 */
export async function sendBatchAnnouncementEmail({ recipients, subject, bodyTemplate }) {
  const transporter = getTransporter();
  const portalUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  if (!transporter) {
    console.log(`[DRY RUN - BATCH EMAIL] Count: ${recipients?.length}, Subject: ${subject}`);
    return {
      success: true,
      simulated: true,
      dispatchedCount: recipients?.length || 0,
    };
  }

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (const recipient of recipients) {
    try {
      const email = (recipient.Email || recipient.email || "").trim().toLowerCase();
      const name = recipient.Name || recipient.fullName || "Candidate";
      const dept = recipient.Department || recipient.department || "GDG Department";

      const interpolatedBody = bodyTemplate
        .replace(/#name/g, name)
        .replace(/#dept/g, dept);

      const html = wrapEmailHtml({
        title: subject,
        preheader: `Announcement from GDG on Campus: ${subject}`,
        bodyHtml: `<p>Dear <strong>${name}</strong>,</p><div style="white-space: pre-wrap;">${interpolatedBody}</div>`,
        ctaText: "Visit Portal",
        ctaUrl: portalUrl,
      });

      await transporter.sendMail({
        from: `"GDG on Campus" <${process.env.EMAIL_USERNAME}>`,
        to: email,
        subject,
        html,
      });

      successCount++;
    } catch (err) {
      failCount++;
      errors.push({ email: recipient.Email, error: err.message });
    }
  }

  return {
    success: failCount === 0,
    successCount,
    failCount,
    errors,
    simulated: false,
  };
}

const mailer = {
  getTransporter,
  verifySmtpConnection,
  sendDecisionEmail,
  sendInterviewConfirmationEmail,
  sendBatchAnnouncementEmail,
};

export default mailer;

