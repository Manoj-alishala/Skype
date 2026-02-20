import { useState } from "react";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";

const useDeleteMessage = () => {
	const [loading, setLoading] = useState(false);
	const { setMessages } = useConversation();

	const deleteMessage = async (messageId, forEveryone = false) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/messages/${messageId}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ forEveryone }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);

			if (forEveryone) {
				// Replace message content with deletion notice
				setMessages((prev) =>
					prev.map((msg) =>
						msg._id === messageId
							? { ...msg, message: "", image: "", deletedForEveryone: true }
							: msg
					)
				);
			} else {
				// Remove from local view
				setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
			}

			toast.success(forEveryone ? "Message unsent" : "Message deleted");
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	return { deleteMessage, loading };
};
export default useDeleteMessage;
