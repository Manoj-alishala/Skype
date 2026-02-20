import { useEffect, useRef, useState, useCallback } from "react";
import { IoVideocamOutline, IoVideocamOffOutline, IoMicOutline, IoMicOffOutline } from "react-icons/io5";
import { BsCameraVideoFill, BsTelephoneXFill, BsTelephoneFill } from "react-icons/bs";
import useConversation from "../../zustand/useConversation";
import { useSocketContext } from "../../context/SocketContext";
import { useAuthContext } from "../../context/AuthContext";

const ICE_SERVERS = {
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
		{ urls: "stun:stun1.l.google.com:19302" },
		{ urls: "stun:stun2.l.google.com:19302" },
	],
};

const CallModal = () => {
	const { activeCall, setActiveCall, incomingCall, setIncomingCall } = useConversation();
	const { socket } = useSocketContext();
	const { authUser } = useAuthContext();

	const peerConnectionRef = useRef(null);
	const localStreamRef = useRef(null);
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);
	const iceCandidatesQueue = useRef([]);
	const targetIdRef = useRef(null); // ref to avoid stale closures
	const durationIntervalRef = useRef(null);

	const [callState, setCallState] = useState("idle");
	const [isMuted, setIsMuted] = useState(false);
	const [isVideoOff, setIsVideoOff] = useState(false);
	const [callDuration, setCallDuration] = useState(0);
	const [callType, setCallType] = useState("audio");
	const [remoteUser, setRemoteUser] = useState(null);

	// Keep targetIdRef current
	useEffect(() => {
		targetIdRef.current = activeCall?.to || incomingCall?.from || null;
	}, [activeCall?.to, incomingCall?.from]);

	// ─── Cleanup helper ──────────────────────────────────
	const doCleanup = useCallback(() => {
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((t) => t.stop());
			localStreamRef.current = null;
		}
		if (peerConnectionRef.current) {
			peerConnectionRef.current.onicecandidate = null;
			peerConnectionRef.current.ontrack = null;
			peerConnectionRef.current.oniceconnectionstatechange = null;
			peerConnectionRef.current.close();
			peerConnectionRef.current = null;
		}
		if (durationIntervalRef.current) {
			clearInterval(durationIntervalRef.current);
			durationIntervalRef.current = null;
		}
		iceCandidatesQueue.current = [];
	}, []);

	// Cleanup on unmount (important: SocketContext may set activeCall=null causing unmount)
	useEffect(() => {
		return () => doCleanup();
	}, [doCleanup]);

	// ─── Create peer connection ──────────────────────────
	const createPeerConnection = useCallback(() => {
		const pc = new RTCPeerConnection(ICE_SERVERS);
		peerConnectionRef.current = pc;

		pc.onicecandidate = (event) => {
			if (event.candidate && socket) {
				const target = targetIdRef.current;
				if (target) {
					socket.emit("iceCandidate", { to: target, candidate: event.candidate });
				}
			}
		};

		pc.ontrack = (event) => {
			if (remoteVideoRef.current) {
				remoteVideoRef.current.srcObject = event.streams[0];
			}
		};

		pc.oniceconnectionstatechange = () => {
			const state = pc.iceConnectionState;
			if (state === "connected" || state === "completed") {
				setCallState("connected");
				if (!durationIntervalRef.current) {
					durationIntervalRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
				}
			}
			if (state === "disconnected" || state === "failed") {
				// Remote peer disconnected — end the call
				const target = targetIdRef.current;
				if (target && socket) {
					socket.emit("endCall", { to: target });
				}
				doCleanup();
				setCallState("idle");
				setActiveCall(null);
				setIncomingCall(null);
			}
		};

		return pc;
	}, [socket, doCleanup, setActiveCall, setIncomingCall]);

	// ─── Outgoing Call (caller side) ─────────────────────
	useEffect(() => {
		if (!activeCall || !activeCall.isCaller || activeCall.accepted) return;

		const initCall = async () => {
			try {
				setCallType(activeCall.type);
				setRemoteUser(activeCall.toUser);
				setCallState("calling");
				targetIdRef.current = activeCall.to;

				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: activeCall.type === "video",
				});
				localStreamRef.current = stream;
				if (localVideoRef.current) localVideoRef.current.srcObject = stream;

				const pc = createPeerConnection();
				stream.getTracks().forEach((track) => pc.addTrack(track, stream));

				const offer = await pc.createOffer();
				await pc.setLocalDescription(offer);

				socket.emit("callUser", {
					to: activeCall.to,
					signal: offer,
					type: activeCall.type,
				});
			} catch (err) {
				console.error("Failed to start call:", err);
				doCleanup();
				setActiveCall(null);
			}
		};

		initCall();
	}, [activeCall?.to, activeCall?.isCaller]);

	// ─── Handle call accepted (caller receives answer) ───
	useEffect(() => {
		if (!activeCall?.accepted || !activeCall?.signal) return;
		const pc = peerConnectionRef.current;
		if (!pc) return;

		const handleAccepted = async () => {
			try {
				if (pc.signalingState === "have-local-offer" || pc.signalingState === "stable") {
					await pc.setRemoteDescription(new RTCSessionDescription(activeCall.signal));
				}
				// Flush queued ICE candidates
				for (const candidate of iceCandidatesQueue.current) {
					await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
				}
				iceCandidatesQueue.current = [];
			} catch (err) {
				console.error("Error handling call accepted:", err);
			}
		};
		handleAccepted();
	}, [activeCall?.accepted]);

	// ─── Incoming Call (callee side — show ringing UI) ───
	useEffect(() => {
		if (!incomingCall) return;
		setCallType(incomingCall.type);
		setRemoteUser(incomingCall.fromUser);
		setCallState("ringing");
		targetIdRef.current = incomingCall.from;
	}, [incomingCall]);

	// ─── ICE Candidate handler ───────────────────────────
	useEffect(() => {
		if (!socket) return;

		const handleIceCandidate = ({ candidate }) => {
			const pc = peerConnectionRef.current;
			if (pc && pc.remoteDescription) {
				pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
			} else {
				iceCandidatesQueue.current.push(candidate);
			}
		};

		socket.on("iceCandidate", handleIceCandidate);
		return () => socket.off("iceCandidate", handleIceCandidate);
	}, [socket]);

	// ─── Remote end / reject handlers ────────────────────
	useEffect(() => {
		if (!socket) return;

		const handleCallEnded = () => {
			doCleanup();
			setCallState("idle");
			setActiveCall(null);
			setIncomingCall(null);
		};
		const handleCallRejected = () => {
			doCleanup();
			setCallState("idle");
			setActiveCall(null);
		};

		socket.on("callEnded", handleCallEnded);
		socket.on("callRejected", handleCallRejected);
		return () => {
			socket.off("callEnded", handleCallEnded);
			socket.off("callRejected", handleCallRejected);
		};
	}, [socket, doCleanup, setActiveCall, setIncomingCall]);

	// ─── Accept incoming call ────────────────────────────
	const acceptCall = async () => {
		if (!incomingCall) return;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: incomingCall.type === "video",
			});
			localStreamRef.current = stream;
			if (localVideoRef.current) localVideoRef.current.srcObject = stream;

			targetIdRef.current = incomingCall.from;
			const pc = createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));

			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			socket.emit("answerCall", { to: incomingCall.from, signal: answer });

			// Flush queued ICE candidates
			for (const candidate of iceCandidatesQueue.current) {
				await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
			}
			iceCandidatesQueue.current = [];

			setActiveCall({
				to: incomingCall.from,
				toUser: incomingCall.fromUser,
				type: incomingCall.type,
				isCaller: false,
				accepted: true,
			});
			setIncomingCall(null);
			setCallState("connected");
			durationIntervalRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
		} catch (err) {
			console.error("Failed to accept call:", err);
			rejectCall();
		}
	};

	// ─── Reject incoming call ────────────────────────────
	const rejectCall = () => {
		if (incomingCall && socket) {
			socket.emit("rejectCall", { to: incomingCall.from });
		}
		setIncomingCall(null);
		doCleanup();
		setCallState("idle");
	};

	// ─── End active call ─────────────────────────────────
	const endCall = () => {
		const target = targetIdRef.current;
		if (target && socket) {
			socket.emit("endCall", { to: target });
		}
		doCleanup();
		setCallState("idle");
		setActiveCall(null);
		setIncomingCall(null);
	};

	const toggleMute = () => {
		if (localStreamRef.current) {
			localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
			setIsMuted((m) => !m);
		}
	};

	const toggleVideo = () => {
		if (localStreamRef.current) {
			localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
			setIsVideoOff((v) => !v);
		}
	};

	const formatDuration = (s) => {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins}:${String(secs).padStart(2, "0")}`;
	};

	// Don't render if no active/incoming call
	if (!activeCall && !incomingCall) return null;

	// ─── Incoming Call Ringing UI ────────────────────────
	if (callState === "ringing" && incomingCall) {
		return (
			<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
				<div className="glass-card-strong rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-6">
					<div className="relative inline-block mx-auto">
						<img
							src={remoteUser?.profilePic}
							alt={remoteUser?.fullName}
							className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-400/30 mx-auto animate-pulse"
						/>
						<span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center ring-4 ring-gray-900">
							{callType === "video" ? (
								<BsCameraVideoFill className="w-4 h-4 text-white" />
							) : (
								<BsTelephoneFill className="w-4 h-4 text-white" />
							)}
						</span>
					</div>

					<div>
						<h3 className="text-xl font-bold text-white">{remoteUser?.fullName}</h3>
						<p className="text-gray-400 text-sm mt-1">
							Incoming {callType} call...
						</p>
					</div>

					<div className="flex items-center justify-center gap-6">
						<button
							onClick={rejectCall}
							className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110"
						>
							<BsTelephoneXFill className="w-6 h-6 text-white" />
						</button>
						<button
							onClick={acceptCall}
							className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110 animate-bounce"
						>
							<BsTelephoneFill className="w-6 h-6 text-white" />
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ─── Active Call UI (calling / connected) ────────────
	return (
		<div className="fixed inset-0 z-[9999] flex flex-col bg-gray-950 animate-fade-in">
			{callType === "video" ? (
				<div className="flex-1 relative bg-gray-900">
					<video
						ref={remoteVideoRef}
						autoPlay
						playsInline
						className="w-full h-full object-cover"
					/>
					{callState !== "connected" && (
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="text-center space-y-4">
								<img
									src={remoteUser?.profilePic}
									alt={remoteUser?.fullName}
									className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10 mx-auto"
								/>
								<h3 className="text-xl font-bold text-white">{remoteUser?.fullName}</h3>
								<p className="text-gray-400 animate-pulse">Calling...</p>
							</div>
						</div>
					)}
					<div className="absolute bottom-24 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-xl overflow-hidden ring-2 ring-white/20 shadow-2xl">
						<video
							ref={localVideoRef}
							autoPlay
							playsInline
							muted
							className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
						/>
						{isVideoOff && (
							<div className="w-full h-full bg-gray-800 flex items-center justify-center">
								<img src={authUser?.profilePic} alt="You" className="w-16 h-16 rounded-full object-cover" />
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
					<div className="text-center space-y-6">
						<div className="relative inline-block">
							<img
								src={remoteUser?.profilePic}
								alt={remoteUser?.fullName}
								className={`w-32 h-32 rounded-full object-cover ring-4 ${
									callState === "connected" ? "ring-green-400/30" : "ring-primary-400/30 animate-pulse"
								}`}
							/>
							{callState === "connected" && (
								<span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full ring-4 ring-gray-900"></span>
							)}
						</div>
						<div>
							<h3 className="text-2xl font-bold text-white">{remoteUser?.fullName}</h3>
							<p className={`text-sm mt-1 ${callState === "connected" ? "text-green-400" : "text-gray-400 animate-pulse"}`}>
								{callState === "connected" ? formatDuration(callDuration) : "Calling..."}
							</p>
						</div>
					</div>
				</div>
			)}

			<div className="flex-shrink-0 bg-black/50 backdrop-blur-xl border-t border-white/5 py-6 px-4">
				<div className="flex items-center justify-center gap-4 sm:gap-6">
					<button
						onClick={toggleMute}
						className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
							isMuted ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/30" : "bg-white/10 text-white hover:bg-white/20"
						}`}
						title={isMuted ? "Unmute" : "Mute"}
					>
						{isMuted ? <IoMicOffOutline className="w-6 h-6" /> : <IoMicOutline className="w-6 h-6" />}
					</button>
					{callType === "video" && (
						<button
							onClick={toggleVideo}
							className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
								isVideoOff ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/30" : "bg-white/10 text-white hover:bg-white/20"
							}`}
							title={isVideoOff ? "Turn camera on" : "Turn camera off"}
						>
							{isVideoOff ? <IoVideocamOffOutline className="w-6 h-6" /> : <IoVideocamOutline className="w-6 h-6" />}
						</button>
					)}
					<button
						onClick={endCall}
						className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-105"
						title="End call"
					>
						<BsTelephoneXFill className="w-6 h-6 text-white" />
					</button>
				</div>
				{callState === "connected" && callType === "video" && (
					<p className="text-center text-green-400 text-sm mt-3">{formatDuration(callDuration)}</p>
				)}
			</div>
		</div>
	);
};

export default CallModal;
