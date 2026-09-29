import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM menu_items WHERE available = true ORDER BY name");
  res.json(rows);
});

const itemSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price_paise: z.number().int().positive(),
});

router.post("/", requireAuth, requireRole("vendor"), async (req, res) => {
  const p = itemSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { name, description, price_paise } = p.data;
  const { rows } = await pool.query(
    "INSERT INTO menu_items (name, description, price_paise) VALUES ($1,$2,$3) RETURNING *",
    [name, description ?? null, price_paise]
  );
  res.status(201).json(rows[0]);
});

router.patch("/:id/availability", requireAuth, requireRole("vendor"), async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE menu_items SET available=$1 WHERE id=$2 RETURNING *",
    [Boolean(req.body.available), req.params.id]
  );
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: "Not found" });
});

export default router;
