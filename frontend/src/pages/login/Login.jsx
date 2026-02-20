import { useState } from "react";
import { Link } from "react-router-dom";
import useLogin from "../../hooks/useLogin";
import { BiMessageRoundedDots } from "react-icons/bi";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

const Login = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const { loading, login } = useLogin();

	const handleSubmit = async (e) => {
		e.preventDefault();
		await login(username, password);
	};

	return (
		<div className='flex items-center justify-center w-full min-h-screen px-4 py-8 animate-fade-in'>
			<div className='w-full max-w-md'>
				{/* Logo */}
				<div className='flex flex-col items-center mb-8'>
					<div className='w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-4 glow-blue'>
						<BiMessageRoundedDots className='text-3xl text-primary-400' />
					</div>
					<h1 className='text-2xl sm:text-3xl font-bold text-white'>
						Welcome back
					</h1>
					<p className='text-gray-400 text-sm mt-1'>Sign in to continue to <span className='text-gradient font-semibold'>ChatApp</span></p>
				</div>

				{/* Card */}
				<div className='glass-card-strong rounded-2xl p-6 sm:p-8 animate-slide-up'>
					<form onSubmit={handleSubmit} className='space-y-5'>
						{/* Username */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Username</label>
							<input
								type='text'
								placeholder='Enter your username'
								className='w-full px-4 py-3 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>

						{/* Password */}
						<div>
							<label className='block text-sm font-medium text-gray-300 mb-1.5'>Password</label>
							<div className='relative'>
								<input
									type={showPassword ? 'text' : 'password'}
									placeholder='Enter your password'
									className='w-full px-4 py-3 pr-11 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-400/50 focus:ring-1 focus:ring-primary-400/20 transition-all'
									value={password}
									onChange={(e) => setPassword(e.target.value)}
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

						{/* Submit */}
						<button
							type='submit'
							disabled={loading}
							className='w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold text-sm shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
						>
							{loading ? (
								<span className='loading loading-spinner loading-sm'></span>
							) : (
								"Sign In"
							)}
						</button>
					</form>

					{/* Divider */}
					<div className='flex items-center gap-3 my-6'>
						<div className='h-px flex-1 bg-white/10'></div>
						<span className='text-xs text-gray-500'>OR</span>
						<div className='h-px flex-1 bg-white/10'></div>
					</div>

					{/* Sign up link */}
					<p className='text-center text-sm text-gray-400'>
						{"Don't"} have an account?{" "}
						<Link to='/signup' className='text-primary-400 hover:text-primary-300 font-medium transition-colors'>
							Create one
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};
export default Login;
// 				</form>
// 			</div>
// 		</div>
// 	);
// };
// export default Login;
