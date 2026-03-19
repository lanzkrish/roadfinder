import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../lib/auth";
import { User, Location } from "../models";

const router = Router();

// ── GET /api/user/locations ───────────────────────────────────────────────────
router.get("/locations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 20));

    const [locations, user] = await Promise.all([
      Location.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.findById(req.userId).select("name totalExplored explorationStreak").lean(),
    ]);

    res.json({
      locations,
      user: {
        totalExplored: user?.totalExplored ?? 0,
        explorationStreak: user?.explorationStreak ?? 0,
      },
      pagination: { page, limit },
    });
  } catch (err) {
    console.error("[user/locations]", err);
    res.status(500).json({ error: "Failed to fetch locations." });
  }
});

export default router;
