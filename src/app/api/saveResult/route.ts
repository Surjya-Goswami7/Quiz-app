import type { NextApiRequest, NextApiResponse } from "next";
import mysql from "mysql2/promise";
import { pool } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { score, prize } = req.body;

  if (score === undefined) {
    return res.status(400).json({ message: "Score is required" });
  }

  try {
    const conn = await pool.getConnection();
    try {
      const query = "INSERT INTO results (id, user_id, round, score, status";
      await conn.execute(query, [score, prize || null]);
      res.status(200).json({ message: "Result saved successfully" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error", error: err });
  }
}
