# NTHUMods 查課與加入課表教學

`NTHUMods-Course-Tutorial-zh-TW-1080x1920.mp4`

26 秒 · 繁體中文 · 1080 × 1920 · 9:16 · 60 fps · H.264 / AAC · 原創 120 BPM 輕快配樂

以四步操作教學呈現目前手機版查課流程。使用品牌字體、點擊指示、欄位聚焦、按鈕放大與抽屜動畫。這是依照現有介面製作的操作示意動畫，畫面上的標註屬於教學圖層，並非逐像素的產品錄影。

| 時間 | 內容 |
| --- | --- |
| 0–2.5 秒 | 開場：找到好課，一按加入 |
| 2.5–8 秒 | 選擇學期，輸入「資料結構」，顯示搜尋結果 |
| 8–12.5 秒 | 核對老師、教室、上課節次 |
| 12.5–17.5 秒 | 點結果右側的「＋」，加入後變成紅色「−」 |
| 17.5–23 秒 | 點搜尋列日曆圖示，確認時間表上的課程 |
| 23–26 秒 | 品牌收尾與查課網址 |

## 流程與資料依據

本片依據製作時工作區的以下元件核對操作：

- `apps/web/src/components/SearchBox/SearchBox.tsx` 在輸入時更新搜尋
- `apps/web/src/app/[lang]/(mods-pages)/courses/SemesterSelector.tsx` 使用 `115-1 學期` 格式
- `apps/web/src/components/Courses/CourseListItem.tsx` 顯示課名、老師、教室、節次與加入按鈕
- `apps/web/src/components/Courses/SelectCourseButton.tsx` 手機顯示加號，選取後顯示紅色減號
- `apps/web/src/app/[lang]/(mods-pages)/courses/SearchContainer.tsx` 手機日曆按鈕開啟底部抽屜
- `apps/web/src/app/[lang]/(mods-pages)/courses/CourseSidePanel.tsx` 使用「時間表」、「課程清單」、「已收藏課程」頁籤

示範的三筆課程擷取自專案的 `courses-11510-full.json` 測試資料，並非影片播放時即時查詢的清單。選取的 `11510CS  235101` 是沈之涯老師的資料結構，教室 `DELTA台達109`，節次 `T3T4R3`。時間表對應週二第 3、4 節與週四第 3 節。片尾說明正式選課仍須至校務系統辦理。

`assets/courses.json` 保留示範課程欄位。新增課程的操作只在動畫中演示，未修改任何使用者的實際課表。

## 預覽與輸出

在專案根目錄執行：

```powershell
python -m http.server 5189 --bind 127.0.0.1 --directory artifacts/nthumods-course-tutorial
```

開啟 `http://127.0.0.1:5189`，按「播放影片與配樂」。播放到 26 秒自動停止，可重新播放。

```powershell
python artifacts/nthumods-course-tutorial/prepare.py
python artifacts/nthumods-course-tutorial/sound.py
node artifacts/nthumods-course-tutorial/render.cjs
python artifacts/nthumods-course-tutorial/verify.py
```

需要 NumPy、Pillow、FontTools，並沿用上一支影片的專案內 FFmpeg 與本機 Chromium。缺少編碼器時可執行 `python -m pip install --target .tmp/motion-python imageio-ffmpeg`。`render.cjs --stills` 只輸出檢查畫面。`window.renderFrame(seconds)` 可定位任一時間點。

`tutorial.js` 是動畫原始檔，`sound.py` 是配樂原始檔。音樂使用 C 大調、木琴式撥弦、電鋼琴、輕量鼓組與對應點擊的音效，沒有使用第三方音樂取樣。

`storyboard.jpg`、`poster.jpg` 由最終 MP4 擷取。`verification.json` 記錄完整解碼、1560 幀、26 秒、畫面與音訊檢查。逐張 PNG 檢查圖不納入 Git。

NTHUMods 字標與 Inter 字體來自本專案。Noto Sans TC 依 SIL Open Font License 使用，保留字型內嵌授權文字於 `assets/NotoSansTC-license.txt`。
