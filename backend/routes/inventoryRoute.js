import express from 'express';
import { 
  updateProductStock, 
  getLowStockInventory, 
  savePatientPrescription, 
  getDailyAccountingMetrics,
  searchCustomerByMobile,    // 🌟 Imported missing customer lookup function
  createInStoreInvoice,      // 🌟 Imported missing invoice generator function
  searchProductsAutocomplete // 🌟 Imported missing product lookup function
} from '../controllers/inventoryController.js';
import adminAuth from '../middleware/adminAuth.js';

const inventoryRouter = express.Router();

inventoryRouter.post('/update-stock', adminAuth, updateProductStock);
inventoryRouter.get('/low-stock-alerts', adminAuth, getLowStockInventory);
inventoryRouter.post('/save-prescription', adminAuth, savePatientPrescription);
inventoryRouter.get('/daily-accounting', adminAuth, getDailyAccountingMetrics);

// 🌟 NEW: IN-STORE RETAIL COUNTER ENDPOINTS
inventoryRouter.get('/search-customer', adminAuth, searchCustomerByMobile);
inventoryRouter.post('/create-invoice', adminAuth, createInStoreInvoice);
inventoryRouter.get('/search-products', adminAuth, searchProductsAutocomplete);

export default inventoryRouter;