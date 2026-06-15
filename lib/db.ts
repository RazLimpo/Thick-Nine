import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

/** * Global is used here to maintain a cached connection across hot reloads in development.
 * This prevents connections from growing exponentially during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  
  if (!cached.promise) {
    
    const opts = {
      dbName: 'freelancingDB',          // Keeps your explicit database target safe
      bufferCommands: true,             // Enables buffering to safely queue traffic fluctuations
      serverSelectionTimeoutMS: 30000,  // Extends timeout to 30s to prevent crash spikes on Render
      maxPoolSize: 10,                  // Maintains up to 10 active parallel database sockets
      minPoolSize: 2,                   // Keeps at least 2 sockets open to handle requests instantly
      socketTimeoutMS: 45000,           // Closes idle sockets after 45 seconds
      family: 4                         // Forces IPv4 to ensure stable cloud-hosting routing
    };
    

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log("=> New MongoDB connection established");
      return mongoose;
    });
  }


  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Clear the failed promise so we can try again
    console.error("=> MongoDB connection failed:", e);
    throw e;
  }

  return cached.conn;
}