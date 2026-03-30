import useGetConversations from "../../hooks/useGetConversations";
import Conversation from "./Conversation";

const Conversations = () => {
	const { loading, conversations } = useGetConversations();
	return (
		<div className='py-2 px-2 flex flex-col overflow-y-auto h-full gap-0.5'>
			{conversations.map((conversation, idx) => (
				<Conversation
					key={conversation._id}
					conversation={conversation}
					lastIdx={idx === conversations.length - 1}
				/>
			))}

			{loading && (
				<div className='flex justify-center py-8'>
					<span className='loading loading-spinner loading-md text-primary-400'></span>
				</div>
			)}

			{!loading && conversations.length === 0 && (
				<div className='flex flex-col items-center justify-center py-10 text-gray-400'>
					<span className='text-4xl mb-2'>�</span>
					<p className='text-sm font-medium'>No friends yet</p>
					<p className='text-xs text-gray-500 mt-1'>Search usernames above to add friends</p>
				</div>
			)}
		</div>
	);
};
export default Conversations;
