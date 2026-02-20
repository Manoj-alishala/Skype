import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import { getUsersForSidebar, getProfile, updateProfile, changePassword } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", protectRoute, getUsersForSidebar);
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);
router.put("/change-password", protectRoute, changePassword);

export default router;
