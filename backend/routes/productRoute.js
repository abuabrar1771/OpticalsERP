import express from "express";
import {
  addProduct,
  removeProduct,
  totalProductList,
  getSingleProduct,
  updateProduct,
  getNextSku,
} from "../controllers/productController.js";
import upload from "../middleware/multer.js";
import adminAuth from "../middleware/adminAuth.js";

const productRouter = express.Router();

// 🌟 FIX: Move upload.fields to run BEFORE adminAuth
productRouter.post(
  "/add",
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
    { name: "image5", maxCount: 1 },
  ]),
  adminAuth, // Now it can read headers and populate req.body safely!
  addProduct,
);

productRouter.post("/update", adminAuth, updateProduct);
productRouter.post("/remove", adminAuth, removeProduct);

productRouter.get("/list", totalProductList);
productRouter.get("/single", getSingleProduct);

productRouter.get("/next-sku", getNextSku);

export default productRouter;