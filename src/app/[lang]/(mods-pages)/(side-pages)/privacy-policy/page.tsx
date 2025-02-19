import { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "隱私權政策 Privacy Policy",
};

const PrivacyPolicyZHPage = () => {
  return (
    <div className="px-4 py-8">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">隱私權政策</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/02/20</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <p>
          非常歡迎您光臨NTHUMods(以下簡稱本網站)，為了讓您能夠安心的使用本網站的各項服務與資訊，特此向您說明本網站的隱私權保護政策，以保障您的權益，請您詳閱下列內容：
        </p>
        <h2>一、隱私權保護政策的適用範圍</h2>
        <p>
          <ul className="list-disc">
            <li>
              隱私權保護政策內容，包括本網站如何處理在您使用網站服務時收集到的個人識別資料。
            </li>
            <li>
              隱私權保護政策不適用於本網站以外的相關連結網站
              ，也不適用於非本網站所委託或參與管理的人員。
            </li>
          </ul>
        </p>
        <h2>二、資料的蒐集與使用方式</h2>
        <p>
          為了在本網站上提供您最佳的互動性服務，可能會請您提供相關個人的資料，其範圍如下：
        </p>
        <ul className="list-disc">
          <li>
            本網站在您使用服務信箱、問卷調查等互動性功能時，會保留您所提供的姓名、電子郵件地址、連絡方式及使用時間等。
          </li>
          <li>
            於一般瀏覽時，伺服器會自行記錄相關行徑，包括您使用連線設備的IP位址、使用時間、使用的瀏覽器、瀏覽及點選資料記錄等，做為我們增進網站服務的參考依據，此記錄為內部應用，決不對外公佈。
          </li>
          <li>
            為提供精確的服務，我們會將收集的問卷調查內容進行統計與分析，分析結果將之統計後的數據或說明文字呈現，除供NTHUMods
            Core
            Team，我們會視需要公佈該數據及說明文字，但不涉及特定個人之資料。
          </li>
          <li>
            在你登錄后，伺服器上不會儲存你的密碼和session。密碼會保存在你的設備中，用來驗證你的身份。除了特別注明之外，本網站不會擅自存儲你其他的個人資料
          </li>
          <li>
            除非取得您的同意或其他法令之特別規定，本網站絕不會將您的個人資料揭露於第三人或使用於蒐集目的以外之其他用途。
          </li>
        </ul>
        <h2> 三、資料之保護 </h2>
        <p>
          <ul className="list-disc">
            <li>
              本網站主機均設有防火牆、防毒系統等相關的各項資訊安全設備及必要的安全防護措施，加以保護網站及您的個人資料採用嚴格的保護措施，只由經過授權的人員才能接觸您的個人資料。
            </li>
            <li>
              如因業務需要有必要委託本部相關單位提供服務時，本網站亦會嚴格要求其遵守保密義務，並且採取必要檢查程序以確定其將確實遵守。
            </li>
          </ul>
        </p>
        <h2>四、網站對外的相關連結</h2>
        <p>
          本網站的網頁提供其他網站的網路連結，您也可經由本網站所提供的連結，點選進入其他網站。但該連結網站中不適用於本網站的隱私權保護政策，您必須參考該連結網站中的隱私權保護政策。
        </p>
        <h2>五、Cookie之使用</h2>
        <p>
          為了提供您最佳的服務，本網站會在您的電腦中放置並取用我們的Cookie
          ，若您不願接受Cookie的寫入，您可在您使用的瀏覽器功能項中設定隱私權等級為高，即可拒絕Cookie的寫入，但可能會導至網站某些功能無法正常執行
          。
        </p>
        <h2>六、隱私權保護政策之修正</h2>
        <p>
          本網站隱私權保護政策將因應需求隨時進行修正，修正後的條款將刊登於網站上。
        </p>
      </article>
    </div>
  );
};

const PrivacyPolicyENPage = () => {
  return (
    <div className="px-4 py-8">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">Privacy Policy</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Last Updated: 2023/12/21
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <p>
          {`Welcome to NTHUMods (hereinafter referred to as "this website"). To
          ensure you can use the services and information on this website with
          peace of mind, we hereby explain the privacy protection policy of this
          website to protect your rights. Please read the following content
          carefully:`}
        </p>
        <h2>1. Scope of the Privacy Protection Policy</h2>
        <ul className="list-disc">
          <li>
            This privacy protection policy includes how this website handles
            personal identification data collected when you use the services of
            this website.
          </li>
          <li>
            The privacy protection policy does not apply to related linked
            websites outside of this website, nor does it apply to personnel not
            entrusted or involved in the management of this website.
          </li>
        </ul>
        <h2>2. Collection and Use of Data</h2>
        <p>
          To provide you with the best interactive services on this website, we
          may ask you to provide relevant personal data. The scope is as
          follows:
        </p>
        <ul className="list-disc">
          <li>
            When you use interactive features such as service mailboxes and
            surveys, this website will retain the name, email address, contact
            information, and usage time you provide.
          </li>
          <li>
            During general browsing, the server will automatically record
            related actions, including your IP address, usage time, browser
            used, browsing and clicking data, etc., as a reference for improving
            website services. This record is for internal use only and will
            never be published externally.
          </li>
          <li>
            To provide accurate services, we will statistically analyze the
            collected survey content. The statistical data or explanatory text
            resulting from the analysis may be disclosed as necessary, but it
            will not involve specific personal data.
          </li>
          <li>
            After logging in, the server will not store your password and
            session. The password will be saved on your device for
            authentication purposes. Unless otherwise specified, this website
            will not store your other personal data without your consent.
          </li>
          <li>
            Unless with your consent or otherwise specified by law, this website
            will never disclose your personal data to third parties or use it
            for purposes other than collection.
          </li>
        </ul>
        <h2>3. Protection of Data</h2>
        <ul className="list-disc">
          <li>
            {`This website's host is equipped with various information security
            devices such as firewalls and anti-virus systems, and necessary
            security protection measures to protect the website and your
            personal data. Strict protection measures are adopted, and only
            authorized personnel can access your personal data. All related
            processing personnel have signed confidentiality agreements and will
            face legal penalties if they violate confidentiality obligations.`}
          </li>
        </ul>
        <h2>4. External Links on the Website</h2>
        <p>
          The web pages of this website provide links to other websites. You can
          also access other websites through the links provided on this website.
          However, the privacy protection policy of this website does not apply
          to those linked websites. You must refer to the privacy protection
          policy of those linked websites.
        </p>
        <h2>5. Use of Cookies</h2>
        <p>
          To provide you with the best service, this website will place and
          access our cookies on your computer. If you do not wish to accept the
          writing of cookies, you can set the privacy level to high in the
          browser functions you use, which will refuse the writing of cookies,
          but it may cause some functions of the website to not perform
          properly.
        </p>
        <h2>6. Amendments to the Privacy Protection Policy</h2>
        <p>
          The privacy protection policy of this website will be revised at any
          time according to needs. The revised terms will be published on the
          website.
        </p>
        <br />
        <p>
          This article is translated from the Chinese Version. If any
          discrepancies are found, please refer to the Chinese Version.
        </p>
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

const PrivacyPolicyPage = ({ params }: LangProps) => {
  return (
    <>
      {params.lang === "zh" ? <PrivacyPolicyZHPage /> : <PrivacyPolicyENPage />}
    </>
  );
};

export default PrivacyPolicyPage;
