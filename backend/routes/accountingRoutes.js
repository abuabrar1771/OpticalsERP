import express from "express";
import { addVoucher, getDaybook, getProfitLoss } from "../controllers/accountingController.js";
import adminAuth from "../middleware/adminAuth.js";

const accountingRouter = express.Router();

// Access-Protected Bookkeeping Hooks (Handles collection splits in the backend)
accountingRouter.post("/add-voucher", adminAuth, addVoucher);
accountingRouter.get("/daybook", adminAuth, getDaybook);
accountingRouter.get("/profit-loss", adminAuth, getProfitLoss);

export default accountingRouter;