import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { notifyUser } from "../notifications";

const router = Router();
const paymentMode = process.env.PAYMENT_MODE || "mock";
const razorpay = paymentMode === "razorpay" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null;

const itemSchema = z.object({ items: z.array(z.object({ menu_item_id:z.number().int(), quantity:z.number().int().min(1).max(20) })).min(1) });

async function createLocalOrder(userId:number, items:{menu_item_id:number;quantity:number}[], method:"razorpay"|"mock") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids=items.map(i=>i.menu_item_id);
    const {rows:menu}=await client.query("SELECT id,price_paise FROM menu_items WHERE id=ANY($1) AND available=true",[ids]);
    if(menu.length !== new Set(ids).size) throw new Error("ITEM_UNAVAILABLE");
    const prices=new Map<number,number>(menu.map(m=>[m.id,m.price_paise]));
    const total=items.reduce((s,i)=>s+(prices.get(i.menu_item_id)||0)*i.quantity,0);
    const {rows:[order]}=await client.query("INSERT INTO orders (user_id,total_paise,payment_method,payment_status) VALUES ($1,$2,$3,'pending') RETURNING *",[userId,total,method]);
    for(const i of items) await client.query("INSERT INTO order_items (order_id,menu_item_id,quantity,price_paise) VALUES ($1,$2,$3,$4)",[order.id,i.menu_item_id,i.quantity,prices.get(i.menu_item_id)]);
    await client.query("COMMIT"); return order;
  } catch(e){await client.query("ROLLBACK");throw e;} finally{client.release();}
}

router.post("/create-order", requireAuth, requireRole("student"), async (req,res)=>{
  const p=itemSchema.safeParse(req.body); if(!p.success) return res.status(400).json({error:p.error.flatten()});
  try {
    const order=await createLocalOrder(req.user!.id,p.data.items,paymentMode === "razorpay" ? "razorpay":"mock");
    if(!razorpay){
      return res.status(201).json({mode:"mock",orderId:order.id,razorpayOrderId:`mock_order_${order.id}`,amount:order.total_paise,currency:"INR",keyId:"mock"});
    }
    const rp:any=await razorpay.orders.create({amount:order.total_paise,currency:"INR",receipt:`campusbite_${order.id}`,notes:{campusbite_order_id:String(order.id)}});
    await pool.query("UPDATE orders SET razorpay_order_id=$1,updated_at=now() WHERE id=$2",[rp.id,order.id]);
    res.status(201).json({mode:"razorpay",orderId:order.id,razorpayOrderId:rp.id,amount:order.total_paise,currency:"INR",keyId:process.env.RAZORPAY_KEY_ID});
  } catch(e:any){console.error(e);res.status(500).json({error:e.message==="ITEM_UNAVAILABLE"?"An item is unavailable":"Could not create payment order"});}
});

router.post("/verify", requireAuth, requireRole("student"), async(req,res)=>{
  const p=z.object({orderId:z.number().int(),razorpay_order_id:z.string(),razorpay_payment_id:z.string(),razorpay_signature:z.string()}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:p.error.flatten()});
  const {orderId,razorpay_order_id,razorpay_payment_id,razorpay_signature}=p.data;
  const {rows:[order]}=await pool.query("SELECT * FROM orders WHERE id=$1 AND user_id=$2",[orderId,req.user!.id]);
  if(!order)return res.status(404).json({error:"Order not found"});
  let valid=false;
  if(razorpay_order_id.startsWith("mock_order_")) valid=process.env.PAYMENT_MODE !== "razorpay";
  else if(process.env.RAZORPAY_KEY_SECRET) {
    const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    valid=crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(razorpay_signature));
  }
  if(!valid){await pool.query("UPDATE orders SET payment_status='failed',updated_at=now() WHERE id=$1",[orderId]);return res.status(400).json({error:"Payment verification failed"});}
  const {rows:[updated]}=await pool.query("UPDATE orders SET payment_status='paid',status=CASE WHEN status='placed' THEN 'confirmed' ELSE status END,razorpay_order_id=$1,razorpay_payment_id=$2,payment_verified_at=now(),updated_at=now() WHERE id=$3 RETURNING *",[razorpay_order_id,razorpay_payment_id,orderId]);
  notifyUser(req.user!.id,"Payment successful",`Payment received for CampusBite order #${orderId}.`,{orderId}).catch(console.error);
  res.json(updated);
});

export default router;
