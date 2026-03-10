import { createContext, useState, useEffect, useContext } from "react";
import { useAuthContext } from "./AuthContext";
import useConversation from "../zustand/useConversation";
import io from "socket.io-client";
import { API_BASE_URL } from "../utils/apiConfig";

const SocketContext = createContext();

export const useSocketContext = () => {
	return useContext(SocketContext);
};

export const SocketContextProvider = ({ children }) => {
	const [socket, setSocket] = useState(null);
	const [onlineUsers, setOnlineUsers] = useState([]);
	const { authUser } = useAuthContext();

	useEffect(() => {
		if (authUser) {
			const socket = io(API_BASE_URL || "http://localhost:5000", {
				query: {
					userId: authUser._id,
				},
			});

			setSocket(socket);

			socket.on("getOnlineUsers", (users) => {
				setOnlineUsers(users);
			});

			// Typing indicator listeners
			socket.on("typing", ({ senderId }) => {
				useConversation.getState().setUserTyping(senderId, true);
			});

			socket.on("stopTyping", ({ senderId }) => {
				useConversation.getState().setUserTyping(senderId, false);
			});

			// Read receipts — when the other user reads our messages
			socket.on("messagesRead", ({ readByUserId }) => {
				const { selectedConversation, setMessages } = useConversation.getState();
				if (selectedConversation?._id === readByUserId) {
					setMessages((prev) =>
						prev.map((msg) =>
							msg.senderId === authUser._id && msg.status !== "read"
								? { ...msg, status: "read" }
								: msg
						)
					);
				}
			});

			// Delivered receipts — when the other user comes online and gets our pending messages
			socket.on("messagesDelivered", ({ deliveredToUserId }) => {
				const { selectedConversation, setMessages } = useConversation.getState();
				if (selectedConversation?._id === deliveredToUserId) {
					setMessages((prev) =>
						prev.map((msg) =>
							msg.senderId === authUser._id && msg.status === "sent"
								? { ...msg, status: "delivered" }
								: msg
						)
					);
				}
			});

			// Message deleted by the other user (unsend)
			socket.on("messageDeleted", ({ messageId, forEveryone }) => {
				if (forEveryone) {
					const { setMessages } = useConversation.getState();
					setMessages((prev) =>
						prev.map((msg) =>
							msg._id === messageId
								? { ...msg, message: "", image: "", audio: "", deletedForEveryone: true }
								: msg
						)
					);
				}
			});

			// Message reaction update
			socket.on("messageReaction", ({ messageId, reactions }) => {
				const { setMessages } = useConversation.getState();
				setMessages((prev) =>
					prev.map((msg) =>
						msg._id === messageId ? { ...msg, reactions } : msg
					)
				);
			});

			// Friend request received — increment pending count
			socket.on("friendRequestReceived", () => {
				useConversation.getState().incrementPendingCount();
			});

			// Friend request accepted — refresh friends list
			socket.on("friendRequestAccepted", () => {
				useConversation.getState().triggerFriendsRefresh();
			});

			// Friend removed — refresh friends list
			socket.on("friendRemoved", () => {
				useConversation.getState().triggerFriendsRefresh();
			});

			// ─── Group Chat Events ──────────────────────────────
			socket.on("newGroupMessage", (message) => {
				const state = useConversation.getState();
				const { selectedConversation, soundEnabled } = state;
				// If this group is currently selected, add message to view
				if (selectedConversation?.isGroupChat && selectedConversation?._id === message.conversationId) {
					state.setMessages((prev) => [...prev, message]);
				} else {
					// Add unread for `group_<id>` key
					state.addUnread(`group_${message.conversationId}`);
				}
				// Play notification sound
				if (soundEnabled && message.senderId?._id !== authUser._id && message.senderId !== authUser._id) {
					try { new Audio("/sounds/notification.mp3").play(); } catch { }
				}
				// Refresh group list to update last message preview
				state.triggerGroupsRefresh();
			});

			socket.on("groupCreated", () => {
				useConversation.getState().triggerGroupsRefresh();
			});

			socket.on("groupUpdated", () => {
				useConversation.getState().triggerGroupsRefresh();
			});

			socket.on("removedFromGroup", ({ groupId }) => {
				const state = useConversation.getState();
				if (state.selectedConversation?.isGroupChat && state.selectedConversation?._id === groupId) {
					state.setSelectedConversation(null);
				}
				state.triggerGroupsRefresh();
			});

			socket.on("groupTyping", ({ senderId, groupId }) => {
				if (senderId !== authUser._id) {
					useConversation.getState().setUserTyping(`group_${groupId}`, true);
				}
			});

			socket.on("groupStopTyping", ({ senderId, groupId }) => {
				if (senderId !== authUser._id) {
					useConversation.getState().setUserTyping(`group_${groupId}`, false);
				}
			});

			// ─── WebRTC Calling Events ──────────────────────────
			socket.on("incomingCall", ({ from, fromUser, type, signal }) => {
				useConversation.getState().setIncomingCall({ from, fromUser, type, signal });
			});

			socket.on("callAccepted", ({ signal }) => {
				const state = useConversation.getState();
				if (state.activeCall) {
					state.setActiveCall({ ...state.activeCall, signal, accepted: true });
				}
			});

			// callEnded / callRejected / iceCandidate are handled by CallModal directly
			// to avoid race conditions with component unmounting

			return () => socket.close();
		} else {
			if (socket) {
				socket.close();
				setSocket(null);
			}
		}
	}, [authUser]);

	return <SocketContext.Provider value={{ socket, onlineUsers }}>{children}</SocketContext.Provider>;
};
