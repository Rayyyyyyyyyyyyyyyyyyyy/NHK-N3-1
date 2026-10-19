## Why

使用者要求聽力語音進度與統一卡片高度，並指出 style.css 多次追加覆寫難維護，最後明確指定改用 SCSS。需整理樣式所有權並補上可觀察的語音播放狀態。

## What Changes

- 拆分 SCSS tokens、base、layout、共用元件與頁面模組；同一 selector 的常態／狀態／斷點集中維護，取消舊 style.css。
- 延用現有 Tailwind utilities 處理既有模板上的局部樣式；不另開第二套色彩，SCSS 讀相同 theme tokens。新增 Sass 開發期編譯依賴。
- 聽力與聽力錯題共用進度、暫停／繼續／停止與錯誤原文降級；進度依語音 boundary，不捏造總秒數。
- 桌面聽力網格卡片統一等高，長解析可撐開；手機維持自然高度。

## Capabilities

### New Capabilities

- `scss-style-organization`: 模組化 SCSS 與單一樣式定義。
- `listening-playback`: 語音進度、播放控制及等高卡片。

### Modified Capabilities

無；保留既有學習、單次作答、進度與語音離頁／背景停止的契約。

## Impact

影響 main.ts 樣式入口、SCSS、Sass dev dependency、語音 composable、ListeningExercise 及 mock 測試。無題庫／資料版本／部署變更，不操作瀏覽器。
