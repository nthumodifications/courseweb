import Script from "next/script";
import Footer from "@/components/Footer";

const CommentsDateExplainerZH = () => {
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
        <h1 className="text-5xl font-bold">課程評論與日期貢獻功能說明</h1>
        <p className="text-gray-600 dark:text-gray-400">更新時間: 2025/02/20</p>
      </div>

      <article className="prose prose-neutral dark:prose-invert">
        <h2>功能概述</h2>
        <p>
          NTHUMods
          提供兩個主要功能來豐富課程資訊：課程評論系統和重要日期貢獻系統。這些功能都在伺服器端運行，確保資料的安全性和可靠性。
        </p>

        <h2>評論系統功能詳解</h2>
        <h3>1. 獲取評論 (getComments)</h3>
        <ul>
          <li>運行位置：伺服器端</li>
          <li>用途：分頁獲取特定課程的評論</li>
          <li>安全措施：需要用戶身份驗證</li>
          <li>資料來源：Supabase 資料庫</li>
        </ul>

        <h3>2. 評論權限檢查 (getStudentCommentState)</h3>
        <ul>
          <li>運行位置：伺服器端</li>
          <li>用途：確認學生是否可以評論課程</li>
          <li>
            狀態類型：
            <ul>
              <li>已填寫 (Filled)</li>
              <li>可評論 (Enabled)</li>
              <li>無權限 (Disabled)</li>
            </ul>
          </li>
          <li>驗證方式：透過校務系統確認選課狀態</li>
        </ul>

        <h3>3. 評論狀態檢查 (hasUserCommented)</h3>
        <ul>
          <li>運行位置：伺服器端</li>
          <li>用途：檢查用戶是否已評論過</li>
          <li>安全措施：需要用戶身份驗證</li>
        </ul>

        <h2>評論系統流程圖</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
            participant Client as 用戶裝置
            participant Server as NTHUMods伺服器
            participant CCXP as 校務系統
            participant DB as Supabase資料庫

            %% 獲取評論流程
            Client->>Server: 請求課程評論
            Server->>Server: 驗證用戶身份
            Server->>DB: 查詢評論資料
            DB-->>Server: 返回評論列表
            Server-->>Client: 顯示評論
            
            %% 發表評論流程
            Client->>Server: 提交評論
            Server->>Server: 驗證用戶身份
            Server->>CCXP: 確認選課狀態
            CCXP-->>Server: 返回選課確認
            Server->>DB: 檢查是否已評論
            DB-->>Server: 返回檢查結果
            alt 未評論且已選課
              Server->>DB: 儲存評論
              DB-->>Server: 確認儲存
              Server-->>Client: 評論成功
            else 已評論或未選課
              Server-->>Client: 拒絕評論
            end
          `}
        </div>

        <h2>日期貢獻系統</h2>
        <h3>1. 獲取日期 (getContribDates)</h3>
        <ul>
          <li>運行位置：伺服器端</li>
          <li>用途：獲取課程重要日期</li>
          <li>返回資料：日期、類型、標題</li>
        </ul>

        <h3>2. 提交日期 (submitContribDates)</h3>
        <ul>
          <li>運行位置：伺服器端</li>
          <li>
            安全措施：
            <ul>
              <li>用戶身份驗證</li>
              <li>選課狀態確認</li>
              <li>學期有效性檢查</li>
            </ul>
          </li>
          <li>
            處理流程：
            <ul>
              <li>更新現有日期</li>
              <li>新增日期</li>
              <li>刪除日期</li>
              <li>記錄變更</li>
            </ul>
          </li>
        </ul>

        <h2>日期系統流程圖</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
            participant Client as 用戶裝置
            participant Server as NTHUMods伺服器
            participant CCXP as 校務系統
            participant DB as Supabase資料庫

            %% 獲取日期流程
            Client->>Server: 請求課程日期
            Server->>DB: 查詢日期資料
            DB-->>Server: 返回日期列表
            Server-->>Client: 顯示日期

            %% 提交日期流程
            Client->>Server: 提交日期更新
            Server->>Server: 驗證用戶身份
            Server->>CCXP: 確認選課狀態
            CCXP-->>Server: 返回選課確認
            Server->>Server: 檢查學期有效性
            alt 驗證通過
              Server->>DB: 更新日期資料
              Server->>DB: 記錄變更日誌
              DB-->>Server: 確認更新
              Server-->>Client: 更新成功
            else 驗證失敗
              Server-->>Client: 拒絕更新
            end
          `}
        </div>

        <h2>安全性說明</h2>
        <ul>
          <li>所有身份驗證在伺服器端進行</li>
          <li>不永久儲存校務系統憑證</li>
          <li>透過校務系統驗證選課狀態</li>
          <li>記錄所有變更以供追蹤</li>
          <li>依學期區隔資料</li>
          <li>每門課程每位學生限評論一次</li>
        </ul>

        <h2>資料保護措施</h2>
        <div className="mermaid">
          {`
          graph TD
            A[用戶請求] --> B{身份驗證}
            B -->|成功| C{選課驗證}
            B -->|失敗| D[拒絕請求]
            C -->|已選課| E[處理請求]
            C -->|未選課| D
            E --> F{學期檢查}
            F -->|有效| G[更新資料]
            F -->|無效| D
            G --> H[記錄變更]
            H --> I[返回結果]
          `}
        </div>
        <h2>參考連結</h2>
        <p>
          如需詳細實現，請參考我們的{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/">
            NTHUMods Github 倉庫
          </a>
          。
        </p>
      </article>
      <Footer />
    </div>
  );
};

