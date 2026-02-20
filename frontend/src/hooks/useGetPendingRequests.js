import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const useGetPendingRequests = () => {
	const [loading, setLoading] = useState(false);
	const [pendingRequests, setPendingRequests] = useState([]);

	const fetchPendingRequests = async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/friends/pending");
			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			setPendingRequests(data);
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPendingRequests();
	}, []);

	return { loading, pendingRequests, setPendingRequests, refetch: fetchPendingRequests };
};

export default useGetPendingRequests;
