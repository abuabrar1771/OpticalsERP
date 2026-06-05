import express from "express";
import { addSupplier, getAllSuppliers, searchSuppliers } from "../controllers/supplierController.js";

const supplierRouter = express.Router();

supplierRouter.post("/add", addSupplier);         // POST here to add a supplier manually
supplierRouter.get("/list", getAllSuppliers);     // GET here to view your master list
supplierRouter.get("/search", searchSuppliers);   // GET here for your live autocomplete typing drop-down

export default supplierRouter;