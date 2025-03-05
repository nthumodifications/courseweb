import Footer from "@/components/Footer";
import { Instagram } from "lucide-react";
import Link from "next/link";

const NextStepsZH = () => {
  return (
    <div className="px-4 py-8 max-w-prose">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">終止NTHUMods代理登入校務系統服務</h1>
      </div>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <p>
          NTHUMods團隊非常感謝大家對平台的支持，基於避免觸犯個人資料保護法的原則，團隊宣佈從(5/3/2025)開始終止用於代理登入清大校務系統的服務。屆時涉及到需要登入校務系統才能使用的功能會被暫停使用，不過其他無需登入校務系統的功能皆可正常使用。
        </p>

        <h2>發生了什麽</h2>
        <p>
          我們接獲來自校方的通知，其中提到代理登入服務會有觸犯個人資料保護法的疑慮。雖然目前并未發生任何資料泄露事件，但團隊在經過討論後決定終止代理登入服務。
          根據校方的定義，NTHUMods屬於第三方外部平台，故使用者的賬號與密碼不能由我們的伺服器做代理登入。代理登入的技術實現正好需要使用者的賬號與密碼，因此儘管使用者需要勾選同意才能由平台代理登入校務系統取得資料，但該技術仍然被校方提出有觸犯個人資料保護法的疑慮。
        </p>

        <h2>我們的應對措施</h2>
        <p>
          由於清大并無提供公開提取資料的API服務於第三方平台，故目前團隊只好與校方做進一步的討論，希望早日商討出解法，爭取在合規合法的前提下為使用者提供更便利的服務。
        </p>

        <h2>我們的願景</h2>
        <p>
          團隊致力於改善校内資訊分散和使用者界面設計不友好的痛點，我們堅信平台一直都有走在正確的道路上，未來團隊也會持續秉持這份理念，繼續為使用者提供更好的服務。
        </p>

        <p>
          若有興趣加入都可以透過 IG (@nthumods) 或 Email (nthumods@gmail.com)
          聯繫我們，還請大家繼續支持NTHUMods！
        </p>

        <p className="text-right">NTHUMods團隊 上</p>
      </article>
      <Footer />
    </div>
  );
};

const NextStepsEN = () => {
  return (
    <div className="px-4 py-8 max-w-prose">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">
          Termination of NTHUMods Proxy Login Service for the CCXP System
        </h1>
      </div>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <p>
          {
            "The NTHUMods team would like to express our sincere gratitude for the support you've shown our platform. In order to avoid violating personal data protection laws, the team announces that, starting from (5/3/2025), we will terminate the proxy login service used for accessing the NTHU CCXP system. As a result, any features that require logging into the CCXP system will be suspended, while all other functions that do not require such a login will remain fully available."
          }
        </p>

        <h2>What Happened</h2>
        <p>
          We received a notification from NTHU stating that the proxy login
          service might breach personal data protection laws. Although there
          have been no data leakage incidents so far, after thorough
          discussions, the team decided to terminate the proxy login service.
        </p>
        <p>
          {
            "According to the university's definition, NTHUMods is classified as a third-party external platform; therefore, users' accounts and passwords should not be handled by our servers for proxy login. The proxy login implementation inherently requires the use of users' accounts and passwords. Even though users must provide explicit consent for the proxy login to retrieve data from the CCXP System, NTHU has raised concerns that this technology may violate personal data protection laws."
          }
        </p>

        <h2>Our Response</h2>
        <p>
          Since NTHU does not provide an external API for third-party platforms,
          our team is currently engaging in further discussions with NTHU. We
          hope to work out a solution soon that will allow us to offer more
          convenient services to users while remaining compliant and legal.
        </p>

        <h2>Our Vision</h2>
        <p>
          Our team is dedicated to addressing the issues of dispersed
          information and unfriendly user interface within the campus. We firmly
          believe that the platform has always been on the right track, and we
          will continue to uphold this philosophy by providing better services
          for our users in the future.
        </p>

        <p>
          If you are interested in joining us, please feel free to contact us
          via Instagram (@nthumods) or email. We appreciate your continued
          support of NTHUMods!
        </p>

        <p className="text-right">— The NTHUMods Team</p>
      </article>
      <Footer />
    </div>
  );
};

type LangProps = {
  params: {
    lang: string;
  };
};

export default function NextSteps({ params: { lang } }: LangProps) {
  return <>{lang === "zh" ? <NextStepsZH /> : <NextStepsEN />}</>;
}
