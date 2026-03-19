import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Footer from "@/components/Footer";

const useMermaid = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.textContent = `
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs";
      mermaid.initialize({startOnLoad: true});
      mermaid.contentLoaded();
    `;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
};

const ProxyLoginExplainerZH = () => {
  useMermaid();
  return (
    <div className="px-4 py-8">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">NTHUMods 代理登入說明</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2026/03/19</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>什麼是 NTHUMods 代理登入？</h2>
        <p>
          NTHUMods
          代理登入是一個選用功能，讓您可以安全地連結清華大學校務資訊系統（CCXP），以使用成績查詢、學生證門禁、宿舍包裹等功能。
          代理登入與主要的 NTHUMods 帳號（OIDC 登入）完全獨立，您無需先登入
          NTHUMods 即可使用。
        </p>

        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
          <p className="text-sm">
            <strong>隱私說明：</strong> 您的 CCXP
            密碼永遠不會儲存在您的裝置上。若您選擇啟用「自動更新」，密碼會以
            AES-256-GCM 加密後儲存於我們的伺服器，30 天後自動刪除。
          </p>
        </div>

        <h2>登入流程</h2>
        <p>
          代理登入使用 Puppeteer（真實瀏覽器）來處理 CCXP 的機器人防護，搭配 OCR
          技術自動解讀驗證碼：
        </p>
        <ol>
          <li>您在 NTHUMods 輸入學號和密碼。</li>
          <li>我們的伺服器啟動一個真實瀏覽器，前往 CCXP 登入頁面。</li>
          <li>使用 OCR 技術自動解碼驗證碼圖片。</li>
          <li>填寫並送出登入表單。</li>
          <li>獲取會話令牌（ACIXSTORE），返回給您的裝置。</li>
          <li>您的密碼此後不再傳輸，只有 ACIXSTORE 用於查詢資料。</li>
        </ol>

        <div className="mermaid">
          {`
            graph TD;
            subgraph 您的裝置
                A[輸入學號與密碼] --> B[送出登入請求];
            end
            subgraph NTHUMods 伺服器
                B --> C[啟動真實瀏覽器];
                C --> D[解碼 CAPTCHA];
                D --> E[登入 CCXP];
                E -->|成功| F[回傳 ACIXSTORE];
                E -->|失敗| G[回傳錯誤];
            end
            F --> H[儲存 ACIXSTORE 於裝置];
            subgraph 資料查詢
                H --> I[使用 ACIXSTORE 查詢成績等資料];
            end
          `}
        </div>

        <h2>自動更新（選用）</h2>
        <p>
          CCXP 的會話令牌（ACIXSTORE）約 30
          分鐘後過期。若您勾選「儲存認證以自動更新」，系統會：
        </p>
        <ul>
          <li>
            將您的密碼以 <b>AES-256-GCM</b> 加密後儲存於我們的伺服器。
          </li>
          <li>當 ACIXSTORE 過期時，自動重新登入 CCXP 並取得新的令牌。</li>
          <li>
            每次更新後，原本的認證金鑰會被替換（令牌輪換），降低外洩風險。
          </li>
          <li>30 天後自動刪除儲存的認證資料。</li>
        </ul>
        <p>若不勾選，會話過期後需手動重新登入。</p>

        <h2>資安說明</h2>
        <ul>
          <li>
            密碼<b>永遠不會儲存在您的裝置</b>上。
          </li>
          <li>伺服器上加密儲存的密碼使用獨立的加密金鑰，且金鑰不對外公開。</li>
          <li>
            回傳給裝置的 <code>credentialToken</code> 是不透明的
            UUID，本身不含密碼資訊。
          </li>
          <li>登入端點有速率限制，防止暴力嘗試。</li>
          <li>您可隨時登出，儲存於伺服器的認證資料將立即刪除。</li>
        </ul>

        <h2>參考連結</h2>
        <p>
          詳細程式碼請參考{" "}
          <a href="https://github.com/nthumodifications/courseweb">
            NTHUMods GitHub
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const ProxyLoginExplainerEN = () => {
  useMermaid();
  return (
    <div className="px-4 py-8">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">NTHUMods Proxy Login Explained</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Last Updated: 2026/03/19
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>What is NTHUMods Proxy Login?</h2>
        <p>
          NTHUMods Proxy Login is an optional feature that lets you securely
          connect your NTHU Academic Information System (CCXP) account to access
          grades, student ID/door access, and parcel tracking. It is completely
          independent of your NTHUMods account (OIDC login) — no NTHUMods
          account is required to use it.
        </p>

        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Privacy note:</strong> Your CCXP password is never stored on
            your device. If you opt in to "auto-refresh", your password is
            encrypted with AES-256-GCM and stored on our server, and
            automatically deleted after 30 days.
          </p>
        </div>

        <h2>How Login Works</h2>
        <p>
          Proxy login uses Puppeteer (a real browser) to handle CCXP's bot
          protection, combined with OCR technology to solve CAPTCHAs:
        </p>
        <ol>
          <li>You enter your student ID and password in NTHUMods.</li>
          <li>
            Our server launches a real browser and navigates to the CCXP login
            page.
          </li>
          <li>OCR technology automatically solves the CAPTCHA image.</li>
          <li>The login form is submitted.</li>
          <li>
            A session token (ACIXSTORE) is obtained and returned to your device.
          </li>
          <li>
            Your password is never transmitted again — only ACIXSTORE is used
            for data queries.
          </li>
        </ol>

        <div className="mermaid">
          {`
            graph TD;
            subgraph Your Device
                A[Enter student ID and password] --> B[Send login request];
            end
            subgraph NTHUMods Server
                B --> C[Launch real browser];
                C --> D[Solve CAPTCHA via OCR];
                D --> E[Login to CCXP];
                E -->|Success| F[Return ACIXSTORE];
                E -->|Failure| G[Return error];
            end
            F --> H[Store ACIXSTORE on device];
            subgraph Data Queries
                H --> I[Use ACIXSTORE to fetch grades, etc.];
            end
          `}
        </div>

        <h2>Auto-Refresh (Optional)</h2>
        <p>
          CCXP session tokens (ACIXSTORE) expire after approximately 30 minutes.
          If you check "Save credentials for auto-refresh", the system will:
        </p>
        <ul>
          <li>
            Encrypt your password with <b>AES-256-GCM</b> and store it securely
            on our server.
          </li>
          <li>Automatically re-login to CCXP when your ACIXSTORE expires.</li>
          <li>
            Rotate the credential token on each refresh, reducing the risk of
            compromise.
          </li>
          <li>Automatically delete stored credentials after 30 days.</li>
        </ul>
        <p>
          Without this option, you will need to log in again manually when your
          session expires.
        </p>

        <h2>Security Details</h2>
        <ul>
          <li>
            Your password is <b>never stored on your device</b>.
          </li>
          <li>
            Server-side encrypted passwords use a private encryption key that is
            never exposed.
          </li>
          <li>
            The <code>credentialToken</code> returned to your device is an
            opaque UUID — it contains no password information.
          </li>
          <li>
            The login endpoint is rate-limited to prevent brute-force attacks.
          </li>
          <li>
            You can log out at any time; stored server credentials are
            immediately deleted.
          </li>
        </ul>

        <h2>References</h2>
        <p>
          For detailed code, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb">
            NTHUMods GitHub
          </a>
          .
        </p>
      </article>
      <Footer />
    </div>
  );
};

const ProxyLoginExplainerPage = () => {
  const { lang } = useParams<{ lang: string }>();
  return (
    <>{lang === "zh" ? <ProxyLoginExplainerZH /> : <ProxyLoginExplainerEN />}</>
  );
};

export default ProxyLoginExplainerPage;
