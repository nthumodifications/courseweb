"use client";
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
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/03/04</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>什麼是 NTHUMods 代理登入？</h2>
        <p>
          NTHUMods 代理登入是一個幫助用戶在 NTHUMods
          平台上安全登入清華大學校務資訊系統（CCXP）的工具。它使用加密技術來保護用戶的帳戶和密碼，確保用戶的資訊安全。這是使用
          <a href="/zh/web-for-beginners/auth">身份驗證系統</a>的重要組成部分。
        </p>

        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
          <p className="text-sm">
            <strong>注意：</strong> 如需完整的技術詳情，請參閱
            <a href="/zh/web-for-beginners/auth">身份驗證與會話管理</a>
            頁面。本頁面提供簡化的概述。
          </p>
        </div>

        <h2>代理登入與其他功能的關係</h2>
        <p>代理登入功能是 NTHUMods 眾多功能的基礎，它使您能夠安全地訪問：</p>
        <ul>
          <li>
            <a href="/zh/web-for-beginners/course">課程資訊和選課功能</a> -
            瀏覽、搜尋和管理您的課程
          </li>
          <li>
            <a href="/zh/web-for-beginners/grades">成績查詢系統</a> -
            安全查看您的學業成績
          </li>
          <li>
            <a href="/zh/web-for-beginners/comment-dates">重要日期與評論系統</a>{" "}
            - 了解關鍵學術日期和課程評論
          </li>
          <li>
            <a href="/zh/web-for-beginners/misc">其他實用工具</a> - 探索更多
            NTHUMods 提供的功能
          </li>
        </ul>

        <h2>如何使用您的帳戶資訊？</h2>
        <p>
          在使用 NTHUMods
          代理登入時，我們需要您的學號和密碼來進行首次登入驗證。登入過程簡述如下：
        </p>
        <ol>
          <li>發送請求到校務資訊系統登入頁面，獲取驗證碼圖片。</li>
          <li>使用 OCR 技術自動解碼驗證碼。</li>
          <li>提交學號、密碼和驗證碼進行登入。</li>
          <li>驗證登入狀態並獲取會話令牌。</li>
        </ol>
        <p className="font-bold">
          您的資訊僅存儲在用戶設備上！我們不會儲存任何帳戶資料（我們沒錢幫您們儲存）
        </p>

        <h2>如何保護您的資訊？</h2>
        <p>我們採取以下基本步驟來保護您的資訊：</p>
        <ul>
          <li>
            <b>您的資訊僅存儲在用戶設備上</b> -
            所有敏感信息都不會存儲在我們的服務器上。
          </li>
          <li>在您的設備上儲存的密碼會使用 AES-256-CBC 加密技術來加密。</li>
          <li>基本密碼處理流程：</li>
          <div className="mermaid">
            {`
                    graph TD;
                        A[用戶輸入密碼] -->|加密| B[加密密碼];
                        B --> C[存儲於用戶設備];
                        C -->|需要時解密| D[使用密碼登入];
                    `}
          </div>
          <li>
            <i>
              更詳細的加密過程請參閱
              <a href="/zh/web-for-beginners/auth">身份驗證頁面</a>
            </i>
          </li>
        </ul>

        <h2>代理登入基本流程</h2>
        <p>以下是代理登入的簡化流程，提供基本了解：</p>
        <div className="mermaid">
          {`
                graph TD;
                subgraph 用戶設備
                    A1[用戶輸入學號和密碼] --> B1[發送登入請求];
                end
                subgraph 伺服器
                    B1 --> C1[獲取並處理驗證碼];
                    C1 --> F1[驗證登入並建立會話];
                    F1 -->|成功| G1[返回會話令牌];
                    F1 -->|失敗| H1[返回錯誤];
                end
                G1 --> I1[用戶設備];
                subgraph 自動更新
                    J1[需要使用CCXP功能時] --> K1[使用加密密碼自動更新會話];
                end
                `}
        </div>
        <p>
          <i>
            如需詳細的流程圖和完整說明，請參閱
            <a href="/zh/web-for-beginners/auth">身份驗證頁面</a>
          </i>
        </p>

        <h2>什麽時候會自動重新驗證？</h2>
        <p>
          在JWT過期或有開啓鏈接校務資訊系統的功能時（如
          <a href="/zh/web-for-beginners/course">課程資訊</a>或
          <a href="/zh/web-for-beginners/grades">成績查詢</a>
          ），系統將自動更新您的會話。
        </p>

        <h2>參考連結</h2>
        <p>
          詳細程式碼請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/headless_ais.ts">
            NTHUMods Github
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

