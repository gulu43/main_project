import mongoose from "mongoose";
import { db_name,db_uri } from "../constants.js";

const connectDB = async () => {
    try {
      const db_connection = await mongoose.connect(`${db_uri}/${db_name}`);
      console.log(`\nMongoDB connected: ${db_connection.connection.host}`);
    } catch (error) {
      console.error("MongoDB connection error: " + error);
      process.exit(1); // Exit the app if DB fails to connect
    }
  };


export default connectDB ;