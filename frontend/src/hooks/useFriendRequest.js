import { useState } from "react";
import toast from "react-hot-toast";

const useFriendRequest = () => {
	const [loading, setLoading] = useState(false);

	const sendRequest = async (userId) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/friends/request/${userId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			toast.success("Friend request sent!");
			return data;
		} catch (error) {
			toast.error(error.message);
			return null;
		} finally {
			setLoading(false);
		}
	};

	const acceptRequest = async (requestId) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/friends/accept/${requestId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
			});
			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			toast.success("Friend request accepted!");
			return data;
		} catch (error) {
			toast.error(error.message);
			return null;
		} finally {
			setLoading(false);
		}
	};

	const rejectRequest = async (requestId) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/friends/reject/${requestId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
			});
			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			toast.success("Friend request rejected");
			return data;
		} catch (error) {
			toast.error(error.message);
			return null;
		} finally {
			setLoading(false);
		}
	};

	return { loading, sendRequest, acceptRequest, rejectRequest };
};

export default useFriendRequest;
