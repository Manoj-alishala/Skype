import { useState, useRef } from "react";
import { useAuthContext } from "../../context/AuthContext";
import useUpdateProfile from "../../hooks/useUpdateProfile";
import useChangePassword from "../../hooks/useChangePassword";
import useConversation from "../../zustand/useConversation";
import { IoArrowBack, IoCamera } from "react-icons/io5";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { BiEdit, BiUser, BiLock, BiBell } from "react-icons/bi";

const TABS = [
	{ id: "personalize", label: "Personalize", icon: BiUser },
	{ id: "password", label: "Password", icon: BiLock },
	{ id: "notifications", label: "Notifications", icon: BiBell },
];

const Profile = ({ onBack }) => {
	const { authUser } = useAuthContext();
	const { loading: profileLoading, updateProfile } = useUpdateProfile();
	const { loading: passwordLoading, changePassword } = useChangePassword();
	const { soundEnabled, setSoundEnabled } = useConversation();

	const [activeTab, setActiveTab] = useState("personalize");

	// Profile state
	const [fullName, setFullName] = useState(authUser?.fullName || "");
	const [bio, setBio] = useState(authUser?.bio || "");
	const [previewPic, setPreviewPic] = useState(null);
	const [imageFile, setImageFile] = useState(null);
	const fileInputRef = useRef(null);
	const [isEditing, setIsEditing] = useState(false);

	// Password state
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [showCurrentPw, setShowCurrentPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [showConfirmPw, setShowConfirmPw] = useState(false);

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			alert("Image must be less than 2MB");
			return;
		}
		const reader = new FileReader();
		reader.onloadend = () => {
			setPreviewPic(reader.result);
			setImageFile(reader.result);
			setIsEditing(true);
		};
		reader.readAsDataURL(file);
	};

	const handleSaveProfile = async () => {
		const updates = {};
		if (fullName !== authUser?.fullName) updates.fullName = fullName;
		if (bio !== (authUser?.bio || "")) updates.bio = bio;
		if (imageFile) updates.profilePic = imageFile;
		if (Object.keys(updates).length === 0) {
			setIsEditing(false);
			return;
		}
		const result = await updateProfile(updates);
		if (result) {
			setIsEditing(false);
			setImageFile(null);
			setPreviewPic(null);
		}
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setFullName(authUser?.fullName || "");
		setBio(authUser?.bio || "");
		setPreviewPic(null);
		setImageFile(null);
	};

	const handleChangePassword = async () => {
		const success = await changePassword({ currentPassword, newPassword, confirmNewPassword });
		if (success) {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmNewPassword("");
		}
	};

	const displayPic = previewPic || authUser?.profilePic;

	return (
		<div className='h-full flex flex-col bg-white/[0.02] animate-fade-in'>
			{/* Header */}
			<div className='flex items-center gap-3 px-4 py-4 border-b border-white/10 flex-shrink-0'>
				<button
					onClick={onBack}
					className='p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all'
				>
					<IoArrowBack className='w-5 h-5' />
				</button>
				<h2 className='text-white font-semibold text-lg'>Settings</h2>
			</div>

			{/* Body: Left tabs + Right content */}
			<div className='flex-1 flex overflow-hidden'>
				{/* Left Tab Nav */}
				<div className='w-14 sm:w-48 flex-shrink-0 border-r border-white/10 bg-white/[0.02] overflow-y-auto'>
					{/* Profile mini-card at top of sidebar */}
					<div className='hidden sm:flex flex-col items-center py-5 px-3 border-b border-white/10'>
						<img
							src={displayPic}
							alt='Profile'
							className='w-16 h-16 rounded-full object-cover ring-2 ring-primary-400/30'
						/>
						<p className='text-white text-sm font-semibold mt-2 truncate w-full text-center'>{authUser?.fullName}</p>
						<p className='text-gray-500 text-xs'>@{authUser?.username}</p>
					</div>

					<nav className='flex flex-col py-2'>
						{TABS.map((tab) => {
							const Icon = tab.icon;
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={`flex items-center gap-3 px-3 sm:px-4 py-3.5 text-left transition-all duration-200 relative
										${isActive
											? "text-primary-400 bg-primary-500/10"
											: "text-gray-400 hover:text-white hover:bg-white/[0.04]"
										}`}
								>
									{isActive && (
										<span className='absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary-400 rounded-r-full'></span>
									)}
									<Icon className='w-5 h-5 flex-shrink-0 mx-auto sm:mx-0' />
									<span className='hidden sm:block text-sm font-medium'>{tab.label}</span>
								</button>
							);
						})}
					</nav>

					{/* Member since - desktop */}
					<div className='hidden sm:block mt-auto px-4 py-4 border-t border-white/10'>
						<p className='text-[10px] text-gray-600 text-center'>
							Member since {new Date(authUser?.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
						</p>
					</div>
				</div>

				{/* Right Content */}
				<div className='flex-1 overflow-y-auto'>
					{activeTab === "personalize" && (
						<PersonalizeTab
							authUser={authUser}
							displayPic={displayPic}
							isEditing={isEditing}
							setIsEditing={setIsEditing}
							fullName={fullName}
							setFullName={setFullName}
							bio={bio}
							setBio={setBio}
							fileInputRef={fileInputRef}
							handleImageChange={handleImageChange}
							handleSaveProfile={handleSaveProfile}
							handleCancelEdit={handleCancelEdit}
							profileLoading={profileLoading}
						/>
					)}

					{activeTab === "password" && (
						<PasswordTab
							currentPassword={currentPassword}
							setCurrentPassword={setCurrentPassword}
							newPassword={newPassword}
							setNewPassword={setNewPassword}
							confirmNewPassword={confirmNewPassword}
							setConfirmNewPassword={setConfirmNewPassword}
							showCurrentPw={showCurrentPw}
							setShowCurrentPw={setShowCurrentPw}
							showNewPw={showNewPw}
							setShowNewPw={setShowNewPw}
							showConfirmPw={showConfirmPw}
							setShowConfirmPw={setShowConfirmPw}
							handleChangePassword={handleChangePassword}
							passwordLoading={passwordLoading}
						/>
					)}

					{activeTab === "notifications" && (
						<NotificationsTab
							soundEnabled={soundEnabled}
							setSoundEnabled={setSoundEnabled}
						/>
					)}
				</div>
			</div>
		</div>
	);
};
export default Profile;

