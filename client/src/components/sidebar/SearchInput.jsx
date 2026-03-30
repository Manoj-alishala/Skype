import { useState, useRef, useEffect } from "react";
import { IoSearchSharp, IoClose, IoPersonAdd, IoCheckmark, IoTime } from "react-icons/io5";
import useSearchUsers from "../../hooks/useSearchUsers";
import useFriendRequest from "../../hooks/useFriendRequest";
import useConversation from "../../zustand/useConversation";

const SearchInput = () => {
	const [search, setSearch] = useState("");
	const { loading, searchResults, searchUsers, clearResults } = useSearchUsers();
	const { loading: requestLoading, sendRequest } = useFriendRequest();
	const { setSelectedConversation, setIsSidebarOpen } = useConversation();
	const [showDropdown, setShowDropdown] = useState(false);
	const [localStatuses, setLocalStatuses] = useState({});
	const dropdownRef = useRef(null);
	const debounceRef = useRef(null);

	// Debounced search
	const handleChange = (e) => {
		const value = e.target.value;
		setSearch(value);

		if (debounceRef.current) clearTimeout(debounceRef.current);

		if (value.trim().length >= 2) {
			debounceRef.current = setTimeout(() => {
				searchUsers(value);
				setShowDropdown(true);
			}, 300);
		} else {
			clearResults();
			setShowDropdown(false);
		}
	};

	const handleClear = () => {
		setSearch("");
		clearResults();
		setShowDropdown(false);
		setLocalStatuses({});
	};

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSendRequest = async (userId) => {
		const result = await sendRequest(userId);
		if (result) {
			setLocalStatuses((prev) => ({ ...prev, [userId]: "request_sent" }));
		}
	};

	const handleSelectFriend = (user) => {
		// If already friends, open conversation
		setSelectedConversation(user);
		setIsSidebarOpen(false);
		handleClear();
	};

	return (
		<div className='relative' ref={dropdownRef}>
			<div className='relative flex items-center'>
				<IoSearchSharp className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
				<input
					type='text'
					placeholder='Search username to add…'
					className='w-full pl-10 pr-9 py-2.5 rounded-xl glass-input text-white text-sm placeholder-gray-400 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
					value={search}
					onChange={handleChange}
					onFocus={() => search.trim().length >= 2 && searchResults.length > 0 && setShowDropdown(true)}
				/>
				{search && (
					<button
						onClick={handleClear}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors'
					>
						<IoClose className='w-4 h-4' />
					</button>
				)}
			</div>

			{/* Search Results Dropdown */}
			{showDropdown && (
				<div className='absolute top-full left-0 right-0 mt-2 z-50 glass-card-strong rounded-xl shadow-2xl shadow-black/40 border border-white/10 max-h-64 overflow-y-auto animate-fade-in'>
					{loading ? (
						<div className='flex justify-center py-4'>
							<span className='loading loading-spinner loading-sm text-primary-400'></span>
						</div>
					) : searchResults.length === 0 ? (
						<div className='py-4 px-4 text-center text-gray-400 text-sm'>
							No users found
						</div>
					) : (
						searchResults.map((user) => {
							const status = localStatuses[user._id] || user.friendshipStatus;
							return (
								<div
									key={user._id}
									className='flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-all cursor-default'
								>
									<img
										src={user.profilePic}
										alt={user.fullName}
										className='w-10 h-10 rounded-full object-cover ring-2 ring-white/10'
									/>
									<div className='flex-1 min-w-0'>
										<p className='text-white text-sm font-medium truncate'>{user.fullName}</p>
										<p className='text-gray-400 text-xs truncate'>@{user.username}</p>
									</div>

									{status === "friends" ? (
										<button
											onClick={() => handleSelectFriend(user)}
											className='px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-400 border border-green-400/30 hover:bg-green-500/30 transition-all'
										>
											Message
										</button>
									) : status === "request_sent" ? (
										<span className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'>
											<IoTime className='w-3 h-3' />
											Pending
										</span>
									) : status === "request_received" ? (
										<span className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30'>
											<IoCheckmark className='w-3 h-3' />
											Accept in requests
										</span>
									) : (
										<button
											onClick={() => handleSendRequest(user._id)}
											disabled={requestLoading}
											className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500/20 text-primary-400 border border-primary-400/30 hover:bg-primary-500/30 transition-all disabled:opacity-50'
										>
											<IoPersonAdd className='w-3 h-3' />
											Add
										</button>
									)}
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
};
export default SearchInput;
