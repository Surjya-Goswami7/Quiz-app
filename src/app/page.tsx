"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLoginDefault = useCallback(() => {
    // login and return to home (not quiz)
    signIn("google", { callbackUrl: "/" });
  }, []);

  const handleStartQuiz = useCallback(() => {
    if (session?.user) {
      router.push("/quiz");
    } else {
      signIn("google", { callbackUrl: "/" });
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-800 via-black to-indigo-900 overflow-hidden text-white">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full flex justify-between items-center px-10 py-5 bg-transparent backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 cursor-pointer">
          <h1 className="text-2xl font-extrabold tracking-wide text-white drop-shadow-lg">
            Quiz<span className="text-yellow-400">Master</span>
          </h1>
        </div>

        {session?.user ? (
          <div className="flex items-center gap-4 cursor-pointer">
            <img
              src={session.user.image ?? "/default-avatar.png"}
              alt="User Avatar"
              className="w-9 h-9 rounded-full border border-gray-400 shadow-sm"
            />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg font-semibold transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLoginDefault}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold px-6 py-2 rounded-lg transition"
          >
            Login
          </button>
        )}
      </nav>

      {/* Main content */}
      <main className="flex flex-col justify-center items-center h-screen text-center px-4">
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 drop-shadow-2xl">
          Welcome to <span className="text-yellow-400">QuizMaster</span>
        </h1>
        <p className="text-gray-200 text-lg mb-10 max-w-xl">
          Test your knowledge, challenge your friends, and win exciting rewards!
        </p>

        {/* If logged in, show Start Quiz button; otherwise Login to Play */}
        <button
          onClick={handleStartQuiz}
          className="cursor-pointer bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-semibold px-10 py-4 rounded-full text-lg shadow-lg transform hover:scale-105 transition duration-300"
        >
          {session?.user ? "Let's Begin !" : "Login to Play"}
        </button>

        <p className="mt-10 text-sm text-gray-400 italic">
          “Knowledge is power — show the world what you’ve got!”
        </p>
      </main>

      <footer className="absolute bottom-4 w-full text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} QuizMaster. All rights reserved.
      </footer>
    </div>
  );
}
