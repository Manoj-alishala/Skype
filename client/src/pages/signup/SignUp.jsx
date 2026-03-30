import { Link } from "react-router-dom";
import GenderCheckbox from "./GenderCheckbox";
import { useState, useRef } from "react";
import useSignup from "../../hooks/useSignup";
import { BiMessageRoundedDots } from "react-icons/bi";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { HiCamera } from "react-icons/hi2";

const SignUp = () => {
	const [inputs, setInputs] = useState({
		fullName: "",
		username: "",
		password: "",
		confirmPassword: "",
		gender: "",
	});
	const [profilePic, setProfilePic] = useState(null);
	const [profilePicPreview, setProfilePicPreview] = useState(null);
	const fileInputRef = useRef(null);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const { loading, signup } = useSignup();

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			alert("Image must be less than 2MB");
			return;
		}
		const reader = new FileReader();
		reader.onloadend = () => {
			setProfilePic(reader.result);
			setProfilePicPreview(reader.result);
		};
		reader.readAsDataURL(file);
	};

	const handleCheckboxChange = (gender) => {
		setInputs({ ...inputs, gender });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		await signup({ ...inputs, profilePic });
	};

	return (
		<div className='flex items-center justify-center w-full min-h-screen px-4 py-8 animate-fade-in'>
			<div className='w-full max-w-md'>
				{/* Logo */}
				<div className='flex flex-col items-center mb-6'>
					<div className='w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-3 glow-blue'>
						<BiMessageRoundedDots className='text-2xl text-primary-400' />
					</div>
					<h1 className='text-2xl sm:text-3xl font-bold text-white'>
						Create Account
					</h1>
					<p className='text-gray-400 text-sm mt-1'>Join <span className='text-gradient font-semibold'>ChatApp</span> today</p>
				</div>

				{/* Card */}
				<div className='glass-card-strong rounded-2xl p-6 sm:p-8 animate-slide-up'>
					<form onSubmit={handleSubmit} className='space-y-4'>
						{/* Profile Picture */}
						<div className='flex flex-col items-center mb-2'>
							<div
								className='relative w-20 h-20 rounded-full cursor-pointer group'
								onClick={() => fileInputRef.current?.click()}
							>
								{profilePicPreview ? (
									<img
										src={profilePicPreview}
										alt='Profile preview'
										className='w-20 h-20 rounded-full object-cover ring-2 ring-primary-400/50'
									/>
								) : (
									<div className='w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-primary-400/50 transition-all'>
										<HiCamera className='w-7 h-7 text-gray-400 group-hover:text-primary-400 transition-colors' />
									</div>
								)}
								<div className='absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
									<HiCamera className='w-6 h-6 text-white' />
								</div>
								<input
									type='file'
									ref={fileInputRef}
									accept='image/*'
									className='hidden'
									onChange={handleImageChange}
								/>
							</div>
							<p className='text-xs text-gray-400 mt-2'>Tap to add photo <span className='text-gray-500'>(optional)</span></p>
						</div>

						{/* Full Name */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Full Name</label>
							<input
								type='text'
								placeholder='John Doe'
								className='w-full px-4 py-3 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
								value={inputs.fullName}
								onChange={(e) => setInputs({ ...inputs, fullName: e.target.value })}
							/>
						</div>

						{/* Username */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Username</label>
							<input
								type='text'
								placeholder='johndoe'
								className='w-full px-4 py-3 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
								value={inputs.username}
								onChange={(e) => setInputs({ ...inputs, username: e.target.value })}
							/>
						</div>

						{/* Password */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Password</label>
							<div className='relative'>
								<input
									type={showPassword ? 'text' : 'password'}
									placeholder='Create a password'
									className='w-full px-4 py-3 pr-11 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
									value={inputs.password}
									onChange={(e) => setInputs({ ...inputs, password: e.target.value })}
								/>
								<button
									type='button'
									onClick={() => setShowPassword(!showPassword)}
									className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors'
								>
									{showPassword ? <HiOutlineEyeOff className='w-5 h-5' /> : <HiOutlineEye className='w-5 h-5' />}
								</button>
							</div>
						</div>

						{/* Confirm Password */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Confirm Password</label>
							<div className='relative'>
								<input
									type={showConfirmPassword ? 'text' : 'password'}
									placeholder='Confirm your password'
									className='w-full px-4 py-3 pr-11 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
									value={inputs.confirmPassword}
									onChange={(e) => setInputs({ ...inputs, confirmPassword: e.target.value })}
								/>
								<button
									type='button'
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors'
								>
									{showConfirmPassword ? <HiOutlineEyeOff className='w-5 h-5' /> : <HiOutlineEye className='w-5 h-5' />}
								</button>
							</div>
						</div>

						{/* Gender */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Gender</label>
							<GenderCheckbox onCheckboxChange={handleCheckboxChange} selectedGender={inputs.gender} />
						</div>

						{/* Submit */}
						<button
							type='submit'
							disabled={loading}
							className='w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2'
						>
							{loading ? (
								<span className='loading loading-spinner loading-sm'></span>
							) : (
								"Create Account"
							)}
						</button>
					</form>

					{/* Divider */}
					<div className='flex items-center gap-3 my-5'>
						<div className='h-px flex-1 bg-white/10'></div>
						<span className='text-xs text-gray-500'>OR</span>
						<div className='h-px flex-1 bg-white/10'></div>
					</div>

					{/* Login link */}
					<p className='text-center text-sm text-gray-400'>
						Already have an account?{" "}
						<Link to='/login' className='text-primary-400 hover:text-primary-300 font-medium transition-colors'>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};
export default SignUp;
