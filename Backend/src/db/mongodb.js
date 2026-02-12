import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectMongoDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        
        console.log(`✅ MongoDB connected: ${connectionInstance.connection.host}`);
        
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        return connectionInstance;
    } catch (error) {
        console.error("❌ MongoDB connection Failed:", error);
        process.exit(1);
    }
};

export default connectMongoDB;
