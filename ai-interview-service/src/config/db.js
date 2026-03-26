import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async (uri) => {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  // Use Google DNS to resolve MongoDB Atlas SRV records
  // Fixes ECONNREFUSED on Windows when local DNS can't resolve SRV
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

  mongoose.set("strictQuery", true);

  const options = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  try {
    await mongoose.connect(uri, options);
    console.log("MongoDB connected successfully");
    console.log("Database:", mongoose.connection.db.databaseName);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};
