import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
	{
		participants: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		messages: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Message",
				default: [],
			},
		],
		lastMessage: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			default: null,
		},
		// Group chat fields
		isGroupChat: {
			type: Boolean,
			default: false,
		},
		groupName: {
			type: String,
			default: "",
		},
		groupPic: {
			type: String,
			default: "",
		},
		groupAdmin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
