import express from "express";
import {
  createRentalRequest,
  getMyRentalRequests,
  acceptOrder,
  rejectOrder,
  claimDeliveryTask,
  schedulePickup,
  verifyPickup,
  startDelivery,
  verifyDelivery,
  confirmReceipt,
  requestReturn,
  verifyReturn,
  completeReturn,
  cancelRentalRequest,
  adminUpdateRental,
  rejectDeliveryTask,
  notifyPocHandover,
} from "../controllers/rentalController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/mine", getMyRentalRequests);
router.post("/", createRentalRequest);
router.patch("/:requestId/accept", acceptOrder);
router.patch("/:requestId/reject", rejectOrder);
router.patch("/:requestId/claim", claimDeliveryTask);
router.patch("/:requestId/schedule-pickup", schedulePickup);
router.patch("/:requestId/verify-pickup", verifyPickup);
router.patch("/:requestId/start-delivery", startDelivery);
router.patch("/:requestId/verify-delivery", verifyDelivery);
router.patch("/:requestId/confirm-receipt", confirmReceipt);
router.patch("/:requestId/request-return", requestReturn);
router.patch("/:requestId/verify-return", verifyReturn);
router.patch("/:requestId/complete-return", completeReturn);
router.patch("/:requestId/cancel", cancelRentalRequest);
router.patch("/:requestId/admin-status", adminUpdateRental);
router.patch("/:requestId/reject-assignment", rejectDeliveryTask);
router.post("/:requestId/handover", notifyPocHandover);

export default router;
