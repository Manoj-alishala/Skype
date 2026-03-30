import express from "express";
import { getMessages, sendMessage, markMessagesAsRead, deleteMessage, reactToMessage, createCallLog } from "../controllers/message.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.post("/call-log", protectRoute, createCallLog);
router.patch("/read/:id", protectRoute, markMessagesAsRead);
router.post("/:id/react", protectRoute, reactToMessage);
router.delete("/:id", protectRoute, deleteMessage);

export default router;
