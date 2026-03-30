import { useEffect } from "react";

import { useSocketContext } from "../context/SocketContext";
import useConversation from "../zustand/useConversation";

import notificationSound from "../assets/sounds/notification.mp3";
import { apiUrl } from "../utils/apiConfig";

const useListenMessages = () => {
	const { socket } = useSocketContext();
	const { setMessages, selectedConversation, addUnread, soundEnabled } = useConversation();

	useEffect(() => {
		const handleNewMessage = (newMessage) => {
			newMessage.shouldShake = true;

			// Play sound only if enabled
			if (soundEnabled) {
				const sound = new Audio(notificationSound);
				sound.play().catch(() => { });
			}

			// If the message is from the user we're currently chatting with, add to messages
			if (selectedConversation?._id === newMessage.senderId) {
				setMessages((prev) => [...prev, newMessage]);

				// Auto-mark as read since we're viewing this conversation       
				fetch(apiUrl(`/api/messages/read/${newMessage.senderId}`), { method: "PATCH" }).catch(() => { });
				socket?.emit("messagesRead", { conversationUserId: newMessage.senderId });
			} else {
				// Otherwise, mark as unread
				addUnread(newMessage.senderId);
			}
		};

		socket?.on("newMessage", handleNewMessage);

		return () => socket?.off("newMessage", handleNewMessage);
	}, [socket, setMessages, selectedConversation, addUnread, soundEnabled]);
};
export default useListenMessages;
