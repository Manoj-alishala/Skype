import MessageContainer from "../../components/messages/MessageContainer";
import Sidebar from "../../components/sidebar/Sidebar";
import Profile from "../profile/Profile";
import CallModal from "../../components/calls/CallModal";
import useConversation from "../../zustand/useConversation";
import useListenMessages from "../../hooks/useListenMessages";

const Home = () => {
	const { isSidebarOpen, showProfile, setShowProfile, setIsSidebarOpen, activeCall, incomingCall } = useConversation();

	// Listen for new messages globally so unread badges work even when chat is not visible
	useListenMessages();

	const handleProfileBack = () => {
		setShowProfile(false);
		setIsSidebarOpen(true);
	};

	return (
		<div className='flex w-full h-full rounded-none sm:rounded-2xl overflow-hidden glass-card-strong shadow-2xl shadow-black/30 animate-fade-in'>
			{/* Call Modal - renders over everything when active */}
			{(activeCall || incomingCall) && <CallModal />}

			{/* Sidebar: full width on mobile when open, fixed width on desktop */}
			<div className={`${
				isSidebarOpen && !showProfile ? 'w-full' : 'hidden'
			} md:block md:w-[340px] md:min-w-[340px] flex-shrink-0 transition-all duration-300`}>
				<Sidebar />
			</div>

			{/* Profile: shows in main area on mobile, as overlay on desktop */}
			{showProfile && (
				<div className={`w-full md:w-full flex flex-col transition-all duration-300`}>
					<Profile onBack={handleProfileBack} />
				</div>
			)}

			{/* Messages: full width on mobile when sidebar closed, flex on desktop */}
			{!showProfile && (
				<div className={`${
					isSidebarOpen ? 'hidden' : 'w-full'
				} md:flex md:w-full flex-col transition-all duration-300`}>
					<MessageContainer />
				</div>
			)}
		</div>
	);
};
export default Home;
