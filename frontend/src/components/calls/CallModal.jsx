import { useEffect, useRef, useState, useCallback } from "react";
import { IoVideocamOutline, IoVideocamOffOutline, IoMicOutline, IoMicOffOutline } from "react-icons/io5";
import { BsCameraVideoFill, BsTelephoneXFill, BsTelephoneFill } from "react-icons/bs";
import useConversation from "../../zustand/useConversation";
import { useSocketContext } from "../../context/SocketContext";
import { useAuthContext } from "../../context/AuthContext";
import { apiUrl } from "../../utils/apiConfig";

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

// Helper: get user media with graceful fallback
const getMediaStream = async (wantVideo) => {
	if (wantVideo) {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: AUDIO_CONSTRAINTS,
				video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
			});
			console.log("[WebRTC] getUserMedia OK — audio:", stream.getAudioTracks().length, "video:", stream.getVideoTracks().length);
			return stream;
		} catch (e) {
			console.warn("[WebRTC] HD video failed:", e.message);
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: true });
				console.log("[WebRTC] Basic video OK — audio:", stream.getAudioTracks().length, "video:", stream.getVideoTracks().length);
				return stream;
			} catch (e2) {
				console.warn("[WebRTC] All video failed, audio-only:", e2.message);
				const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
				console.log("[WebRTC] Audio-only — audio:", stream.getAudioTracks().length, "video:", stream.getVideoTracks().length);
				return stream;
			}
		}
	}
	return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
};

