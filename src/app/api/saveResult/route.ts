import { NextResponse, NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const { userId, score, prize } = await req.json();
    console.log('userId score prize', userId ,score, prize)
    if (score === undefined) {
      return NextResponse.json({ status: 400, message: "Score is required" });
    }

    //if user already exists in the results table then update his data
    const query = "INSERT INTO results (user_id, score, prize) VALUES (?, ?, ?)";
    await connection.query(query, [userId, score, prize || null]);
    return NextResponse.json({
      status: 200,
      message: "Result saved successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      status: 500,
      message: `Error Occurred While saving ${error}`,
    });
  } finally {
    connection.release();
  }
}
