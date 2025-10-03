/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { pool } from "@/lib/db"; // your mysql2 pool

const authConfig = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;

      // check if user exists
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
        profile.email,
      ]);

      if ((rows as any[]).length === 0) {
        await pool.query(
          "INSERT INTO users (name, email, role, image) VALUES (?, ?, ?, ?)",
          [profile.name, profile.email, "user", profile.picture]
        );
      } else {
        await pool.query(
          "UPDATE users SET name = ?, image = ? WHERE email = ?",
          [profile.name, profile.picture, profile.email]
        );
      }

      return true;
    },

    async session({ session }) {
      if (session.user?.email) {
        const [rows] = await pool.query(
          "SELECT id, role, image FROM users WHERE email = ?",
          [session.user.email]
        );

        if ((rows as any[]).length > 0) {
          const user = (rows as any[])[0];
          (session.user as any).id = user.id;
          (session.user as any).role = user.role;
          (session.user as any).image = user.image;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

// ✅ Correct export
export const { GET, POST } = authConfig.handlers;

// (Optional) export helpers if you need them in server components
export const { auth, signIn, signOut } = authConfig;
