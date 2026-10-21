# 日本語道場架構決策

本文件記錄 `migrate-to-vite-vue3` 遷移及後續學習功能的意圖；執行指令與部署步驟見 [README](README.md)。原始決策依據為 [OpenSpec design D1–D9](openspec/changes/migrate-to-vite-vue3/design.md)。程式碼、型別與測試負責描述實作細節，本文件不代表線上部署已完成。

## 產品與不變式

這是手機優先的 N5–N1 日文自學工具，資料與進度由瀏覽器處理。框架遷移保留既有學習功能、題庫內容與視覺，不加入帳號、後端、雲端同步、SSR、PWA 或離線快取；N2 時代的備考文案與 YouTube 清單調整不在範圍內。

| 必須保留的約束                             | 原因                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| 既有題庫內容不改寫，身份固定          | 人工整理的內容是獨立於框架的資產                       |
| 六種進度的語意保留，按五個等級分開         | 框架遷移不能改變學習完成的判定                         |
| 同版本進度碼完整往返                       | 這是裝置間搬移進度的唯一途徑                           |
| 匯入先驗證，覆寫先保存可選快照             | 防止誤貼內容清空進度，並讓撤銷本身可撤銷               |
| 明朝體、既有配色、淺色模式與手機安全區保留 | Tailwind 遷移是更換表達方式，不是重新設計              |
| 新部署先驗證，才切換主分支                 | 原本直接服務根目錄，不能把 Vite 原始入口當成可部署產物 |

## D1：題庫是執行期靜態資產

來源檔放在 `public/data/`，建置後仍以 `data/*.json` 穩定路徑供應；這是對提案「位置不變」的部署路徑解讀。禁止把完整題庫靜態 import 到 JavaScript bundle，避免啟動時下載所有等級。資源 URL 經 `import.meta.env.BASE_URL` 組成，以支援 GitHub Pages 專案子路徑。

首頁分母優先使用 `counts.json`，不為計數下載題目；計數來源失敗才退回載入題庫計算。部分失敗以未知分母表示，不能當作零或據此判定達標。成功資料才快取，失敗後允許重試。題庫快取可重建，不是使用者進度。

CLI 與執行期以 `src/domain/bankContract.mjs` 共用純內容驗證，包含必要文字、選項、等級與穩定 ID／唯一性；CLI 另負責檔案、計數一致性與內容保留，執行期另負責 fetch／cache／retry。原生 ESM 讓兩端直接使用同一份規則，不將 Node 專用功能或完整題庫帶進應用程式。單字計數同樣共用：按同等級不同字面計算學習項目，正常 counts、fallback 及單字頁分母一致；多讀音列與既有進度不變。

## D2：網址表示分頁，等級是持久設定

使用 hash 路由，讓 GitHub Pages 上的直接開啟與重新整理不需要伺服器轉址。等級刻意不進 URL：它是目前修煉設定，不是需要分享的位置。切換等級不增加導覽歷史。學習頁依分頁與等級重建，讓當輪卡片、答案與題目自然重置，避免恢復手寫的全域 reset 清單。

## D3、D5：進度只有一個擁有者

Pinia progress store 是跨元件進度的唯一擁有者。進度正規化、格式驗證、編解碼放在零 Vue／零 localStorage 相依的純 TypeScript domain；儲存服務包住瀏覽器讀寫例外。v5 啟動時完整驗證並升級受支援資料；日常變更由 store 以完整 next state 顯式 commit，匯入與恢復走 state 與快照的原子覆寫流程。結果與日期規則見 D10；不再對中間 mutation 使用 `$subscribe` 保存。

不使用 VueUse `useStorage` 綁定進度，因為不受信任的匯入驗證與可撤銷覆寫不能隱藏在通用 serializer 中。VueUse 用於語音和事件生命週期。題庫由 service／composable 載入，不放進持久 store。頁面只持有當輪 UI 暫態，其餘顯示由進度推導，不建立另一份完成紀錄。

## D4：v2／v3 舊進度刻意不遷移（框架遷移的歷史決定）

