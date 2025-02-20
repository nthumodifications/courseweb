import Script from "next/script";
import Footer from "@/components/Footer";

const AuthenticationExplainerZH = () => {
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
        <h1 className="text-5xl font-bold">身份驗證與會話管理</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/02/20</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>什麼是 NTHUMods 身份驗證系統？</h2>
        <p>
          NTHUMods
          身份驗證系統是一種安全機制，幫助用戶登錄清華大學校務資訊系統（CCXP）的同時保護他們的憑證。該系統使用加密、代理驗證和令牌管理，確保用戶數據在整個過程中保持安全。
        </p>

        <h2>如何保護您的信息</h2>
        <p>我們採取多種安全措施來保護您的登錄信息：</p>
        <ol>
          <li>
            <strong>僅客戶端存儲</strong>：您的憑證
            <strong>永遠不會存儲在我們的服務器上</strong>
            。所有敏感信息都經過加密，且僅存儲在您的設備上。
          </li>
          <li>
            <strong>AES-256-CBC 加密</strong>：任何存儲的密碼都使用行業標準的
            AES-256-CBC 加密來保護您的信息。
          </li>
          <li>
            <strong>臨時處理</strong>
            ：您的未加密密碼僅在身份驗證過程中短暫使用，永遠不會被持久化存儲。
          </li>
          <li>
            <strong>JWT 會話管理</strong>：我們使用 JSON Web Tokens
            來管理已認證的會話，最大限度地減少使用您密碼的需要。
          </li>
        </ol>

        <h2>核心身份驗證函數</h2>

        <h3>signInToCCXP</h3>
        <p>此函數處理 CCXP 系統的初始登錄過程。</p>
        <p>
          <strong>用途</strong>：用於首次登錄，需要提供您的學號和密碼。
        </p>
        <p>
          <strong>執行位置</strong>：此函數<strong>僅在我們的服務器上</strong>
          執行，絕不在您的設備上執行。
        </p>
        <p>
          <strong>執行流程</strong>：
        </p>
        <ol>
          <li>獲取登錄頁面以獲得 CAPTCHA 驗證碼挑戰</li>
          <li>使用 OCR 技術自動解決 CAPTCHA 驗證碼</li>
          <li>提交您的憑證和 CAPTCHA 驗證碼解決方案</li>
          <li>驗證成功登錄並提取 ACIXSTORE 會話令牌</li>
          <li>在返回給您的設備前加密您的密碼</li>
          <li>獲取您的用戶個人資料信息（對於非交換生學生）</li>
          <li>生成 Firebase 身份驗證令牌</li>
        </ol>
        <p>
          <strong>返回值</strong>：
        </p>
        <ul>
          <li>ACIXSTORE（會話令牌）</li>
          <li>加密密碼（用於將來自動登錄）</li>
          <li>指示您的密碼是否已過期的標誌</li>
          <li>Firebase 訪問令牌</li>
        </ul>
        <p>
          <strong>安全說明</strong>
          ：您的原始密碼僅在此過程中臨時使用，永遠不會存儲在我們的服務器上。
        </p>

        <h3>refreshUserSession</h3>
        <p>此函數使用您的加密密碼刷新您的登錄會話。</p>
        <p>
          <strong>用途</strong>：在您的會話過期或需要訪問連接 CCXP
          的功能時使用。
        </p>
        <p>
          <strong>執行位置</strong>：此函數<strong>僅在我們的服務器上</strong>
          執行，但使用存儲在您設備上的加密密碼。
        </p>
        <p>
          <strong>執行流程</strong>：
        </p>
        <ol>
          <li>解密您的密碼（在初始登錄期間加密）</li>
          <li>使用您的解密憑證調用 signInToCCXP</li>
          <li>返回一個新的 ACIXSTORE 會話令牌</li>
        </ol>
        <p>
          <strong>返回值</strong>：
        </p>
        <ul>
          <li>新的 ACIXSTORE 會話令牌</li>
          <li>密碼過期狀態</li>
          <li>刷新的 Firebase 訪問令牌</li>
        </ul>

        <h3>fetchSignInToCCXP（客戶端函數）</h3>
        <p>這是瀏覽器調用以啟動登錄過程的客戶端函數。</p>
        <p>
          <strong>用途</strong>：為您的瀏覽器提供一種安全方式來調用服務器端的
          signInToCCXP 函數。
        </p>
        <p>
          <strong>執行位置</strong>：此函數<strong>在您的設備上</strong>
          （在您的瀏覽器中）執行。
        </p>
        <p>
          <strong>執行流程</strong>：
        </p>
        <ol>
          <li>從登錄表單收集您的憑證</li>
          <li>安全地調用服務器端 signInToCCXP 函數</li>
          <li>接收並安全地將加密憑證存儲在您瀏覽器的本地存儲中</li>
        </ol>

        <h3>fetchRefreshUserSession（客戶端函數）</h3>
        <p>這是在需要時刷新您的會話的客戶端函數。</p>
        <p>
          <strong>用途</strong>：允許您的瀏覽器刷新您的 CCXP
          會話，而無需您重新輸入憑證。
        </p>
        <p>
          <strong>執行位置</strong>：此函數<strong>在您的設備上</strong>
          （在您的瀏覽器中）執行。
        </p>
        <p>
          <strong>執行流程</strong>：
        </p>
        <ol>
          <li>從本地存儲中檢索您的加密密碼</li>
          <li>安全地調用服務器端 refreshUserSession 函數</li>
          <li>使用新的 ACIXSTORE 令牌更新您的會話信息</li>
        </ol>

        <h2>詳細身份驗證流程</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
              participant User as 用戶設備
              participant NTHUMods as NTHUMods 服務器
              participant CCXP as 清大 CCXP 系統
              
              %% 初始登錄流程
              rect rgb(230, 240, 255)
                  Note over User, CCXP: 初始登錄過程 (signInToCCXP)
                  User->>NTHUMods: fetchSignInToCCXP(學號, 密碼)
                  activate NTHUMods
                  NTHUMods->>CCXP: 請求登錄頁面
                  CCXP-->>NTHUMods: 返回帶有驗證碼的登錄頁面
                  NTHUMods->>NTHUMods: OCR 處理解決驗證碼
                  NTHUMods->>CCXP: 提交登錄(學號, 密碼, 驗證碼)
                  CCXP-->>NTHUMods: 返回 ACIXSTORE 會話令牌
                  
                  alt 是交換生
                      NTHUMods->>NTHUMods: 生成最小用戶配置
                  else 是普通學生
                      NTHUMods->>CCXP: 使用 ACIXSTORE 獲取用戶資料
                      CCXP-->>NTHUMods: 返回用戶詳細資料
                  end
                  
                  NTHUMods->>NTHUMods: 生成 Firebase 訪問令牌
                  NTHUMods->>NTHUMods: 使用 AES-256-CBC 加密密碼
                  NTHUMods-->>User: 返回 {ACIXSTORE, 加密密碼, 訪問令牌}
                  deactivate NTHUMods
                  
                  User->>User: 在本地存儲中存儲加密密碼
                  User->>User: 存儲訪問令牌用於身份驗證
              end
              
              %% 會話刷新流程
              rect rgb(255, 240, 230)
                  Note over User, CCXP: 會話刷新過程 (refreshUserSession)
                  User->>NTHUMods: fetchRefreshUserSession(學號, 加密密碼)
                  activate NTHUMods
                  NTHUMods->>NTHUMods: 解密密碼
                  NTHUMods->>CCXP: 使用解密的憑據重複登錄過程
                  CCXP-->>NTHUMods: 返回新的 ACIXSTORE 會話令牌
                  NTHUMods-->>User: 返回 {ACIXSTORE, 密碼過期狀態, 訪問令牌}
                  deactivate NTHUMods
                  
                  User->>User: 更新會話信息
              end
              
              %% 密碼變更流程（可選）
              rect rgb(240, 255, 240)
                  Note over User, CCXP: 密碼變更過程 (updateUserPassword)
                  User->>NTHUMods: 請求變更密碼
                  activate NTHUMods
                  NTHUMods->>CCXP: 提交密碼變更請求
                  CCXP-->>NTHUMods: 確認密碼變更
                  NTHUMods-->>User: 返回成功/失敗
                  deactivate NTHUMods
                  
                  alt 密碼成功變更
                      User->>User: 更新存儲的加密密碼
                  end
              end
          `}
        </div>

        <h2>加密過程</h2>
        <p>系統使用強大的 AES-256-CBC 加密來保護您的密碼：</p>
        <div className="mermaid">
          {`
          graph TD
              A[用戶輸入密碼] -->|初始登錄| B[密碼通過 HTTPS 發送到服務器]
              B -->|臨時處理| C[密碼用於 CCXP 登錄]
              C -->|身份驗證後| D[密碼使用 AES-256-CBC 加密]
              D -->|僅返回加密版本| E[加密密碼返回至用戶設備]
              E -->|僅本地存儲| F[加密密碼存儲在用戶設備上]
              
              G[需要會話刷新] -->|用戶不需重新輸入密碼| H[加密密碼發送到服務器]
              H -->|僅服務器端| I[密碼臨時解密]
              I -->|用於重新認證| J[建立新會話]
              J -->|僅會話令牌| K[新的 ACIXSTORE 返回至設備]
          `}
        </div>

        <h2>重要安全說明</h2>
        <ol>
          <li>
            <strong>您的憑證永遠不會存儲在我們的服務器上</strong> -
            我們沒有資源來存儲它們，而且我們也不想承擔這個責任！
          </li>
          <li>
            <strong>服務器端處理</strong> -
            雖然您的原始密碼必須在我們的服務器上臨時處理以與 CCXP
            進行身份驗證，但它永遠不會被記錄或持久化存儲。
          </li>
          <li>
            <strong>加密密鑰安全</strong> -
            用於加密/解密您密碼的加密密鑰作為環境變量安全地存儲在我們的服務器上。
          </li>
          <li>
            <strong>密碼可見性</strong> - 您的密碼對 NTHUMods
            管理員或開發人員永遠不可見。
          </li>
          <li>
            <strong>傳輸安全</strong> - 您的設備與我們服務器之間的所有通信都使用
            HTTPS 加密。
          </li>
        </ol>

        <h2>什麼時候進行自動重新認證</h2>
        <p>在以下情況下，您的會話將自動刷新：</p>
        <ol>
          <li>當您的 JWT 令牌過期時</li>
          <li>當您訪問需要 CCXP 認證的功能時</li>
          <li>當您明確請求會話刷新時</li>
        </ol>
        <p>在自動重新認證期間：</p>
        <ol>
          <li>您的設備將加密密碼發送到我們的服務器</li>
          <li>我們的服務器臨時解密它以與 CCXP 進行身份驗證</li>
          <li>生成新的 ACIXSTORE 令牌並返回到您的設備</li>
        </ol>

        <h2>參考連結</h2>
        <p>
          如需詳細實現，請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/headless_ais.ts">
            NTHUMods Github 倉庫
          </a>
          。
        </p>

        <h2>常見問題</h2>
        <p>
          <strong>問：我的密碼是否存儲在 NTHUMods 服務器上？</strong>
          <br />
          答：否。您的密碼永遠不會存儲在我們的服務器上。加密版本僅存儲在您自己的設備上。
        </p>

        <p>
          <strong>問：NTHUMods 工作人員能看到我的密碼嗎？</strong>
          <br />
          答：不能。您的密碼僅在身份驗證期間臨時處理，從不被記錄或對工作人員可訪問。
        </p>

        <p>
          <strong>問：如果有人竊取了我的加密密碼會怎樣？</strong>
          <br />
          答：加密使用 AES-256-CBC
          與僅存在於我們服務器上的安全密鑰。沒有這個密鑰，加密密碼無法被解密。
        </p>

        <p>
          <strong>問：我需要多久重新輸入一次密碼？</strong>
          <br />
          答：您通常只需輸入一次密碼。使用您的加密密碼在後台自動進行會話刷新。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const AuthenticationExplainerEN = () => {
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
          Authentication and Session Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Updated on: 2025/02/20
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>What is NTHUMods Authentication System?</h2>
        <p>
          NTHUMods Authentication System is a secure mechanism that helps users
          log in to the NTHU school information system (CCXP) while protecting
          their credentials. The system uses encryption, proxied authentication,
          and token management to ensure user data remains secure throughout the
          process.
        </p>

        <h2>How Your Information is Protected</h2>
        <p>
          We take multiple security measures to protect your login information:
        </p>
        <ol>
          <li>
            <strong>Client-side storage only</strong>: Your credentials are{" "}
            <strong>never stored on our servers</strong>. All sensitive
            information is encrypted and stored only on your device.
          </li>
          <li>
            <strong>AES-256-CBC encryption</strong>: Any stored passwords use
            industry-standard AES-256-CBC encryption to protect your
            information.
          </li>
          <li>
            <strong>Temporary processing</strong>: Your unencrypted password is
            only used momentarily during the authentication process and is never
            persisted.
          </li>
          <li>
            <strong>JWT for session management</strong>: We use JSON Web Tokens
            to manage authenticated sessions, minimizing the need to use your
            password.
          </li>
        </ol>

        <h2>Core Authentication Functions</h2>

        <h3>signInToCCXP</h3>
        <p>
          This function handles the initial login process to the CCXP system.
        </p>
        <p>
          <strong>Purpose</strong>: Used for first-time login when you need to
          provide your studentID and password.
        </p>
        <p>
          <strong>Where it runs</strong>: This function runs{" "}
          <strong>exclusively on our server</strong> and is never executed on
          your device.
        </p>
        <p>
          <strong>What it does</strong>:
        </p>
        <ol>
          <li>Fetches the login page to get a CAPTCHA challenge</li>
          <li>Uses OCR technology to automatically solve the CAPTCHA</li>
          <li>Submits your credentials with the CAPTCHA solution</li>
          <li>
            Verifies successful login and extracts the ACIXSTORE session token
          </li>
          <li>Encrypts your password before returning it to your device</li>
          <li>
            Fetches your user profile information (for non-exchange students)
          </li>
          <li>Generates a Firebase authentication token</li>
        </ol>
        <p>
          <strong>What it returns</strong>:
        </p>
        <ul>
          <li>ACIXSTORE (session token)</li>
          <li>Encrypted password (for future automatic logins)</li>
          <li>Flag indicating if your password has expired</li>
          <li>Firebase access token</li>
        </ul>
        <p>
          <strong>Security note</strong>: Your raw password is only used
          temporarily during this process and is never stored on our servers.
        </p>

        <h3>refreshUserSession</h3>
        <p>
          This function refreshes your login session using your encrypted
          password.
        </p>
        <p>
          <strong>Purpose</strong>: Used when your session expires or when you
          need to access CCXP-connected features.
        </p>
        <p>
          <strong>Where it runs</strong>: This function runs{" "}
          <strong>exclusively on our server</strong> but uses your encrypted
          password stored on your device.
        </p>
        <p>
          <strong>What it does</strong>:
        </p>
        <ol>
          <li>
            Decrypts your password (which was encrypted during initial login)
          </li>
          <li>Calls signInToCCXP with your decrypted credentials</li>
          <li>Returns a fresh ACIXSTORE session token</li>
        </ol>
        <p>
          <strong>What it returns</strong>:
        </p>
        <ul>
          <li>New ACIXSTORE session token</li>
          <li>Password expiration status</li>
          <li>Refreshed Firebase access token</li>
        </ul>

        <h3>fetchSignInToCCXP (Client Function)</h3>
        <p>
          This is the client-side function that your browser calls to initiate
          the login process.
        </p>
        <p>
          <strong>Purpose</strong>: Provides a secure way for your browser to
          call the server-side signInToCCXP function.
        </p>
        <p>
          <strong>Where it runs</strong>: This function runs{" "}
          <strong>on your device</strong> (in your browser).
        </p>
        <p>
          <strong>What it does</strong>:
        </p>
        <ol>
          <li>Collects your credentials from the login form</li>
          <li>
            Makes a secure API call to the server-side signInToCCXP function
          </li>
          <li>
            {
              "Receives and securely stores the encrypted credentials in your browser's local storage"
            }
          </li>
        </ol>

        <h3>fetchRefreshUserSession (Client Function)</h3>
        <p>
          This is the client-side function that refreshes your session when
          needed.
        </p>
        <p>
          <strong>Purpose</strong>: Allows your browser to refresh your CCXP
          session without requiring you to re-enter credentials.
        </p>
        <p>
          <strong>Where it runs</strong>: This function runs{" "}
          <strong>on your device</strong> (in your browser).
        </p>
        <p>
          <strong>What it does</strong>:
        </p>
        <ol>
          <li>Retrieves your encrypted password from local storage</li>
          <li>
            Makes a secure API call to the server-side refreshUserSession
            function
          </li>
          <li>Updates your session information with the new ACIXSTORE token</li>
        </ol>

        <h2>Detailed Authentication Flow</h2>
        <div className="mermaid">
          {`
            sequenceDiagram
                participant User as User's Device
                participant NTHUMods as NTHUMods Server
                participant CCXP as NTHU CCXP System
                
                %% Initial Login Flow
                rect rgb(230, 240, 255)
                    Note over User, CCXP: Initial Login Process (signInToCCXP)
                    User->>NTHUMods: fetchSignInToCCXP(studentID, password)
                    activate NTHUMods
                    NTHUMods->>CCXP: Request login page
                    CCXP-->>NTHUMods: Return login page with CAPTCHA
                    NTHUMods->>NTHUMods: OCR process to solve CAPTCHA
                    NTHUMods->>CCXP: Submit login (studentID, password, CAPTCHA)
                    CCXP-->>NTHUMods: Return ACIXSTORE session token
                    
                    alt is Exchange Student
                        NTHUMods->>NTHUMods: Generate minimal user profile
                    else is Regular Student
                        NTHUMods->>CCXP: Fetch user profile using ACIXSTORE
                        CCXP-->>NTHUMods: Return user profile details
                    end
                    
                    NTHUMods->>NTHUMods: Generate Firebase access token
                    NTHUMods->>NTHUMods: Encrypt password using AES-256-CBC
                    NTHUMods-->>User: Return {ACIXSTORE, encryptedPassword, accessToken}
                    deactivate NTHUMods
                    
                    User->>User: Store encryptedPassword in local storage
                    User->>User: Store accessToken for authentication
                end
                
                %% Session Refresh Flow
                rect rgb(255, 240, 230)
                    Note over User, CCXP: Session Refresh Process (refreshUserSession)
                    User->>NTHUMods: fetchRefreshUserSession(studentID, encryptedPassword)
                    activate NTHUMods
                    NTHUMods->>NTHUMods: Decrypt password
                    NTHUMods->>CCXP: Repeat login process with decrypted credentials
                    CCXP-->>NTHUMods: Return new ACIXSTORE session token
                    NTHUMods-->>User: Return {ACIXSTORE, passwordExpired, accessToken}
                    deactivate NTHUMods
                    
                    User->>User: Update session information
                end
                
                %% Password Change Flow (Optional)
                rect rgb(240, 255, 240)
                    Note over User, CCXP: Password Change Process (updateUserPassword)
                    User->>NTHUMods: Request password change
                    activate NTHUMods
                    NTHUMods->>CCXP: Submit password change request
                    CCXP-->>NTHUMods: Confirm password change
                    NTHUMods-->>User: Return success/failure
                    deactivate NTHUMods
                    
                    alt Password Changed Successfully
                        User->>User: Update stored encrypted password
                    end
                end
            `}
        </div>

        <h2>Encryption Process</h2>
        <p>
          The system uses strong AES-256-CBC encryption to protect your
          password:
        </p>
        <div className="mermaid">
          {`
            graph TD
                A[User enters password] -->|Initial login| B[Password sent to server over HTTPS]
                B -->|Temporary processing| C[Password used for CCXP login]
                C -->|After authentication| D[Password encrypted with AES-256-CBC]
                D -->|Only encrypted version stored| E[Encrypted password returned to user device]
                E -->|Local storage only| F[Encrypted password stored on user device]
                
                G[Session refresh needed] -->|User doesn't re-enter password| H[Encrypted password sent to server]
                H -->|Server-side only| I[Password decrypted temporarily]
                I -->|Used for reauthentication| J[New session established]
                J -->|Session token only| K[New ACIXSTORE returned to device]
            `}
        </div>

        <h2>Important Security Notes</h2>
        <ol>
          <li>
            <strong>Your credentials are never stored on our servers</strong>
            {
              " - we don't have the resources to store them, and we don't want the responsibility!"
            }
          </li>
          <li>
            <strong>Server-side processing</strong> - While your raw password
            must be temporarily processed on our server to authenticate with
            CCXP, it is never logged or persisted.
          </li>
          <li>
            <strong>Encryption key security</strong> - The encryption key used
            to encrypt/decrypt your password is stored securely as an
            environment variable on our server.
          </li>
          <li>
            <strong>Password visibility</strong> - Your password is never
            visible to NTHUMods administrators or developers.
          </li>
          <li>
            <strong>Transport security</strong> - All communications between
            your device and our servers use HTTPS encryption.
          </li>
        </ol>

        <h2>When Automatic Re-authentication Occurs</h2>
        <p>
          Your session will be automatically refreshed in the following
          circumstances:
        </p>
        <ol>
          <li>When your JWT token expires</li>
          <li>When you access features that require CCXP authentication</li>
          <li>When you explicitly request a session refresh</li>
        </ol>
        <p>During automatic re-authentication:</p>
        <ol>
          <li>Your device sends the encrypted password to our server</li>
          <li>Our server temporarily decrypts it to authenticate with CCXP</li>
          <li>
            A new ACIXSTORE token is generated and returned to your device
          </li>
        </ol>

        <h2>Reference Links</h2>
        <p>
          For detailed implementation, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/headless_ais.ts">
            NTHUMods GitHub Repository
          </a>
          .
        </p>

        <h2>FAQ</h2>
        <p>
          <strong>Q: Is my password stored on NTHUMods servers?</strong>
          <br />
          A: No. Your password is never stored on our servers. The encrypted
          version is only stored on your own device.
        </p>

        <p>
          <strong>Q: Can NTHUMods staff see my password?</strong>
          <br />
          A: No. Your password is only processed temporarily during
          authentication and is never logged or accessible to staff.
        </p>

        <p>
          <strong>
            Q: What happens if someone steals my encrypted password?
          </strong>
          <br />
          A: The encryption uses AES-256-CBC with a secure key that only exists
          on our server. Without this key, the encrypted password cannot be
          decrypted.
        </p>

        <p>
          <strong>Q: How often do I need to re-enter my password?</strong>
          <br />
          A: You typically only need to enter your password once. Your encrypted
          password is used in the background for automatic session refreshes.
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
        <AuthenticationExplainerZH />
      ) : (
        <AuthenticationExplainerEN />
      )}
    </>
  );
};

export default ProxyLoginExplainerPage;
