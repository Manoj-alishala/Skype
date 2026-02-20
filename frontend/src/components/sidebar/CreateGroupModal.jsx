import { useState, useEffect } from "react";
import { IoClose, IoSearch, IoCheckmark } from "react-icons/io5";
import { BsPeopleFill } from "react-icons/bs";
import toast from "react-hot-toast";
import useConversation from "../../zustand/useConversation";

const CreateGroupModal = ({ onClose }) => {
	const [step, setStep] = useState(1); // 1: select members, 2: group info
	const [friends, setFriends] = useState([]);
	const [selectedMembers, setSelectedMembers] = useState([]);
	const [groupName, setGroupName] = useState("");
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const { triggerGroupsRefresh } = useConversation();

	useEffect(() => {
		const fetchFriends = async () => {
			try {
				const res = await fetch("/api/friends/list");
				const data = await res.json();
				if (!data.error) setFriends(data);
			} catch (err) {
				toast.error("Failed to load friends");
			}
		};
		fetchFriends();
	}, []);

	const toggleMember = (friendId) => {
		setSelectedMembers((prev) =>
			prev.includes(friendId)
				? prev.filter((id) => id !== friendId)
				: [...prev, friendId]
		);
	};

	const handleCreate = async () => {
		if (!groupName.trim()) {
			toast.error("Group name is required");
			return;
		}
		if (selectedMembers.length < 1) {
			toast.error("Select at least 1 member");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/groups/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					groupName: groupName.trim(),
					participantIds: selectedMembers,
				}),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);

			toast.success(`Group "${data.groupName}" created!`);
			triggerGroupsRefresh();
			onClose();
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	const filteredFriends = friends.filter((f) =>
		f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
		f.username.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in'>
			<div className='w-full max-w-md mx-4 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden'>
				{/* Header */}
				<div className='flex items-center justify-between px-5 py-4 border-b border-white/10'>
					<div className='flex items-center gap-2'>
						<BsPeopleFill className='w-5 h-5 text-primary-400' />
						<h3 className='text-white font-semibold'>
							{step === 1 ? "Select Members" : "Group Info"}
						</h3>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'>
						<IoClose className='w-5 h-5' />
					</button>
				</div>

				{step === 1 ? (
					<>
						{/* Search */}
						<div className='px-4 pt-3'>
							<div className='relative'>
								<IoSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
								<input
									type='text'
									placeholder='Search friends...'
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className='w-full pl-9 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-primary-400/50'
								/>
							</div>
						</div>

						{/* Selected count */}
						{selectedMembers.length > 0 && (
							<div className='px-4 pt-2'>
								<span className='text-xs text-primary-400 font-medium'>
									{selectedMembers.length} selected
								</span>
							</div>
						)}

						{/* Friends list */}
						<div className='px-2 py-2 max-h-64 overflow-y-auto'>
							{filteredFriends.map((friend) => {
								const isSelected = selectedMembers.includes(friend._id);
								return (
									<button
										key={friend._id}
										onClick={() => toggleMember(friend._id)}
										className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all ${
											isSelected ? 'bg-primary-500/20 border border-primary-400/30' : 'hover:bg-white/[0.06] border border-transparent'
										}`}
									>
										<img src={friend.profilePic} alt='' className='w-9 h-9 rounded-full object-cover' />
										<div className='flex-1 text-left min-w-0'>
											<p className='text-sm text-white font-medium truncate'>{friend.fullName}</p>
											<p className='text-xs text-gray-500'>@{friend.username}</p>
										</div>
										<div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
											isSelected ? 'bg-primary-500 border-primary-400' : 'border-gray-600'
										}`}>
											{isSelected && <IoCheckmark className='w-3 h-3 text-white' />}
										</div>
									</button>
								);
							})}
							{filteredFriends.length === 0 && (
								<p className='text-center text-gray-500 text-sm py-6'>No friends found</p>
							)}
						</div>

						{/* Next button */}
						<div className='px-4 pb-4'>
							<button
								onClick={() => setStep(2)}
								disabled={selectedMembers.length < 1}
								className='w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-all'
							>
								Next
							</button>
						</div>
					</>
				) : (
					<>
						{/* Group name input */}
						<div className='px-4 pt-4'>
							<label className='text-xs text-gray-400 mb-1 block'>Group Name</label>
							<input
								type='text'
								placeholder='Enter group name...'
								value={groupName}
								onChange={(e) => setGroupName(e.target.value)}
								maxLength={50}
								className='w-full px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-primary-400/50'
								autoFocus
							/>
						</div>

						{/* Selected members preview */}
						<div className='px-4 pt-3 pb-2'>
							<p className='text-xs text-gray-400 mb-2'>Members ({selectedMembers.length})</p>
							<div className='flex flex-wrap gap-2'>
								{friends.filter((f) => selectedMembers.includes(f._id)).map((f) => (
									<span key={f._id} className='flex items-center gap-1.5 px-2 py-1 bg-white/[0.06] rounded-full text-xs text-gray-300'>
										<img src={f.profilePic} alt='' className='w-4 h-4 rounded-full' />
										{f.fullName}
									</span>
								))}
							</div>
						</div>

						{/* Action buttons */}
						<div className='px-4 pb-4 pt-2 flex gap-2'>
							<button
								onClick={() => setStep(1)}
								className='flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 transition-all'
							>
								Back
							</button>
							<button
								onClick={handleCreate}
								disabled={loading || !groupName.trim()}
								className='flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-all'
							>
								{loading ? "Creating..." : "Create Group"}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};
export default CreateGroupModal;
