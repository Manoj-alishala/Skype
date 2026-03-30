const GenderCheckbox = ({ onCheckboxChange, selectedGender }) => {
	return (
		<div className='flex gap-3 mt-1'>
			<button
				type='button'
				onClick={() => onCheckboxChange("male")}
				className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
					selectedGender === "male"
						? "bg-primary-500/20 border-primary-400/40 text-primary-300 shadow-lg shadow-primary-500/10"
						: "border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
				}`}
			>
				👱‍♂️ Male
			</button>
			<button
				type='button'
				onClick={() => onCheckboxChange("female")}
				className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
					selectedGender === "female"
						? "bg-pink-500/20 border-pink-400/40 text-pink-300 shadow-lg shadow-pink-500/10"
						: "border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-gray-300"
				}`}
			>
				👱‍♀️ Female
			</button>
		</div>
	);
};
export default GenderCheckbox;
