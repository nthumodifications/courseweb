import supabase_server from "@/config/supabase_server";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"

export const authConfig: AuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        {
            id: "nthumods",
            name: "NTHUMods",
            type: "oauth",
            clientId: 'courseweb',
            clientSecret: "secretyoursecret",
            authorization: {
                url: "http://localhost:3000/oauth/auth",
                params: { scope: "login" }
            },
            token: "http://localhost:3000/oauth/access_token",
            userinfo: "http://localhost:3000/oauth/userinfo",
            profile(profile, tokens) {
                return {
                    id: profile.id,
                    name: profile.name,
                    email: profile.email,
                }
            },
        },
        process.env.NODE_ENV === "development"
            ? CredentialsProvider({
                id: "dev",
                name: "Credentials",
                credentials: {
                    username: {
                        label: "Username",
                        type: "text",
                        placeholder: "jsmith",
                    },
                    password: { label: "Password", type: "password" },
                },
                async authorize() {
                    return {
                        id: "b07901001",
                        inschool: true,
                        name_zh: "王小明",
                        name_en: "Wang, Xiao-Ming",
                        email: "chewtzihwee@gmail.com"
                    }
                },
            })
            : {
                id: "nthu",
                name: "NTHU",
                type: "oauth",
                clientId: process.env.NTHU_OAUTH_CLIENT_ID,
                clientSecret: process.env.NTHU_OAUTH_SECRET_KEY,
                authorization: {
                    url: "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php",
                    params: { scope: "inschool email userid name" }
                },
                token: "https://oauth.nthumods.com/v1.1/token.php",
                userinfo: "https://oauth.nthumods.com/v1.1/resource.php",

                profile(profile, tokens) {
                    if (profile.success == false) throw new Error("Failed to fetch user profile");
                    return {
                        id: profile.userid,
                        inschool: profile.inschool,
                        name_zh: profile.name,
                        name_en: profile.name_en,
                        email: profile.email,
                    }
                },
            }
    ],
    callbacks: {
        async jwt({ token, account, profile, user }) {
            if (process.env.NODE_ENV == 'development') {
                const { data, error } = await supabase_server.from("users").select("roles").eq("user_id", "b07901001").limit(1).single();
                token = {
                    ...token,
                    id: "b07901001",
                    inschool: true,
                    name_zh: "王小明",
                    name_en: "Wang, Xiao-Ming",
                    email: "chewtzihwee@gmail.com",
                    roles: data?.roles ?? []
                }
                return token;
            }
            if (account) {
                const { data, error } = await supabase_server.from("users").select("roles").eq("user_id", user.id).limit(1).single();
                token = {
                    ...token,
                    id: user.id,
                    inschool: user.inschool,
                    name_zh: user.name_zh,
                    name_en: user.name_en,
                    email: user.email,
                    roles: data?.roles ?? []
                }
            }
            return token
        },
        async session({ session, token }) {
            if (process.env.NODE_ENV == 'development') {
                session.user = {
                    id: "b07901001",
                    inschool: true,
                    name_zh: "王小明",
                    name_en: "Wang, Xiao-Ming",
                    email: "chewtzihwee@gmail.com",
                    //@ts-ignore
                    roles: token?.roles ?? []
                }
                return session;
            }
            session.user = {
                ...session.user,
                //@ts-ignore
                id: token.id,
                //@ts-ignore
                name_zh: token.name_zh,
                //@ts-ignore
                name_en: token.name_en,
                //@ts-ignore
                inschool: token.inschool,
                //@ts-ignore
                email: token.email,
                //@ts-ignore
                roles: token?.roles ?? []
            }
            return session;
        },
    }
}

export default authConfig;