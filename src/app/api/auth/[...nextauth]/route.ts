import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

console.log({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string; // ✅ safe cast
      }
      return session;
    },
    async signIn({ profile }) {
      console.log("Google profile:", profile);
      return true;
    },
  },
});

export { handler as GET, handler as POST };