/* ─── Personalize Tab ─── */
const PersonalizeTab = ({
	authUser, displayPic, isEditing, setIsEditing,
	fullName, setFullName, bio, setBio,
	fileInputRef, handleImageChange, handleSaveProfile, handleCancelEdit, profileLoading,
}) => (
	<div className='p-5 sm:p-6 animate-fade-in'>
		{/* Section Title + Edit/Save buttons */}
		<div className='flex items-center justify-between mb-6'>
			<div>
				<h3 className='text-white font-semibold text-base'>Personalize</h3>
				<p className='text-gray-500 text-xs mt-0.5'>Customize your profile info and avatar</p>
			</div>
			{!isEditing ? (
				<button
					onClick={() => setIsEditing(true)}
					className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-primary-400 hover:bg-white/10 transition-all'
				>
					<BiEdit className='w-4 h-4' />
					<span className='hidden sm:inline'>Edit</span>
				</button>
			) : (
				<div className='flex gap-2'>
					<button
						onClick={handleCancelEdit}
						className='px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-white/10 transition-all'
					>
						Cancel
					</button>
					<button
						onClick={handleSaveProfile}
						disabled={profileLoading}
						className='px-4 py-1.5 rounded-lg text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white transition-all disabled:opacity-50'
					>
						{profileLoading ? <span className='loading loading-spinner loading-xs'></span> : "Save"}
					</button>
				</div>
			)}
		</div>

		{/* Avatar */}
		<div className='flex flex-col items-center mb-6'>
			<div className='relative group'>
				<img
					src={displayPic}
					alt='Profile'
					className='w-24 h-24 rounded-full object-cover ring-4 ring-primary-400/30 shadow-xl'
				/>
				{isEditing && (
					<button
						onClick={() => fileInputRef.current?.click()}
						className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
					>
						<IoCamera className='w-7 h-7 text-white' />
					</button>
				)}
				<input
					type='file'
					ref={fileInputRef}
					accept='image/*'
					onChange={handleImageChange}
					className='hidden'
				/>
				<span className='absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full ring-2 ring-gray-900'></span>
			</div>
			<p className='text-gray-400 text-sm mt-2'>@{authUser?.username}</p>
			<p className='text-gray-600 text-xs mt-0.5'>
				{authUser?.gender === "male" ? "👨" : "👩"} {authUser?.gender?.charAt(0).toUpperCase() + authUser?.gender?.slice(1)}
			</p>
		</div>

		{/* Fields */}
		<div className='space-y-5 max-w-md mx-auto'>
			{/* Full Name */}
			<div>
				<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'>Full Name</label>
				{isEditing ? (
					<input
						type='text'
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						className='w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
						placeholder='Your full name'
					/>
				) : (
					<p className='text-white text-sm px-1 py-2'>{authUser?.fullName}</p>
				)}
			</div>

			{/* Bio */}
			<div>
				<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'>
					Bio
					{isEditing && <span className='text-gray-600 normal-case ml-2'>({bio.length}/150)</span>}
				</label>
				{isEditing ? (
					<textarea
						value={bio}
						onChange={(e) => setBio(e.target.value.slice(0, 150))}
						className='w-full px-4 py-2.5 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all resize-none'
						rows={3}
						placeholder='Tell people about yourself...'
					/>
				) : (
					<p className='text-gray-300 text-sm px-1 py-2'>
						{authUser?.bio || <span className='text-gray-600 italic'>No bio yet</span>}
					</p>
				)}
			</div>
		</div>
	</div>
);

