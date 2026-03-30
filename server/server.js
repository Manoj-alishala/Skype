import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import groupRoutes from "./routes/group.routes.js";

import connectToMongoDB from "./db/connectToMongoDB.js";
import { app, server } from "./socket/socket.js";

// Load .env from backend/ directory (local dev) — on deploy, env vars are set by the platform
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(__dirname, ".env") });
// Also try root .env as fallback
dotenv.config({ path: path.join(rootDir, ".env") });

const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" })); // to parse the incoming requests with JSON payloads (from req.body)
app.use(cookieParser());

app.use(
	cors({
		origin: [
			process.env.CLIENT_URL,
			"http://localhost:3000",
			"http://localhost:5000",
			"https://chat-application-zchp.onrender.com",
			"https://chat-application-backend-x245.onrender.com"
		].filter(Boolean),
		credentials: true,
	})
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);

app.use(express.static(path.join(rootDir, "client", "dist")));

app.get(/.*/, (req, res) => {
	res.sendFile(path.join(rootDir, "client", "dist", "index.html"));
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
