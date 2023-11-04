import NextAuth, { DefaultSession } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
    interface User {
        id: string,
        inschool: boolean,
        name_zh: string,
        name_en: string,
        email: string
    }
    interface JWT extends DefaultJWT {
        id: string,
        inschool: boolean,
        name_zh: string,
        name_en: string,
        email: string
    }
    interface Session {
        user: {
            id: string,
            inschool: boolean,
            name_zh: string,
            name_en: string,
            email: string
        } & DefaultSession["user"]
    }
}


