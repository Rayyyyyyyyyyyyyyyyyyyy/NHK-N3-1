## ADDED Requirements

### Requirement: 單字排程必須按等級與單字持久保存

系統 MUST 為已評分／作答的單字保存 stage、dueOn、lastScheduledOn 與 lastResult。階段 MUST 為 0–5，成功間隔 MUST 依序為 1、3、7、14、30 個本機曆日，stage 5 後 MUST 維持 30 日。只翻面、手動標掌握或匯入 MUST NOT 假造複習事件。

#### Scenario: 首次成功及下次到期成功
- **WHEN** 未排程單字在 D 日首次有效成功，並在 D+1 再成功
- **THEN** 第一次 MUST 設 stage 1、dueOn D+1
- **AND** 第二次 MUST 設 stage 2、dueOn D+4

### Requirement: 同日重做與提前練習不得放大間隔

每個單字每日 MUST 最多成功推進一次階段；未到期的提前成功 MUST NOT 推進或延後既有到期日。任何失敗 MUST 重設 stage 0、dueOn 當天；當天再答對 MUST 可解除錯題，但 MUST NOT 再推進排程。

#### Scenario: 同日反覆答對
- **WHEN** 同一單字 D 日已成功排程，再重做成功兩次
- **THEN** stage 與 dueOn MUST 保持第一次成功後的結果

#### Scenario: 失敗後同日成功
- **WHEN** stage 4 的單字 D 日失敗後再答對
- **THEN** stage MUST 維持 0 且 dueOn MUST 為 D
- **AND** 待複習錯題 MUST 可解除

#### Scenario: 未到期提前成功
- **WHEN** 單字 dueOn 為 D+7，使用者 D+2 提前答對
- **THEN** stage 與 dueOn MUST 不變

### Requirement: 到期複習與一般抽卡必須有不同的補題規則

「開始到期複習」MUST 只抽目前等級 dueOn 不晚於今天的唯一單字，每輪最多 10 張，按到期日及穩定身份排序。一般翻卡與今日任務 MUST 優先到期、無排程待複習、未學，最後才補其他單字。第一版 MUST 僅對單字採間隔排程。

#### Scenario: 沒有到期單字
- **WHEN** 使用者開啟到期複習但目前沒有到期項
- **THEN** 系統 MUST 顯示無到期項目
- **AND** MUST 提供自由練習入口而非悄悄改抽新字

#### Scenario: 到期項超過一輪
- **WHEN** 目前等級有 15 個到期單字
- **THEN** 本輪 MUST 取最早到期的前 10 個唯一項目

### Requirement: 日期運算與舊進度基線必須明確

排程 MUST 使用本機曆日加法，不以固定毫秒推算一天。v4 升級的已掌握與待複習單字 MUST 保留原掌握狀態，並建立 stage 0、升級日到期的排程，MUST NOT 推測過去答對次數。

#### Scenario: 夏令時間邊界
- **WHEN** D 日跨越夏令時間邊界排定 1 日後複習
- **THEN** dueOn MUST 為本機曆日 D+1，不能因時數差異落在 D 或 D+2

#### Scenario: 升級已有掌握單字
- **WHEN** v4 使用者升級且某字已存在 vKnown
- **THEN** 該字 MUST 仍已掌握
- **AND** 排程 MUST 為 stage 0、升級日到期，沒有虛構活動
