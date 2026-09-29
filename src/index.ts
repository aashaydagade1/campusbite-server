import express from "express";
import cors from "cors";
import "dotenv/config";
import auth from "./routes/auth";
import menu from "./routes/menu";
import orders from "./routes/orders";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", auth);
app.use("/menu", menu);
app.use("/orders", orders);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on port ${port}`));
