import { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";
import { apiUrl } from "../utils/apiConfig";

const useGetGroupMessages = () => {
	const [loading, setLoading] = useState(false);
	const { messages, setMessages, selectedConversation } = useConversation();

	useEffect(() => {
		const getMessages = async () => {
			setLoading(true);
			try {
				const res = await fetch(apiUrl(`/api/groups/${selectedConversation._id}/messages`));
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				setMessages(data);
			} catch (error) {
				toast.error(error.message);
			} finally {
				setLoading(false);
			}
		};

		if (selectedConversation?._id && selectedConversation?.isGroupChat) getMessages();
	}, [selectedConversation?._id, selectedConversation?.isGroupChat, setMessages]);

	return { messages, loading };
};
export default useGetGroupMessages;
