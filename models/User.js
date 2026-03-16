/**
 * models/User.js
 *
 * WHY THIS FILE EXISTS:
 * Defines the shape of a User document in MongoDB.
 * Mongoose will enforce these fields + types on every save.
 *
 * FIELDS:
 *   name     — display name shown in the sidebar
 *   email    — unique, used for login
 *   password — bcrypt hashed, NEVER stored as plain text
 *
 * NOTE: "mongoose.models.User || mongoose.model(...)" prevents
 * "Cannot overwrite model once compiled" errors during Next.js hot-reload.
 */

import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
