## Context

現況是一個活著的 GitHub Pages 站(回應 200),9 支全域 script、零建置、零型別、零元件邊界。使用者瀏覽器裡有累積數月、無法重建的 `nihongo_dojo_v3` 進度。

遷移目標堆疊:**Vite + Vue 3 + TypeScript + Pinia + vue-router + Tailwind + VueUse + Vitest**。

三個貫穿全域的約束,所有決策都受其支配:

1. **既有使用者的進度不能遺失**——包含 v2 → v3 → v4 三代格式的相容讀取。
2. **視覺要忠實重現**——「與舊版對照長得一樣」是驗收手段,不是品味問題。
3. **線上站不能在遷移期間壞掉**——Pages 目前服務 repo 根目錄。

## Goals / Non-Goals

**Goals:**

- 用型別與響應式系統取代目前靠人類記憶維護的手動同步清單。
- 讓 `gDone` 改用穩定 id,一次性拆掉題庫插題會錯位進度的未爆彈。
- 保留全部既有學習功能與視覺,遷移前後使用者不應察覺差異(除了不再有已知 bug)。
- 建立可執行的回歸網,取代目前只能靠人工瀏覽器點擊的驗證方式。

**Non-Goals:**

- 不新增學習功能、不改題庫內容、不重新設計 UI。
- 不引入後端、帳號或雲端同步。
- 不修 N2 時代寫死的文案(獨立處理)。
- 不追求 SSR、PWA、離線快取——目前沒有需求驅動。

## Decisions

### D1:題庫留在 `public/`,以 `fetch` 取得,不進 bundle

**決定**:`data/*.json` 移到 `public/data/`,維持執行時 `fetch`。路徑一律以 `import.meta.env.BASE_URL` 組成,不寫死。

**理由**:題庫共 943 KB,其中單字檔 N1 就有 289 KB。若用 `import` 靜態引入,Vite 會把它們打進 bundle,首次載入必須下載全部五個等級——這正好抵銷掉目前「按等級延遲載入」的設計。放 `public/` 才能保留現有的載入特性,也讓題庫維持成獨立於框架的資產(proposal 的不變式之一)。

**替代方案**:*靜態 import + dynamic import 分塊* — Vite 會為每個 JSON 產生 hash 檔名,使題庫不再是可直接編輯的穩定路徑,且 `tools/` 的產生器與檢查腳本要改成理解建置產物。成本高於收益。

### D2:hash 路由,等級不進 URL

**決定**:使用 `createWebHashHistory()`。路由為 `/`、`/vocab`、`/grammar`、`/reading`、`/listening`。**目前修煉等級不放進 URL**,由 Pinia store 持有並持久化。

**理由**:

- **hash 而非 history**:GitHub Pages 是純靜態託管,history 模式下直接開啟或重新整理 `/vocab` 會得到 404,必須靠 `404.html` 轉址的 hack。hash 路由零設定即正確,對一個沒有 SEO 需求的個人學習工具是正確取捨。
- **等級不進 URL**:等級是**持久的使用者設定**(「我現在在修煉 N3」),不是位置。放進 URL 會讓切換等級變成一次導覽、產生瀏覽器歷史、且與「重新開啟 App 回到上次等級」的既有行為衝突。

**替代方案**:*history 模式 + 404.html* — 增加一個容易忘記維護的部署細節,換來目前沒人需要的漂亮網址;*`/n3/vocab`* — 讓等級可分享,但這是單人學習工具,分享不是使用情境。

### D3:進度的持久化不使用 `useStorage`,改用純函式 + 明確持久化

**決定**:

- `src/domain/progress/` 下放**純 TypeScript 函式**:`migrate()`(v2/v3/v4 → canonical v4)、`normalize()`、`encodeCode()` / `decodeCode()`、`isProgressPayload()`。零 Vue 相依、零 localStorage 相依。
- Pinia store 在初始化時讀 localStorage 原始字串 → 交給 `migrate()` → 得到 canonical state。
- 寫入用 store 的 `$subscribe`,經過一層包了 try/catch 的 `progressStorage` 薄層。

**理由**:VueUse 的 `useStorage` 適合「一個值直接對應一個 key」的情境。這裡不是——讀取路徑要處理**三代格式遷移**與**不受信任輸入的驗證**,而遷移只應在載入時發生一次,不應塞進每次讀寫都會跑的 serializer。把遷移與驗證留在純函式,才能用 Vitest 直接對它們斷言(這也是目前 vanilla 版 7 個測試唯一能存在的原因)。

**VueUse 用在真正合適的地方**:`useSpeechSynthesis`(取代聽力頁手寫的 `speechSynthesis` 包裝與語音挑選)、`useEventListener`(自動解除綁定,取代 `visibilitychange` 的手動清理)。