/* ─── Password Tab ─── */
const PasswordTab = ({
	currentPassword, setCurrentPassword,
	newPassword, setNewPassword,
	confirmNewPassword, setConfirmNewPassword,
	showCurrentPw, setShowCurrentPw,
	showNewPw, setShowNewPw,
	showConfirmPw, setShowConfirmPw,
	handleChangePassword, passwordLoading,
}) => (
	<div className='p-5 sm:p-6 animate-fade-in'>
		<div className='mb-6'>
			<h3 className='text-white font-semibold text-base'>Manage Password</h3>
			<p className='text-gray-500 text-xs mt-0.5'>Update your account password</p>
		</div>

		<div className='space-y-4 max-w-md mx-auto'>
			{/* Current Password */}
			<div>
				<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'>Current Password</label>
				<div className='relative'>
					<input
						type={showCurrentPw ? 'text' : 'password'}
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						className='w-full px-4 py-2.5 pr-10 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
						placeholder='Enter current password'
					/>
					<button
						type='button'
						onClick={() => setShowCurrentPw(!showCurrentPw)}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300'
					>
						{showCurrentPw ? <HiOutlineEyeOff className='w-4 h-4' /> : <HiOutlineEye className='w-4 h-4' />}
					</button>
				</div>
			</div>

			{/* New Password */}
			<div>
				<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'>New Password</label>
				<div className='relative'>
					<input
						type={showNewPw ? 'text' : 'password'}
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						className='w-full px-4 py-2.5 pr-10 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
						placeholder='Enter new password'
					/>
					<button
						type='button'
						onClick={() => setShowNewPw(!showNewPw)}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300'
					>
						{showNewPw ? <HiOutlineEyeOff className='w-4 h-4' /> : <HiOutlineEye className='w-4 h-4' />}
					</button>
				</div>
			</div>

			{/* Confirm New Password */}
			<div>
				<label className='block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'>Confirm New Password</label>
				<div className='relative'>
					<input
						type={showConfirmPw ? 'text' : 'password'}
						value={confirmNewPassword}
						onChange={(e) => setConfirmNewPassword(e.target.value)}
						className='w-full px-4 py-2.5 pr-10 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
						placeholder='Confirm new password'
					/>
					<button
						type='button'
						onClick={() => setShowConfirmPw(!showConfirmPw)}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300'
					>
						{showConfirmPw ? <HiOutlineEyeOff className='w-4 h-4' /> : <HiOutlineEye className='w-4 h-4' />}
					</button>
				</div>
			</div>

			{/* Hint */}
			<p className='text-xs text-gray-600'>Password must be at least 6 characters.</p>

			{/* Submit */}
			<button
				onClick={handleChangePassword}
				disabled={passwordLoading || !currentPassword || !newPassword || !confirmNewPassword}
				className='w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium text-sm shadow-lg shadow-primary-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
			>
				{passwordLoading ? (
					<span className='loading loading-spinner loading-sm'></span>
				) : (
					"Update Password"
				)}
			</button>
		</div>
	</div>
);

/* ─── Notifications Tab ─── */
const NotificationsTab = ({ soundEnabled, setSoundEnabled }) => (
	<div className='p-5 sm:p-6 animate-fade-in'>
		<div className='mb-6'>
			<h3 className='text-white font-semibold text-base'>Notifications</h3>
			<p className='text-gray-500 text-xs mt-0.5'>Manage your notification preferences</p>
		</div>

		<div className='space-y-4 max-w-md mx-auto'>
			{/* Sound Toggle */}
			<div className='flex items-center justify-between p-4 rounded-xl glass-card'>
				<div className='flex items-center gap-3'>
					<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${soundEnabled ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-gray-500'} transition-colors`}>
						<span className='text-xl'>{soundEnabled ? '🔔' : '🔕'}</span>
					</div>
					<div>
						<p className='text-white text-sm font-medium'>Message Sound</p>
						<p className='text-gray-500 text-xs mt-0.5'>Play a sound when you receive a new message</p>
					</div>
				</div>
				<button
					onClick={() => setSoundEnabled(!soundEnabled)}
					className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
						soundEnabled
							? 'bg-primary-500 shadow-lg shadow-primary-500/30'
							: 'bg-white/10'
					}`}
				>
					<span
						className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
							soundEnabled ? 'left-[22px]' : 'left-0.5'
						}`}
					></span>
				</button>
			</div>

			{/* Status info */}
			<div className='flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5'>
				<span className='text-xs text-gray-500'>
					{soundEnabled
						? '✅ You will hear a notification sound for new messages.'
						: '🔇 Notification sounds are turned off. You will still see unread badges.'}
				</span>
			</div>
		</div>
	</div>
);
