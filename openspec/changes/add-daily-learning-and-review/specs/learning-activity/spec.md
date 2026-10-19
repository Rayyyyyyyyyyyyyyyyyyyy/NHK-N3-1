## ADDED Requirements

### Requirement: 有效學習必須經過單一結果入口

系統 MUST 以同一個 domain 結果轉移與 Pinia action 更新掌握狀態、活動、錯題、排程、每日統計及連續天數。有效學習限定翻卡後明確評分及四類練習提交答案；開啟、翻面、播放、切換、匯入、恢復與單獨手動標掌握 MUST NOT 產生活動。

#### Scenario: 單字自評不熟
- **WHEN** 使用者翻卡後選擇「還不熟」
- **THEN** 該字 MUST 記入 vLearning 並從 vKnown 移除
- **AND** 同一結果 MUST 更新今日活動、待複習摘要、單字排程與 streak

#### Scenario: 只查看內容
- **WHEN** 使用者僅開啟頁面、翻面或播放語音
- **THEN** 活動、任務完成量及 streak MUST 保持不變

### Requirement: 學習對象必須有穩定且不碰撞的身份

系統 MUST 以 level、kind 及穩定 item identity 辨識結果。單字沿用 word 去重，文法／聽力沿用既有 ID，讀解子題 MUST 有獨立穩定 ID 與文章參照。身份 MUST NOT 依排序位置或題幹文字決定。

#### Scenario: 讀解子題重新排序
- **WHEN** 題庫只重新排列某文章的子題
- **THEN** 既有活動與錯題 MUST 仍指向原本子題

#### Scenario: 不同等級存在同一單字
- **WHEN** 同一 word 在不同等級各有一次練習
- **THEN** 兩個等級的紀錄 MUST 分開處理

### Requirement: 同一次提交必須去重且保留原掌握語意

每個題目實例 MUST 只提交一次並帶 attemptId；系統 MUST 對保留事件視窗中的相同 attemptId 忽略重複提交。新一輪重做 MUST 使用新 attemptId。讀音作答 MUST NOT 自動標為已掌握；文法答錯 MUST 取消該題 gDone；讀解 MUST 僅在同一完整文章 attempt 全對時記入 rDone；聽力 MUST 分別維護已作答與最新答對狀態。

#### Scenario: 重複送出相同事件
- **WHEN** 同一 attemptId 被連續送出兩次且仍在保留視窗
- **THEN** 第二次 MUST NOT 增加錯誤次數、活動、排程階段、任務量或 streak

#### Scenario: 讀音答對
- **WHEN** 使用者答對尚未掌握單字的讀音
- **THEN** 系統 MUST 記錄成功活動並更新排程
- **AND** 該字 MUST NOT 因此自動加入 vKnown

#### Scenario: 讀解部分答對
- **WHEN** 一篇文章的完整 attempt 有任一子題答錯
- **THEN** 每道答案 MUST 留下活動與對應錯題結果
- **AND** 此 attempt MUST NOT 將該篇新增為 rDone

### Requirement: 活動歷史必須有界且不破壞長期摘要

系統 MUST 保留最近最多 2,000 筆結果，以及最近最多 90 個本機日的每日 item 集合、文章完成集合與任務。去重保證限定保留視窗；刪除舊歷史 MUST NOT 刪除六種進度、錯題摘要、單字排程或 streak，MUST NOT 用剩餘事件重算而抹除既存每日完成量。

#### Scenario: 歷史超過上限
- **WHEN** 加入第 2,001 筆結果
- **THEN** 最舊結果 MUST 被淘汰
- **AND** 已形成的錯題、排程、有效每日摘要與掌握紀錄 MUST 保持
