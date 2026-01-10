import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { env } from "./env";
import { startUserDeletionJob } from "./jobs/userDeletion.job";
import { startServiceReminderJob } from "./jobs/serviceReminder.job";
import { initSocketServer } from "./realtime/socket";



async function startServer() {
  try {
    await connectDB(env.MONGO_URI);
    console.log("MongoDB connected");

    startUserDeletionJob();
    startServiceReminderJob();

    const server = http.createServer(app);
    initSocketServer(server);

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
