import useConversation from "../../zustand/useConversation";
import { useAuthContext } from "../../context/AuthContext";
import { BsMicFill, BsImage } from "react-icons/bs";

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

const GroupConversation = ({ group }) => {
	const { authUser } = useAuthContext();
	const { selectedConversation, setSelectedConversation, setIsSidebarOpen, unreadMessages, clearUnread } = useConversation();

	const isSelected = selectedConversation?._id === group._id;
	const unreadCount = unreadMessages[group._id] || 0;
	const lastMsg = group.lastMessage;
	const lastMsgFromMe = lastMsg?.senderId?._id === authUser?._id || lastMsg?.senderId === authUser?._id;

	const handleClick = () => {
		setSelectedConversation({
			...group,
			isGroupChat: true,
		});
		setIsSidebarOpen(false);
		if (unreadCount > 0) clearUnread(group._id);
	};

	const renderLastMessagePreview = () => {
		if (lastMsg) {
			let senderName = lastMsgFromMe ? "You" : (lastMsg.senderId?.fullName || "").split(" ")[0];
			let preview = "";
			let icon = null;

			if (lastMsg.audio) {
				preview = "Voice message";
				icon = <BsMicFill className='w-3 h-3 flex-shrink-0 mr-0.5 text-red-400' />;
			} else if (lastMsg.image && !lastMsg.message) {
				preview = "Photo";
				icon = <BsImage className='w-3 h-3 flex-shrink-0 mr-0.5' />;
			} else {
				preview = lastMsg.message || "";
			}

			return (
				<p className={`text-xs mt-0.5 truncate flex items-center ${unreadCount > 0 ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
					{icon}
					<span className='font-medium mr-1'>{senderName}:</span>
					{preview}
				</p>
			);
		}

		return <p className='text-xs mt-0.5 text-gray-500'>{group.participants.length} members</p>;
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
			{/* Group Avatar */}
			<div className='relative flex-shrink-0'>
				<img
					src={group.groupPic}
					alt={group.groupName}
					className={`w-11 h-11 rounded-full object-cover ring-2 ${
						unreadCount > 0 ? 'ring-green-400/60' : 'ring-white/10'
					}`}
				/>
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
						{group.groupName}
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
export default GroupConversation;
