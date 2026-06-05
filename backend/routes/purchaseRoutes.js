import express from "express";
import { createPurchaseEntry } from "../controllers/purchaseController.js";
// Import your token authentication middleware if you have one
// import adminAuth from "../middleware/adminAuth.js"; 

const purchaseRouter = express.Router();

/**
 * @route   POST /api/purchase/add-bill
 * @desc    Submit a new supplier invoice and auto-update stock values
 * @access  Private (Admin Only)
 */
// If using your middleware, inject it here: purchaseRouter.post("/add-bill", adminAuth, createPurchaseEntry);
purchaseRouter.post("/add-bill", createPurchaseEntry);

export default purchaseRouter;