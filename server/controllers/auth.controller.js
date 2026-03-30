import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import generateTokenAndSetCookie from "../utils/generateToken.js";
import cloudinary from "../config/cloudinary.js";

export const signup = async (req, res) => {
	try {
		const { fullName, username, password, confirmPassword, gender, profilePic } = req.body;

		if (password !== confirmPassword) {
			return res.status(400).json({ error: "Passwords don't match" });
		}

		const user = await User.findOne({ username });

		if (user) {
			return res.status(400).json({ error: "Username already exists" });
		}

		// HASH PASSWORD HERE
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Handle profile picture
		let finalProfilePic;
		if (profilePic) {
			// Upload user-provided image to Cloudinary
			try {
				const uploadResult = await cloudinary.uploader.upload(profilePic, {
					folder: "chat-app/avatars",
					width: 300,
					height: 300,
					crop: "fill",
					gravity: "face",
				});
				finalProfilePic = uploadResult.secure_url;
			} catch (uploadError) {
				console.error("Cloudinary upload failed:", uploadError.message);
				// Fall back to default avatar if upload fails
				const boyProfilePic = `https://api.dicebear.com/9.x/adventurer/svg?seed=${username}-male&backgroundColor=b6e3f4`;
				const girlProfilePic = `https://api.dicebear.com/9.x/adventurer/svg?seed=${username}-female&backgroundColor=ffd5dc`;
				finalProfilePic = gender === "male" ? boyProfilePic : girlProfilePic;
			}
		} else {
			// DiceBear Avatars - default avatar
			const boyProfilePic = `https://api.dicebear.com/9.x/adventurer/svg?seed=${username}-male&backgroundColor=b6e3f4`;
			const girlProfilePic = `https://api.dicebear.com/9.x/adventurer/svg?seed=${username}-female&backgroundColor=ffd5dc`;
			finalProfilePic = gender === "male" ? boyProfilePic : girlProfilePic;
		}

		const newUser = new User({
			fullName,
			username,
			password: hashedPassword,
			gender,
			profilePic: finalProfilePic,
		});

		if (newUser) {
			// Generate JWT token here
			generateTokenAndSetCookie(newUser._id, res);
			await newUser.save();

			res.status(201).json({
				_id: newUser._id,
				fullName: newUser.fullName,
				username: newUser.username,
				profilePic: newUser.profilePic,
				bio: newUser.bio || "",
				gender: newUser.gender,
			});
		} else {
			res.status(400).json({ error: "Invalid user data" });
		}
	} catch (error) {
		console.log("Error in signup controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const login = async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid username or password" });
		}

		generateTokenAndSetCookie(user._id, res);

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			username: user.username,
			profilePic: user.profilePic,
			bio: user.bio || "",
			gender: user.gender,
		});
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const logout = (req, res) => {
	try {
		res.cookie("jwt", "", { maxAge: 0 });
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};
