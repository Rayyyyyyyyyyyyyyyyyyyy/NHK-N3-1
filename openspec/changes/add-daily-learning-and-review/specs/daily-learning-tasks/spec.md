## ADDED Requirements

### Requirement: 今日任務必須按日期與等級保存可續做的計畫

首頁 MUST 提供建立與續做今日任務入口。計畫 MUST 以裝置本機日期及目前等級隔離；ready 組別所選 item MUST 保存，重整、往返頁面與新增題庫 MUST NOT 重抽。建立前的首頁 MUST 維持既有 counts 載入策略，不為任務預載五級完整題庫。

#### Scenario: 重新開啟與切換等級
- **WHEN** 使用者建立 N3 今日任務後切到 N2，再重整並切回 N3
- **THEN** N3 當日 ready 任務的題目、目標與完成量 MUST 保持
- **AND** N2 任務 MUST 獨立保存

#### Scenario: 續做指定目標
- **WHEN** 使用者點選尚未完成組別的續做入口
- **THEN** 對應學習頁 MUST 呈現保存計畫中的未做目標，而非任意新抽題
- **AND** 切換任務模式 MUST 清除上一輪答案，但不清除持久進度

### Requirement: 預設目標必須依可用資料產生

計畫 MUST 包含最多 10 個唯一單字、5 道唯一文法題，以及使用者選擇的 1 篇讀解或最多 3 道唯一聽力題。深入分支開始後當日 MUST 固定。選題 MUST 優先單字到期／待複習、文法錯題／未掌握及未完成讀解／未答對聽力，並保存固定順序；不足時以可用數量為上限，不重複補數。

#### Scenario: 題庫不足
- **WHEN** 聽力分支只有 2 道可用題
- **THEN** 該任務目標 MUST 為 2
- **AND** MUST NOT 重複同一題來湊 3 題

#### Scenario: 無可用題目
- **WHEN** 某任務組別成功載入但沒有可用題目
- **THEN** 系統 MUST 顯示該組無題狀態
- **AND** MUST NOT 把零題標為完成或據此顯示全日達標

### Requirement: 完成量必須由今日有效活動推導

單字、文法與聽力任務 MUST 以當日有效作答／評分命中的不同目標 item 計量，答案對錯不影響是否做過；讀解任務 MUST 以當日同一完整 attempt 答完全部子題計量。系統 MUST 分開呈現完成量、正確結果與掌握狀態；重做同一 item MUST NOT 重複增加完成量。

#### Scenario: 當日答錯並重做
- **WHEN** 使用者對同一目標文法題答錯後再答對
- **THEN** 今日文法完成量 MUST 只增加 1
- **AND** 錯題結果 MUST 反映最新成功，活動歷史 MUST 可保留兩次獨立 attempt

#### Scenario: 建立計畫之前已練習
- **WHEN** 使用者上午已練習某 item，下午建立的計畫包含它
- **THEN** 該 item MUST 已計入當日完成量

#### Scenario: 文章答完但非全對
- **WHEN** 當日完整答完目標文章但有錯題
- **THEN** 讀解任務 MUST 記為做完
- **AND** rDone MUST NOT 因這次 attempt 新增該文章

### Requirement: 載入失敗與失效題目必須可恢復

任務組別 MUST 有 pending、error、ready 與 empty 狀態；失敗 MUST 能重試並保留已 ready 組別。保存的 item 解析失敗 MUST 顯示不可用；只有使用者明確修復該計畫時才替換失效項或依可用量縮減目標，並保留其餘項目及完成量。

#### Scenario: 部分題庫失敗後重試
- **WHEN** 單字組別 ready 而文法載入失敗，使用者重試
- **THEN** 單字題目與完成量 MUST 不變
- **AND** 文法 MUST 重新請求並在成功後建立目標

#### Scenario: 請求未完成就切換等級或重整
- **WHEN** 計畫建立請求尚未完成而使用者切換等級或重新載入
- **THEN** 晚到結果 MUST 只屬於請求開始時的日期及等級
- **AND** 重整後未完成組別 MUST 能重試，不能永久顯示 pending

#### Scenario: 題目已不可用
- **WHEN** 保存計畫中的某題不在目前成功取得的題庫
- **THEN** 系統 MUST 標示不可用而非完成
- **AND** 修復 MUST 只影響失效項並說明變動

### Requirement: 跨午夜的活動必須歸屬實際提交日

每次提交 MUST 使用當下本機日期。跨午夜後 MUST 呈現新日期任務或建立入口，MUST NOT 沿用昨天完成量顯示為今天；舊題仍可自由練習，MUST NOT 回填昨天任務。

#### Scenario: 未關閉頁面跨午夜
- **WHEN** 使用者昨天開啟一題，今天才提交
- **THEN** 活動 MUST 歸屬今天
- **AND** 昨天任務的完成量 MUST 不增加
