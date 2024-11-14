import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const result = dotenv.config({ path: join(__dirname, ".env") });

if (result.error) {
  console.error("❌ Error loading .env file:", result.error);
  process.exit(1);
}

// Verify required environment variables
const requiredEnvVars = ["GAME_SECRET", "GAME_PORT"];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}

console.log("✅ Environment variables loaded successfully");

// Export config object with environment variables
export const config = {
  gameSecret: process.env.GAME_SECRET,
  port: process.env.GAME_PORT,
};
