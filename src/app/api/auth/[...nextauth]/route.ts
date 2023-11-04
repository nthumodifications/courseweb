import NextAuth from "next-auth"

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
              if(profile.success == false) throw new Error("Failed to fetch user profile");
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
      async jwt({ token, account, profile }) {
        // Persist the OAuth access_token and or the user id to the token right after signin
        if (account && profile) {
          token.id = profile.id,
          token.name = profile.name_zh,
          token.name_en = profile.name_en,
          token.inschool = profile.inschool,
          token.email = profile.email
        }
        return token
      }    
    }
})

export { handler as GET, handler as POST }