框架遷移當時唯一使用者已同意重置，因此該版只讀 `nihongo_dojo_v4`，不讀取或轉換 v2／v3；也不接受舊版進度碼。這是刻意接受的單向門，不是遺漏的相容功能。舊版匯出碼不能用來還原新版，未來不得未經決策便加入猜測式部分遷移。實作不主動清除舊 key，但新版也不把它們當作可用的復原來源。

文法進度使用穩定 ID，使未來插題或重排不改變題目身分。ID 一旦指派不能因排序重新編號，新增題目也不能重用既有題目的身分。

### v4 覆寫與恢復契約（歷史；v5 由 D10 取代）

進度碼使用明確的 v4 envelope，驗證後才正規化與套用。六欄位、目前等級、streak 與日期可往返；快照不隨進度碼匯出。

每次匯入或恢復之前保存當前完整進度，最多保留最近 10 份快照。使用者可選擇較早版本，因此 A→B→C 後仍可選 A；恢復本身也新增快照，使誤觸撤銷之後仍能回到撤銷前（包括新累積的學習紀錄）。額度滿時淘汰最舊快照，不能承諾永久保留。

快照存於 `nihongo_dojo_v4_backups`，只在同一瀏覽器、同一 origin 的儲存生命週期內有效。清除網站資料或換裝置會失去這些快照。若無法保存覆寫前快照，匯入／恢復中止；一般學習在 localStorage 不可用時仍以記憶體狀態繼續，畫面提示需匯出備份。

## D6：忠實保留視覺

Tailwind 的語意 token 對應既有 indigo、paper、vermilion 與明朝體；muted、subtle、correct-bg、wrong-bg 也收進 theme，避免散落的任意色碼與預設調色盤混用。刻意維持 `color-scheme: light only`，不新增深色模式。固定底部導覽、主內容寬度與 `env(safe-area-inset-*)` 間距均屬既有行動版體驗。視覺等價需要舊版與新版對照，型別檢查通過不能取代這項證據。

## D7：純邏輯以行為驗證

進度正規化、格式守門與編解碼以非遷移案例的行為等價為驗收。舊版 v2 遷移案例依 D4 移除；無效匯入、完整往返、覆寫恢復、連續匯入與儲存拋錯則必須保留驗證。不要在框架遷移時順便變更這些規則。

## D8：程式碼與部署分階段驗證

先在遷移分支檢查、建置並以正式 base path 預覽 `dist/`，再驗證 Actions 建置與 Pages artifact 流程。建置產物不提交 Git，`.nojekyll` 隨 public 資產進入產物。GitHub Pages 的 Source 設定與 Actions 成功執行是外部狀態；workflow 檔存在不代表已切換或部署成功。

驗證完成前不合併改變入口與部署方式的變更到 `main`。切換後需在既有網址驗證資源、hash 深連結與題庫。既有根目錄服務不能直接執行 `/src/main.ts`。本文件只記錄流程要求，不宣稱已完成外部切換。

## D9：文件分工與已知規格衝突

本文件是持久設計意圖的入口；`CLAUDE.md` 提供工作指引並指向本文件，`README.md` 提供執行與操作說明，不重複維護多份決策。

[build-and-deploy spec](openspec/changes/migrate-to-vite-vue3/specs/build-and-deploy/spec.md) 的「切換完成後」仍要求既有學習進度可讀取，與 D4、提案的明確重置決定及 [progress-persistence spec](openspec/changes/migrate-to-vite-vue3/specs/progress-persistence/spec.md) 相衝突。此次實作依後者使用新 key 並拒絕舊格式；不能據此宣稱滿足前者的舊進度保留條款。提案摘要中「localStorage 相容性／進度碼格式不變」亦由明確的 D4 取代；同版本完整往返仍須保留。這些原始 OpenSpec 文字尚須在規格整理時同步。

## D10：每日學習、複習與 v5 一致提交

本決策依 [add-daily-learning-and-review design](openspec/changes/add-daily-learning-and-review/design.md)，取代未封存 `migrate-to-vite-vue3` 中的啟動 streak、單字抽牌優先序與 v4 後續持久化規則。這是使用者選擇的產品行為變更；舊啟動時計數符合當時規格。主 specs 仍未同步，不修改或自行封存舊 change；日後同步不得以舊規格覆蓋本決策。D4 對 v2／v3 不遷移的歷史決定保留。

