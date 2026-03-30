import { useEffect } from "react";
import useConversation from "../../zustand/useConversation";
import MessageInput from "./MessageInput";
import Messages from "./Messages";
import GroupMessages from "./GroupMessages";
import GroupMessageInput from "./GroupMessageInput";
import { TiMessages } from "react-icons/ti";
import { IoArrowBack, IoCallOutline, IoVideocamOutline } from "react-icons/io5";
import { BsPeopleFill } from "react-icons/bs";
import { useAuthContext } from "../../context/AuthContext";
import { useSocketContext } from "../../context/SocketContext";

const formatLastSeen = (date) => {
	if (!date) return "Offline";
	const now = new Date();
	const lastSeen = new Date(date);
	const diffMs = now - lastSeen;
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Last seen just now";
	if (diffMins < 60) return `Last seen ${diffMins}m ago`;
	if (diffHours < 24) return `Last seen ${diffHours}h ago`;
	if (diffDays === 1) return "Last seen yesterday";

	return `Last seen ${lastSeen.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
};

const MessageContainer = () => {
	const { selectedConversation, setSelectedConversation, setIsSidebarOpen } = useConversation();

	useEffect(() => {
		// cleanup function (unmounts)
		return () => setSelectedConversation(null);
	}, [setSelectedConversation]);

	const handleBack = () => {
		setSelectedConversation(null);
		setIsSidebarOpen(true);
	};

	const isGroup = selectedConversation?.isGroupChat;

	return (
		<div className='flex-1 flex flex-col h-full'>
			{!selectedConversation ? (
				<NoChatSelected />
			) : (
				<>
					{/* Chat Header */}
					{isGroup ? (
						<GroupChatHeader conversation={selectedConversation} onBack={handleBack} />
					) : (
						<ChatHeader conversation={selectedConversation} onBack={handleBack} />
					)}
					{isGroup ? <GroupMessages /> : <Messages />}
					{isGroup ? <GroupMessageInput /> : <MessageInput />}
				</>
			)}
		</div>
	);
};
export default MessageContainer;

const ChatHeader = ({ conversation, onBack }) => {
	const { onlineUsers } = useSocketContext();
	const isOnline = onlineUsers.includes(conversation._id);
	const { typingUsers, setActiveCall } = useConversation();
	const isTyping = typingUsers[conversation._id];

	const handleCall = (type) => {
		if (!isOnline) {
			return; // Can't call offline users
		}
		setActiveCall({
			to: conversation._id,
			toUser: conversation,
			type, // "audio" or "video"
			isCaller: true,
		});
	};

	return (
		<div className='flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03] flex-shrink-0'>
			{/* Back button */}
			<button
				onClick={onBack}
				className='p-1.5 -ml-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'
			>
				<IoArrowBack className='w-5 h-5' />
			</button>

			{/* Avatar */}
			<div className='relative flex-shrink-0'>
				<img
					src={conversation.profilePic}
					alt={conversation.fullName}
					className='w-10 h-10 rounded-full object-cover ring-2 ring-white/10'
				/>
				{isOnline && (
					<span className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-gray-900'></span>
				)}
			</div>

			{/* Info */}
			<div className='flex-1 min-w-0'>
				<h3 className='font-semibold text-white text-sm truncate'>{conversation.fullName}</h3>
				{isTyping ? (
					<p className='text-xs text-primary-400 animate-pulse'>typing...</p>
				) : (
					<p className={`text-xs ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
						{isOnline ? 'Online' : formatLastSeen(conversation.lastSeen)}
					</p>
				)}
			</div>

			{/* Call buttons */}
			<div className='flex items-center gap-1'>
				<button
					onClick={() => handleCall("audio")}
					disabled={!isOnline}
					className={`p-2 rounded-lg transition-all ${isOnline ? 'hover:bg-white/10 text-gray-400 hover:text-green-400' : 'text-gray-600 cursor-not-allowed'}`}
					title={isOnline ? 'Voice call' : 'User is offline'}
				>
					<IoCallOutline className='w-5 h-5' />
				</button>
				<button
					onClick={() => handleCall("video")}
					disabled={!isOnline}
					className={`p-2 rounded-lg transition-all ${isOnline ? 'hover:bg-white/10 text-gray-400 hover:text-blue-400' : 'text-gray-600 cursor-not-allowed'}`}
					title={isOnline ? 'Video call' : 'User is offline'}
				>
					<IoVideocamOutline className='w-5 h-5' />
				</button>
			</div>
		</div>
	);
};

const GroupChatHeader = ({ conversation, onBack }) => {
	return (
		<div className='flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03] flex-shrink-0'>
			<button
				onClick={onBack}
				className='p-1.5 -ml-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'
			>
				<IoArrowBack className='w-5 h-5' />
			</button>

			<div className='relative flex-shrink-0'>
				<img
					src={conversation.groupPic}
					alt={conversation.groupName}
					className='w-10 h-10 rounded-full object-cover ring-2 ring-white/10'
				/>
				<span className='absolute bottom-0 right-0 w-4 h-4 bg-gray-800 rounded-full ring-1 ring-white/10 flex items-center justify-center'>
					<BsPeopleFill className='w-2.5 h-2.5 text-primary-400' />
				</span>
			</div>

			<div className='flex-1 min-w-0'>
				<h3 className='font-semibold text-white text-sm truncate'>{conversation.groupName}</h3>
				<p className='text-xs text-gray-500 truncate'>
					{conversation.participants?.length || 0} members
				</p>
			</div>
		</div>
	);
};

const NoChatSelected = () => {
	const { authUser } = useAuthContext();
	return (
		<div className='flex items-center justify-center w-full h-full animate-fade-in'>
			<div className='text-center flex flex-col items-center gap-4 px-6'>
				<div className='w-20 h-20 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-2'>
					<TiMessages className='text-4xl text-primary-400' />
				</div>
				<div>
					<h2 className='text-xl font-bold text-white mb-1'>
						Welcome, {authUser.fullName} 👋
					</h2>
					<p className='text-gray-400 text-sm'>Select a conversation to start messaging</p>
				</div>
			</div>
		</div>
	);
};
