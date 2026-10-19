## ADDED Requirements

### Requirement: 四類練習必須保留可重做的錯題摘要

系統 MUST 為單字、文法、讀解子題與聽力保存 wrongCount、lastWrongAt、lastResultAt、pending 及最後錯誤模式。答錯或翻卡自評不熟 MUST 增加 wrongCount 並標示待複習；其後獨立 attempt 成功 MUST 解除 pending 並保留歷史摘要。內容 MUST 透過 stable ref 從題庫取得。

#### Scenario: 錯題答對後再答錯
- **WHEN** 某題答錯一次、重做成功、之後再答錯
- **THEN** wrongCount MUST 為 2 且 pending MUST 為 true
- **AND** lastWrongAt 與 lastResultAt MUST 反映最後一次失敗

#### Scenario: 單字不同模式的失敗
- **WHEN** 同一等級單字先在翻卡標不熟，再於讀音測驗答錯
- **THEN** 系統 MUST 更新同一單字摘要
- **AND** 複習 MUST 可依最後失敗模式呈現

### Requirement: 錯題入口必須支援篩選與固定複習輪次

首頁 MUST 提供錯題數及 `/review` 入口，保留既有五個底部主分頁。複習 MUST 可依目前等級及題型篩選，按最後錯誤時間新到舊及穩定身份排序；開始一輪後題目順序 MUST 固定，當題答對解除 pending MUST NOT 立即抽走正在顯示的答案與解析。

#### Scenario: 答對當前錯題
- **WHEN** 複習中的當題答對
- **THEN** 頁面 MUST 保留該題解析直到使用者前進
- **AND** 待複習數 MUST 更新，下一輪 MUST 不再包含已解除項

#### Scenario: 沒有待複習錯題
- **WHEN** 選定等級及類型沒有 pending 項目
- **THEN** 系統 MUST 顯示清楚的空狀態與返回練習入口

### Requirement: 複習必須保留原題型的上下文與判定

複習 MUST 使用原有單次提交、穩定選項與解析契約，並經共用學習結果入口。讀解子題 MUST 顯示文章與備註；只重做其中一題 MUST NOT 記整篇完成。聽力 MUST 支援朗讀、無語音時原文降級，以及離開或轉背景停止播放。

#### Scenario: 只重做一個讀解錯題
- **WHEN** 使用者在複習頁答對一篇文章中的錯誤子題
- **THEN** 該子題 pending MUST 解除
- **AND** 系統 MUST NOT 因此新增 rDone 或整篇今日完成紀錄

#### Scenario: 聽力複習離開頁面
- **WHEN** 語音播放中使用者離開複習頁或切到背景
- **THEN** 語音 MUST 停止

### Requirement: 錯題解析失敗必須保留紀錄並可重試

題庫請求失敗 MUST 顯示錯誤與重試，不可判定 ID 已刪除；成功載入後仍找不到 ID 才標為不可用。兩者 MUST NOT 刪除錯題摘要或自動標為成功，其他可用題 MUST 仍可練習。

#### Scenario: 題庫暫時不可取得
- **WHEN** 載入錯題所需 JSON 失敗
- **THEN** 系統 MUST 保留錯題並提供重試
- **AND** MUST NOT 顯示為已完成複習

#### Scenario: ID 已不存在
- **WHEN** 題庫成功載入但找不到錯題 ID
- **THEN** 系統 MUST 顯示該題已不可用
- **AND** 其餘可用錯題 MUST 仍能重做
