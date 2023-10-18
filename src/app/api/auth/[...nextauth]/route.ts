import NextAuth from "next-auth"

const handler = NextAuth({
    providers: [
        {
            id: "nthu",
            name: "NTHU",
            type: "oauth",
            clientId: "nthumods",
            clientSecret:"unknown",
            authorization: {
                url: "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php",
                params: { scope: "uuid,inschool,email,userid,name" }
            },
            token: "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php",
            userinfo: "https://oauth.ccxp.nthu.edu.tw/v1.1/resource.php",
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
    
})

export { handler as GET, handler as POST }

