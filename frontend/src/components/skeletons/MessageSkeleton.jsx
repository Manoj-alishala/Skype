const MessageSkeleton = () => {
	return (
		<div className='space-y-4 py-2 animate-pulse'>
			{/* Incoming message skeleton */}
			<div className='flex items-end gap-2'>
				<div className='w-8 h-8 rounded-full bg-white/10 flex-shrink-0'></div>
				<div className='flex flex-col gap-1.5'>
					<div className='h-10 w-48 sm:w-56 rounded-2xl rounded-bl-md bg-white/[0.06]'></div>
					<div className='h-3 w-12 rounded bg-white/[0.04]'></div>
				</div>
			</div>
			{/* Outgoing message skeleton */}
			<div className='flex items-end gap-2 flex-row-reverse'>
				<div className='w-8 h-8 rounded-full bg-white/10 flex-shrink-0'></div>
				<div className='flex flex-col gap-1.5 items-end'>
					<div className='h-10 w-40 sm:w-44 rounded-2xl rounded-br-md bg-primary-500/20'></div>
					<div className='h-3 w-12 rounded bg-white/[0.04]'></div>
				</div>
			</div>
		</div>
	);
};
export default MessageSkeleton;
