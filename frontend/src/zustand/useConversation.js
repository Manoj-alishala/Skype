import { create } from "zustand";

const useConversation = create((set) => ({
	selectedConversation: null,
	setSelectedConversation: (selectedConversation) => set({ selectedConversation }),
	messages: [],
	setMessages: (messages) => set((state) => ({
		messages: typeof messages === "function" ? messages(state.messages) : messages,
	})),
	// Unread messages: { [senderId]: count }
	unreadMessages: {},
	addUnread: (senderId) => set((state) => ({
		unreadMessages: {
			...state.unreadMessages,
			[senderId]: (state.unreadMessages[senderId] || 0) + 1,
		},
	})),
	clearUnread: (senderId) => set((state) => {
		const updated = { ...state.unreadMessages };
		delete updated[senderId];
		return { unreadMessages: updated };
	}),
	// Mobile sidebar visibility
	isSidebarOpen: true,
	setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
	// Profile panel
	showProfile: false,
	setShowProfile: (showProfile) => set({ showProfile }),
	// Notification sound
	soundEnabled: JSON.parse(localStorage.getItem("chat-sound-enabled") ?? "true"),
	setSoundEnabled: (enabled) => {
		localStorage.setItem("chat-sound-enabled", JSON.stringify(enabled));
		set({ soundEnabled: enabled });
	},
	// Typing indicators: { [userId]: boolean }
	typingUsers: {},
	setUserTyping: (userId, isTyping) => set((state) => ({
		typingUsers: { ...state.typingUsers, [userId]: isTyping },
	})),
	// Friend requests
	pendingRequestCount: 0,
	setPendingRequestCount: (count) => set({ pendingRequestCount: count }),
	incrementPendingCount: () => set((state) => ({ pendingRequestCount: state.pendingRequestCount + 1 })),
	decrementPendingCount: () => set((state) => ({ pendingRequestCount: Math.max(0, state.pendingRequestCount - 1) })),
	// Trigger to refresh friends list
	friendsRefreshTrigger: 0,
	triggerFriendsRefresh: () => set((state) => ({ friendsRefreshTrigger: state.friendsRefreshTrigger + 1 })),
	// Groups
	groups: [],
	setGroups: (groups) => set({ groups }),
	groupsRefreshTrigger: 0,
	triggerGroupsRefresh: () => set((state) => ({ groupsRefreshTrigger: state.groupsRefreshTrigger + 1 })),
	// Active call
	activeCall: null,
	setActiveCall: (call) => set({ activeCall: call }),
	incomingCall: null,
	setIncomingCall: (call) => set({ incomingCall: call }),
}));

export default useConversation;
