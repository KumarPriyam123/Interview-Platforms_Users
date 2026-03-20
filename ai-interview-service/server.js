import { config } from "dotenv";

import { connectDB } from "./src/config/db.js";
import { createApp } from "./src/app.js";

config();

const PORT = Number(process.env.PORT || 8000);

const start = async () => {
  await connectDB(process.env.MONGODB_URI);

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`AI interview service running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start AI interview service:", error);
  process.exit(1);
});
