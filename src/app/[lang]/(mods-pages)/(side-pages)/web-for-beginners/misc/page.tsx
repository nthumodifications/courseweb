import Script from "next/script";
import Footer from "@/components/Footer";

const MiscExplainerZH = () => {
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
        <h1 className="text-5xl font-bold">NTHUMods 其他功能說明</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/02/20</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>宿舍門禁與包裹系統</h2>
        <p>
          NTHUMods 提供了一系列與學生事務處（OSA）系統整合的功能，包括宿舍門禁
          QR Code 和包裹查詢系統。這些功能使用了多步驟的認證流程來確保安全性。
        </p>

        <h2>認證流程說明</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
              participant D as 用戶設備
              participant S as NTHUMods 伺服器
              participant C as CCXP
              participant O as OSA系統
              
              D->>C: 使用 ACIXSTORE 請求 OAuth 連結
              C->>O: 重定向到 OSA OAuth
              O-->>D: 返回 OSA Code
              
              D->>O: 使用 Code 獲取用戶ID和刷新令牌
              O-->>D: 返回用戶資訊和刷新令牌
              
              D->>O: 使用刷新令牌請求訪問令牌
              O-->>D: 返回訪問令牌和 Session
              
              Note over D,O: 以下操作使用獲得的令牌
              
              D->>O: 請求門禁 QR Code
              O-->>D: 返回 QR Code 圖片
              
              D->>O: 請求包裹資訊
              O-->>D: 返回包裹列表
          `}
        </div>

        <h2>功能說明</h2>
        <h3>1. OSA Code 獲取 (getOSACode)</h3>
        <ul>
          <li>使用 ACIXSTORE 通過校務系統獲取 OSA 的授權碼</li>
          <li>完全在伺服器端執行，確保安全性</li>
          <li>不儲存任何認證信息</li>
        </ul>

        <h3>2. OSA 訪問令牌獲取 (getOSAAccessToken)</h3>
        <ul>
          <li>使用授權碼獲取訪問令牌</li>
          <li>生成唯一設備 ID</li>
          <li>獲取必要的 session 信息</li>
          <li>所有令牌僅暫存於用戶設備</li>
        </ul>

        <h3>3. 門禁 QR Code (getDoorAccessQR)</h3>
        <ul>
          <li>使用有效的訪問令牌獲取即時 QR Code</li>
          <li>QR Code 定期更新以確保安全性</li>
        </ul>

        <h3>4. 包裹信息查詢 (getParcelInformation)</h3>
        <ul>
          <li>查詢當前待領取的包裹信息</li>
          <li>顯示包裹狀態、物流信息等</li>
        </ul>

        <h2>iLMS (eeclass) 登入</h2>
        <p>我們也提供了 iLMS 系統的代理登入功能，使用類似的安全機制：</p>
        <div className="mermaid">
          {`
          sequenceDiagram
              participant D as 用戶設備
              participant S as NTHUMods 伺服器
              participant O as OAuth伺服器
              participant E as iLMS系統
              
              D->>O: 請求 OAuth 登入頁面
              O-->>D: 返回登入頁面與驗證碼
              
              D->>S: 發送驗證碼進行識別
              S-->>D: 返回識別結果
              
              D->>O: 提交登入資訊
              O-->>E: 重定向到 iLMS
              E-->>D: 完成登入
          `}
        </div>

        <h2>安全注意事項</h2>
        <ul>
          <li>所有認證信息僅在用戶設備上暫存</li>
          <li>服務器不保存任何用戶憑證</li>
          <li>使用加密通道傳輸所有數據</li>
          <li>定期更新令牌確保安全性</li>
        </ul>

        <h2>參考連結</h2>
        <p>
          詳細程式碼請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb">
            NTHUMods Github
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const MiscExplainerEN = () => {
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
        <h1 className="text-5xl font-bold">
          NTHUMods Miscellaneous Features Explanation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Updated on: 2025/02/20
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>Dormitory Access and Parcel System</h2>
        <p>
          NTHUMods provides a series of features integrated with the Office of
          Student Affairs (OSA) system, including dormitory access QR codes and
          parcel inquiry systems. These features use a multi-step authentication
          process to ensure security.
        </p>

        <h2>Authentication Process</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
              participant D as User Device
              participant S as NTHUMods Server
              participant C as CCXP
              participant O as OSA System
              
              D->>C: Request OAuth link using ACIXSTORE
              C->>O: Redirect to OSA OAuth
              O-->>D: Return OSA Code
              
              D->>O: Get User ID and Refresh Token using Code
              O-->>D: Return User Info and Refresh Token
              
              D->>O: Request Access Token using Refresh Token
              O-->>D: Return Access Token and Session
              
              Note over D,O: Following operations use obtained tokens
              
              D->>O: Request Door Access QR Code
              O-->>D: Return QR Code Image
              
              D->>O: Request Parcel Information
              O-->>D: Return Parcel List
          `}
        </div>

        <h2>Feature Details</h2>
        <h3>1. OSA Code Acquisition (getOSACode)</h3>
        <ul>
          <li>
            Uses ACIXSTORE to obtain OSA authorization code through the academic
            system
          </li>
          <li>Executed entirely server-side for security</li>
          <li>No credentials are stored</li>
        </ul>

        <h3>2. OSA Access Token Acquisition (getOSAAccessToken)</h3>
        <ul>
          <li>Uses authorization code to obtain access token</li>
          <li>Generates unique device ID</li>
          <li>Obtains necessary session information</li>
          <li>All tokens are temporarily stored only on user device</li>
        </ul>

        <h3>3. Door Access QR Code (getDoorAccessQR)</h3>
        <ul>
          <li>Uses valid access token to obtain real-time QR code</li>
          <li>QR code updates periodically for security</li>
        </ul>

        <h3>4. Parcel Information Query (getParcelInformation)</h3>
        <ul>
          <li>Queries current pending parcels</li>
          <li>Displays parcel status and logistics information</li>
        </ul>

        <h2>iLMS (eeclass) Login</h2>
        <p>
          We also provide proxy login functionality for the iLMS system, using
          similar security mechanisms:
        </p>
        <div className="mermaid">
          {`
          sequenceDiagram
              participant D as User Device
              participant S as NTHUMods Server
              participant O as OAuth Server
              participant E as iLMS System
              
              D->>O: Request OAuth login page
              O-->>D: Return login page with captcha
              
              D->>S: Send captcha for recognition
              S-->>D: Return recognition result
              
              D->>O: Submit login information
              O-->>E: Redirect to iLMS
              E-->>D: Complete login
          `}
        </div>

        <h2>Security Considerations</h2>
        <ul>
          <li>
            All authentication information is temporarily stored only on user
            devices
          </li>
          <li>Servers do not store any user credentials</li>
          <li>All data is transmitted through encrypted channels</li>
          <li>Tokens are updated regularly for security</li>
        </ul>

        <h2>Reference Links</h2>
        <p>
          For detailed code, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb">
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

const MiscExplainerPage = ({ params }: LangProps) => {
  return (
    <>{params.lang === "zh" ? <MiscExplainerZH /> : <MiscExplainerEN />}</>
  );
};

export default MiscExplainerPage;
