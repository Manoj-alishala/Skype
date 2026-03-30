import { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";
import { apiUrl } from "../utils/apiConfig";

const useGetGroups = () => {
	const [loading, setLoading] = useState(false);
	const { groups, setGroups, groupsRefreshTrigger } = useConversation();

	useEffect(() => {
		const getGroups = async () => {
			setLoading(true);
			try {
				const res = await fetch(apiUrl("/api/groups"));
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				setGroups(data);
			} catch (error) {
				toast.error(error.message);
			} finally {
				setLoading(false);
			}
		};

		getGroups();
	}, [setGroups, groupsRefreshTrigger]);

	return { loading, groups };
};
export default useGetGroups;
