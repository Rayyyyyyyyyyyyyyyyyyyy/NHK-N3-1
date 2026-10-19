# 實作紀錄

## 樣式維護

已移除 `src/style.css`，由 `src/styles/main.scss` 統一載入 SCSS。以 `@use` 拆成 base、layout、components、pages，將相同元件的狀態與斷點放回所屬模組，取代尾端持續追加覆寫。色彩沿用 Tailwind config，共用 breakpoint mixins；既有模板 utilities 保留，以 Tailwind layers 管理優先順序。

新增 Sass `^1.105.2` 開發期依賴與 lockfile。比對安裝前後 lockfile，既有套件版本未變更。這次改善重點是樣式所有權與組織，並非單純減少行數或更改副檔名。

## 聽力播放器與卡片

共用 `useJapaneseSpeech` 管理唯一有效播放，每次開始建立新 utterance，以輪次及所有者隔離過期事件。提供播放、暫停、繼續、停止；切題、進入背景及播放元件卸載時清理，卸載其他元件不會中止有效播放。

進度依語音 boundary 的文字位置更新，結束才顯示 100%。引擎沒有 boundary 時顯示 indeterminate，不虛構時間或提供假 seek。錯誤時可重試並顯示逐字稿，播放控制不寫入學習結果。主聽力與錯題複習沿用同一元件。

桌面雙欄網格使用 stretch 與等高 rows，長解析會撐高卡片，不裁切內容；手機維持自然高度。保留前次版型與 margin 修正。

## 實際驗證

- `npm run check`：14 個測試檔、87 個測試通過，含型別與資料完整性檢查。
- 播放器新增 9 個 mock 回歸案例，涵蓋 boundary、無 boundary、暫停／繼續／停止、重播過期事件、播放所有者、錯誤、背景及初始 paused 引擎。
- `npm run build`：成功編譯 Sass、Tailwind 與 Vite，83 個模組。
- `openspec validate refactor-scss-and-listening-player --strict --no-interactive`：通過。
- `git diff --check`：通過；`git ls-files dist` 為空，沒有追蹤建置產物。
- Sass 編譯與 selector 差異檢查已完成，移除的舊 hooks 為未使用的 menu-list，以及改由 task-content 所有的段落樣式。

遵守使用者禁止自行瀏覽器檢測的規範，沒有操作瀏覽器、執行視覺截圖或真實裝置語音驗收。mock 與建置不能證明實際語音事件支援程度、音質、桌面／手機像素與卡片視覺等高；這些仍未驗證。沒有部署、調整 Pages 設定或封存其他變更。
