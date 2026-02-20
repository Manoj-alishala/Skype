import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../config/cloudinary.js";

export const getUsersForSidebar = async (req, res) => {
	try {
		const loggedInUserId = req.user._id;

		// Only return accepted friends, not all users
		const acceptedRequests = await FriendRequest.find({
			$or: [{ from: loggedInUserId }, { to: loggedInUserId }],
			status: "accepted",
		});

		const friendIds = acceptedRequests.map((req) =>
			req.from.toString() === loggedInUserId.toString() ? req.to : req.from
		);

		const friends = await User.find({ _id: { $in: friendIds } }).select("-password");

		// Get conversations with last message info and unread counts
		const conversations = await Conversation.find({
			participants: loggedInUserId,
		}).populate({
			path: "lastMessage",
			select: "message image senderId createdAt status",
		});

		// Build a map of friendId → { lastMessage, unreadCount }
		const conversationMap = {};
		for (const conv of conversations) {
			const friendId = conv.participants.find(
				(p) => p.toString() !== loggedInUserId.toString()
			);
			if (friendId) {
				conversationMap[friendId.toString()] = {
					lastMessage: conv.lastMessage,
				};
			}
		}

		// Get unread counts per sender
		const unreadCounts = await Message.aggregate([
			{
				$match: {
					receiverId: loggedInUserId,
					status: { $ne: "read" },
					deletedForEveryone: { $ne: true },
					deletedFor: { $nin: [loggedInUserId] },
				},
			},
			{ $group: { _id: "$senderId", count: { $sum: 1 } } },
		]);

		const unreadMap = {};
		for (const item of unreadCounts) {
			unreadMap[item._id.toString()] = item.count;
		}

		// Merge friend data with conversation info
		const friendsWithMeta = friends.map((friend) => {
			const f = friend.toObject();
			const convInfo = conversationMap[f._id.toString()];
			f.lastMessage = convInfo?.lastMessage || null;
			f.unreadCount = unreadMap[f._id.toString()] || 0;
			return f;
		});

		// Sort by last message time (most recent first), friends without messages at end
		friendsWithMeta.sort((a, b) => {
			const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
			const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
			return timeB - timeA;
		});

		res.status(200).json(friendsWithMeta);
	} catch (error) {
		console.error("Error in getUsersForSidebar: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Get current user's profile
export const getProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select("-password");
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.status(200).json(user);
	} catch (error) {
		console.error("Error in getProfile: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Update profile (fullName, bio, profilePic)
export const updateProfile = async (req, res) => {
	try {
		const { fullName, bio, profilePic } = req.body;
		const userId = req.user._id;

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// Update fullName if provided
		if (fullName && fullName.trim()) {
			user.fullName = fullName.trim();
		}

		// Update bio if provided (allow empty string to clear bio)
		if (bio !== undefined) {
			if (bio.length > 150) {
				return res.status(400).json({ error: "Bio must be 150 characters or less" });
			}
			user.bio = bio;
		}

		// Update profile picture if provided (base64 image)
		if (profilePic) {
			// If user already has a cloudinary profile pic, delete the old one
			if (user.profilePic && user.profilePic.includes("cloudinary")) {
				try {
					const publicId = user.profilePic.split("/").pop().split(".")[0];
					await cloudinary.uploader.destroy(`chat-app/profiles/${publicId}`);
				} catch (e) {
					console.warn("Failed to delete old profile pic:", e.message);
				}
			}

			const uploadResponse = await cloudinary.uploader.upload(profilePic, {
				folder: "chat-app/profiles",
				width: 400,
				height: 400,
				crop: "fill",
				gravity: "face",
			});
			user.profilePic = uploadResponse.secure_url;
		}

		await user.save();

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			username: user.username,
			profilePic: user.profilePic,
			bio: user.bio || "",
			gender: user.gender,
		});
	} catch (error) {
		console.error("Error in updateProfile: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Change password
export const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword, confirmNewPassword } = req.body;
		const userId = req.user._id;

		if (!currentPassword || !newPassword || !confirmNewPassword) {
			return res.status(400).json({ error: "All fields are required" });
		}

		if (newPassword !== confirmNewPassword) {
			return res.status(400).json({ error: "New passwords don't match" });
		}

		if (newPassword.length < 6) {
			return res.status(400).json({ error: "Password must be at least 6 characters" });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
		if (!isCurrentPasswordCorrect) {
			return res.status(400).json({ error: "Current password is incorrect" });
		}

		const salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(newPassword, salt);
		await user.save();

		res.status(200).json({ message: "Password updated successfully" });
	} catch (error) {
		console.error("Error in changePassword: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
