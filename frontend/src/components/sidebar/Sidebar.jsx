import { useState, useEffect } from "react";
import { apiUrl } from "../../utils/apiConfig";
import Conversations from "./Conversations";
import LogoutButton from "./LogoutButton";
import SearchInput from "./SearchInput";
import FriendRequests from "./FriendRequests";
import CreateGroupModal from "./CreateGroupModal";
import GroupConversation from "./GroupConversation";
import useGetGroups from "../../hooks/useGetGroups";
import { useAuthContext } from "../../context/AuthContext";
import useConversation from "../../zustand/useConversation";
import { IoSettingsOutline, IoEllipsisVertical, IoPersonAdd, IoPeopleOutline } from "react-icons/io5";
import { BsPlusCircle } from "react-icons/bs";

const Sidebar = () => {
	const { authUser } = useAuthContext();
	const { setShowProfile, setIsSidebarOpen, pendingRequestCount, setPendingRequestCount } = useConversation();
	const [showMenu, setShowMenu] = useState(false);
	const [showRequests, setShowRequests] = useState(false);
	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [activeTab, setActiveTab] = useState("chats"); // "chats" | "groups"
	const { loading: groupsLoading, groups } = useGetGroups();

	// Fetch pending request count on mount
	useEffect(() => {
		const fetchCount = async () => {
			try {
				const res = await fetch(apiUrl("/api/friends/pending"));
				const data = await res.json();
				if (!data.error) {
					setPendingRequestCount(data.length);
				}
			} catch (err) {
				// silently fail
			}
		};
		fetchCount();
	}, [setPendingRequestCount]);

	const handleSettingsClick = () => {
		setShowProfile(true);
		setIsSidebarOpen(false);
		setShowMenu(false);
	};

	return (
		<div className='h-full flex flex-col border-r border-white/10 bg-white/[0.03]'>
			{/* Profile Header */}
			<div className='px-4 pt-5 pb-3'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='relative flex-shrink-0'>
						<img
							src={authUser?.profilePic}
							alt='Profile'
							className='w-11 h-11 rounded-full ring-2 ring-primary-400/40 object-cover'
						/>
						<span className='absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-gray-900'></span>
					</div>
					<div className='flex-1 min-w-0 text-left'>
						<h2 className='text-white font-semibold text-sm truncate'>{authUser?.fullName}</h2>
						<p className='text-green-400 text-xs'>Online</p>
					</div>

					{/* Friend Requests Button */}
					<button
						onClick={() => setShowRequests(true)}
						className='relative p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'
						title='Friend Requests'
					>
						<IoPersonAdd className='w-5 h-5' />
						{pendingRequestCount > 0 && (
							<span className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-gray-900 animate-bounce-in'>
								{pendingRequestCount > 99 ? '99+' : pendingRequestCount}
							</span>
						)}
					</button>

					{/* Mobile: 3-dot menu toggle */}
					<div className='relative md:hidden'>
						<button
							onClick={() => setShowMenu(!showMenu)}
							className='p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'
						>
							<IoEllipsisVertical className='w-5 h-5' />
						</button>

						{showMenu && (
							<>
								<div className='fixed inset-0 z-40' onClick={() => setShowMenu(false)}></div>
								<div className='absolute right-0 top-full mt-1 z-50 w-48 glass-card-strong rounded-xl shadow-2xl shadow-black/40 border border-white/10 py-1.5 animate-fade-in'>
									<button
										onClick={handleSettingsClick}
										className='flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all'
									>
										<IoSettingsOutline className='w-4 h-4' />
										Settings
									</button>
									<div className='h-px bg-white/10 mx-3 my-1'></div>
									<div className='px-1'>
										<LogoutButton />
									</div>
								</div>
							</>
						)}
					</div>
				</div>
				<SearchInput />
			</div>

			{/* Divider */}
			<div className='h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4'></div>

			{/* Tabs: Chats / Groups */}
			<div className='flex items-center gap-1 px-4 pt-2'>
				<button
					onClick={() => setActiveTab("chats")}
					className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
						activeTab === "chats"
							? 'bg-primary-500/20 text-primary-400 border border-primary-400/30'
							: 'text-gray-400 hover:text-white hover:bg-white/5'
					}`}
				>
					Chats
				</button>
				<button
					onClick={() => setActiveTab("groups")}
					className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
						activeTab === "groups"
							? 'bg-primary-500/20 text-primary-400 border border-primary-400/30'
							: 'text-gray-400 hover:text-white hover:bg-white/5'
					}`}
				>
					<IoPeopleOutline className='w-3.5 h-3.5' />
					Groups
				</button>
			</div>

			{/* Conversations or Groups */}
			<div className='flex-1 overflow-hidden'>
				{activeTab === "chats" ? (
					<Conversations />
				) : (
					<div className='py-2 px-2 flex flex-col overflow-y-auto h-full gap-0.5'>
						{/* Create Group Button */}
						<button
							onClick={() => setShowCreateGroup(true)}
							className='flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] border border-dashed border-white/10 hover:border-primary-400/30 transition-all mb-1'
						>
							<div className='w-11 h-11 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0'>
								<BsPlusCircle className='w-5 h-5 text-primary-400' />
							</div>
							<span className='text-sm text-gray-400 font-medium'>New Group</span>
						</button>

						{groups.map((group) => (
							<GroupConversation key={group._id} group={group} />
						))}

						{groupsLoading && (
							<div className='flex justify-center py-8'>
								<span className='loading loading-spinner loading-md text-primary-400'></span>
							</div>
						)}

						{!groupsLoading && groups.length === 0 && (
							<div className='flex flex-col items-center justify-center py-10 text-gray-400'>
								<IoPeopleOutline className='w-10 h-10 mb-2 text-gray-600' />
								<p className='text-sm font-medium'>No groups yet</p>
								<p className='text-xs text-gray-500 mt-1'>Create a group to start chatting</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Friend Requests Panel */}
			{showRequests && (
				<FriendRequests onClose={() => setShowRequests(false)} />
			)}

			{/* Create Group Modal */}
			{showCreateGroup && (
				<CreateGroupModal onClose={() => setShowCreateGroup(false)} />
			)}

			{/* Bottom Bar: Settings + Logout (desktop only) */}
			<div className='hidden md:flex border-t border-white/10 px-4 py-3 items-center gap-2'>
				<button
					onClick={handleSettingsClick}
					className='flex items-center gap-3 flex-1 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition-all duration-200 group'
				>
					<IoSettingsOutline className='w-5 h-5 group-hover:rotate-90 transition-transform duration-300' />
					<span className='text-sm font-medium'>Settings</span>
				</button>
				<LogoutButton />
			</div>
		</div>
	);
};
export default Sidebar;
