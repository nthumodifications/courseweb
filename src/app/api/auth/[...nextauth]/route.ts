import NextAuth, { AuthOptions } from "next-auth"
import authConfig from "./authConfig"

//nextauth uses nodejs libraries
export const runtime = "nodejs"

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }

