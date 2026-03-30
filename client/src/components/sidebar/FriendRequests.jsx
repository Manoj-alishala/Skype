import { useEffect } from "react";
import { IoClose, IoCheckmark } from "react-icons/io5";
import useGetPendingRequests from "../../hooks/useGetPendingRequests";
import useFriendRequest from "../../hooks/useFriendRequest";
import useConversation from "../../zustand/useConversation";
import { useSocketContext } from "../../context/SocketContext";

const FriendRequests = ({ onClose }) => {
	const { loading, pendingRequests, setPendingRequests } = useGetPendingRequests();
	const { loading: actionLoading, acceptRequest, rejectRequest } = useFriendRequest();
	const { setPendingRequestCount, triggerFriendsRefresh } = useConversation();
	const { socket } = useSocketContext();

	// Update the pending count when requests load
	useEffect(() => {
		setPendingRequestCount(pendingRequests.length);
	}, [pendingRequests, setPendingRequestCount]);

	// Listen for real-time new requests
	useEffect(() => {
		const handleNewRequest = (request) => {
			setPendingRequests((prev) => [request, ...prev]);
		};

		socket?.on("friendRequestReceived", handleNewRequest);
		return () => socket?.off("friendRequestReceived", handleNewRequest);
	}, [socket, setPendingRequests]);

	const handleAccept = async (requestId) => {
		const result = await acceptRequest(requestId);
		if (result) {
			setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
			triggerFriendsRefresh();
		}
	};

	const handleReject = async (requestId) => {
		const result = await rejectRequest(requestId);
		if (result) {
			setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
		}
	};

	return (
		<div className='absolute inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-xl animate-fade-in'>
			{/* Header */}
			<div className='flex items-center justify-between px-4 pt-5 pb-3'>
				<h2 className='text-white font-semibold text-base'>Friend Requests</h2>
				<button
					onClick={onClose}
					className='p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'
				>
					<IoClose className='w-5 h-5' />
				</button>
			</div>

			<div className='h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4'></div>

			{/* Requests List */}
			<div className='flex-1 overflow-y-auto py-2 px-2'>
				{loading ? (
					<div className='flex justify-center py-8'>
						<span className='loading loading-spinner loading-md text-primary-400'></span>
					</div>
				) : pendingRequests.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-10 text-gray-400'>
						<span className='text-4xl mb-2'>👋</span>
						<p className='text-sm'>No pending requests</p>
						<p className='text-xs text-gray-500 mt-1'>Search for users to add friends</p>
					</div>
				) : (
					pendingRequests.map((request) => (
						<div
							key={request._id}
							className='flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.06] transition-all mb-1'
						>
							<img
								src={request.from.profilePic}
								alt={request.from.fullName}
								className='w-11 h-11 rounded-full object-cover ring-2 ring-white/10'
							/>
							<div className='flex-1 min-w-0'>
								<p className='text-white text-sm font-medium truncate'>{request.from.fullName}</p>
								<p className='text-gray-400 text-xs truncate'>@{request.from.username}</p>
							</div>
							<div className='flex gap-2'>
								<button
									onClick={() => handleAccept(request._id)}
									disabled={actionLoading}
									className='p-2 rounded-lg bg-green-500/20 text-green-400 border border-green-400/30 hover:bg-green-500/30 transition-all disabled:opacity-50'
									title='Accept'
								>
									<IoCheckmark className='w-4 h-4' />
								</button>
								<button
									onClick={() => handleReject(request._id)}
									disabled={actionLoading}
									className='p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-all disabled:opacity-50'
									title='Reject'
								>
									<IoClose className='w-4 h-4' />
								</button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default FriendRequests;
