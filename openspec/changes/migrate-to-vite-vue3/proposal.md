## Why

「日本語道場」目前是一次性生成的 vanilla 靜態站(五個 commit,每次都是上萬行的整段暴衝),已經撞到這個形態的實際上限:

- **手動同步清單取代了型別系統**。`resetPageStateForLevelChange()` 是一份手寫的欄位清單,漏掉任何一項就會在切換等級後殘留上一級的題目,而且不會報錯;`defaultState()` / `normalizeState()` 也必須手動保持同步,漏了就讓舊使用者載入時得到 `undefined`。
- **沒有元件邊界**。五個分頁各自用 template string 組 `innerHTML` 再手動 `addEventListener`,每次重繪都要重綁,沒有事件委派,狀態散在四個模組層級的可變物件裡。
- **一輪雙軸 code review 就找到三個真實缺陷**,其中兩個是資料遺失等級。以目前的結構,這類問題只能靠人工瀏覽器驗證發現。

改用 Vite + Vue 3 + TypeScript 之後,上述前兩類問題大部分由編譯器與響應式系統接管,而不是靠文件提醒人類記得。

**時機正確的理由**:`gDone` 目前存的是題目陣列索引,在題庫中間插題會讓既有使用者的文法進度整批錯位。這是專案最大的未爆彈,而遷移是**唯一一次不用另外寫遷移程式就能修掉它的機會**——localStorage 的讀取端本來就要重寫。

## What Changes

**技術堆疊**

- 建置:無 → **Vite**
- 框架:vanilla DOM 操作 → **Vue 3**(SFC,`<script setup>`)
- 語言:JavaScript(全域 script)→ **TypeScript**(ES modules)
- 狀態:三個全域可變物件 → **Pinia**
- 路由:`PAGES` 物件 + `innerHTML` 重繪 → **vue-router**
- 樣式:`css/style.css` + CSS 變數 → **Tailwind**
- 工具:VueUse(`useStorage` 等)
- 測試:`node --test` + `vm` 注入 → **Vitest**
- 部署:push 到 `main` 直接服務根目錄 → **GitHub Actions build → Pages**

**架構性後果**

- `resetPageStateForLevelChange()` 這個手寫清單**消失**——目前等級的題目改由 computed 從 store 推導,不再有需要手動清除的暫存副本。
- `ReadingPage.answers` / `ListeningPage.answers` 與 `Store` 之間的重複狀態**消失**——單一狀態所有者,其餘用 derive。
- 進度欄位的形狀由型別定義,新增欄位時漏改的地方由編譯器指出,而非靠 `CLAUDE.md` 提醒。

**順勢修掉的資料模型缺陷**

- `gDone` 從**陣列索引改為穩定 id**。`data/grammar-*.json` 每題新增 `id` 欄位(純新增,不破壞現有格式),`gDone` 改存 id。
- **BREAKING** 於 localStorage 格式(v3 → v4),但 MUST 對使用者完全無感:遷移時依現行陣列順序建立索引→id 的查表,因為當下順序固定且已知,映射是精確的。此後在題庫中間插題、重排、刪題都不再影響任何人的進度。
- 這是唯一一次不必額外寫遷移程式就能修掉它的時機——localStorage 的讀取端本來就要重寫。

**不變的部分**(見下方 Impact 的「必須保留的不變式」)

- 題庫 JSON 的位置與格式、localStorage 的相容性、進度碼格式、視覺識別、手機優先的版面。

## Capabilities

### New Capabilities

- `progress-persistence`: 學習進度的儲存契約。涵蓋既有 `nihongo_dojo_v3` 資料的相容讀取、進度碼的匯出與匯入、破壞性覆寫的防護與復原,以及任何儲存格式變更的遷移保證。
- `question-bank-access`: 題庫與計數資料的載入。涵蓋各等級題庫的取得與快取、載入失敗時的降級、以及首頁分母的來源。
- `app-shell-navigation`: 應用外殼與導覽。涵蓋五個分頁的路由、等級切換時的狀態語意、底部導覽與安全區域處理,以及視覺識別的保留。
- `vocabulary-study`: 單字學習。涵蓋翻卡記憶與讀音測驗兩種模式、抽牌策略、誘答產生規則、漢字查詢。
- `grammar-drill`: 文法練習。涵蓋出題佇列策略、答對/答錯對掌握狀態的影響、以及題目的穩定識別。
- `reading-comprehension`: 讀解。涵蓋文章列表與詳細檢視、單字備註、全對才算完成的判定。
- `listening-practice`: 聽力。涵蓋語音合成朗讀、語速控制、不支援語音合成時的降級。
- `build-and-deploy`: 建置與部署。涵蓋 Vite 產出、GitHub Pages 的 base path、以及部署流程的正確性。

