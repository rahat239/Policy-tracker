const express = require('express');
const supabase = require('../lib/supabase');
const authMiddleware = require('../lib/auth');
const { getPlanLimits } = require('../lib/plans');
const { checkMonitor, fetchPage } = require('../lib/crawler');

const router = express.Router();
router.use(authMiddleware);

// GET /api/monitors — list all monitors for user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/monitors — add a new monitor
router.post('/', async (req, res) => {
  const { url, label, check_interval = 'daily' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Validate URL
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  // Check plan limits
  const limits = getPlanLimits(req.user.plan);
  const { count } = await supabase
    .from('monitors')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (count >= limits.maxMonitors) {
    return res.status(403).json({ error: `Your ${req.user.plan} plan allows up to ${limits.maxMonitors} monitors. Please upgrade.` });
  }

  if (!limits.intervals.includes(check_interval)) {
    return res.status(403).json({ error: `Interval "${check_interval}" requires a higher plan.` });
  }

  const { data, error } = await supabase
    .from('monitors')
    .insert({
      user_id: req.user.id,
      url: url.trim(),
      label: label?.trim() || null,
      check_interval,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Do an immediate first check in background
  checkMonitor(data).catch(console.error);

  res.json(data);
});

// PATCH /api/monitors/:id — update label, interval, status
router.patch('/:id', async (req, res) => {
  const { label, check_interval, status } = req.body;
  const updates = {};
  if (label !== undefined) updates.label = label;
  if (status !== undefined) updates.status = status;
  if (check_interval !== undefined) {
    const limits = getPlanLimits(req.user.plan);
    if (!limits.intervals.includes(check_interval)) {
      return res.status(403).json({ error: 'Interval requires a higher plan.' });
    }
    updates.check_interval = check_interval;
  }

  const { data, error } = await supabase
    .from('monitors')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/monitors/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('monitors')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/monitors/:id/check — manually trigger a check
router.post('/:id/check', async (req, res) => {
  const { data: monitor, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !monitor) return res.status(404).json({ error: 'Monitor not found' });

  try {
    await checkMonitor(monitor);
    res.json({ success: true, message: 'Check completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/monitors/:id/changes — get change history
router.get('/:id/changes', async (req, res) => {
  // Verify ownership
  const { data: monitor } = await supabase
    .from('monitors')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!monitor) return res.status(404).json({ error: 'Monitor not found' });

  const { data, error } = await supabase
    .from('changes')
    .select('*')
    .eq('monitor_id', req.params.id)
    .order('detected_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  // Mark as seen
  await supabase
    .from('changes')
    .update({ seen: true })
    .eq('monitor_id', req.params.id)
    .eq('seen', false);

  res.json(data);
});

// GET /api/monitors/changes/unseen — count of unseen changes
router.get('/changes/unseen', async (req, res) => {
  // Get user's monitor ids
  const { data: monitors } = await supabase
    .from('monitors')
    .select('id')
    .eq('user_id', req.user.id);

  const ids = (monitors || []).map(m => m.id);
  if (!ids.length) return res.json({ count: 0 });

  const { count } = await supabase
    .from('changes')
    .select('id', { count: 'exact', head: true })
    .in('monitor_id', ids)
    .eq('seen', false);

  res.json({ count: count || 0 });
});

module.exports = router;