// Directly attach a stream to a media element
const attachStream = (element, stream, label) => {
	if (!element || !stream) return;
	if (element.srcObject === stream) {
		if (element.paused) {
			element.play().catch((e) => console.warn(`[WebRTC] ${label} re-play:`, e.message));
		}
		return;
	}
	console.log(`[WebRTC] Attaching stream to ${label}`);
	element.srcObject = stream;
	element.play()
		.then(() => console.log(`[WebRTC] ${label} playing ✓`))
		.catch((e) => console.warn(`[WebRTC] ${label} play blocked:`, e.message));
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
	const pollIntervalRef = useRef(null);
	const callTypeRef = useRef("audio");
	const callConnectedRef = useRef(false);

	const [callState, setCallState] = useState("idle");
	const [isMuted, setIsMuted] = useState(false);
	const [isVideoOff, setIsVideoOff] = useState(false);
	const [callDuration, setCallDuration] = useState(0);
	const [callType, setCallType] = useState("audio");
	const [remoteUser, setRemoteUser] = useState(null);
	const [debugInfo, setDebugInfo] = useState("");

	// Keep targetIdRef current
	useEffect(() => {
		targetIdRef.current = activeCall?.to || incomingCall?.from || null;
	}, [activeCall?.to, incomingCall?.from]);

	// Sync callType to ref
	useEffect(() => {
		callTypeRef.current = callType;
	}, [callType]);

	// ─── Poll: ensure media elements have streams and are playing ───
	// This runs every 500ms during active calls and guarantees attachment
	useEffect(() => {
		if (callState === "idle" || callState === "ringing") {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
			return;
		}

		pollIntervalRef.current = setInterval(() => {
			const remoteStream = remoteStreamRef.current;
			if (!remoteStream) return;

			attachStream(remoteVideoRef.current, remoteStream, "poll-remoteVideo");
			attachStream(remoteAudioRef.current, remoteStream, "poll-remoteAudio");

			if (localStreamRef.current && localVideoRef.current) {
				attachStream(localVideoRef.current, localStreamRef.current, "poll-localVideo");
			}

			// Update debug info
			const vEl = remoteVideoRef.current;
			const vTracks = remoteStream.getVideoTracks();
			const aTracks = remoteStream.getAudioTracks();
			const info = [
				`V:${vTracks.length} A:${aTracks.length}`,
				vTracks.map((t) => `${t.readyState}/${t.enabled ? "on" : "off"}/${t.muted ? "muted" : "unmuted"}`).join(",") || "no-vtracks",
				vEl ? `${vEl.videoWidth}x${vEl.videoHeight} ${vEl.paused ? "PAUSED" : "playing"} ${vEl.srcObject ? "HAS-SRC" : "NO-SRC"}` : "no-video-el",
			].join(" | ");
			setDebugInfo(info);
		}, 500);

		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		};
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
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
		iceCandidatesQueue.current = [];
		setDebugInfo("");
	}, []);

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
			console.log("[WebRTC] >>> ontrack:", event.track.kind, "readyState:", event.track.readyState, "streams:", event.streams.length);

			let stream = event.streams[0];
			if (!stream) {
				console.warn("[WebRTC] No stream in ontrack, building manually");
				stream = remoteStreamRef.current || new MediaStream();
				stream.addTrack(event.track);
			}
			remoteStreamRef.current = stream;

			// DIRECTLY attach right now — no state, no effects, no delays
			attachStream(remoteVideoRef.current, stream, "ontrack-remoteVideo");
			attachStream(remoteAudioRef.current, stream, "ontrack-remoteAudio");

			event.track.onunmute = () => {
				console.log("[WebRTC] Track unmuted:", event.track.kind);
				attachStream(remoteVideoRef.current, stream, "unmute-remoteVideo");
				attachStream(remoteAudioRef.current, stream, "unmute-remoteAudio");
			};
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
				// Force re-attach after ICE connects — video element now definitely in DOM
				setTimeout(() => {
					const s = remoteStreamRef.current;
					if (s) {
						attachStream(remoteVideoRef.current, s, "iceConnected-remoteVideo");
						attachStream(remoteAudioRef.current, s, "iceConnected-remoteAudio");
					}
				}, 300);
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
	}, [socket, doCleanup, setActiveCall, setIncomingCall]);

	// ─── Save call log to chat ───────────────────────────


	const saveCallLog = useCallback(async (targetUserId, type, duration, status) => {
		try {
			const res = await fetch(apiUrl("/api/messages/call-log"), {
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

		let cancelled = false;

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

				const stream = await getMediaStream(activeCall.type === "video");
				if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

				localStreamRef.current = stream;

				const pc = createPeerConnection();
				stream.getTracks().forEach((track) => pc.addTrack(track, stream));

				const offer = await pc.createOffer();
				if (cancelled) return;
				await pc.setLocalDescription(offer);

				socket.emit("callUser", {
					to: activeCall.to,
					signal: offer,
					type: activeCall.type,
				});

				// Attach local video after PC setup
				setTimeout(() => {
					if (localVideoRef.current && localStreamRef.current) {
						localVideoRef.current.srcObject = localStreamRef.current;
						localVideoRef.current.play().catch(() => { });
					}
				}, 50);
			} catch (err) {
				if (cancelled) return;
				console.error("[WebRTC] Failed to start call:", err);
				doCleanup();
				setActiveCall(null);
			}
		};

		initCall();

		return () => {
			cancelled = true;
			doCleanup();
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
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
					try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn("ICE candidate error:", e); }
				}
				iceCandidatesQueue.current = [];
			} catch (err) {
				console.error("Error handling call accepted:", err);
			}
		};
		handleAccepted();
	// eslint-disable-next-line react-hooks/exhaustive-deps
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
				pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => { });
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
			const target = targetIdRef.current;
			const type = callTypeRef.current;
			doCleanup();
			setCallState("idle");
			setActiveCall(null);
			if (target) saveCallLog(target, type, 0, "rejected");
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
			const isVideo = incomingCall.type === "video";
			const stream = await getMediaStream(isVideo);
			localStreamRef.current = stream;

			targetIdRef.current = incomingCall.from;
			const pc = createPeerConnection();
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));

			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);

			socket.emit("answerCall", { to: incomingCall.from, signal: answer });

			for (const candidate of iceCandidatesQueue.current) {
				try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn("ICE candidate error:", e); }
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
			setCallState("calling");

			// Attach local video after state updates allow DOM to render
			setTimeout(() => {
				if (localVideoRef.current && localStreamRef.current) {
					localVideoRef.current.srcObject = localStreamRef.current;
					localVideoRef.current.play().catch(() => { });
				}
			}, 100);
		} catch (err) {
			console.error("[WebRTC] Failed to accept call:", err);
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

		if (target) {
			saveCallLog(target, type, wasConnected ? duration : 0, wasConnected ? "ended" : "missed");
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
				<audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />
				<div className="glass-card-strong rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-6">
					<div className="relative inline-block mx-auto">
						<img src={remoteUser?.profilePic} alt={remoteUser?.fullName} className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-400/30 mx-auto animate-pulse" />
						<span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center ring-4 ring-gray-900">
							{callType === "video" ? <BsCameraVideoFill className="w-4 h-4 text-white" /> : <BsTelephoneFill className="w-4 h-4 text-white" />}
						</span>
					</div>
					<div>
						<h3 className="text-xl font-bold text-white">{remoteUser?.fullName}</h3>
						<p className="text-gray-400 text-sm mt-1">Incoming {callType} call...</p>
					</div>
					<div className="flex items-center justify-center gap-6">
						<button onClick={rejectCall} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110">
							<BsTelephoneXFill className="w-6 h-6 text-white" />
						</button>
						<button onClick={acceptCall} className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110 animate-bounce">
							<BsTelephoneFill className="w-6 h-6 text-white" />
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ─── Active Call UI ──────────────────────────────────
	return (
		<div className="fixed inset-0 z-[9999] flex flex-col bg-gray-950 animate-fade-in">
			{/* Hidden audio — always present for audio playback */}
			<audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

			{callType === "video" ? (
				<div style={{ flex: 1, position: "relative", background: "#000", minHeight: 0, overflow: "hidden" }}>
					{/* Remote video — full screen, MUTED because audio goes through <audio> */}
					<video
						ref={remoteVideoRef}
						autoPlay
						playsInline
						muted
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							objectFit: "cover",
							background: "#000",
						}}
					/>

					{/* "Connecting" overlay — only before ICE connects */}
					{callState !== "connected" && (
						<div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(17,24,39,0.92)" }}>
							<div className="text-center space-y-4">
								<img src={remoteUser?.profilePic} alt={remoteUser?.fullName} className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10 mx-auto" />
								<h3 className="text-xl font-bold text-white">{remoteUser?.fullName}</h3>
								<p className="text-gray-400 animate-pulse">Connecting...</p>
							</div>
						</div>
					)}

					{/* Debug overlay — shows video state */}
					{debugInfo && (
						<div style={{ position: "absolute", top: 8, left: 8, zIndex: 50, background: "rgba(0,0,0,0.75)", color: "#0f0", fontSize: 11, fontFamily: "monospace", padding: "4px 8px", borderRadius: 4, maxWidth: "90%", wordBreak: "break-all" }}>
							{debugInfo}
						</div>
					)}

					{/* Local video PIP */}
					<div style={{ position: "absolute", bottom: 96, right: 16, width: 128, height: 176, borderRadius: 12, overflow: "hidden", zIndex: 20, border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
						<video
							ref={localVideoRef}
							autoPlay
							playsInline
							muted
							style={{ width: "100%", height: "100%", objectFit: "cover", display: isVideoOff ? "none" : "block" }}
						/>
						{isVideoOff && (
							<div style={{ width: "100%", height: "100%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
								<img src={authUser?.profilePic} alt="You" className="w-16 h-16 rounded-full object-cover" />
							</div>
						)}
					</div>

					{/* Duration when connected */}
					{callState === "connected" && (
						<div style={{ position: "absolute", top: 8, right: 8, zIndex: 30, background: "rgba(0,0,0,0.5)", color: "#4ade80", fontSize: 14, padding: "4px 12px", borderRadius: 20 }}>
							{formatDuration(callDuration)}
						</div>
					)}
				</div>
			) : (
				/* Audio call UI */
				<div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
					<div className="text-center space-y-6">
						<div className="relative inline-block">
							<img src={remoteUser?.profilePic} alt={remoteUser?.fullName} className={`w-32 h-32 rounded-full object-cover ring-4 ${callState === "connected" ? "ring-green-400/30" : "ring-primary-400/30 animate-pulse"}`} />
							{callState === "connected" && <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full ring-4 ring-gray-900"></span>}
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
					<button onClick={toggleMute} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/30" : "bg-white/10 text-white hover:bg-white/20"}`} title={isMuted ? "Unmute" : "Mute"}>
						{isMuted ? <IoMicOffOutline className="w-6 h-6" /> : <IoMicOutline className="w-6 h-6" />}
					</button>
					{callType === "video" && (
						<button onClick={toggleVideo} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? "bg-red-500/20 text-red-400 ring-2 ring-red-400/30" : "bg-white/10 text-white hover:bg-white/20"}`} title={isVideoOff ? "Turn camera on" : "Turn camera off"}>
							{isVideoOff ? <IoVideocamOffOutline className="w-6 h-6" /> : <IoVideocamOutline className="w-6 h-6" />}
						</button>
					)}
					<button onClick={endCall} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-105" title="End call">
						<BsTelephoneXFill className="w-6 h-6 text-white" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default CallModal;
