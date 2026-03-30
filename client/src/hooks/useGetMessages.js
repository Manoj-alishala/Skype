import { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation";
import { useSocketContext } from "../context/SocketContext";
import toast from "react-hot-toast";
import { apiUrl } from "../utils/apiConfig";

const useGetMessages = () => {
	const [loading, setLoading] = useState(false);
	const { messages, setMessages, selectedConversation } = useConversation();
	const { socket } = useSocketContext();

	useEffect(() => {
		const getMessages = async () => {
			setLoading(true);
			try {
				const res = await fetch(apiUrl(`/api/messages/${selectedConversation._id}`));
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				setMessages(data);

				// Mark messages as read
				await fetch(apiUrl(`/api/messages/read/${selectedConversation._id}`), {
					method: "PATCH",
				});

				// Notify sender that messages have been read
				socket?.emit("messagesRead", { conversationUserId: selectedConversation._id });
			} catch (error) {
				toast.error(error.message);
			} finally {
				setLoading(false);
			}
		};

		if (selectedConversation?._id) getMessages();
	}, [selectedConversation?._id, setMessages, socket]);

	return { messages, loading };
};
export default useGetMessages;
