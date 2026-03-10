import { useState } from "react";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";
import { apiUrl } from "../utils/apiConfig";

const useReactToMessage = () => {
	const [loading, setLoading] = useState(false);
	const { setMessages } = useConversation();

	const reactToMessage = async (messageId, emoji) => {
		setLoading(true);
		try {
			const res = await fetch(apiUrl(`/api/messages/${messageId}/react`), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ emoji }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);

			// Update reactions in local state
			setMessages((prev) =>
				prev.map((msg) =>
					msg._id === messageId ? { ...msg, reactions: data.reactions } : msg
				)
			);
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	return { reactToMessage, loading };
};
export default useReactToMessage;
