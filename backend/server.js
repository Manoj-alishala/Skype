import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";

import connectToMongoDB from "./db/connectToMongoDB.js";
import { app, server } from "./socket/socket.js";

dotenv.config();

// Get the actual directory of this file, then go up one level to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const PORT = process.env.PORT || 5000;

if (!process.env.PORT) {
	// If PORT is not defined in env, try loading from parent directory (if run from backend/)
	dotenv.config({ path: path.join(rootDir, ".env") });
}

if (!process.env.PORT) {
	console.warn("WARNING: PORT not found in environment variables. Defaulting to 5000.");
	console.warn("Ensure .env file is in the root directory.");
}

app.use(express.json()); // to parse the incoming requests with JSON payloads (from req.body)
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use(express.static(path.join(rootDir, "frontend", "dist")));

app.get("/{*splat}", (req, res) => {
	res.sendFile(path.join(rootDir, "frontend", "dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: "Something went wrong! " + err.message });
});

server.listen(PORT, () => {
	connectToMongoDB();
	console.log(`Server Running on port ${PORT}`);
});
