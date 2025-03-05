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
          NTHUMods團隊非常感謝大家對平台的支持，基於避免觸犯個人資料保護法的原則，團隊宣佈從(5/3/2025)開始終止用於代理登入清大校務系統的服務。届時涉及到需要登入校務系統才能使用的功能會被暫停使用，不過其他無需登入校務系統的功能皆可正常使用。
        </p>

        <h2>發生了什麽</h2>
        <p>
          我們接獲來自校方的通知，其中提到代理登入服務會有觸犯個人資料保護法的疑慮。雖然目前并未發生任何資料泄露事件，但團隊在經過討論後決定終止代理登入服務。
          根據校方的定義，NTHUMods屬於第三方外部平台，故使用者的賬號與密碼不能由我們的伺服器做代理登入。代理登入的技術實現正好需要使用者的賬號與密碼，因此儘管使用者需要勾選同意才能由平台代理登入校務系統取得資料，但該技術仍然被校方提出有觸犯個人資料保護法的疑慮。
        </p>

        <h2>我們的應對措施</h2>
        <p>
          {
            "由於清大并無提供公開提取資料的API服務於第三方平台，故目前團隊只好與校方做進一步的討論，希望早日商討出解法，爭取在合規合法的前提下為使用者提供更便利的服務。"
          }
        </p>

        <h2>我們的願景</h2>
        <p>
          {
            "團隊一直致力於打造一個讓學生能夠輕鬆獲得資訊、並擁有直觀易用的使用者界面。我們堅信我們的平台始終走在正確的發展路徑上。展望未來，我們將繼續秉持這樣的理念，不斷為使用者提供更卓越的服務。"
          }
        </p>

        <p>感謝大家對NTHUMods的支持與愛護，期待未來與大家一起共同成長！</p>
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
        <p>Dear NTHUMods Community:</p>
        <p>
          {
            "We wish to extend our heartfelt thanks for your unwavering support and trust in our platform. Due to new compliance requirements with personal data protection laws, we will be discontinuing the proxy login service for the NTHU CCXP system starting from 5/3/2025. This means that features dependent on CCXP system login will be temporarily suspended. However, rest assured that all other functionalities of NTHUMods will continue to operate as usual."
          }
        </p>

        <h2>Background</h2>
        <p>
          {
            "Recently, we received guidance from NTHU regarding potential conflicts between our proxy login service and personal data protection standards. Although no incidents of data misuse have occurred, we prioritize your security and privacy. Therefore, in consultation with the university, we've decided to discontinue this service. Our platform is recognized as an external third-party service, and handling login credentials directly conflicts with the university's guidelines."
          }
        </p>

        <h2>Moving Forward</h2>
        <p>
          {
            "We are in active discussions with NTHU to explore alternative authentication methods that maintain both convenience and compliance. Our goal remains to enhance your experience by integrating useful features without compromising on legal standards."
          }
        </p>

        <h2>Looking Ahead</h2>
        <p>
          {
            "We remain committed to improving campus information accessibility and user experience. We’re optimistic about finding solutions that will allow us to continue serving your needs effectively and safely. For those interested in contributing to our journey or if you have questions, don’t hesitate to reach out via Instagram or email."
          }
        </p>

        <p>
          Thank you for being a part of our community. We look forward to
          navigating these changes together and building a better NTHUMods.
        </p>

        <p>
          If you are interested in joining us, please feel free to contact us
          via Instagram (@nthumods) or email. We appreciate your continued
          support of NTHUMods!
        </p>

        <p>Warm regards, </p>
        <p>The NTHUMods Team</p>
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
