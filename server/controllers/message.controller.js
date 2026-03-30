import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

// ─── Call Log Message ─────────────────────────────────
export const createCallLog = async (req, res) => {
	try {
		const { receiverId, callType, callDuration, callStatus } = req.body;
		const senderId = req.user._id;

		if (!receiverId || !callType) {
			return res.status(400).json({ error: "receiverId and callType are required" });
		}

		let conversation = await Conversation.findOne({
			participants: { $all: [senderId, receiverId] },
		});

		if (!conversation) {
			conversation = await Conversation.create({
				participants: [senderId, receiverId],
			});
		}

		const receiverSocketId = getReceiverSocketId(receiverId);

		const callMessage = new Message({
			senderId,
			receiverId,
			callType,
			callDuration: callDuration || 0,
			callStatus: callStatus || "ended",
			status: receiverSocketId ? "delivered" : "sent",
		});

		conversation.messages.push(callMessage._id);
		conversation.lastMessage = callMessage._id;

		await Promise.all([conversation.save(), callMessage.save()]);

		if (receiverSocketId) {
			io.to(receiverSocketId).emit("newMessage", callMessage);
		}

		res.status(201).json(callMessage);
	} catch (error) {
		console.log("Error in createCallLog controller:", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const sendMessage = async (req, res) => {
	try {
		const { message, image, audio, audioDuration } = req.body;
		const { id: receiverId } = req.params;
		const senderId = req.user._id;

		if (!message && !image && !audio) {
			return res.status(400).json({ error: "Message, image, or audio is required" });
		}

		// Only allow messaging between friends
		const friendship = await FriendRequest.findOne({
			$or: [
				{ from: senderId, to: receiverId },
				{ from: receiverId, to: senderId },
			],
			status: "accepted",
		});

		if (!friendship) {
			return res.status(403).json({ error: "You can only message friends" });
		}

		let imageUrl = "";
		if (image) {
			const uploadResponse = await cloudinary.uploader.upload(image, {
				folder: "chat-app/messages",
				resource_type: "auto",
			});
			imageUrl = uploadResponse.secure_url;
		}

		let audioUrl = "";
		if (audio) {
			const uploadResponse = await cloudinary.uploader.upload(audio, {
				folder: "chat-app/voice-messages",
				resource_type: "video", // Cloudinary uses "video" for audio files
			});
			audioUrl = uploadResponse.secure_url;
		}

		let conversation = await Conversation.findOne({
			participants: { $all: [senderId, receiverId] },
		});

		if (!conversation) {
			conversation = await Conversation.create({
				participants: [senderId, receiverId],
			});
		}

		const receiverSocketId = getReceiverSocketId(receiverId);

		const newMessage = new Message({
			senderId,
			receiverId,
			message: message || "",
			image: imageUrl,
			audio: audioUrl,
			audioDuration: audioDuration || 0,
			status: receiverSocketId ? "delivered" : "sent",
		});

		conversation.messages.push(newMessage._id);
		conversation.lastMessage = newMessage._id;

		await Promise.all([conversation.save(), newMessage.save()]);

		if (receiverSocketId) {
			io.to(receiverSocketId).emit("newMessage", newMessage);
		}

		res.status(201).json(newMessage);
	} catch (error) {
		console.log("Error in sendMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getMessages = async (req, res) => {
	try {
		const { id: userToChatId } = req.params;
		const senderId = req.user._id;

		const conversation = await Conversation.findOne({
			participants: { $all: [senderId, userToChatId] },
		}).populate("messages");

		if (!conversation) return res.status(200).json([]);

		// Filter out messages deleted for this user
		const messages = conversation.messages.filter(
			(msg) => !msg.deletedFor.includes(senderId)
		).map((msg) => {
			if (msg.deletedForEveryone) {
				return {
					...msg.toObject(),
					message: "",
					image: "",
					deletedForEveryone: true,
				};
			}
			return msg;
		});

		res.status(200).json(messages);
	} catch (error) {
		console.log("Error in getMessages controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const markMessagesAsRead = async (req, res) => {
	try {
		const { id: senderId } = req.params;
		const receiverId = req.user._id;

		await Message.updateMany(
			{ senderId, receiverId, status: { $ne: "read" } },
			{ $set: { status: "read" } }
		);

		res.status(200).json({ success: true });
	} catch (error) {
		console.log("Error in markMessagesAsRead controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const deleteMessage = async (req, res) => {
	try {
		const { id: messageId } = req.params;
		const { forEveryone } = req.body;
		const userId = req.user._id;

		const message = await Message.findById(messageId);
		if (!message) {
			return res.status(404).json({ error: "Message not found" });
		}

		if (forEveryone) {
			// Only the sender can delete for everyone
			if (message.senderId.toString() !== userId.toString()) {
				return res.status(403).json({ error: "You can only unsend your own messages" });
			}

			message.deletedForEveryone = true;
			message.message = "";
			message.image = "";
			message.audio = "";
			await message.save();

			// Notify the other user in real-time
			const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
			if (receiverSocketId) {
				io.to(receiverSocketId).emit("messageDeleted", {
					messageId,
					forEveryone: true,
				});
			}
		} else {
			// Delete for me only
			message.deletedFor.push(userId);
			await message.save();
		}

		res.status(200).json({ success: true });
	} catch (error) {
		console.log("Error in deleteMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const reactToMessage = async (req, res) => {
	try {
		const { id: messageId } = req.params;
		const { emoji } = req.body;
		const userId = req.user._id;

		if (!emoji) {
			return res.status(400).json({ error: "Emoji is required" });
		}

		const message = await Message.findById(messageId);
		if (!message) {
			return res.status(404).json({ error: "Message not found" });
		}

		// Check if user already reacted with this emoji
		const existingReaction = message.reactions.find(
			(r) => r.userId.toString() === userId.toString() && r.emoji === emoji
		);

		if (existingReaction) {
			// Remove reaction (toggle off)
			message.reactions = message.reactions.filter(
				(r) => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
			);
		} else {
			// Remove any existing reaction by this user, then add new one
			message.reactions = message.reactions.filter(
				(r) => r.userId.toString() !== userId.toString()
			);
			message.reactions.push({ userId, emoji });
		}

		await message.save();

		// Notify both sender and receiver
		const otherUserId = message.senderId.toString() === userId.toString()
			? message.receiverId.toString()
			: message.senderId.toString();

		const otherSocketId = getReceiverSocketId(otherUserId);
		if (otherSocketId) {
			io.to(otherSocketId).emit("messageReaction", {
				messageId,
				reactions: message.reactions,
			});
		}

		res.status(200).json({ reactions: message.reactions });
	} catch (error) {
		console.log("Error in reactToMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
