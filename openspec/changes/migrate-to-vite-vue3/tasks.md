## 1. 分支與骨架

- [x] 1.1 從 `main` 開遷移分支,遷移期間 `main` 維持現行的根目錄服務方式(D8)
- [x] 1.2 建立 `package.json` 與 Vite + Vue 3 + TypeScript 骨架,鎖定 lockfile
- [x] 1.3 設定 `vite.config.ts` 的 `base` 為部署子路徑,並確認 `import.meta.env.BASE_URL` 可用
- [x] 1.4 安裝並設定 vue-router、Pinia、`@vueuse/core`、Tailwind、Vitest
- [x] 1.5 建立 `npm run check` 統一入口:型別檢查 + 測試(build-and-deploy 規格要求可單一指令執行)
- [x] 1.6 把 `data/*.json` 移到 `public/data/`,確認建置後不進 bundle(question-bank-access 規格)

## 2. 文法題穩定 id

- [x] 2.1 寫腳本為 `public/data/grammar-<level>.json` 每題新增 `id`,格式 `g-<level>-<三位序號>`
- [x] 2.2 擴充資料檢查腳本:驗證各等級 id 存在且唯一(build-and-deploy 規格)

## 3. 純邏輯移植(先寫測試,後寫實作)

- [x] 3.1 定義 `ProgressState` 等型別,六個進度欄位 × 五等級的形狀由型別強制
- [x] 3.2 把 archive 分支 `tools/test-storage.mjs` 中**與版本遷移無關**的案例改寫為 Vitest,先讓它們紅
- [x] 3.3 移植 `normalizeState()` / `isDojoStateShape()` / 進度碼編解碼到 `src/domain/progress/`,零 Vue 與零 localStorage 相依(D3)。**不移植** `migrateLegacyV2()`
- [x] 3.4 確認 3.2 全綠——這是「行為等價」的證明(D7)
- [x] 3.5 測試:舊版格式的進度碼被明確拒絕,且不部分套用(progress-persistence 規格)
- [x] 3.6 測試:同版本進度碼匯出後匯入,六欄位 × 五等級與等級、連續天數皆完全一致
- [x] 3.7 實作有界撤銷堆疊:匯入與撤銷**兩者**在覆寫前都先保存當前狀態
- [x] 3.8 測試:匯入後撤銷、撤銷後再撤銷、連續兩次匯入三種情境(progress-persistence 規格)

## 4. 持久化層與 Pinia store

- [x] 4.1 `progressStorage` 薄層:包 try/catch 的 localStorage 讀寫,拋錯時安全降級
- [x] 4.2 測試:localStorage 讀寫刪全部拋錯時仍回傳完整預設狀態、且回報無可撤銷備份
- [x] 4.3 `useProgressStore`:初始化時讀原始字串 → `normalize()` → canonical state;使用新的儲存 key,**不讀取舊版 key**(D4)
- [x] 4.4 測試:瀏覽器中存在舊版資料時,新版以空白預設進度啟動
- [x] 4.5 store 的 mark 類 action(單字掌握/待複習、文法對錯、讀解完成、聽力作答)與連續天數更新
- [x] 4.6 測試:連續天數的同日/隔日/中斷三種情境

## 5. 題庫存取

- [x] 5.1 `useQuestionBank()` composable:按等級延遲載入、成功才快取、失敗回空且**不快取**
- [x] 5.2 測試(注入假 fetch):失敗後重試會重新發出請求並取得正確資料
- [x] 5.3 測試:載入某等級不會觸發其他等級的請求
- [x] 5.4 首頁題數來源與其 fallback;測試 counts 缺席時退回完整載入仍得到正確分母
- [x] 5.5 漢字查詢的外部 API 包裝與快取,查詢失敗不影響卡片本身

## 6. Tailwind theme 與 app shell

- [x] 6.1 依 design D6 的 token 表建立 `tailwind.config`,含 `muted`/`subtle`/`correct-bg`/`wrong-bg` 四個新收編的顏色
- [x] 6.2 設定明朝體為全站預設 `fontFamily.serif`;**停用 `dark:` variant**(刻意不做深色模式)
- [x] 6.3 定義 `safe-top` / `safe-bottom` 間距,承接 `env(safe-area-inset-*)`
- [x] 6.4 App shell:頂部橫幅(道字、連續天數、等級藥丸)與底部固定導覽
- [x] 6.5 vue-router 以 hash history 設定五個路由(D2)
- [x] 6.6 等級切換不產生瀏覽器歷史、不改變目前分頁

## 7. 五個分頁

- [x] 7.1 首頁:五等級進度總覽、進階建議、今日菜單、進度匯出入與撤銷、備考路線
- [x] 7.2 首頁:分母未知時顯示為未知而非 0,且進階判定不得因此誤判達標
- [x] 7.3 單字頁:翻卡模式(抽牌策略、翻面、記住了/還不熟)
- [x] 7.4 單字頁:漢字查詢,點漢字不得觸發翻面
- [x] 7.5 單字頁:讀音測驗(誘答同等級且不同音、連勝計數)
- [x] 7.6 文法頁:出題佇列(未掌握優先)、答對記錄/答錯取消、解析與下一題
- [x] 7.7 讀解頁:列表與詳細兩層、單字備註、全對才算完成、重做
- [x] 7.8 聽力頁:以 VueUse `useSpeechSynthesis` 朗讀、語速控制、不支援時降級顯示原文
- [x] 7.9 聽力頁:離開分頁或頁面轉入背景時停止播放
- [x] 7.10 各分頁的選項順序在該題/該頁存續期間保持穩定
- [x] 7.11 檢視四類題庫的四選一呈現是否出現真實重複,**確認重複後**再抽共用元件(不預先抽象)

## 8. 部署(分階段,最後執行)

- [x] 8.1 加入 GitHub Actions workflow:型別檢查 + 測試 + build → 上傳 Pages artifact
- [x] 8.2 workflow 在檢查或建置失敗時中止且不發佈
- [x] 8.3 本機以部署用 base path 執行 `vite preview`,確認無資源請求失敗、題庫可取得
- [ ] 8.4 在分支上驗證部署產物可用**之後**,才合併到 `main`(D8:此前 `main` 不得改變服務方式)
- [ ] 8.5 首次發佈後以真實瀏覽器確認站台可用,且以空白進度正常啟動

## 9. 架構文件

- [x] 9.1 建立 `ARCHITECTURE.md`:收錄 proposal 的不變式表與 design 的 D1–D9 結論
- [x] 9.2 特別記錄無法從程式碼反推的意圖:等級為何不進 URL、為何刻意不做深色模式、**舊進度為何刻意不遷移且此為單向門**
- [x] 9.3 建立新的 `CLAUDE.md` 提供工作指引並指向 `ARCHITECTURE.md`,不重複內容;不記錄已由型別強制的事實
- [x] 9.4 更新 `README.md`:開發與建置指令、部署方式、儲存與遷移說明

## 10. 驗收

- [x] 10.1 `npm run check` 全綠(型別檢查 + 全部測試)
- [ ] 10.2 與既有部署版本並排比對五個分頁,確認配色、字體、間距、版面一致(app-shell-navigation 規格的驗收手段)
- [x] 10.3 手動驗收破壞性路徑:誤貼非進度碼、匯入後撤銷、撤銷後再撤銷、連續兩次匯入
- [x] 10.4 手動驗收降級路徑:題庫請求失敗時首頁仍完整、匯出入口仍可用
- [x] 10.5 完成報告列出未驗證邊界:進度重置為單向門、備份與 localStorage 同生命週期
