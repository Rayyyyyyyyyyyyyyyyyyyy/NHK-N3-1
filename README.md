# 日本語道場 — N5 → N1

手機優先的日文 JLPT 學習單頁應用，使用 Vue 3、TypeScript、Pinia、vue-router、Tailwind、VueUse 與 Vite，提供繁體中文解說。

五階段修煉制：N5／N4／N3／N2／N1 可自由切換，四個學習分頁（單字／文法／讀解／聽力）皆依目前等級顯示對應內容與進度。

## 功能

- **首頁**：五個等級各一組整體進度、進階建議（達標可一鍵切換到下一等級）、今日菜單、進度匯出／匯入（base64 進度碼）、備考路線
- **單字**：N5 718 字／N4 666 字／N3 2,139 字／N2 1,748 字／N1 2,699 字，翻卡記憶／讀音測驗雙模式，誘答同等級抽取，點漢字可查 [kanjiapi.dev](https://kanjiapi.dev) 音讀訓讀
- **文法**：N5 80 題／N4 81 題／N3 20 題／N2 30 題／N1 15 題句子填空
- **讀解**：N5 2 篇／N4 2 篇／N3 1 篇／N2 2 篇／N1 1 篇＋延伸練習連結（NHK 從新聞學日語／NHK NEWS WEB EASY）
- **聽力**：N5 4 題／N4 4 題／N3 4 題／N2 4 題／N1 3 題語音朗讀測驗（speechSynthesis）＋ YouTube 文法課程播放清單

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
| `npm run check:data` | 驗證四選一結構、文法 ID 與題數清單            |
| `npm run build`      | 型別檢查後建置至 `dist/`                      |
| `npm run preview`    | 預覽上一次建置的 `dist/`                      |

指令清單是操作方式，不代表各次變更已通過驗證。建置預覽通常位於 `http://localhost:4173/NHK-N3-1/`；請以終端顯示值為準。

## 題庫維護

題庫放在 `public/data/`，建置後保持 `data/*.json` 靜態路徑，執行時按需取得。首頁以 `counts.json` 取得分母，不需下載完整題庫。

文法題的穩定 ID 不隨排序改變。新增缺少 ID 的題目時，可執行 `node tools/add-grammar-ids.mjs`；它保留既有 ID，並以 `tools/grammar-id-sequences.json` 保存已使用序號的上限，避免刪題後重用 ID；勿重設此檔。調整題庫數量後執行 `node tools/check-data.mjs --write-counts` 更新計數，再執行 `npm run check:data`。這兩個產生指令會寫入題庫或計數檔，應檢閱差異。

## 建置與部署切換

目標是 GitHub Actions 檢查、建置並發佈 `dist/` 到 GitHub Pages，使用 `/NHK-N3-1/` 子路徑與 hash 路由。`dist/` 不提交版本庫，`public/.nojekyll` 隨建置產物供應。

1. 在遷移分支執行 `npm run check`、`npm run build`、`npm run preview`，驗證五個分頁、重新整理 hash 深連結及題庫請求。
2. 在合併前驗證 Actions 建置與 artifact 流程，並確認 Pages 的部署來源切換安排。原本從根目錄服務的 Pages 不能直接執行新的 `/src/main.ts`。
3. 新流程完成驗證後才合併；將 Pages Source 設為 GitHub Actions 的外部操作需與切換協調。首次發佈後，再檢查既有網址及實際資源載入。

本文件不表示 Pages 設定已變更、Actions 已成功執行或線上部署已完成。完整切換約束及原始規格衝突見 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 資料出處

- **單字**：Jonathan Waller ([tanos.co.uk](https://www.tanos.co.uk/jlpt/)) CC-BY，經 [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) 整理；繁體中文釋義為本專案自行翻譯
- **N5・N4 文法點清單**：[Sigmabond01/jlpt-grammar-api](https://github.com/Sigmabond01/jlpt-grammar-api)（MIT）——題庫的涵蓋範圍依此清單建立，例句與繁中解析為本專案自行撰寫
- **N3・N2・N1 文法／讀解／聽力**：使用者提供的題庫內容
- **N5・N4 讀解／聽力**：本專案自行撰寫
- **漢字**：[kanjiapi.dev](https://kanjiapi.dev)（執行時即時查詢）

## 儲存

進度僅使用此瀏覽器的 `localStorage`，不設後端或雲端同步。新版 key 為 `nihongo_dojo_v4`；N5／N4／N3／N2／N1 分別記錄 vKnown／vLearning／gDone／lDone／lCorrect／rDone，另保存目前等級、連續學習天數與日期。文法進度使用穩定題目 ID。

**本次遷移刻意重置既有進度。** 新版不讀取或轉換 v2／v3，也拒絕舊版進度碼；此決定已由唯一使用者接受。舊進度碼不能還原到新版。新版進度碼帶有 v4 格式標記，可在裝置間匯出／匯入全部進度；它是編碼文字，不是加密內容。

匯入先驗證，再保存覆寫前快照。匯入與恢復最多留下最近 10 份快照，存在 `nihongo_dojo_v4_backups`，首頁可選較早版本，也可撤銷剛才的恢復。快照不包含在匯出碼中，只對同一瀏覽器的同一網站來源有效；清除資料或換裝置即失效，額度滿時最舊快照會淘汰。

localStorage 不可用時仍可練習，但進度只留在當次記憶體；請匯出進度碼保存。若無法先保存撤銷快照，匯入或恢復會中止，避免直接覆寫當前進度。
