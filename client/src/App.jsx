import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import SignUp from "./pages/signup/SignUp";
import { Toaster } from "react-hot-toast";
import { useAuthContext } from "./context/AuthContext";

function App() {
	const { authUser } = useAuthContext();
	return (
		<div className='h-screen h-[100dvh] w-full flex items-center justify-center p-0 sm:p-3'>
			<Routes>
				<Route path='/' element={authUser ? <Home /> : <Navigate to={"/login"} />} />
				<Route path='/login' element={authUser ? <Navigate to='/' /> : <Login />} />
				<Route path='/signup' element={authUser ? <Navigate to='/' /> : <SignUp />} />
			</Routes>
			<Toaster
				position='top-center'
				toastOptions={{
					style: {
						background: 'rgba(30, 30, 60, 0.9)',
						color: '#fff',
						backdropFilter: 'blur(10px)',
						border: '1px solid rgba(255,255,255,0.1)',
						borderRadius: '12px',
						fontSize: '14px',
					},
				}}
			/>
		</div>
	);
}

export default App;
