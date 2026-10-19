## ADDED Requirements

### Requirement: 匯入必須驗證完整且一致的受支援資料

系統 MUST 支援完整 v4 與 v5 進度 envelope，拒絕 v2／v3、未知版本及未知欄位。匯入 MUST 驗證完整五等級六欄位、合法 level／streak／lastDate、正確型別、ID 去重、known／learning 互斥與 lCorrect 為 lDone 子集合；v5 MUST 同時驗證活動、摘要、任務、錯題與排程的欄位、日期及容量。未知題目 ID MUST 可保留供後續標示不可用。驗證失敗 MUST NOT 改寫目前狀態、儲存或備份。

#### Scenario: 欄位名稱正確但形狀錯誤
- **WHEN** 匯入可解碼的 `{"version":4,"state":{"vKnown":[]}}`
- **THEN** 系統 MUST 拒絕並顯示可辨識錯誤
- **AND** MUST NOT 正規化為空白進度再覆寫

#### Scenario: v4 六欄位互相矛盾
- **WHEN** 同一字同時在 known／learning，或 lCorrect 含不在 lDone 的 ID
- **THEN** 匯入 MUST 失敗
- **AND** 既有備份數量與內容 MUST 不變

#### Scenario: 合法空白進度
- **WHEN** 匯入由本系統產生、欄位完整且一致的空白 v4 或 v5 進度
- **THEN** 系統 MUST 接受，並依覆寫前快照契約處理

### Requirement: v4 升級必須保留資料且不得重置

v5 儲存不存在時，系統 MUST 驗證並轉換有效 v4 主資料及有效快照；保留六種進度、等級與 streak／日期基線，新活動、錯題與任務 MUST 為空，單字排程 MUST 依已知狀態建立基線。升級 MUST 只有在完整 v5 文件保存成功後才標示完成，MUST NOT 修改或刪除 v4 keys。v5 存在時 MUST 以它為權威，不可被 v4 覆蓋。

#### Scenario: 正常升級與重新啟動
- **WHEN** v4 主資料與有效快照成功轉為 v5 後重新啟動
- **THEN** 原進度與最近最多 10 份快照 MUST 可用
- **AND** MUST 讀取 v5，不重複升級或覆蓋新活動

#### Scenario: 升級寫入失敗
- **WHEN** localStorage 無法寫入新 v5 文件
- **THEN** 原 v4 主資料及快照 MUST 保持不變
- **AND** 系統 MUST 提示未保存，允許記憶體練習與 v5 匯出，下次啟動可重試

#### Scenario: v5 已存在但損毀
- **WHEN** 既有 v5 文件無法驗證
- **THEN** 系統 MUST 顯示恢復錯誤並保留原始字串
- **AND** MUST NOT 自動用 v4 或空白資料覆寫該文件

### Requirement: v5 進度碼必須完整往返且不攜帶備份

新匯出 MUST 使用 v5，包含六欄位、等級、streak／日期、保留活動、每日摘要與計畫、錯題及單字排程，MUST NOT 包含本機 backups。合法 v4 碼匯入 MUST 走同一轉換規則；匯入是完整覆寫不是合併。文件 MUST 說明 v5 碼無法由舊版應用讀取。

#### Scenario: 跨裝置往返
- **WHEN** 使用者匯出包含五級資料、Unicode 單字、今日任務與排程的 v5 碼並匯入另一裝置
- **THEN** 所有 state 欄位 MUST 一致
- **AND** 接收端 MUST NOT 得到匯出端的 backups

#### Scenario: 匯入舊 v4 碼
- **WHEN** 使用者匯入合法完整 v4 碼
- **THEN** 六欄位與歷史基線 MUST 保留
- **AND** 新功能 MUST 依轉換規則初始化，不虛構過去的作答或任務

### Requirement: 覆寫與快照必須一起提交

系統 MUST 把當前 state 與最多 10 份完整 state 快照存於同一 v5 儲存文件，快照 MUST NOT 遞迴包含快照。匯入與恢復 MUST 先驗證、產生覆寫前快照，再以一次儲存提交；保存失敗 MUST 保留原記憶體 state、backups 與原儲存內容，MUST NOT 顯示成功。恢復本身 MUST 可撤銷。

#### Scenario: 覆寫儲存失敗
- **WHEN** 合法匯入／恢復的單次 setItem 拋錯
- **THEN** 原進度、任務、錯題、排程及備份 MUST 不變
- **AND** UI MUST 說明未覆寫並提供匯出入口

#### Scenario: 恢復後取消恢復
- **WHEN** 使用者匯入 B、累積新活動，再恢復 A，接著撤銷該次恢復
- **THEN** 系統 MUST 回到恢復前包含新活動的 B
- **AND** 所有新狀態 MUST 一起恢復，不只六種進度

### Requirement: 一般練習儲存失敗必須保持可用且誠實回報

一般學習 MUST 以完整 next state 顯式提交，不對中間 mutation 分別儲存。保存失敗 MUST 允許當次記憶體練習並標示未保存；匯出 MUST 包含最新記憶體狀態。備份 MUST 說明最近 10 份、同瀏覽器同 origin 有效及清除資料即失效。壞掉的已存在文件 MUST NOT 被日常自動保存靜默覆寫。

#### Scenario: 練習途中 quota 不足
- **WHEN** 有效作答結果無法保存
- **THEN** 畫面與記憶體結果 MUST 仍更新，並明確提示需匯出
- **AND** 匯出 MUST 包含該次作答、錯題、任務與排程
