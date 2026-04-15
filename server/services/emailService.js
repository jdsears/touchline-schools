import { Resend } from 'resend'
import { incrementUsage, checkUsageLimit, getEntitlements } from './billingService.js'

// Lazy initialization - only create Resend instance when needed and API key is set
let resend = null

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Default from address
const FROM_ADDRESS = process.env.EMAIL_FROM || 'MoonBoots Sports <noreply@moonbootssports.com>'

// Helper to check if email is enabled
function isEmailEnabled() {
  return !!process.env.RESEND_API_KEY
}

// Email templates
const templates = {
  // Team invite email
  teamInvite: ({ teamName, inviterName, role, inviteLink }) => ({
    subject: `You've been invited to join ${teamName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .role-badge { display: inline-block; background: #E8FBF0; color: #17753F; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
          .link-text { word-break: break-all; font-size: 12px; color: #94a3b8; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>You're invited to <span class="highlight">${teamName}</span></h1>
            <p>${inviterName ? `${inviterName} has` : 'You have been'} invited you to join the team as a <span class="role-badge">${role}</span>.</p>
            <p>Click the button below to accept the invitation and create your account.</p>
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            <p class="link-text">Or copy this link: ${inviteLink}</p>
            <p style="font-size: 14px; color: #94a3b8;">This invitation will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `You've been invited to join ${teamName}!\n\n${inviterName ? `${inviterName} has` : 'You have been'} invited you to join as a ${role}.\n\nAccept your invitation: ${inviteLink}\n\nThis invitation will expire in 7 days.`
  }),

  // Parent invite email
  parentInvite: ({ teamName, playerName, inviteLink }) => ({
    subject: `You've been invited as ${playerName}'s parent on ${teamName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .pupil-name { color: #f97316; font-weight: 600; }
          .feature-list { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .feature-list li { color: #475569; margin: 8px 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
          .link-text { word-break: break-all; font-size: 12px; color: #94a3b8; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Stay connected with <span class="pupil-name">${playerName}</span>'s football journey</h1>
            <p>You've been invited to join <span class="highlight">${teamName}</span> as ${playerName}'s parent.</p>
            <div class="feature-list">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a;">As a parent, you'll be able to:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>View match schedules and results</li>
                <li>See ${playerName}'s development progress</li>
                <li>Receive notifications about team events</li>
                <li>Respond to availability requests</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            <p class="link-text">Or copy this link: ${inviteLink}</p>
            <p style="font-size: 14px; color: #94a3b8;">This invitation will expire in 30 days.</p>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `You've been invited as ${playerName}'s parent on ${teamName}!\n\nAs a parent, you'll be able to:\n- View match schedules and results\n- See ${playerName}'s development progress\n- Receive notifications about team events\n- Respond to availability requests\n\nAccept your invitation: ${inviteLink}\n\nThis invitation will expire in 30 days.`
  }),

  // Match squad announcement
  squadAnnouncement: ({ teamName, matchInfo, playerName, position, isStarting, matchDate, meetupTime, meetupLocation }) => ({
    subject: `Squad Announcement: ${matchInfo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .match-card { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
          .match-date { font-size: 14px; opacity: 0.8; }
          .match-title { font-size: 20px; font-weight: 600; margin: 8px 0; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
          .starting { background: #2ED573; }
          .substitute { background: #f97316; }
          .meetup-info { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left; }
          .meetup-info strong { color: #0369a1; }
          .meetup-info p { color: #0c4a6e; font-size: 14px; margin: 4px 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Squad Announcement</h1>
            <p>Hi ${playerName},</p>
            <p>The squad has been announced for the upcoming match!</p>
            <div class="match-card">
              <div class="match-date">${matchDate}</div>
              <div class="match-title">${matchInfo}</div>
              <div class="status-badge ${isStarting ? 'starting' : 'substitute'}">
                ${isStarting ? `Starting Line Up - ${position}` : 'Substitute'}
              </div>
            </div>
            ${meetupTime || meetupLocation ? `
            <div class="meetup-info">
              <strong>Meet-up Details</strong>
              ${meetupTime ? `<p>Time: ${meetupTime}</p>` : ''}
              ${meetupLocation ? `<p>Location: ${meetupLocation}</p>` : ''}
            </div>
            ` : ''}
            <p>Make sure you arrive on time and come prepared. Good luck!</p>
          </div>
          <div class="footer">
            <p>${teamName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Squad Announcement for ${matchInfo}\n\nHi ${playerName},\n\nYou have been selected as ${isStarting ? `a starter (${position})` : 'a substitute'} for the match on ${matchDate}.${meetupTime ? `\n\nMeet-up Time: ${meetupTime}` : ''}${meetupLocation ? `\nMeet-up Location: ${meetupLocation}` : ''}\n\nMake sure you arrive on time and come prepared. Good luck!\n\n${teamName}`
  }),

  // Availability request
  availabilityRequest: ({ teamName, playerName, matchInfo, matchDate, responseLink }) => ({
    subject: `Availability Request: ${matchInfo}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .match-card { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .match-date { font-size: 14px; color: #64748b; }
          .match-title { font-size: 18px; font-weight: 600; color: #0f172a; margin: 4px 0; }
          .button-group { display: flex; gap: 12px; justify-content: center; margin: 24px 0; }
          .button { display: inline-block; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; }
          .button-yes { background: #2ED573; color: white; }
          .button-no { background: #ef4444; color: white; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Availability Request</h1>
            <p>Hi,</p>
            <p>The coach would like to know if <strong>${playerName}</strong> is available for the upcoming match:</p>
            <div class="match-card">
              <div class="match-date">${matchDate}</div>
              <div class="match-title">${matchInfo}</div>
            </div>
            <p>Please respond as soon as possible to help with match planning.</p>
            <div style="text-align: center;">
              <a href="${responseLink}" class="button button-yes">Respond Now</a>
            </div>
          </div>
          <div class="footer">
            <p>${teamName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Availability Request for ${matchInfo}\n\nThe coach would like to know if ${playerName} is available for the match on ${matchDate}.\n\nPlease respond: ${responseLink}\n\n${teamName}`
  }),

  // Achievement/Badge awarded
  achievementAwarded: ({ teamName, playerName, badgeTitle, badgeIcon, badgeDescription, reason, awardedBy, awardDate }) => ({
    subject: `${badgeIcon} ${playerName} received: ${badgeTitle}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .badge-icon { text-align: center; font-size: 64px; margin-bottom: 16px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 8px 0; text-align: center; }
          .badge-title { color: #2ED573; font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 24px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .reason-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0; }
          .reason-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; margin-bottom: 8px; }
          .reason-text { color: #78350f; font-size: 16px; font-style: italic; }
          .meta { text-align: center; color: #94a3b8; font-size: 14px; margin-top: 24px; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
          .confetti { text-align: center; font-size: 32px; letter-spacing: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="confetti">🎉 🎊 🎉</div>
            <div class="badge-icon">${badgeIcon}</div>
            <h1>Congratulations ${playerName}!</h1>
            <p class="badge-title">${badgeTitle}</p>
            <p style="text-align: center;">${badgeDescription}</p>
            ${reason ? `
              <div class="reason-box">
                <div class="reason-label">Coach's Note</div>
                <div class="reason-text">"${reason}"</div>
              </div>
            ` : ''}
            <p class="meta">Awarded by ${awardedBy} on ${awardDate}</p>
          </div>
          <div class="footer">
            <p>${teamName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Congratulations ${playerName}!\n\nYou've been awarded: ${badgeTitle}!\n\n${badgeDescription}\n\n${reason ? `Coach's Note: "${reason}"\n\n` : ''}Awarded by ${awardedBy} on ${awardDate}\n\n${teamName}`
  }),

  // Pupil of the Match
  potm: ({ teamName, playerName, matchInfo, reason, awardedBy }) => ({
    subject: `⭐ Pupil of the Match: ${playerName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%); border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(251, 191, 36, 0.3); }
          .star { text-align: center; font-size: 80px; margin-bottom: 16px; }
          h1 { color: #78350f; font-size: 20px; margin: 0 0 8px 0; text-align: center; text-transform: uppercase; letter-spacing: 2px; }
          .pupil-name { color: #92400e; font-size: 36px; font-weight: 700; text-align: center; margin: 0 0 8px 0; }
          .match-info { color: #a16207; font-size: 16px; text-align: center; margin-bottom: 24px; }
          .reason-box { background: rgba(255,255,255,0.7); border-radius: 12px; padding: 20px; margin: 20px 0; }
          .reason-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; margin-bottom: 8px; }
          .reason-text { color: #78350f; font-size: 18px; font-style: italic; }
          .meta { text-align: center; color: #a16207; font-size: 14px; margin-top: 24px; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="star">⭐</div>
            <h1>Pupil of the Match</h1>
            <p class="pupil-name">${playerName}</p>
            <p class="match-info">${matchInfo}</p>
            ${reason ? `
              <div class="reason-box">
                <div class="reason-label">Why they were chosen</div>
                <div class="reason-text">"${reason}"</div>
              </div>
            ` : ''}
            <p class="meta">Selected by ${awardedBy}</p>
          </div>
          <div class="footer">
            <p>${teamName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `⭐ PLAYER OF THE MATCH ⭐\n\n${playerName}\n${matchInfo}\n\n${reason ? `Why they were chosen: "${reason}"\n\n` : ''}Selected by ${awardedBy}\n\n${teamName}`
  }),

  // Generic notification
  notification: ({ teamName, title, message, actionLink, actionText }) => ({
    subject: title,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>${title}</h1>
            <p>${message}</p>
            ${actionLink ? `
              <div style="text-align: center;">
                <a href="${actionLink}" class="button">${actionText || 'View Details'}</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>${teamName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${title}\n\n${message}${actionLink ? `\n\n${actionText || 'View Details'}: ${actionLink}` : ''}\n\n${teamName}`
  }),

  // Compliance daily digest — sent to school owners & welfare officers
  complianceDigest: ({ clubName, alertCount, alerts, scanDate }) => ({
    subject: `Compliance Alert: ${alertCount} critical issue${alertCount === 1 ? '' : 's'} for ${clubName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .alert-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .alert-banner-text { color: #991b1b; font-weight: 600; margin: 0; font-size: 16px; }
          .alert-item { border-left: 4px solid #ef4444; background: #fafafa; padding: 12px 16px; margin: 8px 0; border-radius: 0 8px 8px 0; }
          .alert-item.warning { border-left-color: #f59e0b; }
          .alert-message { color: #1e293b; font-size: 14px; margin: 0; }
          .alert-type { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px 0 0 0; }
          .scan-date { color: #94a3b8; font-size: 14px; text-align: center; margin-top: 24px; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Compliance Alert for ${clubName}</h1>
            <div class="alert-banner">
              <p class="alert-banner-text">${alertCount} critical compliance issue${alertCount === 1 ? '' : 's'} require${alertCount === 1 ? 's' : ''} attention</p>
            </div>
            ${alerts.map(a => `
              <div class="alert-item${a.severity === 'warning' ? ' warning' : ''}">
                <p class="alert-message">${a.message}</p>
                <p class="alert-type">${(a.alert_type || '').replace(/_/g, ' ')}</p>
              </div>
            `).join('')}
            <p class="scan-date">Scanned on ${scanDate}</p>
            <p style="font-size: 14px; color: #64748b;">Please log in to the MoonBoots Sports dashboard to review and resolve these alerts.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Compliance Alert for ${clubName}\n\n${alertCount} critical compliance issue${alertCount === 1 ? '' : 's'} require${alertCount === 1 ? 's' : ''} attention:\n\n${alerts.map(a => `- ${a.message}`).join('\n')}\n\nScanned on ${scanDate}\n\nPlease log in to the MoonBoots Sports dashboard to review and resolve these alerts.`
  }),

  // Compliance expiry warning — sent to individual volunteer
  complianceExpiryWarning: ({ clubName, volunteerName, certType, expiryDate, daysRemaining }) => ({
    subject: `Action Required: Your ${certType} expires in ${daysRemaining} days`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .warning-days { font-size: 36px; font-weight: 700; color: #d97706; margin: 0; }
          .warning-label { font-size: 14px; color: #92400e; margin: 4px 0 0 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Certificate Expiry Warning</h1>
            <p>Hi ${volunteerName},</p>
            <p>This is a reminder that your ${certType} is due to expire soon.</p>
            <div class="warning-box">
              <p class="warning-days">${daysRemaining}</p>
              <p class="warning-label">days until expiry</p>
            </div>
            <div style="margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Certificate</span>
                <span class="detail-value">${certType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Expiry date</span>
                <span class="detail-value">${expiryDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">School</span>
                <span class="detail-value">${clubName}</span>
              </div>
            </div>
            <p>Please arrange to renew this certificate before it expires. Once renewed, update your details in the MoonBoots Sports dashboard.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Certificate Expiry Warning\n\nHi ${volunteerName},\n\nYour ${certType} expires in ${daysRemaining} days (${expiryDate}).\n\nPlease arrange to renew this certificate before it expires. Once renewed, update your details in the MoonBoots Sports dashboard.\n\n${clubName}`
  }),

  // Compliance expired — sent to volunteer + admin
  complianceExpired: ({ clubName, volunteerName, certType, expiryDate }) => ({
    subject: `EXPIRED: ${certType} for ${volunteerName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .expired-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .expired-icon { font-size: 48px; margin-bottom: 8px; }
          .expired-text { color: #991b1b; font-weight: 600; font-size: 18px; margin: 0; }
          .expired-detail { color: #b91c1c; font-size: 14px; margin: 4px 0 0 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Certificate Expired</h1>
            <div class="expired-banner">
              <div class="expired-icon">&#9888;&#65039;</div>
              <p class="expired-text">${certType} has expired</p>
              <p class="expired-detail">Expired on ${expiryDate}</p>
            </div>
            <div style="margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Volunteer</span>
                <span class="detail-value">${volunteerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Certificate</span>
                <span class="detail-value">${certType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Expired</span>
                <span class="detail-value">${expiryDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">School</span>
                <span class="detail-value">${clubName}</span>
              </div>
            </div>
            <p>This certificate must be renewed immediately. Until it is updated, the volunteer may not be able to carry out their role.</p>
            <p style="font-size: 14px; color: #94a3b8;">Please update the compliance record in MoonBoots Sports once the certificate has been renewed.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `EXPIRED: ${certType} for ${volunteerName}\n\n${certType} expired on ${expiryDate}.\n\nVolunteer: ${volunteerName}\nClub: ${clubName}\n\nThis certificate must be renewed immediately. Until it is updated, the volunteer may not be able to carry out their role.\n\nPlease update the compliance record in MoonBoots Sports once the certificate has been renewed.`
  }),

  // Incident reported — notification to welfare officer
  incidentReported: ({ clubName, incidentType, severity, reportedBy, incidentDate, description, actionLink }) => ({
    subject: `Safeguarding Incident Reported: ${incidentType} - ${clubName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .incident-banner { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .incident-type { color: #991b1b; font-weight: 700; font-size: 18px; margin: 0; }
          .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
          .severity-low { background: #dbeafe; color: #1e40af; }
          .severity-medium { background: #fef3c7; color: #92400e; }
          .severity-high { background: #fed7aa; color: #9a3412; }
          .severity-critical { background: #fecaca; color: #991b1b; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .description-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .description-text { color: #334155; font-size: 14px; line-height: 1.6; margin: 0; }
          .button { display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>New Safeguarding Incident</h1>
            <div class="incident-banner">
              <p class="incident-type">${incidentType}</p>
              <span class="severity-badge severity-${severity || 'medium'}">${severity || 'medium'}</span>
            </div>
            <div style="margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Reported by</span>
                <span class="detail-value">${reportedBy}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Incident date</span>
                <span class="detail-value">${incidentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">School</span>
                <span class="detail-value">${clubName}</span>
              </div>
            </div>
            ${description ? `
              <div class="description-box">
                <p class="description-text">${description.length > 300 ? description.substring(0, 300) + '...' : description}</p>
              </div>
            ` : ''}
            <p>As the designated welfare officer, please review this incident as soon as possible and take appropriate action.</p>
            ${actionLink ? `
              <div style="text-align: center;">
                <a href="${actionLink}" class="button">Review Incident</a>
              </div>
            ` : ''}
            <p style="font-size: 12px; color: #94a3b8;">This email contains confidential safeguarding information. Do not forward this email to anyone who is not authorised to view it.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New Safeguarding Incident Reported\n\nType: ${incidentType}\nSeverity: ${severity || 'medium'}\nReported by: ${reportedBy}\nIncident date: ${incidentDate}\nClub: ${clubName}\n\n${description ? `Description: ${description}\n\n` : ''}Please review this incident as soon as possible and take appropriate action.${actionLink ? `\n\nReview: ${actionLink}` : ''}\n\nThis email contains confidential safeguarding information. Do not forward this email.`
  }),

  // Incident updated — notification that an incident status changed
  incidentUpdated: ({ clubName, incidentType, incidentId, updatedBy, status, updateSummary, actionLink }) => ({
    subject: `Incident Updated: ${incidentType} - ${status}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .status-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
          .status-banner.open { background: #fef2f2; border-color: #fecaca; }
          .status-banner.investigating { background: #fffbeb; border-color: #fde68a; }
          .status-banner.closed { background: #f0fdf4; border-color: #bbf7d0; }
          .status-text { font-weight: 600; font-size: 16px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .status-text.open { color: #991b1b; }
          .status-text.investigating { color: #92400e; }
          .status-text.closed { color: #166534; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .update-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .update-text { color: #334155; font-size: 14px; line-height: 1.6; margin: 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Incident Updated</h1>
            <div class="status-banner ${status || 'open'}">
              <p class="status-text ${status || 'open'}">Status: ${status || 'Updated'}</p>
            </div>
            <div style="margin: 20px 0;">
              <div class="detail-row">
                <span class="detail-label">Incident type</span>
                <span class="detail-value">${incidentType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Updated by</span>
                <span class="detail-value">${updatedBy}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">School</span>
                <span class="detail-value">${clubName}</span>
              </div>
            </div>
            ${updateSummary ? `
              <div class="update-box">
                <p style="font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin: 0 0 8px 0;">Update</p>
                <p class="update-text">${updateSummary}</p>
              </div>
            ` : ''}
            ${actionLink ? `
              <div style="text-align: center;">
                <a href="${actionLink}" class="button">View Incident</a>
              </div>
            ` : ''}
            <p style="font-size: 12px; color: #94a3b8;">This email contains confidential safeguarding information. Do not forward this email to anyone who is not authorised to view it.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Incident Updated: ${incidentType}\n\nStatus: ${status || 'Updated'}\nUpdated by: ${updatedBy}\nClub: ${clubName}\n\n${updateSummary ? `Update: ${updateSummary}\n\n` : ''}${actionLink ? `View incident: ${actionLink}\n\n` : ''}This email contains confidential safeguarding information. Do not forward this email.`
  }),

  // Event registration confirmation — sent to parent/guardian after registering for a school event
  eventRegistrationConfirmation: ({ clubName, eventTitle, eventDate, eventTime, venueName, venueAddress, recipientName, isPaid, amountPaid, confirmationText }) => ({
    subject: `Registration Confirmed: ${eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .event-card { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
          .event-title { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; }
          .event-date { font-size: 16px; opacity: 0.9; margin: 4px 0; }
          .event-venue { font-size: 14px; opacity: 0.7; margin: 4px 0; }
          .confirmed-badge { display: inline-block; background: #2ED573; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; margin-top: 12px; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .custom-text { background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; color: #166534; font-size: 14px; line-height: 1.6; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>You're registered!</h1>
            <p>Hi ${recipientName},</p>
            <p>Your registration for the following event has been confirmed.</p>
            <div class="event-card">
              <div class="event-title">${eventTitle}</div>
              <div class="event-date">${eventDate} at ${eventTime}</div>
              <div class="event-venue">${venueName}${venueAddress ? `, ${venueAddress}` : ''}</div>
              <div class="confirmed-badge">Confirmed</div>
            </div>
            ${isPaid ? `
              <div style="margin: 20px 0;">
                <div class="detail-row">
                  <span class="detail-label">Amount paid</span>
                  <span class="detail-value">&pound;${(amountPaid / 100).toFixed(2)}</span>
                </div>
              </div>
            ` : ''}
            ${confirmationText ? `<div class="custom-text">${confirmationText}</div>` : ''}
            <p style="font-size: 14px; color: #94a3b8;">If you need to make any changes to your registration, please contact the school directly.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Registration Confirmed: ${eventTitle}\n\nHi ${recipientName},\n\nYour registration has been confirmed.\n\nEvent: ${eventTitle}\nDate: ${eventDate} at ${eventTime}\nVenue: ${venueName}${venueAddress ? `, ${venueAddress}` : ''}\n${isPaid ? `Amount paid: £${(amountPaid / 100).toFixed(2)}\n` : ''}\n${confirmationText ? `${confirmationText}\n\n` : ''}If you need to make any changes, please contact the school directly.\n\n${clubName}`
  }),

  // Event cancelled — notification to registered participants
  eventCancelled: ({ clubName, eventTitle, eventDate, recipientName }) => ({
    subject: `Event Cancelled: ${eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .cancelled-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .cancelled-icon { font-size: 48px; margin-bottom: 8px; }
          .cancelled-text { color: #991b1b; font-weight: 600; font-size: 18px; margin: 0; }
          .cancelled-detail { color: #b91c1c; font-size: 14px; margin: 4px 0 0 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Event Cancelled</h1>
            <p>Hi ${recipientName},</p>
            <p>We're sorry to let you know that the following event has been cancelled.</p>
            <div class="cancelled-banner">
              <div class="cancelled-icon">&#10060;</div>
              <p class="cancelled-text">${eventTitle}</p>
              <p class="cancelled-detail">Originally scheduled for ${eventDate}</p>
            </div>
            <p>If you made a payment for this event, the school will arrange a refund. Please contact the school directly if you have any questions.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Event Cancelled: ${eventTitle}\n\nHi ${recipientName},\n\nWe're sorry to let you know that the following event has been cancelled.\n\nEvent: ${eventTitle}\nOriginally scheduled for: ${eventDate}\n\nIf you made a payment, the school will arrange a refund. Please contact the school directly if you have any questions.\n\n${clubName}`
  }),

  // Session created — notification to team parents about new training/match session
  sessionCreated: ({ clubName, teamName, sessionTitle, sessionType, sessionDate, sessionTime, venueName, recipientName, isRecurring, sessionCount }) => ({
    subject: `New ${sessionType === 'match' ? 'Match' : 'Session'}: ${sessionTitle} - ${teamName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .session-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .session-title { font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0; }
          .session-detail { font-size: 14px; color: #475569; margin: 4px 0; }
          .session-type-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: uppercase; }
          .recurring-note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #92400e; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>New ${sessionType === 'match' ? 'Match' : 'Session'} Added</h1>
            <p>Hi ${recipientName},</p>
            <p>A new session has been added to the <span class="highlight">${teamName}</span> schedule.</p>
            <div class="session-card">
              <span class="session-type-badge">${sessionType}</span>
              <p class="session-title" style="margin-top: 12px;">${sessionTitle}</p>
              <p class="session-detail">${sessionDate} at ${sessionTime}</p>
              <p class="session-detail">${venueName}</p>
            </div>
            ${isRecurring && sessionCount > 1 ? `
              <div class="recurring-note">
                This is a recurring session. ${sessionCount} sessions have been scheduled.
              </div>
            ` : ''}
            <p>Please respond with your availability as soon as possible to help with planning.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `New ${sessionType === 'match' ? 'Match' : 'Session'}: ${sessionTitle} - ${teamName}\n\nHi ${recipientName},\n\nA new session has been added to the ${teamName} schedule.\n\nType: ${sessionType}\nSession: ${sessionTitle}\nDate: ${sessionDate} at ${sessionTime}\nVenue: ${venueName}\n${isRecurring && sessionCount > 1 ? `\nThis is a recurring session. ${sessionCount} sessions have been scheduled.\n` : ''}\nPlease respond with your availability as soon as possible.\n\n${clubName}`
  }),

  // Session cancelled — notification to team parents
  sessionCancelled: ({ clubName, teamName, sessionTitle, sessionDate, sessionTime, cancellationReason, recipientName }) => ({
    subject: `Session Cancelled: ${sessionTitle} - ${teamName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .cancelled-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .cancelled-title { font-size: 18px; font-weight: 600; color: #991b1b; margin: 0 0 8px 0; }
          .cancelled-detail { font-size: 14px; color: #b91c1c; margin: 4px 0; }
          .reason-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .reason-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px 0; }
          .reason-text { color: #334155; font-size: 14px; margin: 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Session Cancelled</h1>
            <p>Hi ${recipientName},</p>
            <p>The following session for <strong>${teamName}</strong> has been cancelled.</p>
            <div class="cancelled-card">
              <p class="cancelled-title">${sessionTitle}</p>
              <p class="cancelled-detail">${sessionDate} at ${sessionTime}</p>
            </div>
            ${cancellationReason ? `
              <div class="reason-box">
                <p class="reason-label">Reason</p>
                <p class="reason-text">${cancellationReason}</p>
              </div>
            ` : ''}
            <p style="font-size: 14px; color: #94a3b8;">Please check the team schedule for any rescheduled sessions.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Session Cancelled: ${sessionTitle} - ${teamName}\n\nHi ${recipientName},\n\nThe following session for ${teamName} has been cancelled.\n\nSession: ${sessionTitle}\nDate: ${sessionDate} at ${sessionTime}\n${cancellationReason ? `\nReason: ${cancellationReason}\n` : ''}\nPlease check the team schedule for any rescheduled sessions.\n\n${clubName}`
  }),

  // Availability reminder — sent to non-responders 24hrs before a session
  availabilityReminder: ({ clubName, teamName, sessionTitle, sessionType, sessionDate, sessionTime, venueName, recipientName, playerName, responseLink }) => ({
    subject: `Reminder: Please respond - ${sessionTitle} tomorrow`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #f97316; font-weight: 600; }
          .urgent-banner { background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
          .urgent-text { color: #92400e; font-weight: 600; font-size: 16px; margin: 0; }
          .session-card { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .session-title { font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0; }
          .session-detail { font-size: 14px; color: #475569; margin: 4px 0; }
          .button { display: inline-block; background: #f97316; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Availability Reminder</h1>
            <p>Hi ${recipientName},</p>
            <div class="urgent-banner">
              <p class="urgent-text">We haven't received a response for ${playerName}</p>
            </div>
            <p>The coach is still waiting for an availability response for <strong>${playerName}</strong> for tomorrow's ${sessionType}:</p>
            <div class="session-card">
              <p class="session-title">${sessionTitle}</p>
              <p class="session-detail">${sessionDate} at ${sessionTime}</p>
              <p class="session-detail">${venueName || 'Venue TBC'}</p>
            </div>
            <p>Please respond as soon as possible to help the coach with planning.</p>
            ${responseLink ? `
              <div style="text-align: center;">
                <a href="${responseLink}" class="button">Respond Now</a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Availability Reminder: ${sessionTitle} tomorrow\n\nHi ${recipientName},\n\nWe haven't received a response for ${playerName}.\n\nThe coach is still waiting for an availability response for tomorrow's ${sessionType}:\n\nSession: ${sessionTitle}\nDate: ${sessionDate} at ${sessionTime}\nVenue: ${venueName || 'Venue TBC'}\n\nPlease respond as soon as possible.${responseLink ? `\n\nRespond here: ${responseLink}` : ''}\n\n${clubName}`
  }),

  // Trial ending warning — sent 3 days before trial expires
  trialEndingWarning: ({ teamName, ownerName, daysRemaining, trialEndDate, pricingLink }) => ({
    subject: `Your MoonBoots Sports trial ends in ${daysRemaining} days`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .warning-days { font-size: 36px; font-weight: 700; color: #d97706; margin: 0; }
          .warning-label { font-size: 14px; color: #92400e; margin: 4px 0 0 0; }
          .feature-list { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .feature-list li { color: #475569; margin: 8px 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Your trial is ending soon</h1>
            <p>Hi ${ownerName},</p>
            <div class="warning-box">
              <p class="warning-days">${daysRemaining}</p>
              <p class="warning-label">days left on your free trial</p>
            </div>
            <p>Your free trial of MoonBoots Sports for <span class="highlight">${teamName}</span> ends on <strong>${trialEndDate}</strong>.</p>
            <div class="feature-list">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #0f172a;">Don't lose access to:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>AI-powered session planning</li>
                <li>Video analysis and highlights</li>
                <li>Pupil development tracking</li>
                <li>Match preparation tools</li>
              </ul>
            </div>
            <p>Choose a plan now to keep everything running smoothly.</p>
            <div style="text-align: center;">
              <a href="${pricingLink}" class="button">View Plans</a>
            </div>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your MoonBoots Sports trial ends in ${daysRemaining} days\n\nHi ${ownerName},\n\nYour free trial of MoonBoots Sports for ${teamName} ends on ${trialEndDate}.\n\nDon't lose access to:\n- AI-powered session planning\n- Video analysis and highlights\n- Pupil development tracking\n- Match preparation tools\n\nChoose a plan now: ${pricingLink}`
  }),

  // Trial ending tomorrow — sent 1 day before trial expires
  trialEndingSoon: ({ teamName, ownerName, trialEndDate, pricingLink }) => ({
    subject: `Last day: Your MoonBoots Sports trial ends tomorrow`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .urgent-banner { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .urgent-text { color: #991b1b; font-weight: 700; font-size: 18px; margin: 0; }
          .urgent-sub { color: #b91c1c; font-size: 14px; margin: 8px 0 0 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Your trial ends tomorrow</h1>
            <p>Hi ${ownerName},</p>
            <div class="urgent-banner">
              <p class="urgent-text">Trial expires tomorrow</p>
              <p class="urgent-sub">${trialEndDate}</p>
            </div>
            <p>Your free trial of MoonBoots Sports for <span class="highlight">${teamName}</span> ends tomorrow. After that, you'll lose access to premium features.</p>
            <p>Subscribe now to keep your team's data, sessions, and tools exactly where you left off.</p>
            <div style="text-align: center;">
              <a href="${pricingLink}" class="button">Subscribe Now</a>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">Your team data won't be deleted — you can subscribe anytime to regain access.</p>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your MoonBoots Sports trial ends tomorrow\n\nHi ${ownerName},\n\nYour free trial of MoonBoots Sports for ${teamName} ends on ${trialEndDate}. After that, you'll lose access to premium features.\n\nSubscribe now to keep everything running: ${pricingLink}\n\nYour team data won't be deleted — you can subscribe anytime to regain access.`
  }),

  // Trial ended — sent on the day the trial expires
  trialEnded: ({ teamName, ownerName, pricingLink }) => ({
    subject: `Your MoonBoots Sports trial has ended — subscribe to continue`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .expired-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; text-align: center; }
          .expired-text { color: #0f172a; font-weight: 600; font-size: 18px; margin: 0 0 8px 0; }
          .expired-sub { color: #64748b; font-size: 14px; margin: 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Your trial has ended</h1>
            <p>Hi ${ownerName},</p>
            <div class="expired-banner">
              <p class="expired-text">Your free trial of MoonBoots Sports for ${teamName} has ended</p>
              <p class="expired-sub">Premium features are now disabled</p>
            </div>
            <p>Thanks for trying MoonBoots Sports! Your team data is safe and waiting for you — subscribe to pick up right where you left off.</p>
            <p>Plans start from just a few pounds a month, and you can cancel anytime.</p>
            <div style="text-align: center;">
              <a href="${pricingLink}" class="button">Choose a Plan</a>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">Questions? Reply to this email and we'll help you find the right plan.</p>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your MoonBoots Sports trial has ended\n\nHi ${ownerName},\n\nYour free trial of MoonBoots Sports for ${teamName} has ended. Premium features are now disabled.\n\nYour team data is safe — subscribe to pick up where you left off: ${pricingLink}\n\nPlans start from just a few pounds a month, and you can cancel anytime.`
  }),

  // Magic link for passwordless login
  magicLink: ({ magicLinkUrl }) => ({
    subject: 'Sign in to MoonBoots Sports',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
          .link-text { word-break: break-all; font-size: 12px; color: #94a3b8; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 16px; }
          .warning { font-size: 14px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Sign in to MoonBoots Sports</h1>
            <p>Click the button below to sign in to your account. This link will expire in 15 minutes.</p>
            <div style="text-align: center;">
              <a href="${magicLinkUrl}" class="button">Sign In</a>
            </div>
            <p class="link-text">Or copy this link: ${magicLinkUrl}</p>
            <p class="warning">If you didn't request this email, you can safely ignore it.</p>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Sign in to MoonBoots Sports\n\nClick this link to sign in: ${magicLinkUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`
  }),

  // Payment reminder — sent to parents before a subscription payment is due
  paymentReminder: ({ clubName, guardianName, playerName, planName, amount, dueDate, paymentLink }) => ({
    subject: `Payment reminder: ${planName} for ${playerName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .payment-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .payment-amount { font-size: 32px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; text-align: center; }
          .payment-label { font-size: 14px; color: #64748b; text-align: center; margin: 0 0 16px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #26B562; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Payment Reminder</h1>
            <p>Hi ${guardianName},</p>
            <p>Your next payment to <span class="highlight">${clubName}</span> is coming up.</p>
            <div class="payment-card">
              <p class="payment-amount">&pound;${amount}</p>
              <p class="payment-label">due on ${dueDate}</p>
              <div class="detail-row">
                <span class="detail-label">Plan</span>
                <span class="detail-value">${planName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Pupil</span>
                <span class="detail-value">${playerName}</span>
              </div>
            </div>
            <div style="text-align: center;">
              <a href="${paymentLink}" class="button">Make Payment</a>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">If you've already made this payment, please disregard this email.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Payment Reminder\n\nHi ${guardianName},\n\nYour next payment to ${clubName} is coming up.\n\nAmount: £${amount}\nDue: ${dueDate}\nPlan: ${planName}\nPlayer: ${playerName}\n\nMake your payment here: ${paymentLink}\n\nIf you've already made this payment, please disregard this email.\n\n${clubName}`
  }),

  // Payment overdue — sent to parents when a subscription payment is past due
  paymentOverdue: ({ clubName, guardianName, playerName, planName, amount, dueDate, paymentLink }) => ({
    subject: `Payment overdue: ${planName} for ${playerName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .highlight { color: #2ED573; font-weight: 600; }
          .overdue-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
          .overdue-text { color: #991b1b; font-weight: 600; font-size: 16px; margin: 0; }
          .payment-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .payment-amount { font-size: 32px; font-weight: 700; color: #991b1b; margin: 0 0 4px 0; text-align: center; }
          .payment-label { font-size: 14px; color: #b91c1c; text-align: center; margin: 0 0 16px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #64748b; font-size: 14px; }
          .detail-value { color: #0f172a; font-size: 14px; font-weight: 500; }
          .button { display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .button:hover { background: #dc2626; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Payment Overdue</h1>
            <p>Hi ${guardianName},</p>
            <div class="overdue-banner">
              <p class="overdue-text">A payment to ${clubName} is overdue</p>
            </div>
            <div class="payment-card">
              <p class="payment-amount">&pound;${amount}</p>
              <p class="payment-label">was due on ${dueDate}</p>
              <div class="detail-row">
                <span class="detail-label">Plan</span>
                <span class="detail-value">${planName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Pupil</span>
                <span class="detail-value">${playerName}</span>
              </div>
            </div>
            <p>Please make this payment as soon as possible to keep ${playerName}'s subscription active.</p>
            <div style="text-align: center;">
              <a href="${paymentLink}" class="button">Pay Now</a>
            </div>
            <p style="font-size: 14px; color: #94a3b8;">If you're having difficulty with payments, please contact the school directly.</p>
          </div>
          <div class="footer">
            <p>${clubName} - via MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Payment Overdue\n\nHi ${guardianName},\n\nA payment to ${clubName} is overdue.\n\nAmount: £${amount}\nWas due: ${dueDate}\nPlan: ${planName}\nPlayer: ${playerName}\n\nPlease make this payment as soon as possible: ${paymentLink}\n\nIf you're having difficulty with payments, please contact the school directly.\n\n${clubName}`
  }),

  passwordReset: ({ resetUrl }) => ({
    subject: 'Reset your MoonBoots Sports password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 24px; font-size: 24px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .button { display: inline-block; background: #2ED573; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
          .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
          .link-text { word-break: break-all; font-size: 12px; color: #94a3b8; background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 16px; }
          .warning { font-size: 14px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">⚽️</div>
            <h1>Reset your password</h1>
            <p>We received a request to reset your MoonBoots Sports password. Click the button below to choose a new password.</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p class="link-text">Or copy this link: ${resetUrl}</p>
            <p class="warning">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
          </div>
          <div class="footer">
            <p>MoonBoots Sports</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Reset your MoonBoots Sports password\n\nClick this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`
  }),
}

// Check if team can send more emails
async function checkEmailLimit(teamId) {
  if (!teamId) return { allowed: true }
  try {
    return await checkUsageLimit(teamId, 'email')
  } catch (error) {
    console.error('[Email] Error checking email limit:', error)
    return { allowed: true } // Allow on error to not block
  }
}

// Track email usage for a team
async function trackEmailUsage(teamId) {
  if (!teamId) return
  try {
    await incrementUsage(teamId, 'email')
  } catch (error) {
    console.error('[Email] Error tracking email usage:', error)
  }
}

// Send email function
// Options: { teamId: string } - if provided, will track usage against the team's quota
async function sendEmail(to, template, data, options = {}) {
  const client = getResendClient()
  if (!client) {
    console.log(`[Email] Skipped (no API key): ${template} to ${to}`)
    return { success: false, reason: 'Email not configured' }
  }

  // Check email limit if teamId is provided
  if (options.teamId) {
    const limitCheck = await checkEmailLimit(options.teamId)
    if (!limitCheck.allowed) {
      console.log(`[Email] Blocked (limit reached): ${template} to ${to}`)
      return {
        success: false,
        reason: 'Email limit reached',
        current: limitCheck.current,
        limit: limitCheck.limit,
      }
    }
  }

  try {
    const emailContent = templates[template](data)

    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    // Track usage after successful send
    if (options.teamId) {
      await trackEmailUsage(options.teamId)
    }

    console.log(`[Email] Sent ${template} to ${to}:`, result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error(`[Email] Failed to send ${template} to ${to}:`, error)
    return { success: false, error: error.message }
  }
}

// Convenience functions for specific email types
export async function sendTeamInviteEmail(to, { teamName, inviterName, role, inviteLink }) {
  return sendEmail(to, 'teamInvite', { teamName, inviterName, role, inviteLink })
}

export async function sendParentInviteEmail(to, { teamName, playerName, inviteLink }) {
  return sendEmail(to, 'parentInvite', { teamName, playerName, inviteLink })
}

export async function sendSquadAnnouncementEmail(to, { teamName, matchInfo, playerName, position, isStarting, matchDate, meetupTime, meetupLocation }) {
  return sendEmail(to, 'squadAnnouncement', { teamName, matchInfo, playerName, position, isStarting, matchDate, meetupTime, meetupLocation })
}

export async function sendAvailabilityRequestEmail(to, { teamName, playerName, matchInfo, matchDate, responseLink }) {
  return sendEmail(to, 'availabilityRequest', { teamName, playerName, matchInfo, matchDate, responseLink })
}

export async function sendAchievementEmail(to, { teamName, playerName, badgeTitle, badgeIcon, badgeDescription, reason, awardedBy, awardDate }) {
  return sendEmail(to, 'achievementAwarded', { teamName, playerName, badgeTitle, badgeIcon, badgeDescription, reason, awardedBy, awardDate })
}

export async function sendPotmEmail(to, { teamName, playerName, matchInfo, reason, awardedBy }) {
  return sendEmail(to, 'potm', { teamName, playerName, matchInfo, reason, awardedBy })
}

export async function sendNotificationEmail(to, { teamName, title, message, actionLink, actionText }) {
  return sendEmail(to, 'notification', { teamName, title, message, actionLink, actionText })
}

export async function sendMagicLinkEmail(to, { magicLinkUrl }) {
  return sendEmail(to, 'magicLink', { magicLinkUrl })
}

export async function sendPasswordResetEmail(to, { resetUrl }) {
  return sendEmail(to, 'passwordReset', { resetUrl })
}

export async function sendTrialEndingWarningEmail(to, { teamName, ownerName, daysRemaining, trialEndDate, pricingLink }) {
  return sendEmail(to, 'trialEndingWarning', { teamName, ownerName, daysRemaining, trialEndDate, pricingLink })
}

export async function sendTrialEndingSoonEmail(to, { teamName, ownerName, trialEndDate, pricingLink }) {
  return sendEmail(to, 'trialEndingSoon', { teamName, ownerName, trialEndDate, pricingLink })
}

export async function sendTrialEndedEmail(to, { teamName, ownerName, pricingLink }) {
  return sendEmail(to, 'trialEnded', { teamName, ownerName, pricingLink })
}

/**
 * Send multiple emails in a single API call using Resend's batch endpoint.
 * Accepts an array of { to, template, data } objects.
 * Resend batch supports up to 100 emails per call; this function chunks automatically.
 */
async function sendBatchEmails(emails) {
  const client = getResendClient()
  if (!client || emails.length === 0) {
    return { sent: 0, total: emails.length }
  }

  // Build the individual email payloads
  const payloads = emails.map(({ to, template, data }) => {
    const content = templates[template](data)
    return {
      from: FROM_ADDRESS,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    }
  })

  // Chunk into batches of 100 (Resend's batch limit)
  const BATCH_SIZE = 100
  let sent = 0

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const chunk = payloads.slice(i, i + BATCH_SIZE)
    try {
      const result = await client.batch.send(chunk)
      sent += result.data?.data?.length || chunk.length
      console.log(`[Email] Batch sent ${chunk.length} emails (chunk ${Math.floor(i / BATCH_SIZE) + 1})`)
    } catch (error) {
      console.error(`[Email] Batch failed (chunk ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message)
    }
  }

  return { sent, total: emails.length }
}

export { isEmailEnabled, sendEmail, sendBatchEmails }
