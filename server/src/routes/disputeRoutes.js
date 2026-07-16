import express from "express";
import { raiseDispute, getDisputes, resolveDispute } from "../controllers/disputeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", raiseDispute);
router.get("/", getDisputes);
router.post("/:id/resolve", resolveDispute);

export default router;
