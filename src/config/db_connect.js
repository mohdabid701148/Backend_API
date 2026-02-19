import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const db_connect = async () => {
  try {
    const conn = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(`✅ MongoDB connected: ${conn.connection.host} ${conn.connection.name}`);
    
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

export default db_connect;
