/**
 * Vertex XR — Express Backend
 * Handles contact form submissions, lead management, and admin API.
 * DB: NeDB (pure-JS embedded database, no native compilation needed)
 */

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const cors     = require('cors');
const Datastore = require('nedb-promises');

// ─── Config ────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'vertexXR-admin-2026';
// Use Vercel's writable /tmp directory if running on Vercel, otherwise local 'db' folder
const DB_DIR      = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'db');

// Ensure db directory exists (only if not on Vercel)
if (!process.env.VERCEL && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ─── Database Setup ─────────────────────────────────────────────────────────
const leadsDb = Datastore.create({
  filename:    path.join(DB_DIR, 'leads.db'),
  autoload:    true,
  timestampData: true   // auto-adds createdAt & updatedAt fields
});

// Ensure an index on email for fast lookups
leadsDb.ensureIndex({ fieldName: 'email' }).catch(() => {});

// ─── Express App Setup ─────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, assets)
app.use(express.static(__dirname));

// ─── Middleware: Admin Auth ─────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid admin token.' });
  }
  next();
}

// ─── Input Validation ───────────────────────────────────────────────────────
const VALID_SERVICES  = ['modeling', 'rendering', 'animation', 'ar', 'vr', 'digitaltwin', 'showroom', 'gaming', 'other'];
const VALID_STATUSES  = ['New', 'Contacted', 'Closed'];
const EMAIL_REGEX     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact(body) {
  const errors = [];
  if (!body.name    || body.name.trim().length < 2)   errors.push('Name must be at least 2 characters.');
  if (!body.email   || !EMAIL_REGEX.test(body.email.trim())) errors.push('A valid email is required.');
  if (!body.message || body.message.trim().length < 10) errors.push('Message must be at least 10 characters.');
  if (body.service  && !VALID_SERVICES.includes(body.service)) errors.push('Invalid service type.');
  return errors;
}

// ─── Public Routes ──────────────────────────────────────────────────────────

// Handle favicon.ico requests to avoid 404 console errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

/**
 * POST /api/contact
 * Accept a lead submission from the contact form.
 */
app.post('/api/contact', async (req, res) => {
  const errors = validateContact(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null;

  try {
    const doc = await leadsDb.insert({
      name:      req.body.name.trim(),
      email:     req.body.email.trim().toLowerCase(),
      company:   req.body.company?.trim() || null,
      service:   req.body.service || 'modeling',
      message:   req.body.message.trim(),
      status:    'New',
      ipAddress: ip
    });

    console.log(`[LEAD] New lead ${doc._id} from ${doc.email}`);

    return res.status(201).json({
      success:  true,
      message:  'Thank you! We will be in touch within 24 hours.',
      lead_id:  doc._id
    });
  } catch (err) {
    console.error('[ERROR] Insert lead failed:', err.message);
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// ─── Admin Routes ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/leads
 * Returns all leads sorted by newest first (requires admin token).
 */
app.get('/api/admin/leads', requireAdmin, async (req, res) => {
  try {
    const leads = await leadsDb.find({}).sort({ createdAt: -1 });

    // Compute stats
    const stats = {
      total:      leads.length,
      new_leads:  leads.filter(l => l.status === 'New').length,
      contacted:  leads.filter(l => l.status === 'Contacted').length,
      closed:     leads.filter(l => l.status === 'Closed').length
    };

    return res.json({ success: true, stats, leads });
  } catch (err) {
    console.error('[ERROR] Fetch leads failed:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/admin/leads/:id/status
 * Update the status of a lead.
 */
app.patch('/api/admin/leads/:id/status', requireAdmin, async (req, res) => {
  const id     = req.params.id;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const numUpdated = await leadsDb.update({ _id: id }, { $set: { status } }, {});
    if (numUpdated === 0) return res.status(404).json({ error: 'Lead not found.' });

    return res.json({ success: true, id, status });
  } catch (err) {
    console.error('[ERROR] Update status failed:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /api/admin/leads/:id
 * Permanently delete a lead record.
 */
app.delete('/api/admin/leads/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    const numRemoved = await leadsDb.remove({ _id: id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Lead not found.' });

    return res.json({ success: true, message: `Lead deleted.` });
  } catch (err) {
    console.error('[ERROR] Delete lead failed:', err.message);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/admin/leads/export
 * Export all leads as a CSV file (requires admin token in Authorization header).
 */
app.get('/api/admin/leads/export', requireAdmin, async (req, res) => {
  try {
    const leads   = await leadsDb.find({}).sort({ createdAt: -1 });
    const headers = ['ID', 'Name', 'Email', 'Company', 'Service', 'Status', 'Message', 'IP Address', 'Created At'];

    const esc = (val) => {
      if (val == null) return '';
      const s = String(val).replace(/"/g, '""');
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s}"` : s;
    };

    const rows = leads.map(l => [
      l._id, l.name, l.email, l.company, l.service,
      l.status, l.message, l.ipAddress,
      l.createdAt ? new Date(l.createdAt).toISOString() : ''
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vertex-xr-leads-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('[ERROR] Export failed:', err.message);
    return res.status(500).json({ error: 'Export failed.' });
  }
});

// ─── Page Routes ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Service Subpage Routing
const servicePages = [
  { route: '/services/3d-modeling', file: '3d-modeling.html' },
  { route: '/services/3d-rendering', file: '3d-rendering.html' },
  { route: '/services/3d-animation', file: '3d-animation.html' },
  { route: '/services/ar-experiences', file: 'ar-experiences.html' },
  { route: '/services/vr-solutions', file: 'vr-solutions.html' },
  { route: '/services/digital-twins', file: 'digital-twins.html' },
  { route: '/services/virtual-showrooms', file: 'virtual-showrooms.html' },
  { route: '/services/gaming-assets', file: 'gaming-assets.html' }
];

servicePages.forEach(p => {
  app.get(p.route, (req, res) => res.sendFile(path.join(__dirname, 'services', p.file)));
});

// ─── Start Server ────────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log(`  ║   VERTEX XR Backend running on :${PORT}   ║`);
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║  Site:   http://localhost:${PORT}           ║`);
    console.log(`  ║  Admin:  http://localhost:${PORT}/admin     ║`);
    console.log(`  ║  Token:  ${ADMIN_TOKEN}  ║`);
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
  });
}

module.exports = app;
