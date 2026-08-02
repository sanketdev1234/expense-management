
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "❌ Please define the MONGODB_URI environment variable in .env.local"
  );
}


let cached = global.mongooseCache;

console.log(global)
console.log("what is in the global.mongooseCache" , global.mongooseCache)

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
 
  if (cached.conn) {
    return cached.conn;
  }

 
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, 
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ MongoDB connected");
      
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; 
    throw e;
  }

  return cached.conn;
}
