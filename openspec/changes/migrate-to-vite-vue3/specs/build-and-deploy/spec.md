## ADDED Requirements

### Requirement: 建置產物必須可在子路徑下正確運作

站台部署於 GitHub Pages 的專案子路徑之下。建置 MUST 以正確的 base path 產出,所有 JavaScript、CSS 與靜態資源的引用 MUST 能在該子路徑下解析成功。

#### Scenario: 於子路徑預覽建置產物

- **WHEN** 在本機以部署用的 base path 預覽建置產物
- **THEN** 頁面 MUST 正常載入且無資源請求失敗
- **AND** 題庫資料 MUST 可成功取得

#### Scenario: 不得寫死絕對路徑

- **WHEN** 檢視建置產物中的資源引用
- **THEN** MUST NOT 存在忽略 base path 的根目錄絕對路徑

### Requirement: 部署必須經由自動化流程產生

系統 MUST 以自動化流程建置並發佈,MUST NOT 依賴人工上傳建置產物,也 MUST NOT 將建置產物提交進版本庫。

#### Scenario: 推送到主分支

- **WHEN** 變更推送到主分支
- **THEN** 自動化流程 MUST 執行建置並發佈產物

#### Scenario: 建置失敗

- **WHEN** 建置或型別檢查失敗
- **THEN** 流程 MUST 中止且 MUST NOT 發佈
- **AND** 既有的線上站台 MUST 維持可用

### Requirement: 遷移期間線上站台不得中斷

切換部署方式的過程 MUST 不使既有站台無法使用。新的部署流程 MUST 在合併到主分支之前完成驗證。

#### Scenario: 部署流程尚未驗證

- **WHEN** 新的建置與部署流程尚未在主分支之外驗證成功
- **THEN** MUST NOT 將改變部署方式的變更合併到主分支

#### Scenario: 切換完成後

- **WHEN** 新的部署流程首次成功發佈
- **THEN** 站台 MUST 於既有網址可用
- **AND** 使用者既有的學習進度 MUST 仍可讀取

### Requirement: 品質檢查必須可在本機與流程中執行

型別檢查與測試 MUST 可用單一指令執行,且 MUST 為部署流程的一部分。

#### Scenario: 本機執行檢查

- **WHEN** 開發者執行專案定義的檢查指令
- **THEN** MUST 執行型別檢查與測試
- **AND** 失敗時 MUST 以非零狀態碼結束

#### Scenario: 題庫資料完整性

- **WHEN** 執行專案的資料檢查
- **THEN** MUST 驗證四選一題目的結構完整
- **AND** MUST 驗證文法題 id 在各等級內唯一
