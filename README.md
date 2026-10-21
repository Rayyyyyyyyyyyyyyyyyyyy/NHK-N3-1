# 日本語道場 — N5 → N1

手機優先的日文 JLPT 學習單頁應用，使用 Vue 3、TypeScript、Pinia、vue-router、SCSS、Tailwind utilities、VueUse 與 Vite，提供繁體中文解說。

桌面與手機採不同的響應式配置：桌面使用側邊導覽及緊湊設定列，寬螢幕首頁以今日任務為主欄、目前等級進度為側欄；手機保留單欄與底部五分頁。五級總覽、備份與備考路線可展開，讀解／聽力在寬螢幕使用並排／網格工作區。

五階段修煉制：N5／N4／N3／N2／N1 可自由切換，四個學習分頁（單字／文法／讀解／聽力）皆依目前等級顯示對應內容與進度。

## 功能

- **首頁**：五個等級各一組整體進度、進階建議（達標可一鍵切換到下一等級）、可建立及續做的今日任務、錯題／到期複習入口、進度匯出／匯入（base64 進度碼）、備考路線
- **單字**：按字面計算 N5 710 項／N4 664 項／N3 2,102 項／N2 1,741 項／N1 2,685 項，翻卡記憶／讀音測驗雙模式，誘答同等級抽取，點漢字可查 [kanjiapi.dev](https://kanjiapi.dev) 音讀訓讀。多讀音原始內容完整保留，共用同字面的學習進度
- **文法**：N5 80 題／N4 81 題／N3 30 題／N2 40 題／N1 25 題句子填空
- **讀解**：N5 2 篇／N4 2 篇／N3 3 篇／N2 4 篇／N1 3 篇＋延伸練習連結（NHK 從新聞學日語／NHK NEWS WEB EASY）
- **聽力**：N5 4 題／N4 4 題／N3 7 題／N2 7 題／N1 6 題語音朗讀測驗（speechSynthesis，含進度條、暫停／繼續／停止）＋ YouTube 文法課程播放清單

- **今日任務**：依本機日期與等級保存最多 10 單字、5 文法及 1 篇讀解或 3 聽力；深入分支開始後固定，支援局部重試、失效目標修復及跨頁續做
- **錯題複習**：`#/review` 可依目前等級及題型建立固定輪次，成功後解除待複習並保留解析；讀解附原文上下文，單題複習不算整篇完成
- **單字排程**：成功依 1／3／7／14／30 本機曆日安排，下次到期再推進；同日最多成功推進一次，提前答對不延後，答錯當天到期，同日重做成功也不跳級
- **連續學習**：有效翻卡評分或提交答案才累計；答錯仍算練習，開啟／翻面／播放／手動掌握／匯入及恢復不增加天數

今日任務的「已做」不等於掌握：單字／文法／聽力按不同目標的有效練習計量，重做不灌水；讀解完整答完便計任務完成，只有同一篇完整 attempt 全對才記為掌握。最新答對結果另顯示。既有 N3／N2／N1 分母因增題增加，百分比可能下降，但原進度與題目身份保留。

## 本地開發

安裝 Node.js 22 與 npm 後：

```bash
npm ci
npm run dev
```

開啟終端顯示的網址，目前 base path 為 `/NHK-N3-1/`（通常為 `http://localhost:5173/NHK-N3-1/`）。原始碼需由 Vite 處理，不能再用一般靜態伺服器直接服務專案根目錄。

| 指令                 | 用途                                          |
| -------------------- | --------------------------------------------- |
| `npm run check`      | TypeScript／Vue 型別檢查、題庫完整性與 Vitest |
| `npm test`           | 單獨執行 Vitest                               |
| `npm run check:data` | 驗證四類題庫結構、level、穩定 ID、選項與題數            |
| `npm run build`      | 型別檢查後建置至 `dist/`                      |
| `npm run preview`    | 預覽上一次建置的 `dist/`                      |

指令清單是操作方式，不代表各次變更已通過驗證。建置預覽通常位於 `http://localhost:4173/NHK-N3-1/`；請以終端顯示值為準。

## 樣式維護

全域入口為 `src/styles/main.scss`，以 Sass `@use` 載入 base、layout、components、pages 模組；原 style.css 已移除。版型請修改對應 shell／sidebar／header／navigation，首頁與任務則在各自 pages 模組，同一元件的狀態／斷點就近管理，勿在入口末尾追加覆寫。`abstracts/_tokens.scss` 共用色彩與具名斷點；色彩來源仍是 Tailwind config，既有 utilities 由 layer 保持優先順序。Sass 僅用於開發／建置。

聽力進度依語音引擎回報的朗讀位置更新，完成事件才為 100%；未回報位置時顯示播放中動畫，不估算秒數。可暫停／繼續／停止，停止後可換語速；播放失敗會顯示原文並允許重試。桌面卡片等高並保留完整解析，手機自然高度。實際語音與像素效果仍需人工確認；[SCSS 與播放器報告](openspec/changes/refactor-scss-and-listening-player/implementation-report.md) 記錄驗證範圍。

## 題庫維護

題庫放在 `public/data/`，建置後保持 `data/*.json` 靜態路徑，執行時按需取得。首頁以 `counts.json` 取得分母，不需下載完整題庫。

單字分母按同等級的不同字面計算，與掌握／錯題／排程的身份一致；原始題庫列數仍為 N5 718／N4 666／N3 2,139／N2 1,748／N1 2,699。不同讀音不刪除，也不遷移既有進度。用語見 [GLOSSARY.md](GLOSSARY.md)。

`src/domain/bankContract.mjs` 提供 CLI 與執行期共用的純題庫驗證及單字計數；使用原生 ESM，讓 Node 指令與 Vite 直接載入同一份規則。檔案讀寫、counts 比較及內容保留檢查由工具負責，執行期保留載入、成功快取及重試。

文法題的穩定 ID 不隨排序改變。新增缺少 ID 的題目時，可執行 `node tools/add-grammar-ids.mjs`；它保留既有 ID，並以 `tools/grammar-id-sequences.json` 保存已使用序號的上限，避免刪題後重用 ID；勿重設此檔。讀解子題亦有獨立穩定 ID，執行 `node tools/add-reading-ids.mjs` 可補缺漏；`tools/reading-id-sequence.json` 保存 high-water mark，不得重設或依排序重編。調整題庫數量後執行 `node tools/check-data.mjs --write-counts` 更新計數，再執行 `npm run check:data`。這些產生指令會寫入題庫或計數檔，應檢閱差異。`tools/content-baseline.json` 是本次擴充前的固定資產保留基線；測試對照其原始 commit、ID 與雜湊，不應為通過測試而重設。

## 建置與部署切換

目標是 GitHub Actions 檢查、建置並發佈 `dist/` 到 GitHub Pages，使用 `/NHK-N3-1/` 子路徑與 hash 路由。`dist/` 不提交版本庫，`public/.nojekyll` 隨建置產物供應。

1. 在遷移分支執行 `npm run check`、`npm run build`、`npm run preview`，驗證五個分頁、重新整理 hash 深連結及題庫請求。
2. 在合併前驗證 Actions 建置與 artifact 流程，並確認 Pages 的部署來源切換安排。原本從根目錄服務的 Pages 不能直接執行新的 `/src/main.ts`。
3. 新流程完成驗證後才合併；將 Pages Source 設為 GitHub Actions 的外部操作需與切換協調。首次發佈後，再檢查既有網址及實際資源載入。

本文件不表示 Pages 設定已變更、Actions 已成功執行或線上部署已完成。完整切換約束及原始規格衝突見 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 資料出處

- **單字**：Jonathan Waller ([tanos.co.uk](https://www.tanos.co.uk/jlpt/)) CC-BY，經 [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) 整理；繁體中文釋義為本專案自行翻譯
- **N5・N4 文法點清單**：[Sigmabond01/jlpt-grammar-api](https://github.com/Sigmabond01/jlpt-grammar-api)（MIT）——題庫的涵蓋範圍依此清單建立，例句與繁中解析為本專案自行撰寫
- **N3・N2・N1 文法／讀解／聽力**：既有使用者提供內容保留；2026-10-16 各級追加 10 文法／2 讀解／3 聽力為本專案原創，非官方試題。來源性質記於新增項目的 `source`；[內容審閱紀錄](openspec/changes/add-daily-learning-and-review/content-review.md) 區分程式結構檢查、Codex 內容自查與尚未完成的人工日語審閱
- **N5・N4 讀解／聽力**：本專案自行撰寫
- **漢字**：[kanjiapi.dev](https://kanjiapi.dev)（執行時即時查詢）

## 儲存

進度僅使用此瀏覽器、此 origin 的 `localStorage`，不設後端或雲端同步。`nihongo_dojo_v5` 以單一文件保存 `{ version: 5, state, backups }`；state 包含五級六種進度、等級、streak／日期、最近最多 2,000 筆結果、90 個本機日的摘要／計畫、錯題及單字排程。錯題、排程與掌握不隨舊事件淘汰而消失。

首次使用 v5 時，若尚無 v5 文件，完整驗證既有 `nihongo_dojo_v4` 與有效 `nihongo_dojo_v4_backups` 後升級，保留六種進度、等級及 streak／lastDate 歷史基線；已掌握與待複習單字以 stage 0、升級日到期起算，不虛構舊活動。**升級前的 streak 是開啟紀錄，升級後才依有效練習累計。** 兩個 v4 原始 keys 均不刪改。v2／v3 的歷史不遷移決定維持，相關碼仍不接受。

新匯出使用 v5 envelope，包含全部 state，不包含本機 backups。v4／v5 碼須有完整五級欄位、合法型別／日期、不重複且一致的進度；未知欄位及未知版本會拒絕，未知題目 ID 可保留並顯示不可用。進度碼是 Unicode 安全編碼文字，並非加密。**v5 碼無法匯回舊 v4 應用。**

匯入及恢復完整覆寫、不合併，先驗證，再以一次寫入提交 next state 與覆寫前快照。最多保留最近 10 份完整 state 快照，首頁可選較早版本，也可撤銷恢復本身。快照只對同一瀏覽器、同一 origin 有效；清除資料或換裝置即失效，不能代替自行匯出備份。

localStorage 讀寫失敗或 quota 不足時，練習仍在當次記憶體繼續，畫面提示未保存，匯出碼包含最新記憶體狀態；重新開啟只會讀已保存的資料。匯入／恢復保存失敗則不套用、不新增備份。損毀的既有文件會保留原始字串並阻止自動覆寫，首頁可取出原始資料，或以有效進度碼明確恢復。

回退舊應用只能看到升級前留下的 v4 狀態，不能繼續最新 v5 活動；請先匯出 v5。保留 v5 key，重新升級時以既有 v5 為權威，不重新用 v4 覆蓋。多分頁／裝置衝突合併不在此版本範圍。

## 此次驗證邊界

自動驗證使用型別、Vitest happy-dom、資料保留比較、建置及 OpenSpec；學習功能驗證詳見 [實作報告](openspec/changes/add-daily-learning-and-review/implementation-report.md)，桌面／手機版型調整詳見 [響應式 UI 報告](openspec/changes/adapt-desktop-mobile-layout/implementation-report.md)。依使用者規範，未啟動任何瀏覽器檢測。真實手機版面、鍵盤焦點、實際語音、線上 Pages／Actions 與人工日語品質尚未驗證；沒有執行發佈、合併或修改 Pages 外部設定。
