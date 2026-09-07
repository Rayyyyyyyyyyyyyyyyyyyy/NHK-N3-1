## Context

現況是一個活著的 GitHub Pages 站(回應 200),9 支全域 script、零建置、零型別、零元件邊界。目前只有一位使用者(作者本人),且已明確同意既有的 `nihongo_dojo_v3` 進度可以重置。

遷移目標堆疊:**Vite + Vue 3 + TypeScript + Pinia + vue-router + Tailwind + VueUse + Vitest**。

三個貫穿全域的約束,所有決策都受其支配:

1. **既有進度直接重置**——唯一的使用者已同意,因此不建立任何向後相容的遷移路徑(D4)。
2. **視覺要忠實重現**——「與舊版對照長得一樣」是驗收手段,不是品味問題。
3. **線上站不能在遷移期間壞掉**——Pages 目前服務 repo 根目錄。

## Goals / Non-Goals

**Goals:**

- 用型別與響應式系統取代目前靠人類記憶維護的手動同步清單。
- 讓 `gDone` 改用穩定 id,使日後在題庫任何位置增刪題目都不影響進度。
- 保留全部既有學習功能與視覺,遷移前後除了進度重置與已知 bug 消失之外,不應有其他差異。
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

- `src/domain/progress/` 下放**純 TypeScript 函式**:`normalize()`、`encodeCode()` / `decodeCode()`、`isProgressPayload()`。零 Vue 相依、零 localStorage 相依。
- Pinia store 在初始化時讀 localStorage 原始字串 → 經 `normalize()` → 得到 canonical state。
- 寫入用 store 的 `$subscribe`,經過一層包了 try/catch 的 `progressStorage` 薄層。

**理由**:VueUse 的 `useStorage` 適合「一個值直接對應一個 key」的情境。這裡不是——匯入的進度碼是**不受信任的外部輸入**,必須先驗證再正規化才可寫入,而這不該塞進每次讀寫都會跑的 serializer。把驗證與正規化留在純函式,才能用 Vitest 直接對它們斷言(這也是目前 vanilla 版測試唯一能存在的原因)。

**VueUse 用在真正合適的地方**:`useSpeechSynthesis`(取代聽力頁手寫的 `speechSynthesis` 包裝與語音挑選)、`useEventListener`(自動解除綁定,取代 `visibilitychange` 的手動清理)。

### D4:不建立向後相容的遷移路徑,既有進度直接重置

**決定**:新版**不讀取** `nihongo_dojo_v3` 或 `nihongo_dojo_v2`,不實作任何版本遷移。使用新的儲存 key,遷移後從空白進度開始。文法題仍新增穩定 id(見下),但**不需要索引→id 的對照表**。

**理由**:這個 App 目前只有一位使用者,且該使用者明確表示既有進度可以重置。在只有一位使用者且他願意重來的情況下,建立三代格式的相容讀取、凍結對照表、以及保留舊 key 作為回滾網,全部是為了不存在的風險而付出的成本。

這移除了整份遷移**風險最高的一項**:原本的設計必須把「v3 索引 → id」的對照表凍結成靜態常數並永久保留,因為遷移是在使用者下次開啟時才執行,屆時題庫可能已改版,依當下順序推導會把進度標到錯誤的題目上——比清空更難察覺。不做遷移,這整類風險連同其防護機制一起消失。

**文法題 id 仍然要做**:id 的價值不在遷移,而在**未來**——有了穩定 id,日後在題庫任何位置增刪題目都不會影響進度。這是本來就該有的資料模型,只是現在不必背負歷史包袱。

**代價與其可接受性**:此決定使新版**無法**接收舊版資料。若日後這個 App 有了第二位使用者,或作者自己想保留目前的學習紀錄,唯一的補救是在遷移前用舊版匯出進度碼——但新版也不會讀舊版的進度碼。**這是刻意接受的單向門**,MUST 記錄於架構文件,避免日後誤以為是疏漏。

**替代方案**:*保留一次性的遷移* — 成本已如上述,且使用者已明確表示不需要;*保留舊 key 不刪* — 沒有讀取端,留著只是佔用空間。

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

