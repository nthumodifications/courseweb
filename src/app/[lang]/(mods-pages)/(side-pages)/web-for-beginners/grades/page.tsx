import Script from "next/script";
import Footer from "@/components/Footer";

const GradesExplainerZH = () => {
  return (
    <div className="px-4 py-8">
      <Script
        id="mermaid"
        type="module"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                import mermaid from "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs";
                mermaid.initialize({startOnLoad: true, theme: ${"dark"}});
                mermaid.contentLoaded();`,
        }}
      />
      <div id="hero" className="flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold">NTHUMods 成績查詢功能說明</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/02/20</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>什麼是 NTHUMods 成績查詢功能？</h2>
        <p>
          NTHUMods
          成績查詢功能是一個讓您安全地從清華大學校務資訊系統（CCXP）獲取和查看您的學術成績的工具。
          它使用代理登入機制來獲取您的成績數據，同時確保您的憑證安全。
        </p>

        <h2>成績查詢功能如何運作？</h2>
        <p>
          成績查詢功能通過安全地將您的
          ACIXSTORE（認證令牌）傳遞給我們的伺服器，然後伺服器代表您向 CCXP
          系統發出請求。 ACIXSTORE
          是您通過我們的代理登入系統成功登入後生成的臨時認證令牌。
        </p>

        <h2>您的憑證在哪裡以及如何被處理？</h2>
        <p>了解這個過程的每個部分發生在哪裡非常重要：</p>
        <ol>
          <li>
            <b>您的設備</b>
            ：在成績檢索過程中，您的登入憑證（學號和密碼）永遠不會離開您的設備。ACIXSTORE
            令牌暫時存儲在您的瀏覽器中。
          </li>
          <li>
            <b>NTHUMods 伺服器</b>：我們的伺服器只接收 ACIXSTORE
            令牌（不是您的密碼）來向 CCXP 發出授權請求。
          </li>
          <li>
            <b>CCXP 伺服器</b>：官方清華大學學術信息系統，它驗證 ACIXSTORE
            令牌並返回您的成績數據。
          </li>
        </ol>
        <b>您的憑證永遠不會存儲在我們的伺服器上。</b>
        <p>ACIXSTORE 令牌是在您的設備和我們的伺服器之間傳輸的唯一認證信息。</p>

        <h2>詳細流程</h2>
        <p>
          <code>src/lib/headless_ais/grades.ts</code> 中的{" "}
          <code>getStudentGrades</code> 函數執行以下操作：
        </p>
        <ol>
          <li>接收 ACIXSTORE 令牌（從您之前的登入生成）</li>
          <li>使用此令牌向 CCXP 成績頁面發出請求</li>
          <li>
            解析返回的 HTML 以提取您的：
            <ul>
              <li>學生信息（學號、姓名、系所）</li>
              <li>學分信息（總學分、通過學分、待處理學分）</li>
              <li>詳細課程成績</li>
              <li>學術排名信息</li>
            </ul>
          </li>
        </ol>

        <h2>資料保護措施</h2>
        <p>我們通過以下措施保護您的數據：</p>
        <ul>
          <li>
            <b>不存儲憑證</b>：我們從不在我們的伺服器上存儲您的學號或密碼
          </li>
          <li>
            <b>臨時令牌使用</b>：ACIXSTORE 令牌的有效期有限，只用於特定請求
          </li>
          <li>
            <b>客戶端處理</b>：大部分數據處理在您的設備上進行
          </li>
          <li>
            <b>最小數據傳輸</b>：系統之間只傳輸必要的數據
          </li>
        </ul>

        <h2>流程圖</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
            participant 用戶設備
            participant NTHUMods伺服器
            participant CCXP伺服器
            
            Note over 用戶設備: 用戶已使用ACIXSTORE登入
            
            用戶設備->>NTHUMods伺服器: 使用ACIXSTORE請求成績數據
            
            Note over NTHUMods伺服器: 執行getStudentGrades函數
            
            NTHUMods伺服器->>CCXP伺服器: 使用ACIXSTORE請求成績頁面
            CCXP伺服器->>NTHUMods伺服器: 返回包含成績數據的HTML
            
            Note over NTHUMods伺服器: 解析HTML響應<br/>提取學生信息<br/>提取學分信息<br/>提取課程成績<br/>提取排名數據
            
            NTHUMods伺服器->>用戶設備: 返回結構化成績數據
            
            Note over 用戶設備: 向用戶顯示成績<br/>伺服器上不儲存任何憑證
          `}
        </div>

        <h2>技術實現細節</h2>
        <p>
          <code>getStudentGrades</code> 函數執行以下步驟：
        </p>
        <ol>
          <li>
            <b>URL 形成</b>：使用 ACIXSTORE 參數構建成績頁面的 URL
          </li>
          <li>
            <b>請求執行</b>：從 CCXP 伺服器獲取 HTML 內容
          </li>
          <li>
            <b>字符編碼處理</b>：使用 Big5 編碼（CCXP 使用的字符集）解碼響應
          </li>
          <li>
            <b>DOM 解析</b>：使用 LinkedDOM 解析 HTML 結構
          </li>
          <li>
            <b>數據提取</b>：
            <ul>
              <li>在 HTML 中定位特定表格</li>
              <li>使用正則表達式模式提取結構化信息</li>
              <li>解析學生詳細信息、學分計數和成績信息</li>
              <li>小心處理本科生和研究生不同格式的排名數據</li>
            </ul>
          </li>
        </ol>

        <h2>隱私和安全考慮</h2>
        <ul>
          <li>成績數據是實時獲取的，不會在我們的伺服器上緩存</li>
          <li>解析過程在伺服器端函數中進行，但不會持久保存任何用戶數據</li>
          <li>伺服器之間的所有通信都通過 HTTPS 進行，以確保傳輸中的加密</li>
          <li>ACIXSTORE 令牌僅在有限的會話中有效，並自動過期</li>
        </ul>

        <h2>參考連結</h2>
        <p>
          詳細代碼實現，請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/grades.ts">
            NTHUMods Github
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const GradesExplainerEN = () => {
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
          NTHUMods Grades Feature Explanation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Updated on: 2025/02/20
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert">
        <h2>What is NTHUMods Grades Feature?</h2>
        <p>
          NTHUMods Grades is a feature that allows you to securely retrieve and
          view your academic grades from the NTHU academic information system
          (CCXP). It uses a proxy login mechanism to fetch your grade data while
          maintaining the security of your credentials.
        </p>

        <h2>How does the Grades Feature work?</h2>
        <p>
          {
            "The Grades feature works by securely passing your ACIXSTORE (authentication token) to our server, which then makes requests to the CCXP system on your behalf. The ACIXSTORE is a temporary authentication token generated after you've successfully logged in through our proxy login system."
          }
        </p>

        <h2>Where and how are your credentials handled?</h2>
        <p>
          {
            "It's crucial to understand where each part of this process happens:"
          }
        </p>
        <ol>
          <li>
            <b>Your Device</b>: Your login credentials (student ID and password)
            never leave your device during the grades retrieval process. The
            ACIXSTORE token is stored temporarily in your browser.
          </li>
          <li>
            <b>NTHUMods Server</b>: Our server receives only the ACIXSTORE token
            (not your password) to make authorized requests to CCXP.
          </li>
          <li>
            <b>CCXP Server</b>: The official NTHU academic information system
            which validates the ACIXSTORE token and returns your grade data.
          </li>
        </ol>
        <b>Your credentials are never stored on our servers.</b>
        <p>
          The ACIXSTORE token is the only authentication information transmitted
          between your device and our server.
        </p>

        <h2>Detailed Process Flow</h2>
        <p>
          The <code>getStudentGrades</code> function in{" "}
          <code>src/lib/headless_ais/grades.ts</code> does the following:
        </p>
        <ol>
          <li>
            Receives an ACIXSTORE token (generated from your previous login)
          </li>
          <li>Makes a request to the CCXP grades page using this token</li>
          <li>
            Parses the returned HTML to extract your:
            <ul>
              <li>Student information (ID, name, department)</li>
              <li>Credit information (total, passed, pending)</li>
              <li>Detailed course grades</li>
              <li>Academic ranking information</li>
            </ul>
          </li>
        </ol>

        <h2>Data Protection Measures</h2>
        <p>We protect your data through the following measures:</p>
        <ul>
          <li>
            <b>No credential storage</b>: We never store your student ID or
            password on our servers
          </li>
          <li>
            <b>Temporary token usage</b>: The ACIXSTORE token has limited
            validity and is only used for the specific request
          </li>
          <li>
            <b>Client-side processing</b>: Most data processing happens on your
            device
          </li>
          <li>
            <b>Minimal data transmission</b>: Only necessary data is transmitted
            between systems
          </li>
        </ul>

        <h2>Process Diagram</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
            participant User Device
            participant NTHUMods Server
            participant CCXP Server
            
            Note over User Device: User already logged in with ACIXSTORE
            
            User Device->>NTHUMods Server: Request grades data with ACIXSTORE
            
            Note over NTHUMods Server: getStudentGrades function is executed
            
            NTHUMods Server->>CCXP Server: Request to grades page with ACIXSTORE
            CCXP Server->>NTHUMods Server: Return HTML with grades data
            
            Note over NTHUMods Server: Parse HTML response<br/>Extract student info<br/>Extract credits info<br/>Extract course grades<br/>Extract ranking data
            
            NTHUMods Server->>User Device: Return structured grades data
            
            Note over User Device: Display grades to user<br/>No credentials stored on server
          `}
        </div>

        <h2>Technical Implementation Details</h2>
        <p>
          The <code>getStudentGrades</code> function performs the following
          steps:
        </p>
        <ol>
          <li>
            <b>URL Formation</b>: Constructs the URL for the grades page with
            the ACIXSTORE parameter
          </li>
          <li>
            <b>Request Execution</b>: Fetches the HTML content from the CCXP
            server
          </li>
          <li>
            <b>Character Encoding Handling</b>: Decodes the response using Big5
            encoding (the character set used by CCXP)
          </li>
          <li>
            <b>DOM Parsing</b>: Uses LinkedDOM to parse the HTML structure
          </li>
          <li>
            <b>Data Extraction</b>:
            <ul>
              <li>Locates specific tables in the HTML</li>
              <li>Uses regex patterns to extract structured information</li>
              <li>
                Parses student details, credit counts, and grade information
              </li>
              <li>
                Extracts ranking data with careful handling of different formats
                for undergraduate and graduate students
              </li>
            </ul>
          </li>
        </ol>

        <h2>Privacy and Security Considerations</h2>
        <ul>
          <li>
            The grades data is fetched in real-time and is not cached on our
            servers
          </li>
          <li>
            The parsing process happens within a server-side function but does
            not persist any user data
          </li>
          <li>
            All communication between servers is done over HTTPS to ensure
            encryption in transit
          </li>
          <li>
            The ACIXSTORE token is only valid for a limited session and expires
            automatically
          </li>
        </ul>

        <h2>Reference Links</h2>
        <p>
          For detailed code implementation, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/grades.ts">
            NTHUMods GitHub
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

const GradesExplainerPage = ({ params }: LangProps) => {
  return (
    <>{params.lang === "zh" ? <GradesExplainerZH /> : <GradesExplainerEN />}</>
  );
};

export default GradesExplainerPage;
