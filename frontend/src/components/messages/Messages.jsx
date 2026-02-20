import { useEffect, useRef } from "react";
import useGetMessages from "../../hooks/useGetMessages";
import MessageSkeleton from "../skeletons/MessageSkeleton";
import Message from "./Message";

const Messages = () => {
	const { messages, loading } = useGetMessages();
	const lastMessageRef = useRef();

	useEffect(() => {
		setTimeout(() => {
			lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}, [messages]);

	return (
		<div className='flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1'>
			{!loading &&
				messages.length > 0 &&
				messages.map((message) => (
					<div key={message._id} ref={lastMessageRef} className='animate-fade-in'>
						<Message message={message} />
					</div>
				))}

			{loading && [...Array(3)].map((_, idx) => <MessageSkeleton key={idx} />)}

			{!loading && messages.length === 0 && (
				<div className='flex flex-col items-center justify-center h-full text-gray-400 animate-fade-in'>
					<span className='text-5xl mb-3'>👋</span>
					<p className='text-sm font-medium'>No messages yet</p>
					<p className='text-xs text-gray-500 mt-1'>Send a message to start the conversation</p>
				</div>
			)}
		</div>
	);
};
export default Messages;