**決定**:`normalizeState()`、`isDojoStateShape()`、進度碼編解碼移植到 TypeScript 時,MUST 保持行為等價,並以測試證明。vanilla 版 7 個 Store 測試(存放於 `archive/vanilla-progress-rescue` 分支)中**與版本遷移無關**的部分 MUST 改寫為 Vitest 並通過;涉及 v2 遷移的案例隨 D4 一併移除。

**理由**:這些函式仍是使用者資料的守門員——**即使不做歷史遷移,匯入與撤銷仍會整份覆寫進度**。既有測試已驗證過能變紅,遷移時「順手改寫得更漂亮」風險最高。先讓等價的測試全綠,再談重構。

### D8:部署切換與程式碼遷移分開驗證

**決定**:

1. 先在遷移分支上加入 GitHub Actions workflow(build → 上傳 Pages artifact),用 Pages 的分支預覽或本地 `vite preview` 驗證產物與 `base` 路徑正確。
2. **確認新站可用之後才合併到 `main`**。合併前 `main` 保持現行的根目錄服務方式,線上站持續可用。
3. `.nojekyll` 需保留在建置產物中(Vite 產出的 `assets/` 不以底線開頭,但保留成本為零且可防未來變動)。

**理由**:Pages 目前直接服務 repo 根目錄。一旦 `main` 上的 `index.html` 變成 Vite 的原始碼版本(引用 `/src/main.ts`),而 workflow 尚未生效,線上站會立刻壞掉且沒有回復路徑。雖然只有一位使用者、短暫中斷可以接受,但分階段的成本近乎為零,沒有理由不做。

### D9:架構文件落在 `ARCHITECTURE.md`,`CLAUDE.md` 指向它

**決定**:建立 `ARCHITECTURE.md` 收錄 proposal 中的不變式表與本文件的 D1–D9 結論;另建 `CLAUDE.md` 提供 agent 工作指引並指向前者,不重複內容。

**理由**:main 上沒有既有的架構文件慣例(vanilla 版的 `CLAUDE.md` 僅存在於 archive 分支)。這次遷移改變幾乎所有邊界,且其中多數意圖**無法從程式碼反推**——例如「等級刻意不放進 URL」「刻意不做深色模式」「舊進度為何刻意不遷移,以及這是一道單向門」。這些屬於決策與不變式,適合持久記錄;至於進度欄位的形狀、元件 props 等已由型別強制的東西,不進文件。

## Risks / Trade-offs

- **[進度重置是單向門,舊資料與舊進度碼皆無法再讀入]** → 已由唯一使用者明確同意(D4);MUST 記錄於架構文件,避免日後被誤認為疏漏。
- **[遷移期間線上站中斷]** → D8 的分階段流程;合併前不動 `main` 的服務方式。
- **[Tailwind 重寫視覺時產生肉眼難察的偏移]** → 以舊版站台並排對照為驗收手段;token 表(D6)先行定案,元件只能引用 token,不得使用任意值。
- **[「順手重構」污染純邏輯移植]** → D7 要求先達成行為等價並讓移植測試全綠,重構另行處理。
- **[npm 生態系首次進入,相依維護成本從零變成非零]** → 這是換取型別與元件邊界的必要代價,已在 proposal 記錄;鎖定 lockfile,不追求最新版本。
- **[hash 路由的網址較不美觀]** → 已知取捨,換取 Pages 上零設定的正確性(D2)。

## Migration Plan

**使用者資料**:無遷移。依 D4,新版使用新的儲存 key 並從空白進度開始;既有的 `nihongo_dojo_v3` / `nihongo_dojo_v2` 不讀取、不轉換。此為單向決定,舊資料與舊版匯出的進度碼在新版皆無法讀入。

**部署**:見 D8 的三階段。

## Open Questions

- 五個分頁的元件拆分粒度(單一 View 元件 vs 抽出共用的「四選一題目卡」元件)留到實作時依實際重複情況決定——四類題庫共用同一個四選一結構,很可能值得抽出,但**先寫出來看到重複再抽**,不預先抽象。
- Vitest 是否需要搭配元件測試(`@vue/test-utils`),或純邏輯測試已足夠?建議先只做純邏輯與 store 測試,元件層依實際缺口再補。
