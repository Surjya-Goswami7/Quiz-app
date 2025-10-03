import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-400 to-blue-500">
      <h1 className="text-4xl font-bold text-white mb-6">🎯 Online Quiz App</h1>
      <div className="space-x-4">
        <Link
          href="/register"
          className="bg-white text-blue-600 px-4 py-2 rounded shadow hover:bg-gray-200"
        >
          Register
        </Link>
        <Link
          href="/login"
          className="bg-yellow-400 text-black px-4 py-2 rounded shadow hover:bg-yellow-500"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
