## ADDED Requirements

### Requirement: 第一批題庫擴充必須有固定可驗收的數量

系統 MUST 為 N3、N2、N1 各追加 10 道文法、2 篇讀解及 3 道聽力，每篇新讀解 MUST 至少 2 題。完成後 N3 MUST 為文法 30／讀解 3／聽力 7，N2 MUST 為 40／4／7，N1 MUST 為 25／3／6。N5／N4 題數與既有單字數 MUST 不變。

#### Scenario: 完成第一批新增
- **WHEN** 重新產生並檢查 counts.json
- **THEN** 三個等級的文法、讀解與聽力 MUST 符合上述數量
- **AND** 首頁分母 MUST 使用更新後的 counts

### Requirement: 新內容必須具備可審閱的題目與解析

新增題 MUST 為本專案原創並記錄來源性質，不得宣稱官方試題。每道選擇題 MUST 有非空日文題幹、1 個可由題目／文章／逐字稿支持的唯一正解、3 個不同誘答及繁體中文解析；新增聽力 MUST 有完整日文逐字稿，新文章 MUST 有標題、類型、內文與備註。交付 MUST 附內容審閱結果，區分結構檢查與人工語言審閱。

#### Scenario: 新增聽力題
- **WHEN** 新聽力題加入題庫
- **THEN** 題目 MUST 包含逐字稿及繁中解析
- **AND** 正解 MUST 能由逐字稿判定，誘答 MUST 不與正解重複

#### Scenario: 尚未完成語言審閱
- **WHEN** 結構檢查通過但內容尚未獲人工審閱
- **THEN** 完成報告 MUST 清楚標示此限制
- **AND** MUST NOT 以結構檢查宣稱語言品質已通過人工驗證

### Requirement: 擴充不得改變既有題意與身份

既有題目的內容、答案、解析與 ID MUST 保留。既有讀解子題 MUST 僅新增穩定且唯一的 ID；新增文法與子題 ID MUST 使用持久序號上限避免刪題重用，MUST NOT 因排序重編。既有單字身份 MUST 保持 word 去重語意。

#### Scenario: 對既有文章補子題 ID
- **WHEN** 為 N5 至 N1 的既有讀解子題指派 ID
- **THEN** 題幹、正解、誘答與解析 MUST 與指派前一致
- **AND** 再執行工具或重排題目 MUST 保留既有 ID

#### Scenario: 刪題後新增
- **WHEN** 高序號題目被刪除後再新增題目
- **THEN** 新 ID MUST 大於該類別已使用的序號上限
- **AND** MUST NOT 重用被刪題目的身份

### Requirement: 建置與執行期必須檢查題庫契約

資料檢查 MUST 覆蓋四類題庫的必要欄位、有效 level、非空字串、唯一 ID、四個不同選項、至少一題的文章，以及 counts 一致性；runtime service MUST 接受新 ID 並拒絕不合法結構，保留成功快取與失敗重試。JSON MUST 仍為按需靜態資產，不得整包 import 到應用 bundle。

#### Scenario: 重複子題 ID 或無題文章
- **WHEN** 題庫含重複讀解子題 ID 或空 questions 的文章
- **THEN** 資料檢查 MUST 失敗
- **AND** MUST NOT 把該資料視為可完成的有效題庫

#### Scenario: 計數未同步
- **WHEN** 新增題目後 counts.json 仍是舊值
- **THEN** `npm run check:data` MUST 失敗並指出需更新計數
