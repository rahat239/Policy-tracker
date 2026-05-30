const axios = require('axios');
const cheerio = require('cheerio');
const { diffLines } = require('diff');
const crypto = require('crypto');
const supabase = require('./supabase');
const { sendChangeAlert } = require('./email');

// Fetch a URL and extract clean text content
async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WatchDiff/1.0; +https://watchdiff.app)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);

  // Remove noise elements
  $('script, style, nav, footer, iframe, noscript, [aria-hidden="true"]').remove();

  // Extract clean text
  const text = $('body').text()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function hashContent(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function computeDiff(oldContent, newContent) {
  const changes = diffLines(oldContent || '', newContent || '');
  let linesAdded = 0;
  let linesRemoved = 0;
  const diffText = changes.map(part => {
    const lines = part.value.split('\n').filter(l => l.trim());
    if (part.added) {
      linesAdded += lines.length;
      return lines.map(l => `+${l}`).join('\n');
    }
    if (part.removed) {
      linesRemoved += lines.length;
      return lines.map(l => `-${l}`).join('\n');
    }
    // Context: show up to 2 lines around changes
    const ctx = lines.slice(0, 2);
    return ctx.map(l => ` ${l}`).join('\n');
  }).join('\n');

  return { diffText, linesAdded, linesRemoved };
}

// Check a single monitor for changes
async function checkMonitor(monitor) {
  console.log(`Checking: ${monitor.url}`);

  let newContent;
  try {
    newContent = await fetchPage(monitor.url);
  } catch (err) {
    console.error(`Failed to fetch ${monitor.url}:`, err.message);
    return;
  }

  const newHash = hashContent(newContent);

  // Update last_checked_at
  await supabase
    .from('monitors')
    .update({ last_checked_at: new Date().toISOString() })
    .eq('id', monitor.id);

  // If hash hasn't changed, nothing to do
  if (monitor.last_content_hash === newHash) {
    console.log(`No change: ${monitor.url}`);
    return;
  }

  console.log(`Change detected: ${monitor.url}`);

  // Save new snapshot
  const { data: snapshot } = await supabase
    .from('snapshots')
    .insert({
      monitor_id: monitor.id,
      content: newContent,
      content_hash: newHash,
    })
    .select()
    .single();

  // Get previous snapshot
  const { data: prevSnapshot } = await supabase
    .from('snapshots')
    .select('id, content')
    .eq('monitor_id', monitor.id)
    .order('captured_at', { ascending: false })
    .limit(2);

  const oldContent = prevSnapshot && prevSnapshot.length > 1
    ? prevSnapshot[1].content
    : '';

  const { diffText, linesAdded, linesRemoved } = computeDiff(oldContent, newContent);

  // Save change record
  await supabase.from('changes').insert({
    monitor_id: monitor.id,
    diff_text: diffText,
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    snapshot_after: snapshot?.id,
  });

  // Update monitor
  await supabase
    .from('monitors')
    .update({
      last_content_hash: newHash,
      last_changed_at: new Date().toISOString(),
    })
    .eq('id', monitor.id);

  // Get user for email alert
  const { data: user } = await supabase
    .from('users')
    .select('email, email_alerts')
    .eq('id', monitor.user_id)
    .single();

  if (user?.email_alerts) {
    try {
      await sendChangeAlert({
        to: user.email,
        url: monitor.url,
        label: monitor.label,
        diff: diffText,
        detectedAt: new Date().toISOString(),
      });
      console.log(`Alert sent to ${user.email}`);
    } catch (err) {
      console.error('Email failed:', err.message);
    }
  }
}

// Run all due monitors based on their interval
async function runCrawler() {
  console.log('Crawler running at', new Date().toISOString());

  const now = new Date();

  // Get all active monitors
  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('Failed to fetch monitors:', error.message);
    return;
  }

  // Filter monitors that are due for a check
  const due = (monitors || []).filter(m => {
    if (!m.last_checked_at) return true;
    const lastCheck = new Date(m.last_checked_at);
    const diffMs = now - lastCheck;
    const diffMin = diffMs / 60000;

    switch (m.check_interval) {
      case '15min': return diffMin >= 15;
      case 'hourly': return diffMin >= 60;
      case 'daily': return diffMin >= 1440;
      case 'weekly': return diffMin >= 10080;
      default: return diffMin >= 1440;
    }
  });

  console.log(`${due.length} monitors due for checking`);

  // Check sequentially to avoid rate limiting
  for (const monitor of due) {
    await checkMonitor(monitor);
    await new Promise(r => setTimeout(r, 2000)); // 2s delay between requests
  }
}

module.exports = { runCrawler, checkMonitor, fetchPage };
