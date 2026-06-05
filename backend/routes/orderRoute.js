import express from "express";
import authUser from "../middleware/userAuth.js";
import { placeOrder, getUserOrders, listOrders,updateStatus, placeOrderRazorpay, verifyRazorpay } from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/place", authUser, placeOrder);
orderRouter.post('/myorders',authUser,getUserOrders);
orderRouter.post("/list", listOrders);
orderRouter.post("/updatestatus", updateStatus);

// New Razorpay logic routes
orderRouter.post('/razorpay', authUser, placeOrderRazorpay);
orderRouter.post('/verifyRazorpay', authUser, verifyRazorpay);

export default orderRouter;
