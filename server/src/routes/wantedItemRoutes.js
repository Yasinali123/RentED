import express from "express";
import {
  searchInventory,
  createDemandRequest,
  getMyDemandRequests,
  getRelevantDemandRequests,
  getAllDemandRequests,
  getDemandRequestById,
  cancelDemandRequest,
  fulfillDemandRequest,
  deleteDemandRequest,
} from "../controllers/wantedItemController.js";
import { authenticate, optionalProtect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/search", optionalProtect, searchInventory);
router.post("/", authenticate, createDemandRequest);
router.get("/my", authenticate, getMyDemandRequests);
router.get("/relevant", optionalProtect, getRelevantDemandRequests);
router.get("/all", authenticate, getAllDemandRequests);
router.get("/:id", optionalProtect, getDemandRequestById);
router.post("/:id/cancel", authenticate, cancelDemandRequest);
router.post("/:id/fulfill", authenticate, fulfillDemandRequest);
router.delete("/:id", authenticate, deleteDemandRequest);

export default router;
