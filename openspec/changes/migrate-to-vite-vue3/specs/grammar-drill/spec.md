## ADDED Requirements

### Requirement: 每道文法題必須有穩定的識別碼

題目 MUST 由不隨陣列位置改變的 id 識別。掌握狀態 MUST 以 id 記錄,MUST NOT 以陣列索引記錄。

#### Scenario: 題庫中間插入新題

- **GIVEN** 使用者已掌握某些文法題
- **WHEN** 在題庫檔案中間插入一道新題
- **THEN** 使用者原本已掌握的題目 MUST 維持已掌握
- **AND** MUST NOT 有任何題目的掌握狀態位移到別題

#### Scenario: 題庫中的題目被刪除

- **GIVEN** 使用者已掌握某道題
- **WHEN** 該題從題庫中移除
- **THEN** 其餘題目的掌握狀態 MUST 不受影響

#### Scenario: id 在同一等級內唯一

- **WHEN** 載入任一等級的文法題庫
- **THEN** 該等級內所有題目的 id MUST 互不重複

### Requirement: 出題順序必須優先未掌握的題目

系統 MUST 先出尚未掌握的題目,全部出完後才輪到已掌握的題目。兩組各自的順序 MUST 隨機。

#### Scenario: 存在未掌握的題目

- **GIVEN** 目前等級尚有未掌握的題目
- **WHEN** 系統產生出題順序
- **THEN** 所有未掌握的題目 MUST 排在所有已掌握的題目之前

#### Scenario: 全部題目皆已掌握

- **GIVEN** 目前等級的題目全部已掌握
- **WHEN** 系統產生出題順序
- **THEN** 系統 MUST 仍可出題,順序為隨機

#### Scenario: 出完一輪

- **WHEN** 使用者作答完當前順序中的最後一題
- **THEN** 系統 MUST 依當下的掌握狀態重新產生順序並繼續

### Requirement: 答對記為掌握,答錯必須取消掌握

掌握狀態 MUST 反映最近一次作答結果。

#### Scenario: 答對

- **WHEN** 使用者選擇正確答案
- **THEN** 該題 MUST 記為已掌握
- **AND** 畫面上的已掌握計數 MUST 立即更新

#### Scenario: 答錯已掌握的題目

- **GIVEN** 某題先前已記為掌握
- **WHEN** 使用者這次答錯
- **THEN** 該題 MUST 從已掌握中移除

### Requirement: 作答後必須顯示解析並可前進

作答後系統 MUST 立即揭示正解並提供該題的中文解析,再讓使用者前進到下一題。解析是這個練習的學習價值所在,不得省略。

#### Scenario: 作答

- **WHEN** 使用者選擇任一選項
- **THEN** 系統 MUST 標示正解所在
- **AND** 答錯時 MUST 同時標示所選的錯誤項目
- **AND** MUST 顯示該題的解析
- **AND** MUST 提供前往下一題的入口

#### Scenario: 重複點擊選項

- **WHEN** 使用者在已作答的題目上再次點擊選項
- **THEN** 掌握狀態 MUST NOT 再次改變

### Requirement: 題目的填空位必須明確標示

題目文字含有填空位,系統 MUST 在畫面上將其與一般文字區分。

#### Scenario: 顯示題目

- **WHEN** 系統顯示一道文法題
- **THEN** 填空位 MUST 有別於一般題目文字的視覺呈現

### Requirement: 選項在同一題內不得重新排列

選項順序 MUST 在題目產生時決定,並在該題存續期間保持穩定,避免畫面更新造成選項跳動而讓使用者誤選。

#### Scenario: 作答後畫面更新

- **WHEN** 使用者作答後畫面重新繪製
- **THEN** 選項順序 MUST 與作答前相同
