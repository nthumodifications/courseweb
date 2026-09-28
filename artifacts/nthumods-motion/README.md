# NTHUMods — In Sync

A 15-second vertical motion film about finding your course, building your rhythm, and exploring campus.

Deliverable: `NTHUMods-In-Sync-1080x1920.mp4`

Traditional Chinese version: `NTHUMods-In-Sync-1080x1920-zh-TW.mp4`

The Traditional Chinese version keeps the same animation and original score, with localized headlines, course cards, timetable labels, and campus information. `storyboard-zh-TW.jpg`, `poster-zh-TW.jpg`, and `verification-zh-TW.json` accompany it. The English video remains unchanged.

1080 × 1920 · 9:16 · 60 fps · 900 frames · H.264 / AAC · original 128 BPM stereo score

The animation uses the project's actual NTHUMods wordmark, calendar symbol, Inter font, and 112 campus building footprints. The course cards and timetable are illustrative product compositions. The film is a motion study, not a recording of the current application. No application code or dependencies were changed.

| Time | Sequence |
| --- | --- |
| 0–2.8125 s | Less friction, floating brand modules |
| 2.8125–5.625 s | More possibility, animated course discovery |
| 5.625–8.4375 s | Make time yours, staggered timetable assembly |
| 8.4375–11.71875 s | Beyond the class, rotating campus geometry and places |
| 11.71875–15 s | Modules converge into the NTHUMods lockup |

`storyboard.jpg` and `poster.jpg` are extracted from the final encoded video. `verification.json` records the full decode check, frame count, duration, and black-frame, freeze, and silence checks. The closing wordmark intentionally settles for reading from approximately 13.2 seconds.

## Preview

From the repository root:

```powershell
python -m http.server 5188 --bind 127.0.0.1 --directory artifacts/nthumods-motion
```

Open `http://127.0.0.1:5188` and select **Play with sound**. Playback stops at 15 seconds and can be replayed. This preview and rendering source work offline after the assets are prepared.

For the Traditional Chinese preview, open `http://127.0.0.1:5188/zh.html` and select **播放影片與配樂**.

## Re-render on this Windows workstation

```powershell
python -m pip install --target .tmp/motion-python imageio-ffmpeg
python artifacts/nthumods-motion/prepare.py
python artifacts/nthumods-motion/sound.py
node artifacts/nthumods-motion/render.cjs
python artifacts/nthumods-motion/verify.py
```

Python requires NumPy and Pillow. The renderer uses the installed Chromium at `%LOCALAPPDATA%/ms-playwright/chromium-1223/chrome-win64/chrome.exe` and starts an isolated hidden browser. It does not modify the user's browser profile. `node render.cjs --stills` renders only the storyboard samples. Every frame can also be addressed with `window.renderFrame(seconds)` in the preview.

Source files remain editable. Animation is in `motion.js`, audio composition is in `sound.py`, and encoding is in `render.cjs`.

Traditional Chinese copy and headline sizes are in `motion-zh.js`. Render and verify this version with:

```powershell
node artifacts/nthumods-motion/render.cjs --zh
python artifacts/nthumods-motion/verify.py --zh
```

`prepare-zh.py` uses FontTools and the installed `C:/Windows/Fonts/NotoSansTC-VF.ttf` to create a small font subset with all required Chinese glyphs. Run it again if the Chinese copy changes. The prepared subset is already included in `assets/NotoSansTC-Motion.ttf`.

## Credits

NTHUMods branding and application references come from this project. Campus geometry is © OpenStreetMap contributors, licensed under ODbL, with attribution in the film. Inter is by Rasmus Andersson under the SIL Open Font License. The electronic soundtrack is synthesized for this film and uses no sampled music.

The Traditional Chinese version uses Noto Sans TC under the SIL Open Font License. The embedded font notices are preserved in `assets/NotoSansTC-license.txt`.

Individual extracted PNG frames are generated locally and excluded from Git. Both final MP4 files, sound, editable sources, posters, storyboards, and verification reports are included.