### Modified Capabilities

<!-- openspec/specs/ 為空,無既有 spec 需要修改 -->

## Impact

### 必須保留的不變式(architecture-context recover 的結果)

線上站台目前**是活的**(GitHub Pages 回應 200),因此以下是硬性約束,不是偏好:

| 不變式 | 為什麼是硬性的 |
|---|---|
| localStorage key `nihongo_dojo_v3` 的既有資料 MUST 可讀 | 使用者瀏覽器裡存著累積數月、**無法重建**的學習進度。遷移若讀不到就是靜默清空。 |
| `nihongo_dojo_v2` 的遷移路徑 MUST 保留 | 更舊的不分級資料仍可能存在於某些瀏覽器。 |
| base64 進度碼格式 MUST 相容 | 使用者可能已匯出進度碼作為長期備份;新版讀不到就等於備份作廢。 |
| `data/*.json` 的位置與內容 MUST 不變,僅允許為文法題**新增** `id` 欄位 | 題庫是專案最大的資產(943 KB、7,970 個單字、226 道題);它與框架無關,不應被遷移波及。新增欄位是相容的。 |
| 六個進度欄位 × 五個等級的語意 MUST 保留 | 這是進度模型的定義,不是實作細節。 |
| v3 → v4 的 `gDone` 遷移 MUST 對使用者無感且不可遺失 | 依現行題目順序做索引→id 的精確映射;映射錯誤等同靜默清空文法進度。 |
| 視覺識別 MUST 由 Tailwind 忠實重現而非重新設計 | 明朝體、indigo/paper/vermilion 配色、刻意鎖定 light mode、底部固定導覽與 `env(safe-area-inset-*)` 都是既有的刻意選擇。Tailwind 是換表達方式,不是換設計;「與舊版對照長得一樣」是本次的驗收手段。 |
| 目前散在 CSS/JS 中未被 tokenize 的顏色 MUST 一併收進 theme | `#8892a0`(次要文字,7 處)、`#5b6470`(5 處)、`#eaf5ee`/`#fbeae7`(答對/答錯底色)從未進入 `:root`。不收進 theme 就會在 Tailwind 裡散成任意值。 |

### 受影響的程式碼

- **全部重寫**:`index.html`、`js/*.js`(9 支)、`css/style.css`
- **原封不動**:`data/*.json`(13 個檔案)
- **邏輯移植而非重寫**:`js/storage.js` 的 `normalizeState()` / `migrateLegacyV2()` / 進度碼編解碼是純函式,MUST 以行為等價的方式帶進 TypeScript,並以測試證明等價

### 新增相依

npm 生態系首次進入本專案:`vite`、`vue`、`vue-router`、`pinia`、`@vueuse/core`、`tailwindcss`、`typescript`、`vitest`。

### 部署風險

Pages 目前直接服務 repo 根目錄。切換到 Vite 產出後,**在 Actions workflow 就位並驗證之前 push `main` 會讓線上站台壞掉**。部署切換 MUST 與程式碼遷移分開驗證。

### 架構文件

main 上沒有 `ARCHITECTURE.md` 也沒有 `CLAUDE.md`(後者僅存在於 `archive/vanilla-progress-rescue` 分支),等於沒有既有的架構文件慣例。本次遷移改變了幾乎所有邊界,因此 MUST 在同一個 change 內建立持久記錄,收錄上表的不變式與 design 階段的決策——這些是難以從程式碼反推的意圖,而非型別與測試已經強制的行為。

### 明確不在範圍內

- 新增學習功能或題庫內容
- 後端、帳號、雲端同步
- 修正 N2 時代寫死的文案(備考路線、YouTube 播放清單不隨等級變動)——真實缺陷,但屬內容問題,獨立處理
