import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { savePushToken } from "../notifications";
const router=Router();
router.post("/register",requireAuth,async(req,res)=>{const p=z.object({expoPushToken:z.string().min(10),platform:z.string().optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:p.error.flatten()});try{await savePushToken(req.user!.id,p.data.expoPushToken,p.data.platform);res.json({ok:true});}catch(e:any){res.status(400).json({error:e.message});}});
router.get("/status",requireAuth,(_req,res)=>res.json({enabled:true,service:"expo-push"}));
export default router;
