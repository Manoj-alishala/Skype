import { useState } from "react";
import { BiLogOut } from "react-icons/bi";
import useLogout from "../../hooks/useLogout";

const LogoutButton = () => {
	const { loading, logout } = useLogout();
	const [showConfirm, setShowConfirm] = useState(false);

	const handleLogout = async () => {
		setShowConfirm(false);
		await logout();
	};

	return (
		<>
			{!loading ? (
				<button
					onClick={() => setShowConfirm(true)}
					className='flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all duration-200 group'
					title='Logout'
				>
					<BiLogOut className='w-5 h-5 group-hover:scale-110 transition-transform' />
					<span className='text-sm font-medium'>Logout</span>
				</button>
			) : (
				<span className='loading loading-spinner loading-sm text-gray-400'></span>
			)}

			{/* Confirmation Modal */}
			{showConfirm && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in' onClick={() => setShowConfirm(false)}>
					{/* Backdrop */}
					<div className='absolute inset-0 bg-black/60 backdrop-blur-sm'></div>

					{/* Modal */}
					<div
						className='relative glass-card-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-black/40 animate-slide-up'
						onClick={(e) => e.stopPropagation()}
					>
						<div className='flex flex-col items-center text-center'>
							<div className='w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4'>
								<BiLogOut className='w-7 h-7 text-red-400' />
							</div>
							<h3 className='text-white font-semibold text-lg mb-1'>Logout</h3>
							<p className='text-gray-400 text-sm mb-6'>Are you sure you want to logout from ChatApp?</p>

							<div className='flex gap-3 w-full'>
								<button
									onClick={() => setShowConfirm(false)}
									className='flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 border border-white/10 transition-all'
								>
									Cancel
								</button>
								<button
									onClick={handleLogout}
									className='flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all'
								>
									Logout
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
export default LogoutButton;
