const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendChangeAlert({ to, url, label, diff, detectedAt, changeId }) {
  const diffLines = diff.split('\n').slice(0, 40).join('\n');
  const appUrl = process.env.APP_URL || 'https://your-app.vercel.app';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0a0a0f; color: #f0f0f5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
  .logo { font-size: 1.3rem; font-weight: 700; color: #7c6cf8; margin-bottom: 32px; }
  .alert-box { background: #18181f; border: 1px solid rgba(251,191,36,0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .alert-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
  .url { font-family: monospace; font-size: 0.85rem; color: #7c6cf8; background: rgba(124,108,248,0.1); padding: 8px 12px; border-radius: 6px; word-break: break-all; margin-bottom: 16px; }
  .time { font-size: 0.82rem; color: #8888a0; margin-bottom: 20px; }
  .diff-block { background: #0a0a0f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; font-family: monospace; font-size: 0.8rem; }
  .diff-line { padding: 4px 12px; display: flex; gap: 12px; }
  .diff-removed { background: rgba(248,113,113,0.1); color: #f87171; }
  .diff-added { background: rgba(52,211,153,0.1); color: #34d399; }
  .diff-context { color: #8888a0; }
  .cta { display: inline-block; background: #7c6cf8; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
  .footer { margin-top: 32px; font-size: 0.78rem; color: #8888a0; }
</style></head>
<body>
<div class="container">
  <div class="logo">● WatchDiff</div>
  <div class="alert-box">
    <div class="alert-title">⚠ Change detected${label ? ': ' + label : ''}</div>
    <div class="url">${url}</div>
    <div class="time">Detected at ${new Date(detectedAt).toUTCString()}</div>
    <div class="diff-block">
      ${diffLines.split('\n').map(line => {
        if (line.startsWith('+')) return `<div class="diff-line diff-added"><span>+</span><span>${escapeHtml(line.slice(1))}</span></div>`;
        if (line.startsWith('-')) return `<div class="diff-line diff-removed"><span>-</span><span>${escapeHtml(line.slice(1))}</span></div>`;
        return `<div class="diff-line diff-context"><span> </span><span>${escapeHtml(line)}</span></div>`;
      }).join('')}
    </div>
    <a href="${appUrl}/dashboard" class="cta">View full diff →</a>
  </div>
  <div class="footer">
    You're receiving this because you monitor ${url} on WatchDiff.<br>
    <a href="${appUrl}/dashboard" style="color:#7c6cf8;">Manage your monitors</a>
  </div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `⚠ Change detected: ${label || url}`,
    html,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { sendChangeAlert };
