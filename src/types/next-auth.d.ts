import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Profile {
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


