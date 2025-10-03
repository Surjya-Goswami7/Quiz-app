"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-purple-400 to-blue-500">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-400 to-blue-500">
      <h1 className="text-4xl font-bold text-white mb-6">🎯 Online Quiz App</h1>

      {/* If user is signed in */}
      {session?.user ? (
        <div className="flex flex-col items-center space-y-4">
          <img
            src={session.user.image ?? "/default-avatar.png"}
            alt="avatar"
            className="w-16 h-16 rounded-full border-2 border-white"
          />
          <p className="text-white text-lg">
            Welcome, <span className="font-semibold">{session.user.name}</span>!
          </p>
          <div className="space-x-4">
            <Link
              href="/quiz"
              className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600"
            >
              Start Quiz
            </Link>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        // If not signed in
        <div className="space-x-4">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-gray-200"
          >
            Register Or Login
          </button>
          {/* Keep Register/Login if you still want custom credentials */}
          {/* <Link
            href="/register"
            className="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-gray-200"
          >
            Register
          </Link> */}
          {/* <Link
            href="/login"
            className="bg-yellow-400 text-black px-4 py-2 rounded shadow hover:bg-yellow-500"
          >
            Login
          </Link> */}
        </div>
      )}
    </div>
  );
}
