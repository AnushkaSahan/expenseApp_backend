import express from "express";
import { uploadSyncData } from "../controllers/syncController.js";

const router = express.Router();

router.post("/upload", uploadSyncData);

export default router;