import Script from "next/script";

const ProxyLoginExplainer = () => {
    return (
        <div className="px-4 py-8">  
            <Script
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
                <p>NTHUMods 代理登入是一個幫助用戶在 NTHUMods 平台上安全登入校務資訊系統的工具。它使用加密技術來保護用戶的帳戶和密碼，確保用戶的資訊安全。</p>
                
                <h2>如何使用您的帳戶資訊？</h2>
                <p>在使用 NTHUMods 代理登入時，我們需要您的學號和密碼來進行首次登入驗證。登入過程如下：</p>
                <ol>
                    <li>發送請求到校務資訊系統登入頁面，獲取驗證碼圖片。</li>
                    <li>使用 OCR 技術解碼驗證碼。</li>
                    <li>提交學號、密碼和驗證碼進行登入。</li>
                    <li>驗證登入狀態並獲取 ACIXSTORE 資訊。</li>
                </ol>
                <b>您的資訊僅存儲在用戶設備上！我們不會儲存任何資料（我們沒錢幫你們儲存）</b>
                <p>首次登入後，您的密碼會被加密<b>存儲在您的裝置上</b>，以便您下次自動登入。</p>
                
                <h2>如何保護您的資訊？</h2>
                <p>我們採取以下步驟來保護您的資訊：</p>
                <ul>
                    <li><b>您的資訊僅存儲在用戶設備上。</b></li>
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
                    <li>使用 JWT 技術來認證用戶的資料，減少密碼的使用量，也確保資料的安全且有時效性。<b>您的JWT僅存儲在用戶設備上。</b></li>
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
                <p>在JWT過期或有開啓鏈接校務資訊系統的功能時，系統將使用加密存儲的密碼來刷新認證期：<b>您的資訊僅存儲在用戶設備上。</b></p>
                <ol>
                    <li>解密存儲的密碼。</li>
                    <li>使用解密後的密碼進行重新登入。</li>
                    <li>返回新的 ACIXSTORE。</li>
                </ol>
                
                <h2>參考連結</h2>
                <p>詳細程式碼請參考我們的 <a href="https://github.com/nthumodifications/courseweb/blob/9e738bc32c49b0168efaedeb9626211dbc36b639/src/lib/headless_ais/headless_ais.ts">NTHUMods Github</a>。</p>
            </article>
        </div>
    )
}

export default ProxyLoginExplainer;