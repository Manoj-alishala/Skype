import express from "express";
import {
	createGroup,
	getGroups,
	getGroupMessages,
	sendGroupMessage,
	addMember,
	removeMember,
	leaveGroup,
	updateGroup,
} from "../controllers/group.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.post("/:id/send", protectRoute, sendGroupMessage);
router.post("/:id/add-member", protectRoute, addMember);
router.post("/:id/remove-member", protectRoute, removeMember);
router.post("/:id/leave", protectRoute, leaveGroup);
router.patch("/:id", protectRoute, updateGroup);

export default router;
