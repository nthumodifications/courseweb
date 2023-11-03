import NextAuth from "next-auth"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import jwt from "jsonwebtoken"

const handler = NextAuth({
    providers: [
        {
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
            profile(profile) {
              return {
                id: profile.id,
                userid: profile.userid,
                inschool: profile.inschool,
                name_zh: profile.name,
                name_en: profile.name_en,
                email: profile.email,
              }
            },
          }
    ],
    adapter: SupabaseAdapter({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
    callbacks: {
      async session({ session, user }) {
        const signingSecret = process.env.SUPABASE_JWT_SECRET
        if (signingSecret) {
          const payload = {
            aud: "authenticated",
            exp: Math.floor(new Date(session.expires).getTime() / 1000),
            sub: user.id,
            email: user.email,
            role: "authenticated",
          }
          session.supabaseAccessToken = jwt.sign(payload, signingSecret)
        }
        return session
      },
    }
})

export { handler as GET, handler as POST }