// English Version
const ProxyLoginExplainerEN = () => {
  useMermaid();
  return (
    <div className="px-4 py-8">
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">NTHUMods Proxy Login Explained</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Last Updated: 2025/03/04
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>What is NTHUMods Proxy Login?</h2>
        <p>
          {
            "NTHUMods Proxy Login is a tool that helps users securely log into the NTHU Academic Information System (CCXP) through the NTHUMods platform. It uses encryption technology to protect users' accounts and passwords, ensuring information security. This is an essential component of our "
          }
          <a href="/web-for-beginners/auth">Authentication System</a>.
        </p>

        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Note:</strong> For complete technical details, please refer
            to the{" "}
            <a href="/web-for-beginners/auth">
              Authentication and Session Management
            </a>{" "}
            page. This page provides a simplified overview.
          </p>
        </div>

        <h2>How Proxy Login Connects to Other Features</h2>
        <p>
          The proxy login feature is the foundation for many NTHUMods functions,
          enabling you to securely access:
        </p>
        <ul>
          <li>
            <a href="/web-for-beginners/course">
              Course Information and Registration
            </a>{" "}
            - Browse, search, and manage your courses
          </li>
          <li>
            <a href="/web-for-beginners/grades">Grade Query System</a> -
            Securely view your academic records
          </li>
          <li>
            <a href="/web-for-beginners/comment-dates">
              Important Dates and Course Reviews
            </a>{" "}
            - Stay informed of key academic dates and course feedback
          </li>
          <li>
            <a href="/web-for-beginners/misc">Other Useful Tools</a> - Explore
            additional features offered by NTHUMods
          </li>
        </ul>

        <h2>How We Use Your Account Information</h2>
        <p>
          When using NTHUMods Proxy Login, we need your student ID and password
          for initial login verification. The login process is briefly described
          as follows:
        </p>
        <ol>
          <li>
            Send a request to the university information system login page to
            obtain a CAPTCHA image.
          </li>
          <li>Use OCR technology to automatically solve the CAPTCHA.</li>
          <li>Submit student ID, password, and CAPTCHA solution for login.</li>
          <li>Verify login status and obtain a session token.</li>
        </ol>
        <p className="font-bold">
          {
            "Your information is stored only on your device! We do not store any account data (we can't afford to store it for you)"
          }
          .
        </p>

        <h2>How We Protect Your Information</h2>
        <p>We take the following basic steps to protect your information:</p>
        <ul>
          <li>
            <b>Your information is stored only on your device</b> - All
            sensitive information is never stored on our servers.
          </li>
          <li>
            Passwords stored on your device are encrypted using AES-256-CBC
            encryption technology.
          </li>
          <li>Basic password handling process:</li>
          <div className="mermaid">
            {`
                    graph TD;
                        A[User enters password] -->|Encryption| B[Encrypted password];
                        B --> C[Stored on user device];
                        C -->|Decryption when needed| D[Use password for login];
                    `}
          </div>
          <li>
            <i>
              For more detailed encryption process, please refer to the{" "}
              <a href="/web-for-beginners/auth">Authentication page</a>
            </i>
          </li>
        </ul>

        <h2>Basic Proxy Login Process</h2>
        <p>
          Here is a simplified flow of the proxy login, providing a basic
          understanding:
        </p>
        <div className="mermaid">
          {`
                graph TD;
                subgraph User Device
                    A1[User enters ID and password] --> B1[Send login request];
                end
                subgraph Server
                    B1 --> C1[Get and process CAPTCHA];
                    C1 --> F1[Verify login and establish session];
                    F1 -->|Success| G1[Return session token];
                    F1 -->|Failure| H1[Return error];
                end
                G1 --> I1[User Device];
                subgraph Automatic Updates
                    J1[When CCXP features are needed] --> K1[Automatically update session using encrypted password];
                end
                `}
        </div>
        <p>
          <i>
            For detailed flowcharts and complete explanations, please refer to
            the <a href="/web-for-beginners/auth">Authentication page</a>
          </i>
        </p>

        <h2>When Automatic Re-authentication Occurs</h2>
        <p>
          When your JWT expires or when you access features linked to the
          university information system (such as{" "}
          <a href="/web-for-beginners/course">Course Information</a> or{" "}
          <a href="/web-for-beginners/grades">Grade Queries</a>), the system
          automatically updates your session.
        </p>

        <h2>References</h2>
        <p>
          For detailed code, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/headless_ais.ts">
            NTHUMods Github
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
