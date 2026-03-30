import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const createGroup = async (req, res) => {
	try {
		const { groupName, participantIds, groupPic } = req.body;
		const adminId = req.user._id;

		if (!groupName || !groupName.trim()) {
			return res.status(400).json({ error: "Group name is required" });
		}

		if (!participantIds || participantIds.length < 1) {
			return res.status(400).json({ error: "At least 1 other member is required" });
		}

		// Add admin to participants
		const allParticipants = [adminId, ...participantIds.filter((id) => id !== adminId.toString())];

		let groupPicUrl = "";
		if (groupPic) {
			const uploadResponse = await cloudinary.uploader.upload(groupPic, {
				folder: "chat-app/groups",
				resource_type: "auto",
			});
			groupPicUrl = uploadResponse.secure_url;
		}

		const conversation = await Conversation.create({
			participants: allParticipants,
			isGroupChat: true,
			groupName: groupName.trim(),
			groupPic: groupPicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName.trim())}&background=6d28d9&color=fff&size=200`,
			groupAdmin: adminId,
		});

		const populated = await Conversation.findById(conversation._id)
			.populate("participants", "fullName username profilePic")
			.populate("groupAdmin", "fullName username profilePic");

		// Notify all participants via socket
		for (const pid of allParticipants) {
			const socketId = getReceiverSocketId(pid.toString());
			if (socketId) {
				io.to(socketId).emit("groupCreated", populated);
			}
		}

		res.status(201).json(populated);
	} catch (error) {
		console.log("Error in createGroup controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getGroups = async (req, res) => {
	try {
		const userId = req.user._id;

		const groups = await Conversation.find({
			isGroupChat: true,
			participants: userId,
		})
			.populate("participants", "fullName username profilePic")
			.populate("groupAdmin", "fullName username profilePic")
			.populate({
				path: "lastMessage",
				populate: { path: "senderId", select: "fullName" },
			})
			.sort({ updatedAt: -1 });

		res.status(200).json(groups);
	} catch (error) {
		console.log("Error in getGroups controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getGroupMessages = async (req, res) => {
	try {
		const { id: groupId } = req.params;
		const userId = req.user._id;

		const conversation = await Conversation.findOne({
			_id: groupId,
			isGroupChat: true,
			participants: userId,
		}).populate({
			path: "messages",
			populate: { path: "senderId", select: "fullName profilePic" },
		});

		if (!conversation) {
			return res.status(404).json({ error: "Group not found" });
		}

		// Filter deleted messages
		const messages = conversation.messages
			.filter((msg) => !msg.deletedFor.includes(userId))
			.map((msg) => {
				if (msg.deletedForEveryone) {
					return { ...msg.toObject(), message: "", image: "", audio: "", deletedForEveryone: true };
				}
				return msg;
			});

		res.status(200).json(messages);
	} catch (error) {
		console.log("Error in getGroupMessages controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const sendGroupMessage = async (req, res) => {
	try {
		const { id: groupId } = req.params;
		const { message, image, audio, audioDuration } = req.body;
		const senderId = req.user._id;

		if (!message && !image && !audio) {
			return res.status(400).json({ error: "Message, image, or audio is required" });
		}

		const conversation = await Conversation.findOne({
			_id: groupId,
			isGroupChat: true,
			participants: senderId,
		});

		if (!conversation) {
			return res.status(404).json({ error: "Group not found or you're not a member" });
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
				resource_type: "video",
			});
			audioUrl = uploadResponse.secure_url;
		}

		const newMessage = new Message({
			senderId,
			conversationId: groupId,
			message: message || "",
			image: imageUrl,
			audio: audioUrl,
			audioDuration: audioDuration || 0,
			status: "delivered", // Group messages are always "delivered"
		});

		conversation.messages.push(newMessage._id);
		conversation.lastMessage = newMessage._id;

		await Promise.all([conversation.save(), newMessage.save()]);

		// Populate sender info for the response
		const populatedMsg = await Message.findById(newMessage._id).populate("senderId", "fullName profilePic");

		// Emit to all group members except sender
		for (const participantId of conversation.participants) {
			if (participantId.toString() === senderId.toString()) continue;
			const socketId = getReceiverSocketId(participantId.toString());
			if (socketId) {
				io.to(socketId).emit("newGroupMessage", {
					groupId,
					message: populatedMsg,
				});
			}
		}

		res.status(201).json(populatedMsg);
	} catch (error) {
		console.log("Error in sendGroupMessage controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const addMember = async (req, res) => {
	try {
		const { id: groupId } = req.params;
		const { userId: newMemberId } = req.body;
		const adminId = req.user._id;

		const conversation = await Conversation.findOne({
			_id: groupId,
			isGroupChat: true,
			groupAdmin: adminId,
		});

		if (!conversation) {
			return res.status(403).json({ error: "Only group admin can add members" });
		}

		if (conversation.participants.includes(newMemberId)) {
			return res.status(400).json({ error: "User is already a member" });
		}

		conversation.participants.push(newMemberId);
		await conversation.save();

		const populated = await Conversation.findById(groupId)
			.populate("participants", "fullName username profilePic")
			.populate("groupAdmin", "fullName username profilePic");

		// Notify all members
		for (const pid of conversation.participants) {
			const socketId = getReceiverSocketId(pid.toString());
			if (socketId) {
				io.to(socketId).emit("groupUpdated", populated);
			}
		}

		res.status(200).json(populated);
	} catch (error) {
		console.log("Error in addMember controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const removeMember = async (req, res) => {
	try {
		const { id: groupId } = req.params;
		const { userId: memberId } = req.body;
		const adminId = req.user._id;

		const conversation = await Conversation.findOne({
			_id: groupId,
			isGroupChat: true,
			groupAdmin: adminId,
		});

		if (!conversation) {
			return res.status(403).json({ error: "Only group admin can remove members" });
		}

		if (memberId === adminId.toString()) {
			return res.status(400).json({ error: "Admin cannot remove themselves. Transfer admin first." });
		}

		conversation.participants = conversation.participants.filter(
			(p) => p.toString() !== memberId
		);
		await conversation.save();

		const populated = await Conversation.findById(groupId)
			.populate("participants", "fullName username profilePic")
			.populate("groupAdmin", "fullName username profilePic");

		// Notify removed member
		const removedSocketId = getReceiverSocketId(memberId);
		if (removedSocketId) {
			io.to(removedSocketId).emit("removedFromGroup", { groupId });
		}

		// Notify remaining members
		for (const pid of conversation.participants) {
			const socketId = getReceiverSocketId(pid.toString());
			if (socketId) {
				io.to(socketId).emit("groupUpdated", populated);
			}
		}

		res.status(200).json(populated);
	} catch (error) {
		console.log("Error in removeMember controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const leaveGroup = async (req, res) => {
	try {
		const { id: groupId } = req.params;
		const userId = req.user._id;

		const conversation = await Conversation.findOne({
			_id: groupId,
			isGroupChat: true,
			participants: userId,
		});

		if (!conversation) {
			return res.status(404).json({ error: "Group not found" });
		}

		conversation.participants = conversation.participants.filter(
			(p) => p.toString() !== userId.toString()
		);

		// If admin leaves, transfer to next participant
		if (conversation.groupAdmin.toString() === userId.toString() && conversation.participants.length > 0) {
			conversation.groupAdmin = conversation.participants[0];
		}

		if (conversation.participants.length === 0) {
			// Delete group if no members left
			await Conversation.findByIdAndDelete(groupId);
		} else {
			await conversation.save();
		}

		// Notify remaining members
		for (const pid of conversation.participants) {
			const socketId = getReceiverSocketId(pid.toString());
			if (socketId) {
				const populated = await Conversation.findById(groupId)
					.populate("participants", "fullName username profilePic")
					.populate("groupAdmin", "fullName username profilePic");
				io.to(socketId).emit("groupUpdated", populated);
			}
		}

		res.status(200).json({ success: true });
	} catch (error) {
		console.log("Error in leaveGroup controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const updateGroup = async (req, res) => {
	try {
		const { id: groupId } = req.params;
		const { groupName, groupPic } = req.body;
		const adminId = req.user._id;

		const conversation = await Conversation.findOne({
			_id: groupId,
			isGroupChat: true,
			groupAdmin: adminId,
		});

		if (!conversation) {
			return res.status(403).json({ error: "Only group admin can update group info" });
		}

		if (groupName) conversation.groupName = groupName.trim();

		if (groupPic) {
			const uploadResponse = await cloudinary.uploader.upload(groupPic, {
				folder: "chat-app/groups",
				resource_type: "auto",
			});
			conversation.groupPic = uploadResponse.secure_url;
		}

		await conversation.save();

		const populated = await Conversation.findById(groupId)
			.populate("participants", "fullName username profilePic")
			.populate("groupAdmin", "fullName username profilePic");

		// Notify all members
		for (const pid of conversation.participants) {
			const socketId = getReceiverSocketId(pid.toString());
			if (socketId) {
				io.to(socketId).emit("groupUpdated", populated);
			}
		}

		res.status(200).json(populated);
	} catch (error) {
		console.log("Error in updateGroup controller: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
