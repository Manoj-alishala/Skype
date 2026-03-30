import { useState, useRef, useEffect } from "react";
import { BsSend, BsEmojiSmile, BsImage, BsXCircleFill, BsMicFill, BsStopFill } from "react-icons/bs";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";
import useSendGroupMessage from "../../hooks/useSendGroupMessage";
import { useSocketContext } from "../../context/SocketContext";
import useConversation from "../../zustand/useConversation";

const GroupMessageInput = () => {
	const [message, setMessage] = useState("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [imagePreview, setImagePreview] = useState(null);
	const [isRecording, setIsRecording] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const { loading, sendGroupMessage } = useSendGroupMessage();
	const { socket } = useSocketContext();
	const { selectedConversation } = useConversation();
	const typingTimeoutRef = useRef(null);
	const emojiPickerRef = useRef(null);
	const inputRef = useRef(null);
	const fileInputRef = useRef(null);
	const mediaRecorderRef = useRef(null);
	const audioChunksRef = useRef([]);
	const recordingIntervalRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
				setShowEmojiPicker(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		setShowEmojiPicker(false);
		setImagePreview(null);
	}, [selectedConversation?._id]);

	const handleTyping = (e) => {
		setMessage(e.target.value);
		if (!socket || !selectedConversation) return;
		socket.emit("groupTyping", { groupId: selectedConversation._id });
		if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
		typingTimeoutRef.current = setTimeout(() => {
			socket.emit("groupStopTyping", { groupId: selectedConversation._id });
		}, 1500);
	};

	const handleImageSelect = (e) => {
		const file = e.target.files[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
		if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
		const reader = new FileReader();
		reader.onloadend = () => setImagePreview(reader.result);
		reader.readAsDataURL(file);
	};

	const removeImagePreview = () => {
		setImagePreview(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];
			mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
				stream.getTracks().forEach(track => track.stop());
				const reader = new FileReader();
				reader.onloadend = async () => {
					await sendGroupMessage(null, null, reader.result, recordingDuration);
					setRecordingDuration(0);
				};
				reader.readAsDataURL(audioBlob);
			};
			mediaRecorder.start();
			setIsRecording(true);
			setRecordingDuration(0);
			recordingIntervalRef.current = setInterval(() => {
				setRecordingDuration(prev => { if (prev >= 120) { stopRecording(); return prev; } return prev + 1; });
			}, 1000);
		} catch (err) { toast.error("Microphone access denied"); }
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
		setIsRecording(false);
		if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
	};

	const cancelRecording = () => {
		if (mediaRecorderRef.current?.state === 'recording') {
			mediaRecorderRef.current.ondataavailable = null;
			mediaRecorderRef.current.onstop = null;
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
		}
		setIsRecording(false);
		setRecordingDuration(0);
		audioChunksRef.current = [];
		if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!message.trim() && !imagePreview) return;
		if (socket && selectedConversation) socket.emit("groupStopTyping", { groupId: selectedConversation._id });
		if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
		await sendGroupMessage(message.trim() || null, imagePreview || null);
		setMessage("");
		removeImagePreview();
	};

	const onEmojiClick = (emojiData) => {
		setMessage((prev) => prev + emojiData.emoji);
		inputRef.current?.focus();
	};

	return (
		<form className='px-3 sm:px-4 pb-3 sm:pb-4 pt-2 flex-shrink-0 relative' onSubmit={handleSubmit}>
			{showEmojiPicker && (
				<div ref={emojiPickerRef} className='absolute bottom-full left-3 sm:left-4 mb-2 z-50 animate-fade-in'>
					<EmojiPicker onEmojiClick={onEmojiClick} theme="dark" width={320} height={400} searchPlaceholder="Search emoji..." lazyLoadEmojis skinTonesDisabled previewConfig={{ showPreview: false }} />
				</div>
			)}
			{imagePreview && (
				<div className='mb-2 relative inline-block animate-fade-in'>
					<img src={imagePreview} alt='Preview' className='max-h-32 rounded-xl border border-white/10 object-cover' />
					<button type='button' onClick={removeImagePreview} className='absolute -top-2 -right-2 text-red-400 hover:text-red-300 bg-gray-900 rounded-full'>
						<BsXCircleFill className='w-5 h-5' />
					</button>
				</div>
			)}
			{isRecording ? (
				<div className='flex items-center gap-3 glass-input rounded-2xl px-4 py-2.5'>
					<div className='flex items-center gap-2 flex-1'>
						<span className='w-3 h-3 bg-red-500 rounded-full animate-pulse'></span>
						<span className='text-red-400 text-sm font-medium'>Recording</span>
						<span className='text-gray-400 text-sm'>{Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}</span>
					</div>
					<button type='button' onClick={cancelRecording} className='p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5'><BsXCircleFill className='w-5 h-5' /></button>
					<button type='button' onClick={stopRecording} className='p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'><BsStopFill className='w-5 h-5' /></button>
				</div>
			) : (
				<div className='flex items-center gap-2 glass-input rounded-2xl px-4 py-2 focus-within:border-primary-400/50 focus-within:ring-1 focus-within:ring-primary-400/20 transition-all'>
					<button type='button' onClick={() => setShowEmojiPicker(prev => !prev)} className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${showEmojiPicker ? 'text-primary-400 bg-primary-500/20' : 'text-gray-400 hover:text-primary-400 hover:bg-white/5'}`}>
						<BsEmojiSmile className='w-5 h-5' />
					</button>
					<button type='button' onClick={() => fileInputRef.current?.click()} className='p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-white/5 flex-shrink-0'>
						<BsImage className='w-5 h-5' />
					</button>
					<input type='file' accept='image/*' ref={fileInputRef} onChange={handleImageSelect} className='hidden' />
					<input ref={inputRef} type='text' className='flex-1 bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none py-1.5' placeholder='Type a message…' value={message} onChange={handleTyping} autoComplete='off' />
					{!message.trim() && !imagePreview ? (
						<button type='button' onClick={startRecording} className='p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 flex-shrink-0'><BsMicFill className='w-4 h-4' /></button>
					) : (
						<button type='submit' disabled={loading || (!message.trim() && !imagePreview)} className={`p-2 rounded-xl flex-shrink-0 ${message.trim() || imagePreview ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-gray-500'}`}>
							{loading ? <div className='loading loading-spinner loading-sm'></div> : <BsSend className='w-4 h-4' />}
						</button>
					)}
				</div>
			)}
		</form>
	);
};
export default GroupMessageInput;
