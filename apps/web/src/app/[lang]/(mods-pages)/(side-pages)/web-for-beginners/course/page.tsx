import Script from "next/script";
import Footer from "@/components/Footer";

const CourseEnrollmentExplainerZH = () => {
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
        <h1 className="text-5xl font-bold">課程選課與資訊功能說明</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/02/20</p>
      </div>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>什麼是課程選課與資訊功能？</h2>
        <p>
          NTHUMods
          提供了多種功能，可以與清大選課系統交互，獲取您的課程數據、選課狀態和班級信息。這些功能在保護您的隱私和安全的同時與學校的
          CCXP 系統進行通信。
        </p>

        <h2>這些功能如何運作？</h2>
        <p>
          這些功能使用您的 `ACIXSTORE`
          令牌（通過代理登入獲取）來安全地訪問學校的信息系統。
          <b>您的憑證絕不會存儲在我們的伺服器上</b> -
          所有敏感操作要麼直接在您的設備上進行，要麼通過不會保留您數據的安全伺服器端代理進行。
        </p>

        <h2>各功能詳細說明</h2>

        <h3>1. `getStudentCourses`</h3>
        <p>
          <b>用途：</b>獲取學生的完整課程歷史，包括課程 ID 和學生信息。
        </p>
        <p>
          <b>流程：</b>
        </p>
        <ul>
          <li>使用您的 `ACIXSTORE` 令牌從 CCXP 系統獲取您的課程歷史頁面</li>
          <li>解析響應以提取您的學生信息和課程 ID</li>
          <li>返回您的學號、姓名、班級和課程 ID 列表</li>
        </ul>
        <p>
          <b>隱私說明：</b>
        </p>
        <ul>
          <li>您的課程歷史在伺服器端獲取，但從不存儲</li>
          <li>該功能僅將處理後的數據返回到您的設備</li>
          <li>不記錄或保留個人信息</li>
        </ul>

        <h3>2. `getLatestCourses`</h3>
        <p>
          <b>用途：</b>獲取您在最近學期註冊的課程。
        </p>
        <p>
          <b>流程：</b>
        </p>
        <ul>
          <li>獲取學期選擇頁面以確定最新學期和階段</li>
          <li>從頁面提取您的學號</li>
          <li>發起第二個請求以獲取您當前的課程註冊</li>
          <li>解析 HTML 以提取您已註冊的課程 ID</li>
        </ul>
        <p>
          <b>隱私說明：</b>
        </p>
        <ul>
          <li>所有憑證僅用於即時請求</li>
          <li>您的課程數據僅返回到您的設備</li>
          <li>我們的伺服器上不會保留任何數據</li>
        </ul>

        <h3>3. `getLatestCourseEnrollment`</h3>
        <p>
          <b>用途：</b>獲取特定系所課程的詳細選課統計數據。
        </p>
        <p>
          <b>流程：</b>
        </p>
        <ul>
          <li>向指定系所的課程選課頁面發起請求</li>
          <li>解析包含課程選課數據的 HTML 表格</li>
          <li>提取課程編號、名稱、教授、上課時間和選課統計等信息</li>
        </ul>
        <p>
          <b>隱私說明：</b>
        </p>
        <ul>
          <li>此功能訪問的是公開課程數據（非您的個人數據）</li>
          <li>查詢使用您的 `ACIXSTORE` 令牌，但不訪問您的個人信息</li>
          <li>結果僅返回到您的設備</li>
        </ul>

        <h3>4. `getHiddenCourseSelectionCode`</h3>
        <p>
          <b>用途：</b>獲取選課所需的特殊選課代碼。
        </p>
        <p>
          <b>流程：</b>
        </p>
        <ul>
          <li>向選課頁面發起 POST 請求，附帶您的系所代碼</li>
          <li>解析頁面以從按鈕中提取選課參數</li>
          <li>返回選課所需的課程代碼和相關參數</li>
        </ul>
        <p>
          <b>隱私說明：</b>
        </p>
        <ul>
          <li>該功能在伺服器端運行，但僅處理即時請求</li>
          <li>您的 `ACIXSTORE` 令牌僅用於認證</li>
          <li>除了即時響應外，不會記錄或存儲任何數據</li>
        </ul>

        <h3>5. `getClassDetailed`</h3>
        <p>
          <b>用途：</b>獲取有關學生班級/系所、學位類型和年級的詳細信息。
        </p>
        <p>
          <b>流程：</b>
        </p>
        <ul>
          <li>使用 `ACIXSTORE` 令牌獲取學生班級信息頁面</li>
          <li>解析 HTML 以提取系所名稱、學位類型和年級</li>
          <li>返回有關您學術狀態的結構化信息</li>
        </ul>
        <p>
          <b>隱私說明：</b>
        </p>
        <ul>
          <li>此功能在伺服器端運行，但僅用於即時請求</li>
          <li>信息僅返回到您的設備</li>
          <li>我們的伺服器上不存儲個人數據</li>
        </ul>

        <h2>每個功能在哪裡執行？</h2>
        <p>
          為了幫助您理解數據處理的位置，以下是詳細的序列圖，顯示了您的設備、我們的伺服器和
          CCXP 系統之間的數據流：
        </p>

        <div className="mermaid">
          {`
sequenceDiagram
    participant Device as 您的設備
    participant Server as NTHUMods 伺服器
    participant CCXP as 清大 CCXP 伺服器
    
    Note over Device, CCXP: getStudentCourses 功能
    Device->>Server: 帶有 ACIXSTORE 令牌的請求
    Server->>CCXP: 獲取課程歷史頁面
    CCXP-->>Server: 返回 HTML 響應（Big5 編碼）
    Server->>Server: 解碼和解析 HTML
    Server->>Server: 提取學生信息和課程 ID
    Server-->>Device: 返回處理後的課程數據
    
    Note over Device, CCXP: getLatestCourses 功能
    Device->>Server: 帶有 ACIXSTORE 令牌的請求
    Server->>CCXP: 獲取學期選擇頁面
    CCXP-->>Server: 返回帶有學期數據的 HTML
    Server->>Server: 提取學期、階段和學號
    Server->>CCXP: 發送 POST 請求獲取當前課程
    CCXP-->>Server: 返回帶有課程數據的 HTML
    Server->>Server: 解析並提取課程 ID
    Server-->>Device: 返回當前課程選課數據
    
    Note over Device, CCXP: getLatestCourseEnrollment 功能
    Device->>Server: 帶有 ACIXSTORE 令牌和系所代碼的請求
    Server->>CCXP: 向系所選課頁面發送 POST 請求
    CCXP-->>Server: 返回帶有選課統計的 HTML
    Server->>Server: 解析表格並提取課程數據
    Server-->>Device: 返回詳細選課統計
    
    Note over Device, CCXP: getHiddenCourseSelectionCode 功能
    Device->>Server: 帶有 ACIXSTORE 令牌和系所的請求
    Server->>CCXP: 向選課頁面發送 POST 請求
    CCXP-->>Server: 返回帶有選課按鈕的 HTML
    Server->>Server: 從按鈕參數中提取選課代碼
    Server-->>Device: 返回課程選課參數
    
    Note over Device, CCXP: getClassDetailed 功能
    Device->>Server: 帶有 ACIXSTORE 令牌的請求
    Server->>CCXP: 獲取班級信息頁面
    CCXP-->>Server: 返回帶有班級詳情的 HTML
    Server->>Server: 解析 HTML 以提取系所/學位/年級
    Server-->>Device: 返回結構化班級信息
          `}
        </div>

        <h2>我們如何保護您的數據</h2>
        <p>我們採取多種措施確保您的數據安全：</p>
        <ol>
          <li>
            <b>不存儲憑證</b>：您的學號、密碼和 `ACIXSTORE`
            令牌絕不會存儲在我們的伺服器上。
          </li>
          <li>
            <b>伺服器端處理</b>
            ：雖然某些功能在我們的伺服器上運行以處理複雜的解析，但它們只處理即時請求，不會保留數據。
          </li>
          <li>
            <b>臨時處理</b>：所有數據處理都是短暫的，僅在您的請求期間存在。
          </li>
          <li>
            <b>安全通信</b>：您的設備、我們的伺服器和 CCXP 之間的所有通信都使用
            HTTPS 加密。
          </li>
          <li>
            <b>最小數據處理</b>
            ：我們只提取必要的信息，並立即將其返回到您的設備。
          </li>
        </ol>

        <h2>重要安全說明</h2>
        <ul>
          <li>
            <b>您的憑證保留在您的設備上</b>：`ACIXSTORE`
            令牌安全地存儲在您的瀏覽器中，僅在這些特定功能需要時才發送到我們的伺服器。
          </li>
          <li>
            <b>我們不記錄個人數據</b>
            ：我們的伺服器不會記錄或存儲您的個人信息或課程數據。
          </li>
          <li>
            <b>數據處理是臨時的</b>
            ：對您數據的所有解析和處理僅在您的請求期間存在。
          </li>
        </ul>

        <h2>參考連結</h2>
        <p>
          詳細代碼實現，請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb">
            NTHUMods Github 倉庫
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const CourseEnrollmentExplainerEN = () => {
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
          Course Enrollment and Information
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Updated on: 2025/02/20
        </p>
      </div>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>What are the Course Enrollment and Information Functions?</h2>
        <p>
          {
            "NTHUMods provides several functions that interact with the NTHU course enrollment system to fetch your course data, enrollment status, and class information. These functions communicate with the school's CCXP system while maintaining your privacy and security."
          }
        </p>

        <h2>How Do These Functions Work?</h2>
        <p>
          {
            "These functions use your `ACIXSTORE` token (obtained through the proxy login process) to securely access the school's information system. "
          }
          <b>Your credentials are never stored on our servers</b>
          {
            " - all sensitive operations happen either directly on your device or via secure server-side proxying that doesn't persist your data."
          }
        </p>

        <h2>Detailed Explanation of Each Function</h2>

        <h3>1. `getStudentCourses`</h3>
        <p>
          <b>Purpose:</b>
          {
            " Retrieves a student's complete course history, including course IDs and student information."
          }
        </p>
        <p>
          <b>Process:</b>
        </p>
        <ul>
          <li>
            Uses your `ACIXSTORE` token to fetch your course history page from
            the CCXP system
          </li>
          <li>
            Parses the response to extract your student information and course
            IDs
          </li>
          <li>
            Returns your student ID, name, class, and a list of your course IDs
          </li>
        </ul>
        <p>
          <b>Privacy Notes:</b>
        </p>
        <ul>
          <li>Your course history is fetched server-side but never stored</li>
          <li>The function only returns the processed data to your device</li>
          <li>No personal information is logged or retained</li>
        </ul>

        <h3>2. `getLatestCourses`</h3>
        <p>
          <b>Purpose:</b> Retrieves your currently enrolled courses for the most
          recent semester.
        </p>
        <p>
          <b>Process:</b>
        </p>
        <ul>
          <li>
            Fetches the semester selection page to determine the latest semester
            and phase
          </li>
          <li>Extracts your student number from the page</li>
          <li>
            Makes a second request to get your current course registrations
          </li>
          <li>Parses the HTML to extract your enrolled course IDs</li>
        </ul>
        <p>
          <b>Privacy Notes:</b>
        </p>
        <ul>
          <li>All credentials are only used for the immediate request</li>
          <li>Your course data is only returned to your device</li>
          <li>No data is persisted on our servers</li>
        </ul>

        <h3>3. `getLatestCourseEnrollment`</h3>
        <p>
          <b>Purpose:</b> Retrieves detailed enrollment statistics for courses
          in a specific department.
        </p>
        <p>
          <b>Process:</b>
        </p>
        <ul>
          <li>
            Makes a request to the course enrollment page for the specified
            department
          </li>
          <li>Parses the HTML table containing course enrollment data</li>
          <li>
            Extracts information like course numbers, names, professors, class
            times, and enrollment statistics
          </li>
        </ul>
        <p>
          <b>Privacy Notes:</b>
        </p>
        <ul>
          <li>
            This function accesses public course data (not your personal data)
          </li>
          <li>
            {
              "The query uses your `ACIXSTORE` token but doesn't access your personal information"
            }
          </li>
          <li>Results are only returned to your device</li>
        </ul>

        <h3>4. `getHiddenCourseSelectionCode`</h3>
        <p>
          <b>Purpose:</b> Retrieves special course selection codes that are
          needed for enrolling in certain courses.
        </p>
        <p>
          <b>Process:</b>
        </p>
        <ul>
          <li>
            Makes a POST request to the course selection page with your
            department code
          </li>
          <li>
            Parses the page to extract course selection parameters from buttons
          </li>
          <li>
            Returns the course codes and related parameters needed for
            enrollment
          </li>
        </ul>
        <p>
          <b>Privacy Notes:</b>
        </p>
        <ul>
          <li>
            The function runs server-side but only processes the immediate
            request
          </li>
          <li>Your `ACIXSTORE` token is used only for authentication</li>
          <li>No data is logged or stored beyond the immediate response</li>
        </ul>

        <h3>5. `getClassDetailed`</h3>
        <p>
          <b>Purpose:</b>
          {
            " Retrieves detailed information about a student's class/department, degree type, and year."
          }
        </p>
        <p>
          <b>Process:</b>
        </p>
        <ul>
          <li>
            Fetches student class information page using the `ACIXSTORE` token
          </li>
          <li>
            Parses the HTML to extract department name, degree type, and year
          </li>
          <li>Returns structured information about your academic status</li>
        </ul>
        <p>
          <b>Privacy Notes:</b>
        </p>
        <ul>
          <li>
            This function runs server-side but only for the immediate request
          </li>
          <li>Information is only returned to your device</li>
          <li>No personal data is stored on our servers</li>
        </ul>

        <h2>Where is Each Function Executed?</h2>
        <p>
          {
            "To help you understand where your data is being processed, here's a detailed sequence diagram showing the data flow between your device, our server, and the CCXP system:"
          }
        </p>

        <div className="mermaid">
          {`
sequenceDiagram
    participant Device as Your Device
    participant Server as NTHUMods Server
    participant CCXP as NTHU CCXP Server
    
    Note over Device, CCXP: getStudentCourses Function
    Device->>Server: Request with ACIXSTORE token
    Server->>CCXP: Fetch course history page
    CCXP-->>Server: Return HTML response (Big5 encoded)
    Server->>Server: Decode and parse HTML
    Server->>Server: Extract student info and course IDs
    Server-->>Device: Return processed course data
    
    Note over Device, CCXP: getLatestCourses Function
    Device->>Server: Request with ACIXSTORE token
    Server->>CCXP: Fetch semester selection page
    CCXP-->>Server: Return HTML with semester data
    Server->>Server: Extract semester, phase and student ID
    Server->>CCXP: POST request to get current courses
    CCXP-->>Server: Return HTML with course data
    Server->>Server: Parse and extract course IDs
    Server-->>Device: Return current course enrollment data
    
    Note over Device, CCXP: getLatestCourseEnrollment Function
    Device->>Server: Request with ACIXSTORE token and department code
    Server->>CCXP: POST request to department enrollment page
    CCXP-->>Server: Return HTML with enrollment statistics
    Server->>Server: Parse tables and extract course data
    Server-->>Device: Return detailed enrollment statistics
    
    Note over Device, CCXP: getHiddenCourseSelectionCode Function
    Device->>Server: Request with ACIXSTORE token and department
    Server->>CCXP: POST request to course selection page
    CCXP-->>Server: Return HTML with course selection buttons
    Server->>Server: Extract selection codes from button parameters
    Server-->>Device: Return course selection parameters
    
    Note over Device, CCXP: getClassDetailed Function
    Device->>Server: Request with ACIXSTORE token
    Server->>CCXP: Fetch class information page
    CCXP-->>Server: Return HTML with class details
    Server->>Server: Parse HTML to extract department/degree/year
    Server-->>Device: Return structured class information
          `}
        </div>

        <h2>How We Protect Your Data</h2>
        <p>We take several measures to ensure your data remains secure:</p>
        <ol>
          <li>
            <b>No Credential Storage</b>: Your student ID, password, and
            `ACIXSTORE` token are never stored on our servers.
          </li>
          <li>
            <b>Server-Side Processing</b>
            {
              ": While some functions run on our server to handle complex parsing, they only process the immediate request and don't persist data."
            }
          </li>
          <li>
            <b>Temporary Processing</b>: All data processing is ephemeral and
            exists only for the duration of your request.
          </li>
          <li>
            <b>Secure Communication</b>: All communication between your device,
            our server, and CCXP uses HTTPS encryption.
          </li>
          <li>
            <b>Minimal Data Handling</b>: We only extract the necessary
            information and immediately return it to your device.
          </li>
        </ol>

        <h2>Important Security Notes</h2>
        <ul>
          <li>
            <b>Your credentials remain on your device</b>: The `ACIXSTORE` token
            is stored securely in your browser and is only sent to our server
            when needed for these specific functions.
          </li>
          <li>
            <b>{"We don't log personal data"}</b>: Our servers do not log or
            store your personal information or course data.
          </li>
          <li>
            <b>Data processing is temporary</b>: All parsing and processing of
            your data exists only for the duration of your request.
          </li>
        </ul>

        <h2>Reference Links</h2>
        <p>
          For detailed code implementation, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/courses.ts">
            NTHUMods Github Repository
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

const CourseEnrollmentExplainerPage = ({ params }: LangProps) => {
  return (
    <>
      {params.lang === "zh" ? (
        <CourseEnrollmentExplainerZH />
      ) : (
        <CourseEnrollmentExplainerEN />
      )}
    </>
  );
};

export default CourseEnrollmentExplainerPage;
