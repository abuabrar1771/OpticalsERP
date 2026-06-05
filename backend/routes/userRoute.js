import express from 'express'
import { loginUser,registerUser,adminLogin, getUserData } from '../controllers/userController.js'
import authUser from '../middleware/userAuth.js';

const userRouter = express.Router();

userRouter.post ('/login',loginUser)
userRouter.post ('/register',registerUser)
userRouter.post ('/admin',adminLogin)
userRouter.post ('/profile',authUser,getUserData)

export default userRouter;