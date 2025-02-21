import Script from "next/script";
import Footer from "@/components/Footer";

const ProxyLoginExplainerZH = () => {
  return (
    <div className="px-4 py-8">
      <Script
        id="mermaid"
        type="module"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                import mermaid from "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs";
                mermaid.initialize({startOnLoad: true});
                mermaid.contentLoaded();`,
        }}
      />
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">NTHUMods 代理登入登入說明</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2024/05/31</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>什麼是 NTHUMods 代理登入？</h2>
        <p>
          NTHUMods 代理登入是一個幫助用戶在 NTHUMods
          平台上安全登入校務資訊系統的工具。它使用加密技術來保護用戶的帳戶和密碼，確保用戶的資訊安全。
        </p>

        <h2>如何使用您的帳戶資訊？</h2>
        <p>
          在使用 NTHUMods
          代理登入時，我們需要您的學號和密碼來進行首次登入驗證。登入過程如下：
        </p>
        <ol>
          <li>發送請求到校務資訊系統登入頁面，獲取驗證碼圖片。</li>
          <li>使用 OCR 技術解碼驗證碼。</li>
          <li>提交學號、密碼和驗證碼進行登入。</li>
          <li>驗證登入狀態並獲取 ACIXSTORE 資訊。</li>
        </ol>
        <b>
          您的資訊僅存儲在用戶設備上！我們不會儲存任何資料（我們沒錢幫你們儲存）
        </b>
        <p>
          首次登入後，您的密碼會被加密<b>存儲在您的裝置上</b>
          ，以便您下次自動登入。
        </p>

        <h2>如何保護您的資訊？</h2>
        <p>我們採取以下步驟來保護您的資訊：</p>
        <ul>
          <li>
            <b>您的資訊僅存儲在用戶設備上。</b>
          </li>
          <li>在您的設備上儲存的密碼會使用 AES-256-CBC 加密技術來加密。</li>
          <li>密碼加密和解密過程示意圖：</li>
          <div className="mermaid">
            {`
                    graph TD;
                        A[用戶輸入密碼] -->|加密| B[加密密碼];
                        B --> C[存儲於用戶設備];
                        C -->|解密| D[使用密碼登入];
                    `}
          </div>
          <li>
            使用 JWT
            技術來認證用戶的資料，減少密碼的使用量，也確保資料的安全且有時效性。
            <b>您的JWT僅存儲在用戶設備上。</b>
          </li>
        </ul>

        <h2>流程圖</h2>
        <div className="mermaid">
          {`
                graph TD;
                subgraph 用戶設備
                    A1[用戶輸入學號和密碼] --> B1[發送登入請求];
                end
                subgraph 伺服器
                    B1 --> C1[獲取驗證碼];
                    C1 --> D1[解碼驗證碼];
                    D1 --> E1[提交登入資訊];
                    E1 --> F1[驗證登入狀態];
                    F1 -->|成功| G1[返回 ACIXSTORE];
                    F1 -->|失敗| H1[錯誤處理];
                end
                G1 --> I1[用戶設備];
                subgraph 用戶設備
                    J1[每當開啓需要登入的功能] --> K1[用加密密碼發送重新登入請求];
                end
                K1 --> L1[刷新登入狀態];
                `}
        </div>

        <h2>什麽時候會自動重新驗證？</h2>
        <p>
          在JWT過期或有開啓鏈接校務資訊系統的功能時，系統將使用加密存儲的密碼來刷新認證期：
          <b>您的資訊僅存儲在用戶設備上。</b>
        </p>
        <ol>
          <li>解密存儲的密碼。</li>
          <li>使用解密後的密碼進行重新登入。</li>
          <li>返回新的 ACIXSTORE。</li>
        </ol>

        <h2>參考連結</h2>
        <p>
          詳細程式碼請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/9e738bc32c49b0168efaedeb9626211dbc36b639/src/lib/headless_ais/headless_ais.ts">
            NTHUMods Github
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const ProxyLoginExplainerEN = () => {
  return (
    <div className="px-4 py-8">
      <Script
        id="mermaid"
        type="module"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                import mermaid from "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs";
                mermaid.initialize({startOnLoad: true});
                mermaid.contentLoaded();`,
        }}
      />
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">NTHUMods Proxy Login Explanation</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Updated on: 2024/05/31
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>What is NTHUMods Proxy Login?</h2>
        <p>
          NTHUMods Proxy Login is a tool that helps users securely log in to the
          school information system on the NTHUMods platform. It uses encryption
          technology to protect user accounts and passwords, ensuring your
          information’s security.
        </p>

        <h2>How do we use your account information?</h2>
        <p>
          When using NTHUMods Proxy Login, we require your student ID and
          password for the initial login verification. The login process is as
          follows:
        </p>
        <ol>
          <li>
            Send a request to the school information system login page to obtain
            a captcha image.
          </li>
          <li>Decode the captcha using OCR technology.</li>
          <li>Submit your student ID, password, and captcha to log in.</li>
          <li>Verify the login status and obtain ACIXSTORE information.</li>
        </ol>
        <b>
          Your information is stored only on your device! We do not store any
          data (we don’t have the fuckin’ money to store it for you)!
        </b>
        <p>
          After the initial login, your password will be encrypted{" "}
          <b>and stored on your device</b> for automatic login next time.
        </p>

        <h2>How is your information protected?</h2>
        <p>We take the following steps to protect your information:</p>
        <ul>
          <li>
            <b>Your information is stored only on your device.</b>
          </li>
          <li>
            Passwords stored on your device are encrypted using AES-256-CBC
            encryption technology.
          </li>
          <li>A diagram of the password encryption and decryption process:</li>
          <div className="mermaid">
            {`
                    graph TD;
                        A[User enters password] -->|Encrypt| B[Encrypted password];
                        B --> C[Stored on user’s device];
                        C -->|Decrypt| D[Login using password];
                    `}
          </div>
          <li>
            Using JWT technology to authenticate user data—reducing password
            usage while ensuring security and timeliness.{" "}
            <b>Your JWT is stored only on your device.</b>
          </li>
        </ul>

        <h2>Flowchart</h2>
        <div className="mermaid">
          {`
                graph TD;
                subgraph User Device
                    A1[User enters student ID and password] --> B1[Send login request];
                end
                subgraph Server
                    B1 --> C1[Get captcha];
                    C1 --> D1[Decode captcha];
                    D1 --> E1[Submit login information];
                    E1 --> F1[Verify login status];
                    F1 -->|Success| G1[Return ACIXSTORE];
                    F1 -->|Failure| H1[Error handling];
                end
                G1 --> I1[User Device];
                subgraph User Device
                    J1[Whenever a login-required feature is accessed] --> K1[Send re-login request using encrypted password];
                end
                K1 --> L1[Refresh login status];
                `}
        </div>

        <h2>When is automatic re-authentication performed?</h2>
        <p>
          When the JWT expires or a feature linking to the school information
          system is activated, the system will use the encrypted stored password
          to refresh the authentication period:{" "}
          <b>Your information is stored only on your device.</b>
        </p>
        <ol>
          <li>Decrypt the stored password.</li>
          <li>Use the decrypted password to log in again.</li>
          <li>Return a new ACIXSTORE.</li>
        </ol>

        <h2>Reference Links</h2>
        <p>
          For detailed code, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/9e738bc32c49b0168efaedeb9626211dbc36b639/src/lib/headless_ais/headless_ais.ts">
            NTHUMods Github
          </a>
          .
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

const ProxyLoginExplainerPage = ({ params }: LangProps) => {
  return (
    <>
      {params.lang === "zh" ? (
        <ProxyLoginExplainerZH />
      ) : (
        <ProxyLoginExplainerEN />
      )}
    </>
  );
};

export default ProxyLoginExplainerPage;
