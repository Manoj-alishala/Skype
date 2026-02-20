import { useState } from "react";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";

const useSendGroupMessage = () => {
	const [loading, setLoading] = useState(false);
	const { messages, setMessages, selectedConversation } = useConversation();

	const sendGroupMessage = async (message, image = null, audio = null, audioDuration = 0) => {
		setLoading(true);
		try {
			const body = {};
			if (message) body.message = message;
			if (image) body.image = image;
			if (audio) {
				body.audio = audio;
				body.audioDuration = audioDuration;
			}

			const res = await fetch(`/api/groups/${selectedConversation._id}/send`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);

			setMessages([...messages, data]);
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	return { sendGroupMessage, loading };
};
export default useSendGroupMessage;
