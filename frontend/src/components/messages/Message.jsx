import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { extractTime } from "../../utils/extractTime";
import useConversation from "../../zustand/useConversation";
import useDeleteMessage from "../../hooks/useDeleteMessage";
import useReactToMessage from "../../hooks/useReactToMessage";
import { BsCheck2, BsCheck2All, BsThreeDotsVertical, BsMicFill, BsTelephoneFill, BsCameraVideoFill, BsTelephoneXFill } from "react-icons/bs";
import { IoTrashOutline, IoTrashBin, IoCallOutline, IoVideocamOutline } from "react-icons/io5";
import { MdOutlineAddReaction } from "react-icons/md";

const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

const Message = ({ message }) => {
	const { authUser } = useAuthContext();
	const { selectedConversation } = useConversation();
	const { deleteMessage } = useDeleteMessage();
	const { reactToMessage } = useReactToMessage();
	const [showMenu, setShowMenu] = useState(false);
	const [showReactions, setShowReactions] = useState(false);
	const menuRef = useRef(null);
	const reactionRef = useRef(null);
	const fromMe = message.senderId === authUser._id;
	const formattedTime = extractTime(message.createdAt);
	const profilePic = fromMe ? authUser.profilePic : selectedConversation?.profilePic;

	const shakeClass = message.shouldShake ? "shake" : "";

	// Close menu on outside click
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setShowMenu(false);
			}
			if (reactionRef.current && !reactionRef.current.contains(e.target)) {
				setShowReactions(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleDelete = (forEveryone) => {
		deleteMessage(message._id, forEveryone);
		setShowMenu(false);
	};

	const handleReact = (emoji) => {
		reactToMessage(message._id, emoji);
		setShowReactions(false);
	};

	// Group reactions by emoji with counts
	const groupedReactions = (message.reactions || []).reduce((acc, r) => {
		const existing = acc.find((a) => a.emoji === r.emoji);
		if (existing) {
			existing.count++;
			if (r.userId === authUser._id) existing.myReaction = true;
		} else {
			acc.push({ emoji: r.emoji, count: 1, myReaction: r.userId === authUser._id });
		}
		return acc;
	}, []);

	// Status icon for sent messages
	const renderStatus = () => {
		if (!fromMe) return null;
		const status = message.status || (message.read ? "read" : "sent");
		if (status === "read") {
			return <BsCheck2All className='w-3.5 h-3.5 text-blue-400' />;
		} else if (status === "delivered") {
			return <BsCheck2All className='w-3.5 h-3.5 text-gray-400' />;
		}
		return <BsCheck2 className='w-3.5 h-3.5 text-gray-400' />;
	};

	// Deleted message
	if (message.deletedForEveryone) {
		return (
			<div className={`flex items-end gap-2 mb-3 ${fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
				<img src={profilePic} alt='avatar' className='w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10' />
				<div className={`flex flex-col ${fromMe ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
					<div className={`px-3.5 py-2.5 rounded-2xl text-sm italic text-gray-500 ${
						fromMe ? 'bg-white/[0.04] rounded-br-md' : 'bg-white/[0.04] rounded-bl-md'
					} border border-white/[0.06]`}>
						🚫 This message was deleted
					</div>
					<div className='flex items-center gap-1 mt-1 px-1'>
						<span className='text-[10px] text-gray-500'>{formattedTime}</span>
					</div>
				</div>
			</div>
		);
	}

	// ─── Call Log Message ────────────────────────────────
	if (message.callType) {
		const isVideo = message.callType === "video";
		const duration = message.callDuration || 0;
		const status = message.callStatus || "ended";
		const durationStr = duration > 0
			? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
			: null;

		let statusText = "";
		let statusColor = "";
		let StatusIcon = isVideo ? BsCameraVideoFill : BsTelephoneFill;

		if (status === "ended" && duration > 0) {
			statusText = `${isVideo ? "Video" : "Voice"} call · ${durationStr}`;
			statusColor = "text-green-400";
		} else if (status === "missed") {
			statusText = `Missed ${isVideo ? "video" : "voice"} call`;
			statusColor = "text-red-400";
			StatusIcon = BsTelephoneXFill;
		} else if (status === "rejected") {
			statusText = `${isVideo ? "Video" : "Voice"} call declined`;
			statusColor = "text-orange-400";
			StatusIcon = BsTelephoneXFill;
		} else {
			statusText = `${isVideo ? "Video" : "Voice"} call`;
			statusColor = "text-gray-400";
		}

		return (
			<div className="flex justify-center mb-3">
				<div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.08] ${statusColor}`}>
					<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
						status === "missed" || status === "rejected" ? "bg-red-500/20" : "bg-green-500/20"
					}`}>
						<StatusIcon className="w-3.5 h-3.5" />
					</div>
					<div className="flex flex-col">
						<span className="text-xs font-medium">{statusText}</span>
						<span className="text-[10px] text-gray-500">{formattedTime}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`group flex items-end gap-2 mb-3 ${fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
			{/* Avatar */}
			<img
				src={profilePic}
				alt='avatar'
				className='w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10'
			/>

			{/* Bubble */}
			<div className={`relative flex flex-col ${fromMe ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
				{/* Image attachment (rendered outside text bubble for clean look) */}
				{message.image && (
					<div className={`rounded-2xl overflow-hidden ${shakeClass} ${message.message ? 'mb-1' : ''} cursor-pointer`}
						onClick={() => window.open(message.image, '_blank')}
					>
						<img
							src={message.image}
							alt='attachment'
							className='max-w-[250px] sm:max-w-[300px] rounded-2xl object-cover hover:opacity-90 transition-opacity'
							loading='lazy'
							onError={(e) => {
								e.target.onerror = null;
								e.target.src = '';
								e.target.alt = 'Image failed to load';
								e.target.className = 'max-w-[250px] p-4 text-xs text-gray-500 italic bg-white/[0.04] rounded-2xl border border-white/10';
							}}
						/>
					</div>
				)}

				{/* Voice message */}
				{message.audio && (
					<div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl ${shakeClass} ${
						fromMe
							? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md'
							: 'bg-white/[0.08] text-gray-100 rounded-bl-md border border-white/[0.06]'
					}`}>
						<BsMicFill className='w-4 h-4 flex-shrink-0 text-red-400' />
						<audio controls src={message.audio} className='h-8 max-w-[200px] sm:max-w-[250px]' preload='metadata'>
							Your browser does not support audio.
						</audio>
						{message.audioDuration > 0 && (
							<span className='text-[10px] opacity-70 flex-shrink-0'>
								{Math.floor(message.audioDuration / 60)}:{String(Math.floor(message.audioDuration % 60)).padStart(2, '0')}
							</span>
						)}
					</div>
				)}

				{/* Text bubble (only if there's text) */}
				{message.message && (
					<div
						className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${shakeClass} ${
							fromMe
								? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md'
								: 'bg-white/[0.08] text-gray-100 rounded-bl-md border border-white/[0.06]'
						}`}
					>
						<span>{message.message}</span>
					</div>
				)}

				{/* Reactions display */}
				{groupedReactions.length > 0 && (
					<div className={`flex flex-wrap gap-1 mt-0.5 ${fromMe ? 'justify-end' : 'justify-start'}`}>
						{groupedReactions.map((r, i) => (
							<button
								key={i}
								onClick={() => handleReact(r.emoji)}
								className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
									r.myReaction
										? 'bg-primary-500/30 border border-primary-400/40'
										: 'bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.12]'
								}`}
							>
								<span>{r.emoji}</span>
								{r.count > 1 && <span className='text-[10px] text-gray-400'>{r.count}</span>}
							</button>
						))}
					</div>
				)}

				<div className='flex items-center gap-1 mt-1 px-1'>
					<span className='text-[10px] text-gray-500'>{formattedTime}</span>
					{renderStatus()}
				</div>

				{/* Action buttons (react + delete) */}
				<div className={`absolute top-1 ${fromMe ? '-left-14' : '-right-14'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
					{/* Reaction button */}
					<div className='relative' ref={reactionRef}>
						<button
							onClick={() => setShowReactions(!showReactions)}
							className='p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all'
						>
							<MdOutlineAddReaction className='w-3.5 h-3.5' />
						</button>

						{showReactions && (
							<div className={`absolute ${fromMe ? 'left-0' : 'right-0'} bottom-full mb-1 z-50 flex items-center gap-0.5 bg-gray-800 border border-white/10 rounded-full shadow-xl shadow-black/40 px-2 py-1 animate-fade-in`}>
								{QUICK_REACTIONS.map((emoji) => (
									<button
										key={emoji}
										onClick={() => handleReact(emoji)}
										className='text-base hover:scale-125 transition-transform p-0.5'
									>
										{emoji}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Delete menu trigger */}
					<div ref={menuRef}>
						<button
							onClick={() => setShowMenu(!showMenu)}
							className='p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all'
						>
							<BsThreeDotsVertical className='w-3.5 h-3.5' />
						</button>

						{showMenu && (
							<div className={`absolute ${fromMe ? 'left-0' : 'right-0'} top-full mt-1 z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl shadow-black/40 min-w-[140px] animate-fade-in`}>
								{fromMe && (
									<button
										onClick={() => handleDelete(true)}
										className='flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors rounded-t-lg'
									>
										<IoTrashBin className='w-3.5 h-3.5' />
										Unsend
									</button>
								)}
								<button
									onClick={() => handleDelete(false)}
									className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:bg-white/5 transition-colors ${fromMe ? '' : 'rounded-t-lg'} rounded-b-lg`}
								>
									<IoTrashOutline className='w-3.5 h-3.5' />
									Delete for me
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
export default Message;
