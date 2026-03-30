import { useState, useRef, useEffect } from "react";
import { useAuthContext } from "../../context/AuthContext";
import { extractTime } from "../../utils/extractTime";
import useReactToMessage from "../../hooks/useReactToMessage";
import { BsMicFill } from "react-icons/bs";
import { MdOutlineAddReaction } from "react-icons/md";

const QUICK_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

const GroupMessage = ({ message }) => {
	const { authUser } = useAuthContext();
	const { reactToMessage } = useReactToMessage();
	const [showReactions, setShowReactions] = useState(false);
	const reactionRef = useRef(null);
	const fromMe = message.senderId?._id === authUser._id || message.senderId === authUser._id;
	const formattedTime = extractTime(message.createdAt);
	const senderName = fromMe ? "You" : (message.senderId?.fullName || "Unknown");
	const senderPic = fromMe ? authUser.profilePic : (message.senderId?.profilePic || "");

	const shakeClass = message.shouldShake ? "shake" : "";

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (reactionRef.current && !reactionRef.current.contains(e.target)) {
				setShowReactions(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleReact = (emoji) => {
		reactToMessage(message._id, emoji);
		setShowReactions(false);
	};

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

	if (message.deletedForEveryone) {
		return (
			<div className={`flex items-end gap-2 mb-3 ${fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
				<img src={senderPic} alt='avatar' className='w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10' />
				<div className={`flex flex-col ${fromMe ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
					{!fromMe && <span className='text-[10px] text-primary-400 mb-0.5 px-1 font-medium'>{senderName}</span>}
					<div className={`px-3.5 py-2.5 rounded-2xl text-sm italic text-gray-500 bg-white/[0.04] border border-white/[0.06] ${
						fromMe ? 'rounded-br-md' : 'rounded-bl-md'
					}`}>
						🚫 This message was deleted
					</div>
					<span className='text-[10px] text-gray-500 mt-1 px-1'>{formattedTime}</span>
				</div>
			</div>
		);
	}

	return (
		<div className={`group flex items-end gap-2 mb-3 ${fromMe ? 'flex-row-reverse' : 'flex-row'}`}>
			<img src={senderPic} alt='avatar' className='w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10' />

			<div className={`relative flex flex-col ${fromMe ? 'items-end' : 'items-start'} max-w-[75%] sm:max-w-[65%]`}>
				{/* Sender name for others */}
				{!fromMe && <span className='text-[10px] text-primary-400 mb-0.5 px-1 font-medium'>{senderName}</span>}

				{/* Image */}
				{message.image && (
					<div className={`rounded-2xl overflow-hidden ${shakeClass} ${message.message ? 'mb-1' : ''} cursor-pointer`}
						onClick={() => window.open(message.image, '_blank')}
					>
						<img src={message.image} alt='attachment' className='max-w-[250px] sm:max-w-[300px] rounded-2xl object-cover hover:opacity-90 transition-opacity' loading='lazy' />
					</div>
				)}

				{/* Voice message */}
				{message.audio && (
					<div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl ${shakeClass} ${
						fromMe ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md' : 'bg-white/[0.08] text-gray-100 rounded-bl-md border border-white/[0.06]'
					}`}>
						<BsMicFill className='w-4 h-4 flex-shrink-0 text-red-400' />
						<audio controls src={message.audio} className='h-8 max-w-[200px] sm:max-w-[250px]' preload='metadata' />
						{message.audioDuration > 0 && (
							<span className='text-[10px] opacity-70 flex-shrink-0'>
								{Math.floor(message.audioDuration / 60)}:{String(Math.floor(message.audioDuration % 60)).padStart(2, '0')}
							</span>
						)}
					</div>
				)}

				{/* Text */}
				{message.message && (
					<div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${shakeClass} ${
						fromMe ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md' : 'bg-white/[0.08] text-gray-100 rounded-bl-md border border-white/[0.06]'
					}`}>
						<span>{message.message}</span>
					</div>
				)}

				{/* Reactions */}
				{groupedReactions.length > 0 && (
					<div className={`flex flex-wrap gap-1 mt-0.5 ${fromMe ? 'justify-end' : 'justify-start'}`}>
						{groupedReactions.map((r, i) => (
							<button key={i} onClick={() => handleReact(r.emoji)}
								className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
									r.myReaction ? 'bg-primary-500/30 border border-primary-400/40' : 'bg-white/[0.08] border border-white/[0.06] hover:bg-white/[0.12]'
								}`}>
								<span>{r.emoji}</span>
								{r.count > 1 && <span className='text-[10px] text-gray-400'>{r.count}</span>}
							</button>
						))}
					</div>
				)}

				<span className='text-[10px] text-gray-500 mt-1 px-1'>{formattedTime}</span>

				{/* Reaction button */}
				<div className={`absolute top-1 ${fromMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`} ref={reactionRef}>
					<button onClick={() => setShowReactions(!showReactions)} className='p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all'>
						<MdOutlineAddReaction className='w-3.5 h-3.5' />
					</button>
					{showReactions && (
						<div className={`absolute ${fromMe ? 'left-0' : 'right-0'} bottom-full mb-1 z-50 flex items-center gap-0.5 bg-gray-800 border border-white/10 rounded-full shadow-xl px-2 py-1 animate-fade-in`}>
							{QUICK_REACTIONS.map((emoji) => (
								<button key={emoji} onClick={() => handleReact(emoji)} className='text-base hover:scale-125 transition-transform p-0.5'>
									{emoji}
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
export default GroupMessage;
