import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        menu_item_id: z.number().int(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
});

// Student places an order. Prices always come from the DB, never from the client.
router.post("/", requireAuth, requireRole("student"), async (req, res) => {
  const p = orderSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ids = p.data.items.map((i) => i.menu_item_id);
    const { rows: menu } = await client.query(
      "SELECT id, price_paise FROM menu_items WHERE id = ANY($1) AND available = true",
      [ids]
    );
    if (menu.length !== new Set(ids).size) throw new Error("ITEM_UNAVAILABLE");

    const priceOf = new Map<number, number>(menu.map((m) => [m.id, m.price_paise]));
    const total = p.data.items.reduce((s, i) => s + priceOf.get(i.menu_item_id)! * i.quantity, 0);

    const {
      rows: [order],
    } = await client.query("INSERT INTO orders (user_id, total_paise) VALUES ($1,$2) RETURNING *", [
      req.user!.id,
      total,
    ]);

    for (const i of p.data.items) {
      await client.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, price_paise) VALUES ($1,$2,$3,$4)",
        [order.id, i.menu_item_id, i.quantity, priceOf.get(i.menu_item_id)]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(order);
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e.message === "ITEM_UNAVAILABLE") {
      return res.status(400).json({ error: "An item is unavailable" });
    }
    console.error(e);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// Student: my orders
router.get("/mine", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC", [
    req.user!.id,
  ]);
  res.json(rows);
});

// Vendor: all orders
router.get("/", requireAuth, requireRole("vendor"), async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT o.*, u.name AS student_name FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC"
  );
  res.json(rows);
});

// Vendor: update order status
router.patch("/:id/status", requireAuth, requireRole("vendor"), async (req, res) => {
  const status = z.enum(["preparing", "ready", "completed", "cancelled"]).safeParse(req.body.status);
  if (!status.success) return res.status(400).json({ error: "Invalid status" });
  const { rows } = await pool.query("UPDATE orders SET status=$1 WHERE id=$2 RETURNING *", [
    status.data,
    req.params.id,
  ]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: "Not found" });
});

export default router;
