import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const { userId, score, prize } = await req.json();
    console.log("userId score prize", userId, score, prize);

    if (!userId || score === undefined) {
      return NextResponse.json({
        status: 400,
        message: "User ID and score are required",
      });
    }

    // Check if the user already exists
    const [existingUser] = await connection.query(
      "SELECT * FROM results WHERE user_id = ?",
      [userId]
    );

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      // User already exists, do not insert again
      return NextResponse.json({
        status: 200,
        message: "User already exists — result not updated",
      });
    }

    // If user does not exist, insert new record
    await connection.query(
      "INSERT INTO results (user_id, score, prize) VALUES (?, ?, ?)",
      [userId, score, prize || null]
    );

    return NextResponse.json({
      status: 200,
      message: "Result saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving result:", error);
    return NextResponse.json({
      status: 500,
      message: `Error occurred while saving result: ${error.message}`,
    });
  } finally {
    connection.release();
  }
}
