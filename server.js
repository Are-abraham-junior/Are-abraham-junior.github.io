require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://forminit.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// Configuration CORS pour la sécurité
app.use((req, res, next) => {
  const allowedDevOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
  ]);
  const origin = req.headers.origin;
  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigin = isProd
    ? "https://audreyhumbert.com"
    : allowedDevOrigins.has(origin)
      ? origin
      : "http://localhost:3000";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

app.use(express.json());

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function ensurePostsFile() {
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(
      POSTS_FILE,
      JSON.stringify({ posts: [] }, null, 2),
      "utf8",
    );
  }
}
ensurePostsFile();

function readPosts() {
  ensurePostsFile();
  const raw = fs.readFileSync(POSTS_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.posts) ? parsed.posts : [];
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts }, null, 2), "utf8");
}

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: payload.iat ?? now,
  };
  const headerPart = base64url(Buffer.from(JSON.stringify(header)));
  const payloadPart = base64url(Buffer.from(JSON.stringify(fullPayload)));
  const data = `${headerPart}.${payloadPart}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigPart = base64url(sig);
  return `${data}.${sigPart}`;
}

function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expectedSig = base64url(
    crypto.createHmac("sha256", secret).update(data).digest(),
  );
  if (expectedSig !== s) return null;

  const payloadJson = Buffer.from(p, "base64").toString("utf8");
  const payload = JSON.parse(payloadJson);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return null;
  return payload;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ahumbert.w@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Audrey123+";

// Supprimer les logs sensibles pour la sécurité
// console.log("[AUTH defaults]", { ADMIN_EMAIL, ADMIN_PASSWORD });

const JWT_SECRET = process.env.JWT_SECRET || "change-me-secret";

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(__dirname));

// Rate limiting pour éviter les attaques par déni de service
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message:
    "Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard.",
});
app.use("/api/", limiter);

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis." });
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Identifiants invalides." });
  }

  const token = signJwt(
    {
      sub: "admin",
      email: ADMIN_EMAIL,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    JWT_SECRET,
  );

  res.json({ token });
});

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token)
    return res.status(401).json({ message: "Non authentifié." });
  const payload = verifyJwt(token, JWT_SECRET);
  if (!payload)
    return res.status(401).json({ message: "Token invalide/expiré." });
  req.user = payload;
  next();
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});

// Validation des types de fichiers pour la sécurité
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Type de fichier non autorisé. Seuls les images et vidéos sont acceptés.",
      ),
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter,
});

app.get("/api/posts", (req, res) => {
  const posts = readPosts().sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
  res.json({ posts });
});

app.post("/api/posts", requireAuth, upload.single("mediaFile"), (req, res) => {
  const { title, content, excerpt, type } = req.body || {};
  const postType = (type || "text").toString();

  if (!title || !content) {
    return res.status(400).json({ message: "Titre et contenu requis." });
  }

  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
  const createdAt = new Date().toISOString();

  let media = null;
  if (req.file) {
    media = {
      kind: postType === "video" ? "video" : "image",
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    };
  } else {
    const mediaUrl = req.body.mediaUrl;
    if (mediaUrl) {
      media = { kind: postType === "video" ? "video" : "image", url: mediaUrl };
    }
  }

  const posts = readPosts();
  const post = {
    id,
    title,
    excerpt: excerpt || "",
    type: postType,
    content,
    media,
    status: "published",
    createdAt,
  };
  posts.push(post);
  writePosts(posts);
  res.json({ post });
});

app.put(
  "/api/posts/:id",
  requireAuth,
  upload.single("mediaFile"),
  (req, res) => {
    const { id } = req.params;
    const { title, content, excerpt, type } = req.body || {};
    const postType = (type || "text").toString();

    const posts = readPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1)
      return res.status(404).json({ message: "Post introuvable." });

    const updated = { ...posts[idx] };
    if (title !== undefined) updated.title = title;
    if (content !== undefined) updated.content = content;
    if (excerpt !== undefined) updated.excerpt = excerpt;
    if (type !== undefined) updated.type = postType;

    if (req.file) {
      updated.media = {
        kind: postType === "video" ? "video" : "image",
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      };
    } else if (req.body.mediaUrl) {
      updated.media = {
        kind: postType === "video" ? "video" : "image",
        url: req.body.mediaUrl,
      };
    }

    posts[idx] = updated;
    writePosts(posts);
    res.json({ post: updated });
  },
);

app.delete("/api/posts/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const posts = readPosts();
  const next = posts.filter((p) => p.id !== id);
  if (next.length === posts.length)
    return res.status(404).json({ message: "Post introuvable." });
  writePosts(next);
  res.json({ ok: true });
});

// -------------------- CONTACT (Nodemailer) --------------------
// Route appelée par scripts/contact.js depuis index.html
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ message: "Nom, email et message sont requis." });
  }

  // Destinataire par défaut : tu peux le configurer via ADMIN_EMAIL
  const to = process.env.CONTACT_TO || ADMIN_EMAIL;

  // Transport SMTP (à configurer en variables d’environnement)
  // Si pas configuré, renvoie une erreur claire.
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return res.status(500).json({
      message:
        "SMTP non configuré. Définis SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: {
        rejectUnauthorized: false, // Pour le développement avec Gmail
      },
    });

    const subject = `Message depuis audreyhumbert.com`;
    const body = `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`;

    await transporter.sendMail({
      from: smtpUser,
      to,
      replyTo: email,
      subject,
      text: body,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      message: "Envoi impossible. Vérifie la configuration SMTP.",
      details: err?.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Admin blog API running on http://localhost:${PORT}`);
  console.log(`Admin credentials: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
});
