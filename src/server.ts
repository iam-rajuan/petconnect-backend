import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { env } from "./env";
import { startUserDeletionJob } from "./jobs/userDeletion.job";



async function startServer() {
  try {
    await connectDB(env.MONGO_URI);
    console.log("MongoDB connected");

    startUserDeletionJob();

    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to start server:", message);
    process.exit(1);
  }
}

void startServer();
