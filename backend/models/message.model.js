import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
	{
		senderId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		receiverId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},
		// For group messages
		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Conversation",
			default: null,
		},
		message: {
			type: String,
			default: "",
		},
		image: {
			type: String, // Cloudinary URL
			default: "",
		},
		// "sent" → delivered to server, "delivered" → reached recipient's client, "read" → opened
		status: {
			type: String,
			enum: ["sent", "delivered", "read"],
			default: "sent",
		},
		deletedFor: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: "User",
			default: [],
		},
		deletedForEveryone: {
			type: Boolean,
			default: false,
		},
		// Voice message
		audio: {
			type: String, // Cloudinary URL
			default: "",
		},
		audioDuration: {
			type: Number, // duration in seconds
			default: 0,
		},
		// Call log fields
		callType: {
			type: String,
			enum: ["audio", "video"],
			default: null,
		},
		callDuration: {
			type: Number, // seconds
			default: 0,
		},
		callStatus: {
			type: String,
			enum: ["ended", "missed", "rejected"],
			default: null,
		},
		// Reactions: [{userId, emoji}]
		reactions: [
			{
				userId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
				},
				emoji: String,
			},
		],
		// createdAt, updatedAt
	},
	{ timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
