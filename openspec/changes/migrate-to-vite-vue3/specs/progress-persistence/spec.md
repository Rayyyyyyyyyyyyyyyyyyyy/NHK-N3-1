## ADDED Requirements

### Requirement: 既有使用者的進度必須跨遷移存活

系統 MUST 能讀取已部署版本寫入的 `nihongo_dojo_v3` 資料,並在不遺失任何進度的前提下轉為新的正規狀態。使用者不應察覺遷移發生。

#### Scenario: 讀取既有 v3 資料

- **WHEN** 瀏覽器中存在 `nihongo_dojo_v3` 且格式合法
- **THEN** 系統 MUST 載入其全部六個進度欄位 × 五個等級的內容
- **AND** `streak`、`lastDate`、`level` MUST 保持原值

#### Scenario: 讀取更舊的 v2 不分級資料

- **WHEN** 不存在 `nihongo_dojo_v3` 但存在 `nihongo_dojo_v2`(分級化之前的扁平結構)
- **THEN** 系統 MUST 將其遷移到 N2 的對應欄位
- **AND** 讀解與聽力的既有 id MUST 依既有對照歸入正確等級

#### Scenario: 完全沒有既有資料

- **WHEN** 兩個舊 key 都不存在
- **THEN** 系統 MUST 產生結構完整的預設狀態,`level` 為 `n5`

### Requirement: 文法進度必須從陣列索引遷移為穩定 id

`gDone` 在 v3 存的是題目在陣列中的索引;v4 改存穩定 id。遷移 MUST 使用**凍結於程式碼中的靜態對照表**,MUST NOT 在執行時從當下的題庫檔案推導順序。

遷移執行的時間點是使用者下次開啟 App,屆時題庫可能已改版多次;依當下順序推導會把進度標到錯誤的題目上,比清空更難察覺。

#### Scenario: 索引依凍結對照表轉為 id

- **WHEN** v3 資料中某等級的 `gDone` 為 `[0, 3, 7]`
- **THEN** 系統 MUST 依該等級的凍結對照表,將其轉為對應位置的三個 id
- **AND** 轉換結果 MUST NOT 受目前 `data/grammar-*.json` 的實際內容或順序影響

#### Scenario: 索引在對照表中不存在

- **WHEN** v3 資料含有超出凍結對照表範圍的索引
- **THEN** 系統 MUST 丟棄該筆
- **AND** MUST NOT 因此中止整體遷移或清空其他進度

#### Scenario: 遷移後題庫改版

- **GIVEN** 使用者的進度已遷移為 id
- **WHEN** `data/grammar-*.json` 在任意位置新增、刪除或重新排序題目
- **THEN** 使用者已掌握的題目 MUST 維持已掌握
- **AND** MUST NOT 發生進度整批位移

### Requirement: 舊版 key 必須保留作為回滾安全網

遷移 MUST NOT 刪除 `nihongo_dojo_v3`。新狀態寫入獨立的 key。

#### Scenario: 遷移完成後的儲存內容

- **WHEN** v3 → v4 遷移完成
- **THEN** 新狀態 MUST 寫入 `nihongo_dojo_v4`
- **AND** `nihongo_dojo_v3` MUST 仍然存在且內容未被修改

### Requirement: 進度碼必須跨版本相容

匯出的 base64 進度碼是使用者唯一的跨裝置與長期備份手段。系統 MUST 能匯入舊版本產生的進度碼,並走與 localStorage 相同的遷移路徑。

#### Scenario: 匯入 v3 時代產生的進度碼

- **WHEN** 使用者匯入部署版本匯出的進度碼
- **THEN** 系統 MUST 接受它並套用相同的版本遷移
- **AND** 文法進度 MUST 依凍結對照表轉為 id

#### Scenario: 匯出後再匯入

- **WHEN** 使用者匯出進度碼並立即匯入同一份
- **THEN** 進度 MUST 與匯出當下完全相同

### Requirement: 匯入前必須驗證輸入

系統 MUST 在覆寫任何進度前驗證解碼後的內容確實是進度資料。驗證失敗時 MUST 中止,且 MUST NOT 寫入既有進度或既有備份。

正規化函式會把任何物件補成完整的空進度結構;少了這道守門,任何合法的 base64 JSON 都會被當成空進度而靜默清空紀錄。

#### Scenario: 誤貼非進度碼的合法 JSON

- **WHEN** 使用者貼上可解碼、為合法 JSON 物件、但不含任何進度欄位的文字
- **THEN** 系統 MUST 中止匯入並顯示可辨識的錯誤
- **AND** 既有進度 MUST 完全不變

#### Scenario: 無法解碼的輸入

- **WHEN** 輸入無法 base64 解碼或解碼後不是合法 JSON
- **THEN** 系統 MUST 中止匯入
- **AND** 既有進度 MUST 完全不變

### Requirement: 破壞性覆寫必須可復原

匯入與復原都會整份覆寫進度,兩者都是破壞性操作。系統 MUST 在任何一次覆寫之前保存當前狀態,使使用者能夠撤銷上一步。復原本身 MUST NOT 成為不可逆的覆寫。

#### Scenario: 匯入後撤銷

- **WHEN** 使用者匯入一份合法進度碼後選擇撤銷
- **THEN** 系統 MUST 還原到匯入前的進度

#### Scenario: 撤銷之後再撤銷

- **GIVEN** 使用者匯入後累積了新的學習進度
- **WHEN** 使用者誤觸撤銷
- **THEN** 系統 MUST 讓使用者能夠取消這次撤銷,回到誤觸之前的進度

#### Scenario: 連續兩次匯入

- **GIVEN** 使用者有原始進度 A
- **WHEN** 依序匯入 B 與 C 後執行撤銷
- **THEN** 系統 MUST NOT 在未告知的情況下把使用者永久留在中間狀態 B 而失去 A

### Requirement: UI 承諾不得超出實際保證

面向使用者的訊息 MUST 反映備份的真實限制:數量有限、與此瀏覽器同生命週期、清除瀏覽器資料或更換裝置即失效。

#### Scenario: 匯入成功後的訊息

- **WHEN** 匯入成功
- **THEN** 訊息 MUST 說明可撤銷的範圍與限制
- **AND** MUST NOT 無條件宣稱舊進度已被永久保存

### Requirement: 儲存不可用時必須安全降級

當 localStorage 讀寫拋出例外時,系統 MUST NOT 崩潰,學習功能 MUST 仍可使用(僅進度不被保存)。

#### Scenario: localStorage 全面拋錯

- **WHEN** localStorage 的讀、寫、刪除皆拋出例外
- **THEN** 系統 MUST 以結構完整的預設狀態啟動
- **AND** MUST 回報沒有可撤銷的備份,而非顯示一個按下會失敗的按鈕
