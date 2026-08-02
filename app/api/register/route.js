
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    //  Validation 
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    //  DB Connection 
    await connectDB();

    //  Check for duplicate email 
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 } // 409 Conflict
      );
    }

   
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 } // 201 Created
    );
  } catch (error) {
    console.error("Registration error:", error);

   
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json({ error: messages[0] }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
