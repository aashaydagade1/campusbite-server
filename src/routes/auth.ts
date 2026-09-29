import { Router } from "express";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db";

const router = Router();

const sign = (u: { id: number; role: string }) =>
  jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET!, { expiresIn: "7d" });

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password } = parsed.data;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, role",
      [name, email.toLowerCase(), hash]
    );
    res.status(201).json({ user: rows[0], token: sign(rows[0]) });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [String(email).toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password), u.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.json({
    user: { id: u.id, name: u.name, email: u.email, role: u.role },
    token: sign(u),
  });
});

export default router;
