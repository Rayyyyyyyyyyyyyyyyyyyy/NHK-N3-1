## ADDED Requirements

### Requirement: 連續天數必須以實際練習而非開啟累計

系統 MUST 僅在共用入口接受有效且未被去重的學習結果時更新 streak。第一次有效練習 MUST 為 1，同日 MUST 不增加，相隔一個本機曆日 MUST 加一，間隔超過一日 MUST 重設為 1。答錯與翻卡自評不熟 MUST 仍算有效學習；開啟、播放、翻面、切換、匯入、恢復與手動標掌握 MUST NOT 更新。

#### Scenario: 只開啟網站
- **WHEN** 使用者今天多次開啟網站但沒有有效學習
- **THEN** streak 與 lastDate MUST 保持不變

#### Scenario: 隔日第一次練習答錯
- **GIVEN** 昨天最後有效日期且 streak 為 5
- **WHEN** 使用者今天第一次練習答錯
- **THEN** streak MUST 為 6 且 lastDate MUST 為今天

#### Scenario: 中斷後同日多次練習
- **GIVEN** 最後有效練習是三天前
- **WHEN** 使用者今天先評分一張卡片，再做多道題
- **THEN** streak MUST 為 1 且同日不再增加

### Requirement: 日期必須在提交當下判定且支援跨午夜

日期 MUST 由可注入的 clock 依裝置本機曆日取得，MUST NOT 在頁面初始化時固定。若時鐘倒退至 lastDate 之前，系統 MUST 不回退 lastDate、不加算或重設 streak；日期追上後依正常規則更新。

#### Scenario: 持續開啟跨午夜
- **GIVEN** 使用者昨天已有有效練習且頁面持續開啟
- **WHEN** 今天午夜後提交第一個有效答案
- **THEN** streak MUST 增加 1，無需重新整理

#### Scenario: 時鐘倒退
- **WHEN** 提交日期早於 lastDate
- **THEN** 活動 MUST 仍按提交日期記錄
- **AND** streak 與 lastDate MUST 不變

### Requirement: 舊版基線不得被偽造成實際練習歷史

v4 升級／匯入 MUST 保留既有 streak 與 lastDate 作為歷史基線，但 MUST NOT 據此產生有效活動或今日完成量。畫面或升級說明 MUST 清楚表示舊值依開啟紀錄、新值依練習累計；後續同日練習不重複加一。

#### Scenario: 升級當天舊版已計算連續日
- **GIVEN** v4 lastDate 為今天且 streak 為 5
- **WHEN** 升級後首次有效練習
- **THEN** streak MUST 仍為 5
- **AND** 該次練習 MUST 正常新增活動與今日完成量
