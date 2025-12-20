const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SECRET = process.env.AV_SECRET || 'dev-secret-key';
const VIEWER_PASS = 'H@rshi';
const OWNER_PASS = 'ch@plot';

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'uploads.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const safe = file.originalname.replace(/[^a-z0-9.\-_/]/gi, '_');
    cb(null, `${id}-${safe}`);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) || [];
  } catch (e) {
    return [];
  }
}

function writeDB(items) {
  fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2));
}

function signToken(name, role) {
  return jwt.sign({ name, role }, SECRET, { expiresIn: '30m' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Missing token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/login', (req, res) => {
  const { name, passcode } = req.body || {};
  if (!passcode) return res.status(400).json({ error: 'Missing passcode' });
  const pc = String(passcode).trim();
  if (pc === VIEWER_PASS) {
    const token = signToken(name || 'Viewer', 'viewer');
    return res.json({ token, role: 'viewer', name: name || 'Viewer', expiresAt: Date.now() + 30 * 60 * 1000 });
  }
  if (pc === OWNER_PASS) {
    const token = signToken(name || 'Owner', 'owner');
    return res.json({ token, role: 'owner', name: name || 'Owner', expiresAt: Date.now() + 30 * 60 * 1000 });
  }
  return res.status(401).json({ error: 'Invalid passcode' });
});

app.get('/api/uploads', (req, res) => {
  const items = readDB();
  res.json({ items });
});

app.post('/api/uploads', authMiddleware, upload.single('file'), (req, res) => {
  const user = req.user || {};
  if (user.role !== 'owner') return res.status(403).json({ error: 'Owner role required' });

  const { subject, title, description } = req.body || {};
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Missing file' });

  const name = file.filename;
  const url = `/uploads/${encodeURIComponent(name)}`;
  const ext = path.extname(file.originalname).toLowerCase();
  const fileType = ['.png', '.jpg', '.jpeg'].includes(ext) ? 'image' : 'pdf';

  const item = {
    id: uuidv4(),
    subject: subject || 'Uncategorized',
    title: title || 'Untitled upload',
    description: description || '',
    uploadedAt: new Date().toISOString(),
    fileType,
    url,
    preview: fileType === 'image' ? url : undefined
  };

  const items = readDB();
  items.unshift(item);
  writeDB(items);

  res.json({ item });
});

app.delete('/api/uploads/:id', authMiddleware, (req, res) => {
  const user = req.user || {};
  if (user.role !== 'owner') return res.status(403).json({ error: 'Owner role required' });
  const id = req.params.id;
  const items = readDB();
  const found = items.find((it) => it.id === id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  // remove file if present
  if (found.url && found.url.startsWith('/uploads/')) {
    const fname = decodeURIComponent(found.url.replace('/uploads/', ''));
    const p = path.join(UPLOAD_DIR, fname);
    try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
  }
  const remaining = items.filter((it) => it.id !== id);
  writeDB(remaining);
  res.json({ ok: true });
});

app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {
  console.log(`Assignment Vault backend listening on http://localhost:${PORT}`);
});