### D4:`gDone` 的 id 遷移查表 MUST 是凍結的常數,不可在執行時從題庫推導

**決定**:

- 為 `data/grammar-<level>.json` 每題新增 `id`,格式 `g-<level>-<三位序號>`(如 `g-n3-001`),由腳本依**當前**順序一次性產生。
- v3 → v4 遷移所用的「索引 → id」對照表,MUST 以**靜態常數**形式提交進程式碼(`src/domain/progress/gdoneMigrationTable.ts`),而不是在執行時讀當下的 `grammar-*.json` 來推導。

**理由**(這是本決策的關鍵,也最容易做錯):遷移是在**使用者下次開啟 App 時**才執行的,而那可能是題庫已經改過好幾版之後。若當下才從題庫推導索引→id,推導出的順序已經不是使用者當初作答時的順序,映射就是錯的——結果是靜默地把進度標到別的題目上,比清空更難察覺。

把對照表凍結在程式碼裡,語意才正確:它記錄的是「v3 時代的索引語意」,而 v3 時代已經結束,不會再變。

**遷移後**:對照表成為唯讀的歷史紀錄,只要還可能存在 v3 資料就不能刪除。

### D5:單一 progress store,題庫走 composable

**決定**:

- **Pinia**:`useProgressStore` 一個,持有全部進度狀態(六欄位 × 五等級)+ `level`。它是**唯一的狀態所有者**。
- **題庫**:`useQuestionBank()` composable,負責 fetch、快取、失敗降級。不放進 Pinia。
- 各分頁的「目前這一輪」衍生資料(抽到的牌組、出題佇列、本次作答)一律用 `computed` 從 store 推導,或以元件區域 `ref` 持有並隨路由/等級自然重建。

**理由**:

- Pinia 存**跨元件共享且需要持久化**的東西——只有進度符合。題庫是可重新取得的快取,不是應用狀態;放進 store 會讓它被誤當成需要持久化的狀態。
- `resetPageStateForLevelChange()` 這份手寫清單之所以存在,正是因為 vanilla 版把「衍生資料」存成獨立的可變副本。改用 computed 推導後,等級一變,衍生值自動失效——**這個函式不是被改寫,是不再需要存在**。
- `ReadingPage.answers` / `ListeningPage.answers` 目前與 store 重複同一份事實,遷移後由 store 為唯一來源、元件只保留 UI 暫態(例如尚未提交的選擇)。

### D6:Tailwind theme 是現有 token 的忠實映射,不使用預設色階

**決定**:在 `tailwind.config` 的 `theme.extend` 中定義下列語意化 token,並**停用不需要的預設調色盤**以避免混用:

| token | 值 | 目前用途 |
|---|---|---|
| `indigo` | `#1B3A5C` | 主色、連結、標題 |
| `indigo-deep` | `#0F2438` | banner 漸層終點 |
| `paper` | `#F6F7F5` | 頁面底色 |
| `ink` | `#20242B` | 主要文字 |
| `border` | `#DDE3E6` | 分隔線 |
| `vermilion` | `#C73E2E` | 錯誤、答錯 |
| `green` | `#2E7D52` | 正確、答對 |
| `muted` | `#8892a0` | 次要文字(現有 7 處,從未 tokenize) |
| `subtle` | `#5b6470` | 說明文字(現有 5 處,從未 tokenize) |
| `correct-bg` | `#EAF5EE` | 答對選項底色 |
| `wrong-bg` | `#FBEAE7` | 答錯選項底色 |

字體:`fontFamily.serif` = `"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif TC", "Songti TC", serif`,設為全站預設。

**明確保留的刻意選擇**:`color-scheme: light only` 維持——這個 App 刻意不做深色模式,Tailwind 的 `dark:` variant **不啟用**,避免日後有人「順手」加上去。

**安全區域**:`env(safe-area-inset-*)` 沒有 Tailwind 內建對應,以 `theme.extend.spacing` 定義 `safe-top` / `safe-bottom` 自訂值承接現有的 `calc(22px + env(...))` 與 `calc(72px + env(...))`。

**理由**:忠實重現的前提是**先把顏色收成有名字的 token**。目前有四個顏色從未進入 `:root`,若不一併收編,它們在 Tailwind 裡會變成 `text-[#8892a0]` 這種任意值,散得比現在更開。

### D7:純邏輯以「行為等價」為驗收,而非重寫

**決定**:`normalizeState()`、`migrateLegacyV2()`、進度碼編解碼移植到 TypeScript 時,MUST 保持行為等價,並以測試證明。vanilla 版的 7 個 Store 測試(存放於 `archive/vanilla-progress-rescue` 分支的 `tools/test-storage.mjs`)MUST 全部改寫為 Vitest 並通過。

