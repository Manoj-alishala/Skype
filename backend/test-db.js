import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const MONGO_DB_URI = process.env.MONGO_DB_URI;

console.log("Testing connection to:", MONGO_DB_URI.split("@")[1]); // Log host only for security

async function testConnection() {
    try {
        console.log("Connecting...");
        await mongoose.connect(MONGO_DB_URI, {
            serverSelectionTimeoutMS: 5000, // Wait only 5s
        });
        console.log("✅ Successfully connected to MongoDB!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Connection failed!");
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
