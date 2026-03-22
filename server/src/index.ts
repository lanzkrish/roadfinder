import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { connectDB } from "./lib/db";
import authRouter from "./routes/auth";
import locationRouter from "./routes/location";
import userRouter from "./routes/user";

const app = express();
const PORT = Number(process.env.PORT ?? 8080);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global rate limit: 60 req/min per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
  })
);

// Security headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api", locationRouter);
app.use("/api/user", userRouter);

// Health check
app.get(["/health", "/api/health"], (_req, res) => res.json({ 
  status: "ok", 
  uptime: process.uptime(),
  ts: new Date().toISOString() 
}));

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found." }));

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🌍 Carpe Terra API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

start();
