import { useState } from "react";
import toast from "react-hot-toast";
import { apiUrl } from "../utils/apiConfig";

const useSearchUsers = () => {
	const [loading, setLoading] = useState(false);
	const [searchResults, setSearchResults] = useState([]);

	const searchUsers = async (query) => {
		if (!query || query.trim().length < 2) {
			setSearchResults([]);
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(apiUrl(`/api/friends/search?query=${encodeURIComponent(query.trim())}`));
			const data = await res.json();
			if (data.error) {
				throw new Error(data.error);
			}
			setSearchResults(data);
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	const clearResults = () => setSearchResults([]);

	return { loading, searchResults, searchUsers, clearResults };
};

export default useSearchUsers;