`src/domain/learning/` 是零 Vue 的規則邊界，clock 可注入。Pinia 是唯一可寫進度擁有者；`recordLearning` 一次轉移六欄位、活動、錯題、單字排程、日摘要與 streak。共用 LearningChoice／FlashcardExercise／ListeningExercise 保留單次提交、穩定選項、解析及語音生命週期，各頁只持有當輪暫態。讀解子題有獨立 ID；文章 attempt 以 `[articleAttemptId, questionId]` 對應每題提交，完整答完另記完成，僅完整全對才新增 rDone，錯題頁不能直接標整篇掌握。

題目 key 是 `[level, kind, id]` 的 JSON tuple，避免分隔字元碰撞；讀解參照另帶 articleId，單字仍依 word 去重。runtime resolver 使用共用成功 cache，請求失敗可重試，成功載入後找不到 ID 才視為不可用，兩者都不清除持久紀錄。讀解子題工具與文法序號都保留 high-water mark，避免刪題後重用。

今日任務按 `[localDate, level]` 固定保存 targets，首頁尚未建立時只載 counts；建立／續做只需要目前等級的相關資源。pending／error 為暫態，ready／empty 才保存；晚回應限於原日期及等級，匯入／恢復會使舊請求失效。深入分支在開始讀解／聽力後固定。query 只表示模式、日期及組別，等級仍不入 URL；日期／query／等級改變重建輪次，午夜使用新日。完成按當日命中的唯一目標／完整文章推導，無須答對；失效目標須明確修復，保留有效 targets，零題不算完成。

目標解析、失效判定、有效目標完成量、未完成項目與修復選題集中於 `src/domain/learning/plans.ts`，供首頁、練習及 store 共用。未提供成功載入的題庫時不能宣稱目標失效或本組完成；成功的空題庫才代表所有保存目標不可用。修復計算不修改輸入，仍由 store 在確認原請求有效後提交；首頁只持有載入狀態，練習仍固定當輪目標。任務上限定義於 learning types，產生、修復與匯入驗證使用同一份值。

錯題保留失敗次數、最後失敗模式及最新待複習狀態；成功解除 pending 後仍保留歷史。複習輪次固定，當題不因答對立刻消失。單字一般翻卡與今日任務先到期、再無排程待複習、未學、其他；到期模式只抽到期字，每輪最多 10 張。成功間隔為 1／3／7／14／30 個本機曆日，同日最多推進一次；提前成功不延後，失敗重設 stage 0 當天到期，同日成功可解除錯題但不跳級。

streak 僅由有效且未去重的學習提交更新，首次 1、同日不加、次日加 1、中斷重設 1；錯誤答案仍算練習。翻面、播放、切換、手動掌握、匯入／恢復皆不算。日期在提交時取本機 clock，曆日加法不使用固定 24 小時；時鐘倒退時不回退 streak 基線。v4 streak／lastDate 保留原值，不據此虛構活動。

`nihongo_dojo_v5` 單一文件包含 state 與最多 10 個完整 state 快照，使用一次 setItem 提交；快照不含遞迴備份，匯出也不含備份。完整 validator 與可信 normalize 分離，拒絕不完整或矛盾的進度、未知欄位、非法日期／數字及超量資料。v4 首次升級與匯入保留六欄位／等級／歷史基線；單字建立 stage 0、當日到期的基線；兩個 v4 keys 不改寫。有效 v5 一旦存在就是權威；損毀 v5 保留原字串、顯示恢復錯誤並阻止自動覆寫。

一般保存失敗仍套用記憶體 next state 並提供最新匯出；匯入／恢復必須保存成功才套用 state 和 backups。結果最多 2,000 筆、日摘要與任務最多 90 個本機日，長期掌握／錯題／排程不因截斷事件被重算或刪除。完整快照仍可能遇到 quota，不能保證永久保存。回退舊版只讀升級前 v4，v5 碼不承諾可由舊版讀取；保留 v5 及匯出以供重新升級。

新增題庫的結構檢查與既有內容保留可自動驗證，答案語意、自然度及難度須另行審閱，不能以資料檢查宣稱人工語言品質通過。使用者全域規範禁止自行使用瀏覽器檢測；此變更以 happy-dom／mock、型別、資料檢查及建置提供本機證據，真實版面、語音及外部 Pages 驗收保持未驗證。


