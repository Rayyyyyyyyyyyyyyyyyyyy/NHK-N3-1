# 實作與驗收報告

日期：2026-10-16（Asia/Taipei）。變更：`add-daily-learning-and-review`。42／42 項實作及本機驗證任務完成；沒有剩餘的程式實作任務。外部／人工驗收的未驗證邊界另列於下，不代表已完成線上或人工驗收。

## 實作結果

- 零 Vue 學習 domain 定義 stable refs、attempt 身份、注入 clock、共用 reducer；Pinia 是唯一可寫所有者。四頁與錯題複習都經相同結果入口，顯式提交完整 next state，已移除啟動 streak 與 mutation subscription 寫入。
- 首頁按日期／等級建立、保存及續做最多 10 單字、5 文法、1 篇讀解或 3 聽力。深入分支開始後固定；ready 目標不重抽，建立前當日活動能命中完成量；局部重試、晚回應、午夜、失效題目及明確修復均有處理。未建立首頁只讀 counts。
- `/review` 保留五個主分頁，按等級／類型建立固定輪次；成功解除 pending 後保留當題解析，請求失敗／ID 不存在分開處理並保留摘要。讀解帶文章上下文，單題複習不能完成整篇；聽力共用語音／逐字稿與停止生命週期。
- 單字採 stage 0–5、1／3／7／14／30 本機曆日；同日不跳級、提前成功不延後、失敗當日到期。到期模式最多 10 個唯一單字、不補新字；無到期可進自由練習。一般翻卡與今日任務按優先序補題。
- streak 改為第一個有效練習更新；錯誤答案仍算練習。只開啟、翻面、播放、手動掌握、匯入／恢復及重複提交不加算。v4 streak／lastDate 保留舊開啟紀錄基線，不虛構活動。
- v5 單一文件原子保存 state＋最多 10 快照。完整 v4／v5 驗證與內部 normalize 分離；合法 v4 升級保留五級六欄位及有效快照，不刪改 v4 keys，v2／v3 仍拒絕。損毀 v5 保留原字串並禁止自動覆寫。一般保存失敗可繼續記憶體練習與匯出，匯入／恢復失敗不套用、不改 backups。
- N3／N2／N1 各新增 10 文法、2 篇各 2 題讀解、3 聽力。既有內容保留、子題穩定 ID、序號 high-water mark、counts、四類 runtime／建置資料檢查及保護基線已同步。新增來源與語言限制見 [內容審閱紀錄](content-review.md)。
- README／ARCHITECTURE 說明任務與掌握差異、v5 相容／回退限制及新舊規格取代關係；未修改或封存 `migrate-to-vite-vue3`。

## 實際執行的驗證

| 檢查 | 結果 | 證據範圍 |
| --- | --- | --- |
| `npm run check` | 通過 | Vue／TypeScript 型別、四類資料檢查、12 個 Vitest 檔共 73 個測試 |
| `npm run build` | 通過 | Vite 正式建置，81 modules transformed，使用既有 `/NHK-N3-1/` base path |
| `openspec validate add-daily-learning-and-review --strict --no-interactive` | 通過 | 本 change 的 OpenSpec 結構與規格靜態驗證 |
| `git diff --check` | 通過 | 無差異空白錯誤 |
| 固定資產基線比較 | 通過 | 原始 commit 的五級單字、既有文法／聽力、讀解內容及新增穩定子題 ID 保留 |

`dist/` 僅為本機建置產物，Git 未追蹤、未提交。沒有新增套件或改 lockfile。

## 邏輯與 mock 證據

| 能力 | 主要測試 | 實際涵蓋 |
| --- | --- | --- |
| 學習事件／streak | `learning.test.ts`、`progress.test.ts`、`progress.test.ts`（store） | 有效／非學習、跨級特殊字元、attempt 去重、2,000 筆截斷、90 日淘汰、錯→對→錯、同日／次日／中斷、倒退日期、v4 基線 |
| 單字排程 | `learning.test.ts`、`LearningFlow.test.ts` | 全部階段、同日／提前／失敗後成功、DST 曆日、唯一 max-10、無到期自由入口 |
| v5 保存與恢復 | `learning.test.ts`、`progress.test.ts`、`LearningFlow.test.ts` | malformed v4／v5、完整五級 Unicode 往返、v2／v3 拒絕、未知 ID 保留、升級重試、原 keys 保留、損毀來源、quota、一次覆寫、A→B→C 與撤銷恢復 |
| 四頁提交／複習 | `ReadingPage.test.ts`、`ListeningPage.test.ts`、`LearningFlow.test.ts`、`ChoiceQuestion.test.ts` | 單次提交／穩定選項、讀音不自動掌握、手動掌握不記活動、讀解完整 attempt、失敗不掌握、固定複習、解析保留、部分可用／失敗重試／失效 ID、語音與背景／卸載停止 mock |
| 每日任務 | `LearningFlow.test.ts` | counts-only 首頁、唯一固定目標、等級／日期隔離、晚回應、重整、局部重試、未做 targets、建立前活動、分支鎖定、午夜、明確修復、零題不完成、題庫失敗不誤判刪題 |
| 題庫 | `data.test.ts`、`identity.test.ts`、`questionBank.test.ts` | 目標題數／來源、既有資產 hash、補 ID 重跑／排序／不重用、四類結構、重複 ID／選項／空文章／stale counts 負例、runtime cache／retry／resolver |

其中一個 happy-dom 整合案例按順序走完：建立每日計畫 → 單字評分 → 文法提交 → 完整讀解 → 聽力提交 → 錯題重做 → 次日到期複習 → v5 匯出／匯入 → 恢復。另有可控制 promise、fake clock、StoragePort 與 mock speech 的失敗／時序案例。這些證據屬本機邏輯與模擬元件互動，不等同真實瀏覽器或外部服務驗收。

## 內容品質證據

自動檢查證明必要文字、ID、四選一、來源註記、文章／逐字稿及題數結構。Codex 已逐批自查文法接續、答案唯一性、上下文支持、繁中解析與難度方向，並修正新增題中的限定否定歧義。人工日語校對、正式等級對應與真實語音品質仍未確認，不能用結構檢查宣稱已通過人工語言審閱。

## 未驗證與未執行邊界

依使用者全域規範，沒有開啟、啟動或操作任何外部／內建／既有分頁／有頭或無頭瀏覽器，未使用 Playwright 或 Puppeteer。

- 未驗證真實手機版面、安全區、鍵盤焦點與實際瀏覽器互動。
- 語音僅有 mock 及無語音降級證據，未驗證真實裝置 voice、讀音、斷句或速度。
- 未驗證線上 Pages、Actions、跨 origin 或實際多裝置儲存；沒有發佈、合併或修改 Pages 外部設定。
- 未完成獨立人工日語審閱。內容審閱檔已列明需人工確認的範圍。
- 原始未追蹤 `.agents/`、`.codex/`、`openspec/config.yaml` 保留；沒有清理其他既有工作，也未封存新／舊 change。

## 回退及資料限制

v5 碼不能由舊 v4 應用讀取。回退只會看到保留的升級前 v4；最新 v5 狀態請匯出並保留 v5 key，重新升級不以 v4 覆蓋。快照限同瀏覽器同 origin、最近 10 份；清除資料或換裝置即失效。quota 失敗時當次記憶體可匯出，重新開啟只讀已保存部分；不承諾無限儲存、永久事件去重或多分頁衝突合併。
