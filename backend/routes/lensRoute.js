import express from 'express';
const lensRouter = express.Router();
import { updateLensPrice, getAllLensConfigs } from '../controllers/lensController.js';

// Route for updating/creating price
lensRouter.post('/update-price', updateLensPrice);

// Route for fetching current settings
lensRouter.get('/all', getAllLensConfigs);

export default lensRouter;