## D11：桌面與手機使用不同配置、共用學習實例

依使用者 2026-10-16 提供的桌面截圖與版型調整要求，新增 [adapt-desktop-mobile-layout](openspec/changes/adapt-desktop-mobile-layout/design.md)。這是 D6 框架遷移後的明確 UI 變更：保留 indigo／paper、明朝體、淺色與手機安全區，取代桌面沿用 520px 手機單欄及底部導覽的配置。

1024px 起使用桌面側欄與緊湊的等級／streak 設定列；較窄裝置保留五個底部主分頁。1280px 起首頁主欄放今日任務／複習，側欄放目前等級／進階建議；較小桌面與平板先讓主要任務有足夠寬度，再以雙欄呈現輔助資訊。完整五級進度、備份與備考路線以原生 details／summary 展開，首頁 DOM 與鍵盤順序仍先主要任務再輔助資訊。儲存錯誤時自動展開備份，以維持恢復可發現性。

CSS media queries 負責版型，沒有另一套 viewport store、RouterView、TodayTasks 或練習實例；寬度切換不能重設答案、重複掛載資料 effects 或產生另一份學習狀態。NavIcon 僅共用主導覽圖示；路由、等級、日期、結果與持久化所有權維持 D2／D10。頂列、主內容與頁尾共用相同外層寬度／留白；閱讀寬度限制放在內層，避免練習頁與設定列錯位。桌面讀解可同時看原文／問題，聽力用題目網格，單字／文法／複習則限制內層閱讀寬度，手機皆回單欄。

驗證使用 happy-dom 的導覽、單一實例、縮放不重設、語意展開與既有學習回歸，加上型別、資料檢查、建置及 OpenSpec。CSS 規則存在與元件測試不等於真實視覺驗收；沒有因使用者提供 Chrome 截圖而自行操作瀏覽器。真實手機／桌面像素、overflow、焦點與實際語音仍未驗證。


## D12：模組化 SCSS 與單一語音播放所有者

依使用者最後指定的 SCSS 選擇，[refactor-scss-and-listening-player](openspec/changes/refactor-scss-and-listening-player/design.md) 將原本反覆追加覆寫的 style.css 改為 `src/styles/main.scss` 入口。以 @use 分成 base、layout（shell／sidebar／header／navigation）、components（primitives／exercises／speech-player）、pages（home／tasks／study）；常態、狀態及響應式斷點集中在各自負責模組，不靠尾端補相反的全域 selector。只做單一檔案改副檔名不能滿足這個維護決策。

SCSS abstracts 僅提供 theme 色彩函式與具名 breakpoint mixins，不輸出樣式；Tailwind config 仍是共用色彩來源，現有模板 utilities 保留。樣式置於 Tailwind base／components layer，讓 utilities 有明確優先順序，避免原先未分層 CSS 壓過局部 utilities。Sass 是新增的開發期依賴，沿用 npm／lockfile；沒有改其他既有套件版本或新增應用執行期依賴。

`useJapaneseSpeech` 擁有 transient 的有效播放，與 Pinia 學習狀態無關。每次播放建立新 native utterance，使用輪次與所有者檢查忽略舊 boundary／end／error；切題先停止前一題，卸載非播放元件不能取消另一題。暫停／繼續保留同一 utterance，停止／背景／有效元件卸載清除進度，開始時處理引擎殘留 paused 狀態。

進度以有效 boundary 的 charIndex 對文字長度推算，end 才為 100%；未提供 boundary 時只顯示播放中與 indeterminate，不虛構總時間或 seek。native 錯誤可重新播放並提供原文降級。主聽力與錯題頁沿用 ListeningExercise；播放、暫停、停止都不產生學習活動。桌面聽力 grid 使用 stretch 與等高 rows，長內容撐高；手機不固定高度。

mock 語音事件、既有學習回歸、Sass／Tailwind 編譯及 Vite 建置提供本機證據；真實語音事件支援程度、裝置音質與實際像素等高仍未驗證，不自行操作瀏覽器。