**理由**:這些函式是使用者資料唯一的守門員,且已經有一組驗證過能變紅的測試。遷移時「順手改寫得更漂亮」是資料遺失風險最高的做法。先讓等價的測試全綠,再談重構。

### D8:部署切換與程式碼遷移分開驗證

**決定**:

1. 先在遷移分支上加入 GitHub Actions workflow(build → 上傳 Pages artifact),用 Pages 的分支預覽或本地 `vite preview` 驗證產物與 `base` 路徑正確。
2. **確認新站可用之後才合併到 `main`**。合併前 `main` 保持現行的根目錄服務方式,線上站持續可用。
3. `.nojekyll` 需保留在建置產物中(Vite 產出的 `assets/` 不以底線開頭,但保留成本為零且可防未來變動)。

**理由**:Pages 目前直接服務 repo 根目錄。一旦 `main` 上的 `index.html` 變成 Vite 的原始碼版本(引用 `/src/main.ts`),而 workflow 尚未生效,線上站會立刻壞掉且沒有回復路徑。這是本次遷移唯一會影響真實使用者的操作,MUST 分階段。

### D9:架構文件落在 `ARCHITECTURE.md`,`CLAUDE.md` 指向它

**決定**:建立 `ARCHITECTURE.md` 收錄 proposal 中的不變式表與本文件的 D1–D8 結論;另建 `CLAUDE.md` 提供 agent 工作指引並指向前者,不重複內容。

**理由**:main 上沒有既有的架構文件慣例(vanilla 版的 `CLAUDE.md` 僅存在於 archive 分支)。這次遷移改變幾乎所有邊界,且其中多數意圖**無法從程式碼反推**——例如「等級刻意不放進 URL」「刻意不做深色模式」「gDone 對照表為何必須凍結」。這些屬於決策與不變式,適合持久記錄;至於進度欄位的形狀、元件 props 等已由型別強制的東西,不進文件。

## Risks / Trade-offs

- **[gDone 遷移映射錯誤 = 靜默把進度標到別的題目]** → 對照表凍結為靜態常數(D4);遷移函式以真實 v3 資料樣本測試;遷移後題目總數與 id 集合須通過一致性檢查。這是本次風險最高的一項。
- **[遷移期間線上站中斷]** → D8 的分階段流程;合併前不動 `main` 的服務方式。
- **[Tailwind 重寫視覺時產生肉眼難察的偏移]** → 以舊版站台並排對照為驗收手段;token 表(D6)先行定案,元件只能引用 token,不得使用任意值。
- **[「順手重構」污染純邏輯移植]** → D7 要求先達成行為等價並讓移植測試全綠,重構另行處理。
- **[npm 生態系首次進入,相依維護成本從零變成非零]** → 這是換取型別與元件邊界的必要代價,已在 proposal 記錄;鎖定 lockfile,不追求最新版本。
- **[hash 路由的網址較不美觀]** → 已知取捨,換取 Pages 上零設定的正確性(D2)。

## Migration Plan

**使用者資料(v3 → v4)**

1. 讀取 `nihongo_dojo_v3`(或更舊的 `nihongo_dojo_v2`,先走既有的 v2 → v3 遷移路徑)。
2. 以凍結的對照表把 `gDone` 的索引轉為 id,查不到的索引丟棄(代表該題在 v3 時代之後已被刪除)。
3. 寫入新 key `nihongo_dojo_v4`。**保留 `nihongo_dojo_v3` 不刪除**,作為回滾的安全網。
4. 匯入進度碼時走同一條遷移路徑,舊進度碼因此仍然可用。

**回滾**:因為 v3 的 key 不刪除,回滾到 vanilla 版時舊資料仍在,使用者會回到遷移當下的進度(遺失遷移後累積的部分,但不會歸零)。此限制 MUST 明確記錄,不得宣稱為完全可逆。

**部署**:見 D8 的三階段。

## Open Questions

- `nihongo_dojo_v3` 要保留多久才能刪除?建議至少保留到新版穩定運行一段時間,但沒有客觀門檻,暫定不刪。
- 五個分頁的元件拆分粒度(單一 View 元件 vs 抽出共用的「四選一題目卡」元件)留到實作時依實際重複情況決定——四類題庫共用同一個四選一結構,很可能值得抽出,但**先寫出來看到重複再抽**,不預先抽象。
- Vitest 是否需要搭配元件測試(`@vue/test-utils`),或純邏輯測試已足夠?建議先只做純邏輯與 store 測試,元件層依實際缺口再補。
