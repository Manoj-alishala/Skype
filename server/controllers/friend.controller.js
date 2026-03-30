import FriendRequest from "../models/friendRequest.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

// Search users by username (for sending friend requests)
export const searchUsers = async (req, res) => {
	try {
		const { query } = req.query;
		const loggedInUserId = req.user._id;

		if (!query || query.trim().length < 2) {
			return res.status(400).json({ error: "Search query must be at least 2 characters" });
		}

		// Find users matching the username (case-insensitive), exclude self
		const users = await User.find({
			_id: { $ne: loggedInUserId },
			username: { $regex: query.trim(), $options: "i" },
		})
			.select("fullName username profilePic")
			.limit(10);

		// For each user, check the friendship status with the logged-in user
		const usersWithStatus = await Promise.all(
			users.map(async (user) => {
				const existingRequest = await FriendRequest.findOne({
					$or: [
						{ from: loggedInUserId, to: user._id },
						{ from: user._id, to: loggedInUserId },
					],
				});

				let friendshipStatus = "none"; // not connected
				if (existingRequest) {
					if (existingRequest.status === "accepted") {
						friendshipStatus = "friends";
					} else if (existingRequest.status === "pending") {
						friendshipStatus =
							existingRequest.from.toString() === loggedInUserId.toString()
								? "request_sent"
								: "request_received";
					} else if (existingRequest.status === "rejected") {
						// Allow re-sending if previously rejected
						friendshipStatus = "none";
					}
				}

				return {
					_id: user._id,
					fullName: user.fullName,
					username: user.username,
					profilePic: user.profilePic,
					friendshipStatus,
				};
			})
		);

		res.status(200).json(usersWithStatus);
	} catch (error) {
		console.error("Error in searchUsers: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
	try {
		const { userId } = req.params;
		const loggedInUserId = req.user._id;

		if (userId === loggedInUserId.toString()) {
			return res.status(400).json({ error: "Cannot send request to yourself" });
		}

		// Check if target user exists
		const targetUser = await User.findById(userId);
		if (!targetUser) {
			return res.status(404).json({ error: "User not found" });
		}

		// Check if there's already an active request/friendship
		const existing = await FriendRequest.findOne({
			$or: [
				{ from: loggedInUserId, to: userId },
				{ from: userId, to: loggedInUserId },
			],
			status: { $in: ["pending", "accepted"] },
		});

		if (existing) {
			if (existing.status === "accepted") {
				return res.status(400).json({ error: "You are already friends" });
			}
			return res.status(400).json({ error: "Friend request already pending" });
		}

		// Remove any old rejected requests so we can create a new one
		await FriendRequest.deleteMany({
			$or: [
				{ from: loggedInUserId, to: userId },
				{ from: userId, to: loggedInUserId },
			],
			status: "rejected",
		});

		const friendRequest = await FriendRequest.create({
			from: loggedInUserId,
			to: userId,
		});

		// Populate sender info for real-time notification
		const populatedRequest = await FriendRequest.findById(friendRequest._id)
			.populate("from", "fullName username profilePic")
			.populate("to", "fullName username profilePic");

		// Real-time notification to the receiver
		const receiverSocketId = getReceiverSocketId(userId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit("friendRequestReceived", populatedRequest);
		}

		res.status(201).json(populatedRequest);
	} catch (error) {
		console.error("Error in sendFriendRequest: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
	try {
		const { requestId } = req.params;
		const loggedInUserId = req.user._id;

		const request = await FriendRequest.findById(requestId);
		if (!request) {
			return res.status(404).json({ error: "Friend request not found" });
		}

		// Only the receiver can accept
		if (request.to.toString() !== loggedInUserId.toString()) {
			return res.status(403).json({ error: "Not authorized" });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ error: "Request already handled" });
		}

		request.status = "accepted";
		await request.save();

		const populatedRequest = await FriendRequest.findById(requestId)
			.populate("from", "fullName username profilePic bio gender lastSeen")
			.populate("to", "fullName username profilePic bio gender lastSeen");

		// Notify the sender that their request was accepted
		const senderSocketId = getReceiverSocketId(request.from._id || request.from);
		if (senderSocketId) {
			io.to(senderSocketId).emit("friendRequestAccepted", populatedRequest);
		}

		res.status(200).json(populatedRequest);
	} catch (error) {
		console.error("Error in acceptFriendRequest: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
	try {
		const { requestId } = req.params;
		const loggedInUserId = req.user._id;

		const request = await FriendRequest.findById(requestId);
		if (!request) {
			return res.status(404).json({ error: "Friend request not found" });
		}

		// Only the receiver can reject
		if (request.to.toString() !== loggedInUserId.toString()) {
			return res.status(403).json({ error: "Not authorized" });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ error: "Request already handled" });
		}

		request.status = "rejected";
		await request.save();

		res.status(200).json({ message: "Friend request rejected" });
	} catch (error) {
		console.error("Error in rejectFriendRequest: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Get all pending friend requests received by the logged-in user
export const getPendingRequests = async (req, res) => {
	try {
		const loggedInUserId = req.user._id;

		const requests = await FriendRequest.find({
			to: loggedInUserId,
			status: "pending",
		})
			.populate("from", "fullName username profilePic")
			.sort({ createdAt: -1 });

		res.status(200).json(requests);
	} catch (error) {
		console.error("Error in getPendingRequests: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Get all friends (accepted requests) for the logged-in user
export const getFriends = async (req, res) => {
	try {
		const loggedInUserId = req.user._id;

		const acceptedRequests = await FriendRequest.find({
			$or: [{ from: loggedInUserId }, { to: loggedInUserId }],
			status: "accepted",
		})
			.populate("from", "fullName username profilePic bio gender lastSeen")
			.populate("to", "fullName username profilePic bio gender lastSeen");

		// Extract the friend user object (the one that's not the logged-in user)
		const friends = acceptedRequests.map((req) => {
			const friend =
				req.from._id.toString() === loggedInUserId.toString() ? req.to : req.from;
			return friend;
		});

		res.status(200).json(friends);
	} catch (error) {
		console.error("Error in getFriends: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Remove a friend (unfriend)
export const removeFriend = async (req, res) => {
	try {
		const { userId } = req.params;
		const loggedInUserId = req.user._id;

		const result = await FriendRequest.findOneAndDelete({
			$or: [
				{ from: loggedInUserId, to: userId },
				{ from: userId, to: loggedInUserId },
			],
			status: "accepted",
		});

		if (!result) {
			return res.status(404).json({ error: "Friendship not found" });
		}

		// Notify the other user in real-time
		const otherSocketId = getReceiverSocketId(userId);
		if (otherSocketId) {
			io.to(otherSocketId).emit("friendRemoved", { userId: loggedInUserId.toString() });
		}

		res.status(200).json({ message: "Friend removed" });
	} catch (error) {
		console.error("Error in removeFriend: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};
