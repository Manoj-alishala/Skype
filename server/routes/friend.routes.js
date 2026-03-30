import express from "express";
import protectRoute from "../middleware/protectRoute.js";
import {
	searchUsers,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	getPendingRequests,
	getFriends,
	removeFriend,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/search", protectRoute, searchUsers);
router.get("/pending", protectRoute, getPendingRequests);
router.get("/list", protectRoute, getFriends);
router.post("/request/:userId", protectRoute, sendFriendRequest);
router.put("/accept/:requestId", protectRoute, acceptFriendRequest);
router.put("/reject/:requestId", protectRoute, rejectFriendRequest);
router.delete("/remove/:userId", protectRoute, removeFriend);

export default router;
