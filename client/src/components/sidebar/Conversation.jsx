import { useSocketContext } from "../../context/SocketContext";
import useConversation from "../../zustand/useConversation";
import { useAuthContext } from "../../context/AuthContext";
import { BsCheck2, BsCheck2All, BsImage, BsMicFill } from "react-icons/bs";

const formatLastSeenShort = (date) => {
	if (!date) return "Offline";
	const now = new Date();
	const lastSeen = new Date(date);
	const diffMs = now - lastSeen;
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays === 1) return "Yesterday";
	return lastSeen.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatMessageTime = (date) => {
	if (!date) return "";
	const now = new Date();
	const msgDate = new Date(date);
	const diffMs = now - msgDate;
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffDays === 0) {
		return msgDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
	}
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return msgDate.toLocaleDateString(undefined, { weekday: "short" });
	return msgDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Conversation = ({ conversation }) => {
	const { authUser } = useAuthContext();
	const { selectedConversation, setSelectedConversation, setIsSidebarOpen, unreadMessages, clearUnread, typingUsers } = useConversation();

	const isSelected = selectedConversation?._id === conversation._id;
	const { onlineUsers } = useSocketContext();
	const isOnline = onlineUsers.includes(conversation._id);
	// Combine client-side unread (from socket) with server-side unread count
	const clientUnread = unreadMessages[conversation._id] || 0;
	const serverUnread = conversation.unreadCount || 0;
	const unreadCount = Math.max(clientUnread, serverUnread);
	const isTyping = typingUsers[conversation._id];

	const lastMsg = conversation.lastMessage;
	const lastMsgFromMe = lastMsg?.senderId === authUser?._id;

	const handleClick = () => {
		setSelectedConversation(conversation);
		setIsSidebarOpen(false);
		if (unreadCount > 0) clearUnread(conversation._id);
	};

	const renderLastMessagePreview = () => {
		if (isTyping) {
			return <p className='text-xs mt-0.5 text-primary-400 font-medium animate-pulse'>typing...</p>;
		}

		if (lastMsg) {
			let preview = "";
			let icon = null;

			if (lastMsg.image && !lastMsg.message) {
				preview = "Photo";
				icon = <BsImage className='w-3 h-3 flex-shrink-0 mr-0.5' />;
			} else if (lastMsg.audio) {
				preview = "Voice message";
				icon = <BsMicFill className='w-3 h-3 flex-shrink-0 mr-0.5 text-red-400' />;
			} else if (lastMsg.image && lastMsg.message) {
				preview = lastMsg.message;
				icon = <BsImage className='w-3 h-3 flex-shrink-0 mr-0.5' />;
			} else {
				preview = lastMsg.message || "";
			}

			// Status icon for sent messages
			let statusIcon = null;
			if (lastMsgFromMe) {
				const status = lastMsg.status;
				if (status === "read") {
					statusIcon = <BsCheck2All className='w-3 h-3 text-blue-400 flex-shrink-0 mr-0.5' />;
				} else if (status === "delivered") {
					statusIcon = <BsCheck2All className='w-3 h-3 text-gray-400 flex-shrink-0 mr-0.5' />;
				} else {
					statusIcon = <BsCheck2 className='w-3 h-3 text-gray-400 flex-shrink-0 mr-0.5' />;
				}
			}

			return (
				<p className={`text-xs mt-0.5 truncate flex items-center ${unreadCount > 0 ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
					{statusIcon}
					{icon}
					{preview}
				</p>
			);
		}

		if (unreadCount > 0) {
			return (
				<p className='text-xs mt-0.5 text-green-400 font-medium truncate'>
					{unreadCount === 1 ? 'New message' : `${unreadCount} new messages`}
				</p>
			);
		}

		return (
			<p className={`text-xs mt-0.5 ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
				{isOnline ? 'Online' : formatLastSeenShort(conversation.lastSeen)}
			</p>
		);
	};

	return (
		<div
			className={`flex gap-3 items-center rounded-xl px-3 py-3 cursor-pointer transition-all duration-200
				${isSelected
					? "bg-primary-500/20 border border-primary-400/30 shadow-lg shadow-primary-500/10"
					: unreadCount > 0
						? "bg-green-500/10 border border-green-400/20 hover:bg-green-500/15"
						: "hover:bg-white/[0.06] border border-transparent"
				}
			`}
			onClick={handleClick}
		>
			{/* Avatar with online/unread indicator */}
			<div className='relative flex-shrink-0'>
				<img
					src={conversation.profilePic}
					alt={conversation.fullName}
					className={`w-11 h-11 rounded-full object-cover ring-2 ${
						unreadCount > 0 ? 'ring-green-400/60' : 'ring-white/10'
					}`}
				/>
				{isOnline && !unreadCount && (
					<span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-gray-900 animate-pulse-soft'></span>
				)}
				{unreadCount > 0 && (
					<span className='absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-green-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-gray-900 animate-bounce-in'>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</div>

			{/* Info */}
			<div className='flex flex-col flex-1 min-w-0'>
				<div className='flex justify-between items-center'>
					<p className={`font-semibold text-sm truncate ${unreadCount > 0 ? 'text-green-300' : 'text-white'}`}>
						{conversation.fullName}
					</p>
					{lastMsg?.createdAt && (
						<span className={`text-[10px] flex-shrink-0 ml-2 ${unreadCount > 0 ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
							{formatMessageTime(lastMsg.createdAt)}
						</span>
					)}
				</div>
				{renderLastMessagePreview()}
			</div>
		</div>
	);
};
export default Conversation;
