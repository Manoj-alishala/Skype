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
		{ urls: "stun:stun3.l.google.com:19302" },
		{ urls: "stun:stun4.l.google.com:19302" },
	],
};

const AUDIO_CONSTRAINTS = {
	echoCancellation: true,
	noiseSuppression: true,
	autoGainControl: true,
};

const VIDEO_CONSTRAINTS = {
	width: { ideal: 1280, max: 1920 },
	height: { ideal: 720, max: 1080 },
	frameRate: { ideal: 30, max: 30 },
	facingMode: "user",
};

const CallModal = () => {
	const { activeCall, setActiveCall, incomingCall, setIncomingCall } = useConversation();
	const { socket } = useSocketContext();
	const { authUser } = useAuthContext();

	const peerConnectionRef = useRef(null);
	const localStreamRef = useRef(null);
	const remoteStreamRef = useRef(null);
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);
	const remoteAudioRef = useRef(null);
	const iceCandidatesQueue = useRef([]);
	const targetIdRef = useRef(null);
	const durationIntervalRef = useRef(null);
	const disconnectTimeoutRef = useRef(null);
	const callTypeRef = useRef("audio"); // ref for use inside callbacks
	const callConnectedRef = useRef(false); // track if call was ever connected

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

	// Sync callType to ref
	useEffect(() => {
		callTypeRef.current = callType;
	}, [callType]);

	// ─── Re-attach streams when DOM changes ─────────────
	useEffect(() => {
		if (remoteStreamRef.current) {
			tryAttachRemoteStream(remoteStreamRef.current);
		}
		if (localStreamRef.current && localVideoRef.current) {
			localVideoRef.current.srcObject = localStreamRef.current;
		}
	}, [callState]);

	// ─── Cleanup helper ──────────────────────────────────
	const doCleanup = useCallback(() => {
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((t) => t.stop());
			localStreamRef.current = null;
		}
		remoteStreamRef.current = null;
		callConnectedRef.current = false;
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
		if (disconnectTimeoutRef.current) {
			clearTimeout(disconnectTimeoutRef.current);
			disconnectTimeoutRef.current = null;
		}
		iceCandidatesQueue.current = [];
	}, []);

	useEffect(() => {
		return () => doCleanup();
	}, [doCleanup]);

	// ─── Attach remote stream to all media elements ─────
	const tryAttachRemoteStream = useCallback((stream) => {
		remoteStreamRef.current = stream;

		// Log track info for debugging
		const audioTracks = stream.getAudioTracks();
		const videoTracks = stream.getVideoTracks();
		console.log(`[WebRTC] Attaching remote stream — audio tracks: ${audioTracks.length}, video tracks: ${videoTracks.length}`);
		videoTracks.forEach((t, i) => console.log(`[WebRTC]   video[${i}]: enabled=${t.enabled}, muted=${t.muted}, readyState=${t.readyState}`));

		// Attach to video element (for video calls — muted because audio goes through <audio>)
		if (remoteVideoRef.current) {
			remoteVideoRef.current.srcObject = stream;
			remoteVideoRef.current.onloadedmetadata = () => {
				console.log("[WebRTC] Remote video loadedmetadata");
				remoteVideoRef.current?.play().catch((e) => console.warn("[WebRTC] Remote video play (metadata) failed:", e));
			};
			remoteVideoRef.current.play().catch((e) => console.warn("[WebRTC] Remote video play failed:", e));
		}

		// Attach to audio element (always present — sole handler for audio playback)
		if (remoteAudioRef.current) {
			remoteAudioRef.current.srcObject = stream;
			remoteAudioRef.current.play().catch((e) => console.warn("[WebRTC] Remote audio play failed:", e));
		}
	}, []);

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
			console.log("[WebRTC] ontrack:", event.track.kind, "readyState:", event.track.readyState);
			const stream = event.streams[0];
			if (stream) {
				tryAttachRemoteStream(stream);
				// Listen for track unmute (tracks can arrive muted)
				event.track.onunmute = () => {
					console.log("[WebRTC] Track unmuted:", event.track.kind);
					tryAttachRemoteStream(stream);
				};
			}
		};

		pc.oniceconnectionstatechange = () => {
			const state = pc.iceConnectionState;
			console.log("[WebRTC] ICE state:", state);

			if (state === "connected" || state === "completed") {
				if (disconnectTimeoutRef.current) {
					clearTimeout(disconnectTimeoutRef.current);
					disconnectTimeoutRef.current = null;
				}
				callConnectedRef.current = true;
				setCallState("connected");
				if (!durationIntervalRef.current) {
					durationIntervalRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
				}
				// Re-attach remote stream after connection
				setTimeout(() => {
					if (remoteStreamRef.current) {
						tryAttachRemoteStream(remoteStreamRef.current);
					}
				}, 100);
			}
			if (state === "failed") {
				const target = targetIdRef.current;
				if (target && socket) socket.emit("endCall", { to: target });
				doCleanup();
				setCallState("idle");
				setActiveCall(null);
				setIncomingCall(null);
			}
			if (state === "disconnected") {
				if (!disconnectTimeoutRef.current) {
					disconnectTimeoutRef.current = setTimeout(() => {
						if (peerConnectionRef.current?.iceConnectionState === "disconnected") {
							const target = targetIdRef.current;
							if (target && socket) socket.emit("endCall", { to: target });
							doCleanup();
							setCallState("idle");
							setActiveCall(null);
							setIncomingCall(null);
						}
						disconnectTimeoutRef.current = null;
					}, 8000);
				}
			}
		};

		return pc;
	}, [socket, doCleanup, setActiveCall, setIncomingCall, tryAttachRemoteStream]);

	// ─── Save call log to chat ───────────────────────────
	const saveCallLog = useCallback(async (targetUserId, type, duration, status) => {
		try {
			const res = await fetch("/api/messages/call-log", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					receiverId: targetUserId,
					callType: type,
					callDuration: duration,
					callStatus: status,
				}),
			});
			if (res.ok) {
				const callMsg = await res.json();
				// Add to current chat if viewing this conversation
				const state = useConversation.getState();
				if (state.selectedConversation?._id === targetUserId) {
					state.setMessages((prev) => [...prev, callMsg]);
				}
			}
		} catch (err) {
			console.error("Failed to save call log:", err);
		}
	}, []);

	// ─── Outgoing Call (caller side) ─────────────────────
	useEffect(() => {
		if (!activeCall || !activeCall.isCaller || activeCall.accepted) return;

		const initCall = async () => {
			try {
				setCallDuration(0);
				setIsMuted(false);
				setIsVideoOff(false);
				setCallType(activeCall.type);
				callTypeRef.current = activeCall.type;
				setRemoteUser(activeCall.toUser);
				setCallState("calling");
				targetIdRef.current = activeCall.to;
				callConnectedRef.current = false;

				const constraints = {
					audio: AUDIO_CONSTRAINTS,
					video: activeCall.type === "video" ? VIDEO_CONSTRAINTS : false,
				};
				const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
				if (pc.signalingState === "have-local-offer") {
					await pc.setRemoteDescription(new RTCSessionDescription(activeCall.signal));
				}
				for (const candidate of iceCandidatesQueue.current) {
					try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
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
		callTypeRef.current = incomingCall.type;
		setRemoteUser(incomingCall.fromUser);
		setCallState("ringing");
		setCallDuration(0);
		setIsMuted(false);
		setIsVideoOff(false);
		callConnectedRef.current = false;
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
			// Save call log (the remote side ended)
			const target = targetIdRef.current;
			const type = callTypeRef.current;
			const wasConnected = callConnectedRef.current;
			doCleanup();
			setCallState("idle");
			setActiveCall(null);
			setIncomingCall(null);
			// The caller saves the log, so if we're the callee,
			// the caller already handled it. But if the remote ended while connected,
			// we should still log from our side if we initiated the call.
			// Actually — let endCall handle logging for the person who clicks "end".
			// For callEnded, the remote peer already saved it. So we just close.
		};
		const handleCallRejected = () => {
			const target = targetIdRef.current;
			const type = callTypeRef.current;
			doCleanup();
			setCallState("idle");
			setActiveCall(null);
			// Save as missed/rejected call
			if (target) {
				saveCallLog(target, type, 0, "rejected");
			}
		};

		socket.on("callEnded", handleCallEnded);
		socket.on("callRejected", handleCallRejected);
		return () => {
			socket.off("callEnded", handleCallEnded);
			socket.off("callRejected", handleCallRejected);
		};
	}, [socket, doCleanup, setActiveCall, setIncomingCall, saveCallLog]);

	// ─── Accept incoming call ────────────────────────────
	const acceptCall = async () => {
		if (!incomingCall) return;
		try {
			const constraints = {
				audio: AUDIO_CONSTRAINTS,
				video: incomingCall.type === "video" ? VIDEO_CONSTRAINTS : false,
			};
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			localStreamRef.current = stream;

			targetIdRef.current = incomingCall.from;
			const pc = createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));

			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			socket.emit("answerCall", { to: incomingCall.from, signal: answer });

			for (const candidate of iceCandidatesQueue.current) {
				try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
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
			setCallState("calling"); // show "Connecting..." until ICE connects
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
		const type = callTypeRef.current;
		const duration = callDuration;
		const wasConnected = callConnectedRef.current;

		if (target && socket) {
			socket.emit("endCall", { to: target });
		}
		doCleanup();
		setCallState("idle");
		setActiveCall(null);
		setIncomingCall(null);

		// Save call log
		if (target) {
			if (wasConnected) {
				saveCallLog(target, type, duration, "ended");
			} else {
				saveCallLog(target, type, 0, "missed");
			}
		}
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

	if (!activeCall && !incomingCall) return null;

	// ─── Incoming Call Ringing UI ────────────────────────
	if (callState === "ringing" && incomingCall) {
		return (
			<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
				<audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
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
			{/* Hidden audio — always present for audio playback */}
			<audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

			{callType === "video" ? (
				<div className="flex-1 relative bg-gray-900 overflow-hidden">
					{/* Remote video — always in DOM, z-0. MUTED because audio goes through hidden <audio> */}
					<video
						ref={remoteVideoRef}
						autoPlay
						playsInline
						muted
						className="absolute inset-0 w-full h-full object-cover z-0"
					/>
					{/* "Connecting" overlay — disappears when connected */}
					{callState !== "connected" && (
						<div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/90">
							<div className="text-center space-y-4">
								<img
									src={remoteUser?.profilePic}
									alt={remoteUser?.fullName}
									className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10 mx-auto"
								/>
								<h3 className="text-xl font-bold text-white">{remoteUser?.fullName}</h3>
								<p className="text-gray-400 animate-pulse">Connecting...</p>
							</div>
						</div>
					)}
					{/* Local video preview (picture-in-picture) */}
					<div className="absolute bottom-24 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-xl overflow-hidden ring-2 ring-white/20 shadow-2xl z-20">
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
								{callState === "connected" ? formatDuration(callDuration) : "Connecting..."}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Call controls */}
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
