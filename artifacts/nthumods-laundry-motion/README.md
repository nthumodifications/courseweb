# NTHUMods 洗衣前，先看一眼

`NTHUMods-Laundry-zh-TW-1080x1920.mp4`

15 秒 · 繁體中文 · 1080 × 1920 · 9:16 · 60 fps · H.264 / AAC · 原創 128 BPM 配樂

宿舍洗衣機／烘衣機即時狀態功能的動態短片。延續 `nthumods-motion` 的色票、字體、HUD 與節拍剪接，每個轉場都落在配樂的拍點上。

| 時間 | 段落 | 動態手法 |
| --- | --- | --- |
| 0–2.8125 秒 | 洗衣前，先看一眼 | 從滾筒內部開場，第 1 拍拉遠露出整台洗衣機，逐字動態標題，最後鏡頭推進舷窗、以舷窗當作轉場進入下一段 |
| 2.8125–6.5625 秒 | 選宿舍，找空機 | 宿舍選單以拉霸滾輪轉過全部 13 棟宿舍後停在明齋，空機數字以里程表方式滾動，機台卡片依序彈入 |
| 6.5625–11.25 秒 | 洗・烘狀態，一目瞭然 | 烘衣機 2 的小卡直接放大成狀態卡，倒數快轉並帶動態模糊，第 20 拍時狀態切換成「待取」並噴出粒子 |
| 11.25–15 秒 | 少點空等，多點生活 | 待取卡片展開成紫色畫面，機台圖示環繞收合成 NTHUMods 標誌，字標掠光，鏡頭緩慢推近 |

## 資料依據

- 宿舍清單與明齋的 3 台洗衣機、3 台烘衣機取自 `apps/web/src/const/laundry-machines.ts`，`prepare.py` 會在資料變動時中止
- 介面文字取自 `apps/web/src/dictionaries/zh.json` 的 `laundry` 區塊
- 篩選列、區域卡、機台小卡與倒數格式依照 `apps/web/src/app/[lang]/(mods-pages)/laundry/page.tsx`
- 烘衣機總時長 40 分鐘、洗衣機 36 分鐘，依照頁面上的價格說明

機台狀態與倒數時間為示意，未擷取即時遙測資料，片中也有標註。`assets/demo.json` 記錄示範狀態與機台清單檔的 SHA-256。

## 預覽與輸出

在專案根目錄執行：

```powershell
python -m http.server 5190 --bind 127.0.0.1 --directory artifacts/nthumods-laundry-motion
```

開啟 `http://127.0.0.1:5190`，按「播放影片與配樂」。

```powershell
python artifacts/nthumods-laundry-motion/prepare.py
python artifacts/nthumods-laundry-motion/sound.py
node artifacts/nthumods-laundry-motion/render.cjs
python artifacts/nthumods-laundry-motion/verify.py
```

需要 NumPy、Pillow、FontTools，並沿用前兩支影片使用的專案內 FFmpeg（`.tmp/motion-python`）與本機 Chromium。`render.cjs --stills` 只輸出檢查畫面，`render.cjs --at=2.7,6.3` 可輸出指定時間點的畫面。`window.renderFrame(seconds)` 可定位任一時間點。

`motion.js` 是動畫原始檔，`sound.py` 是配樂與音效原始檔。配樂為 D 小調轉 F 大調，包含開場的水聲與氣泡聲、拉霸滾輪逐格的點擊聲（依照動畫的滾輪位置計算）、快轉段落漸快的小鼓、第 20 拍狀態切換時的提示鈴聲，以及標誌落下時的和弦。全部由程式合成，沒有使用任何音樂取樣。

`storyboard.jpg`、`poster.jpg` 由最終 MP4 擷取。`verification.json` 記錄完整解碼、900 幀、15 秒，以及黑畫面、靜止畫面與靜音的檢查結果。逐張 PNG 檢查圖不納入 Git。

NTHUMods 字標與 Inter 字體來自本專案。Noto Sans TC 依 SIL Open Font License 使用，保留字型內嵌授權文字於 `assets/NotoSansTC-license.txt`。
