import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, "http://localhost:3000", "http://localhost:5000"] : ["http://localhost:3000", "http://localhost:5000"],
		methods: ["GET", "POST"],
	},
});

export const getReceiverSocketId = (receiverId) => {
	return userSocketMap[receiverId];
};

const userSocketMap = {}; // {userId: socketId}

io.on("connection", async (socket) => {
	console.log("a user connected", socket.id);

	const userId = socket.handshake.query.userId;
	if (userId != "undefined") userSocketMap[userId] = socket.id;

	// io.emit() is used to send events to all the connected clients
	io.emit("getOnlineUsers", Object.keys(userSocketMap));

	// When user comes online, mark all pending messages TO them as "delivered"
	if (userId && userId !== "undefined") {
		try {
			const updated = await Message.updateMany(
				{ receiverId: userId, status: "sent" },
				{ $set: { status: "delivered" } }
			);
			if (updated.modifiedCount > 0) {
				// Notify senders that their messages were delivered
				const msgs = await Message.find({ receiverId: userId, status: "delivered" })
					.select("senderId")
					.lean();
				const senderIds = [...new Set(msgs.map((m) => m.senderId.toString()))];
				for (const sid of senderIds) {
					const senderSocketId = getReceiverSocketId(sid);
					if (senderSocketId) {
						io.to(senderSocketId).emit("messagesDelivered", { deliveredToUserId: userId });
					}
				}
			}
		} catch (err) {
			console.log("Error marking messages as delivered:", err.message);
		}

		// Join all group chat rooms
		try {
			const groups = await Conversation.find({
				isGroupChat: true,
				participants: userId,
			}).select("_id");
			for (const group of groups) {
				socket.join(`group_${group._id}`);
			}
		} catch (err) {
			console.log("Error joining group rooms:", err.message);
		}
	}

	// Typing indicator events
	socket.on("typing", ({ receiverId }) => {
		const receiverSocketId = getReceiverSocketId(receiverId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit("typing", { senderId: userId });
		}
	});

	socket.on("stopTyping", ({ receiverId }) => {
		const receiverSocketId = getReceiverSocketId(receiverId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
		}
	});

	// Group typing
	socket.on("groupTyping", ({ groupId }) => {
		socket.to(`group_${groupId}`).emit("groupTyping", { groupId, senderId: userId });
	});

	socket.on("groupStopTyping", ({ groupId }) => {
		socket.to(`group_${groupId}`).emit("groupStopTyping", { groupId, senderId: userId });
	});

	// Join a group room (when group is created or user is added)
	socket.on("joinGroup", ({ groupId }) => {
		socket.join(`group_${groupId}`);
	});

	// WebRTC Signaling
	socket.on("callUser", async ({ to, signal, type }) => {
		const receiverSocketId = getReceiverSocketId(to);
		if (receiverSocketId) {
			// Look up caller info to send to receiver
			let fromUser = null;
			try {
				fromUser = await User.findById(userId).select("fullName profilePic").lean();
			} catch { }
			io.to(receiverSocketId).emit("incomingCall", {
				from: userId,
				fromUser,
				signal,
				type,
			});
		}
	});

	socket.on("answerCall", ({ to, signal }) => {
		const callerSocketId = getReceiverSocketId(to);
		if (callerSocketId) {
			io.to(callerSocketId).emit("callAccepted", { signal });
		}
	});

	socket.on("iceCandidate", ({ to, candidate }) => {
		const targetSocketId = getReceiverSocketId(to);
		if (targetSocketId) {
			io.to(targetSocketId).emit("iceCandidate", { candidate, from: userId });
		}
	});

	socket.on("endCall", ({ to }) => {
		const targetSocketId = getReceiverSocketId(to);
		if (targetSocketId) {
			io.to(targetSocketId).emit("callEnded");
		}
	});

	socket.on("rejectCall", ({ to }) => {
		const callerSocketId = getReceiverSocketId(to);
		if (callerSocketId) {
			io.to(callerSocketId).emit("callRejected");
		}
	});

	// Read receipts — when a user marks messages as read, notify the sender
	socket.on("messagesRead", ({ conversationUserId }) => {
		const senderSocketId = getReceiverSocketId(conversationUserId);
		if (senderSocketId) {
			io.to(senderSocketId).emit("messagesRead", { readByUserId: userId });
		}
	});

	socket.on("disconnect", async () => {
		console.log("user disconnected", socket.id);
		delete userSocketMap[userId];
		io.emit("getOnlineUsers", Object.keys(userSocketMap));

		// Update lastSeen timestamp
		if (userId && userId !== "undefined") {
			try {
				await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
			} catch (err) {
				console.log("Error updating lastSeen:", err.message);
			}
		}
	});
});

export { app, io, server };
