## ADDED Requirements

### Requirement: 聽力題必須以語音合成朗讀日文原文

系統 MUST 以瀏覽器的語音合成朗讀題目原文,並優先選用日文語音。原文在支援語音合成時 MUST NOT 直接顯示,否則就不是聽力練習。

#### Scenario: 播放題目

- **WHEN** 使用者點擊某題的播放
- **THEN** 系統 MUST 以日文語音朗讀該題原文

#### Scenario: 支援語音合成時不顯示原文

- **WHEN** 瀏覽器支援語音合成
- **THEN** 題目原文 MUST NOT 顯示在畫面上

#### Scenario: 播放另一題

- **WHEN** 某題正在播放時使用者播放另一題
- **THEN** 系統 MUST 先停止前一段播放,再開始新的播放

### Requirement: 必須可調整朗讀語速

系統 MUST 提供數個語速選項,目前選用的語速 MUST 有明確標示,且 MUST 套用於後續播放。

#### Scenario: 調整語速後播放

- **WHEN** 使用者選擇某個語速後播放題目
- **THEN** 朗讀 MUST 以該語速進行
- **AND** 該語速 MUST 標示為目前選用

### Requirement: 不支援語音合成時必須降級為顯示原文

若瀏覽器不支援語音合成,系統 MUST 直接顯示原文,使題目仍可作答。

#### Scenario: 瀏覽器不支援語音合成

- **WHEN** 使用者在不支援語音合成的瀏覽器開啟聽力頁
- **THEN** 系統 MUST 顯示不支援的說明
- **AND** MUST 顯示題目原文
- **AND** MUST NOT 顯示無作用的播放控制項

### Requirement: 作答必須同時記錄作答與答對狀態

聽力進度分為「已作答」與「答對」兩項。答錯 MUST 記為已作答,且 MUST 從答對中移除。

#### Scenario: 答對

- **WHEN** 使用者選擇正確答案
- **THEN** 該題 MUST 記為已作答且已答對
- **AND** 畫面上的計數 MUST 立即更新

#### Scenario: 答錯

- **WHEN** 使用者選擇錯誤答案
- **THEN** 該題 MUST 記為已作答
- **AND** MUST NOT 記為答對

#### Scenario: 作答後顯示結果

- **WHEN** 使用者作答任一題
- **THEN** 系統 MUST 標示正解所在
- **AND** 答錯時 MUST 同時標示所選的錯誤項目
- **AND** MUST 顯示該題解析

#### Scenario: 重複作答

- **WHEN** 使用者在已作答的題目上再次點擊選項
- **THEN** 作答結果 MUST NOT 改變

### Requirement: 目前等級沒有題目時必須有空狀態

各等級的聽力題數不一。當目前等級沒有題目時,系統 MUST 明確說明,MUST NOT 呈現無法區分於載入失敗的空白畫面。

#### Scenario: 等級無聽力題

- **WHEN** 目前等級沒有任何聽力題
- **THEN** 系統 MUST 顯示可理解的空狀態訊息

### Requirement: 必須提供外部影片課程資源

系統 MUST 提供日語學習影片資源的入口,並在影片無法播放時提供前往來源的替代連結。

#### Scenario: 影片無法播放

- **WHEN** 內嵌影片無法播放
- **THEN** 系統 MUST 提供可前往原始頻道的連結

### Requirement: 選項在同一題內不得重新排列

聽力頁一次列出多題,任一題作答都可能觸發畫面更新。所有題目的選項順序 MUST 在該頁存續期間保持穩定。

#### Scenario: 作答後畫面更新

- **WHEN** 使用者作答任一題後畫面重新繪製
- **THEN** 所有題目的選項順序 MUST 與作答前相同
