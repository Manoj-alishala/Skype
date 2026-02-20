import { useState } from "react";
import toast from "react-hot-toast";

const useChangePassword = () => {
	const [loading, setLoading] = useState(false);

	const changePassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
		if (!currentPassword || !newPassword || !confirmNewPassword) {
			toast.error("Please fill in all fields");
			return false;
		}
		if (newPassword !== confirmNewPassword) {
			toast.error("New passwords don't match");
			return false;
		}
		if (newPassword.length < 6) {
			toast.error("Password must be at least 6 characters");
			return false;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/users/change-password", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
			});

			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}

			toast.success("Password changed successfully");
			return true;
		} catch (error) {
			toast.error(error.message);
			return false;
		} finally {
			setLoading(false);
		}
	};

	return { loading, changePassword };
};
export default useChangePassword;