const CommentsDateExplainerEN = () => {
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
          Course Comments and Date Contributions Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Updated on: 2025/02/20
        </p>
      </div>

      <article className="prose prose-neutral dark:prose-invert">
        <h2>Feature Overview</h2>
        <p>
          NTHUMods provides two main features to enrich course information: the
          Course Comments System and Important Dates Contribution System. These
          features run server-side to ensure data security and reliability.
        </p>

        <h2>Comments System Details</h2>
        <h3>1. Retrieving Comments (getComments)</h3>
        <ul>
          <li>Location: Server-side</li>
          <li>Purpose: Fetch paginated course comments</li>
          <li>Security: Requires user authentication</li>
          <li>Data Source: Supabase database</li>
        </ul>

        <h3>2. Comment Permission Check (getStudentCommentState)</h3>
        <ul>
          <li>Location: Server-side</li>
          <li>Purpose: Verify if student can comment</li>
          <li>
            States:
            <ul>
              <li>Filled</li>
              <li>Enabled</li>
              <li>Disabled</li>
            </ul>
          </li>
          <li>Validation: Through CCXP enrollment verification</li>
        </ul>

        <h3>3. Comment Status Check (hasUserCommented)</h3>
        <ul>
          <li>Location: Server-side</li>
          <li>Purpose: Check if user has already commented</li>
          <li>Security: Requires user authentication</li>
        </ul>

        <h2>Comments System Flow</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
            participant Client as User Device
            participant Server as NTHUMods Server
            participant CCXP as CCXP System
            participant DB as Supabase Database

            %% Get Comments Flow
            Client->>Server: Request Comments
            Server->>Server: Verify Authentication
            Server->>DB: Query Comments
            DB-->>Server: Return Comments
            Server-->>Client: Display Comments
            
            %% Post Comment Flow
            Client->>Server: Submit Comment
            Server->>Server: Verify Authentication
            Server->>CCXP: Check Enrollment
            CCXP-->>Server: Return Enrollment Status
            Server->>DB: Check Existing Comment
            DB-->>Server: Return Check Result
            alt Not Commented & Enrolled
              Server->>DB: Store Comment
              DB-->>Server: Confirm Storage
              Server-->>Client: Comment Success
            else Already Commented or Not Enrolled
              Server-->>Client: Reject Comment
            end
          `}
        </div>

        <h2>Date Contribution System</h2>
        <h3>1. Retrieving Dates (getContribDates)</h3>
        <ul>
          <li>Location: Server-side</li>
          <li>Purpose: Get course important dates</li>
          <li>Returns: Date, type, and title</li>
        </ul>

        <h3>2. Submitting Dates (submitContribDates)</h3>
        <ul>
          <li>Location: Server-side</li>
          <li>
            Security Measures:
            <ul>
              <li>User authentication</li>
              <li>Enrollment verification</li>
              <li>Semester validity check</li>
            </ul>
          </li>
          <li>
            Process:
            <ul>
              <li>Update existing dates</li>
              <li>Add new dates</li>
              <li>Delete dates</li>
              <li>Log changes</li>
            </ul>
          </li>
        </ul>

        <h2>Date System Flow</h2>
        <div className="mermaid">
          {`
          sequenceDiagram
            participant Client as User Device
            participant Server as NTHUMods Server
            participant CCXP as CCXP System
            participant DB as Supabase Database

            %% Get Dates Flow
            Client->>Server: Request Dates
            Server->>DB: Query Dates
            DB-->>Server: Return Date List
            Server-->>Client: Display Dates

            %% Submit Dates Flow
            Client->>Server: Submit Date Updates
            Server->>Server: Verify Authentication
            Server->>CCXP: Check Enrollment
            CCXP-->>Server: Return Enrollment Status
            Server->>Server: Check Semester Validity
            alt Validation Passed
              Server->>DB: Update Dates
              Server->>DB: Log Changes
              DB-->>Server: Confirm Update
              Server-->>Client: Update Success
            else Validation Failed
              Server-->>Client: Reject Update
            end
          `}
        </div>

        <h2>Security Details</h2>
        <ul>
          <li>All authentication performed server-side</li>
          <li>No permanent storage of CCXP credentials</li>
          <li>Enrollment verification through CCXP</li>
          <li>All changes are logged for tracking</li>
          <li>Data segregated by semester</li>
          <li>One comment per student per course</li>
        </ul>

        <h2>Data Protection Measures</h2>
        <div className="mermaid">
          {`
          graph TD
            A[User Request] --> B{Authentication}
            B -->|Success| C{Enrollment Check}
            B -->|Failure| D[Reject Request]
            C -->|Enrolled| E[Process Request]
            C -->|Not Enrolled| D
            E --> F{Semester Check}
            F -->|Valid| G[Update Data]
            F -->|Invalid| D
            G --> H[Log Changes]
            H --> I[Return Result]
          `}
        </div>

        <h2>Reference Links</h2>
        <p>
          For detailed implementation, please refer to our{" "}
          <a href="https://github.com/nthumodifications/courseweb/blob/main/src/lib/headless_ais/">
            NTHUMods GitHub Repository
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

const CommentsDateExplainerPage = ({ params }: LangProps) => {
  return (
    <>
      {params.lang === "zh" ? (
        <CommentsDateExplainerZH />
      ) : (
        <CommentsDateExplainerEN />
      )}
    </>
  );
};

export default CommentsDateExplainerPage;
