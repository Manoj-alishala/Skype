import { useState } from "react";
import toast from "react-hot-toast";
import { useAuthContext } from "../context/AuthContext";

const useUpdateProfile = () => {
	const [loading, setLoading] = useState(false);
	const { setAuthUser } = useAuthContext();

	const updateProfile = async ({ fullName, bio, profilePic }) => {
		setLoading(true);
		try {
			const res = await fetch("/api/users/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fullName, bio, profilePic }),
			});

			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}

			// Update local storage and context
			localStorage.setItem("chat-user", JSON.stringify(data));
			setAuthUser(data);
			toast.success("Profile updated successfully");
			return data;
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	return { loading, updateProfile };
};
export default useUpdateProfile;
