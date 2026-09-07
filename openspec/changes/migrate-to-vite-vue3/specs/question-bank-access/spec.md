## ADDED Requirements

### Requirement: 題庫必須維持按等級延遲載入

題庫共約 943 KB。系統 MUST 只在需要時取得目前等級的資料,MUST NOT 在啟動時載入全部五個等級的題庫。

#### Scenario: 開啟單字頁

- **WHEN** 使用者在 N3 開啟單字頁
- **THEN** 系統 MUST 僅取得 N3 的單字資料
- **AND** MUST NOT 取得其他等級的單字資料

#### Scenario: 題庫不進入應用程式 bundle

- **WHEN** 建置產物完成
- **THEN** `data/*.json` MUST 以獨立的靜態檔案形式存在,可用穩定路徑取得
- **AND** MUST NOT 被打包進 JavaScript bundle

### Requirement: 資源路徑必須尊重部署的 base path

站台部署於子路徑之下。所有題庫請求 MUST 以建置時的 base path 組成,MUST NOT 寫死絕對路徑。

#### Scenario: 部署於子路徑

- **WHEN** 站台部署在 `/<repo>/` 之下
- **THEN** 題庫請求 MUST 解析到 `/<repo>/data/...`
- **AND** MUST 成功取得資料

### Requirement: 首頁分母不得下載完整題庫

首頁進度條只需要各等級的題數。系統 MUST 有一個不需下載題目內容即可取得題數的來源。

#### Scenario: 開啟首頁

- **WHEN** 使用者開啟首頁且題數來源可用
- **THEN** 首頁 MUST 顯示五個等級的正確分母
- **AND** MUST NOT 為了取得分母而請求任何題庫檔案

#### Scenario: 題數來源不可用

- **WHEN** 題數來源取得失敗
- **THEN** 系統 MUST 退回實際載入題庫並計算數量
- **AND** 首頁 MUST 仍顯示正確分母

### Requirement: 單一資源失敗不得使整頁失效

任一資料檔取得失敗 MUST NOT 導致整個頁面被錯誤畫面取代。首頁尤其是使用者存取進度備份的唯一入口。

#### Scenario: 部分題庫取得失敗

- **WHEN** 首頁渲染期間有部分資料檔請求失敗
- **THEN** 首頁 MUST 仍渲染全部五個等級的進度區塊
- **AND** 進度匯出與匯入介面 MUST 仍可使用

#### Scenario: 學習頁的題庫取得失敗

- **WHEN** 某學習頁所需的題庫取得失敗
- **THEN** 該頁 MUST 顯示可理解的錯誤狀態
- **AND** 導覽與其他分頁 MUST 仍可使用

### Requirement: 失敗結果不得寫入快取

取得失敗 MUST NOT 被記錄為該資源的快取值,否則一次網路閃斷會使該資源在整個 session 中永久為空。

#### Scenario: 失敗後重試

- **GIVEN** 某題庫的請求曾經失敗
- **WHEN** 使用者在網路恢復後再次進入該頁
- **THEN** 系統 MUST 重新發出請求並取得正確資料

### Requirement: 分母未知時不得呈現為零或誤判進階

分母無法取得代表未知,不等於零。系統 MUST 在視覺上區分兩者,且等級進階判定 MUST NOT 因分母為零而誤判為已全部掌握。

#### Scenario: 某等級的文法題庫無法取得

- **WHEN** 某等級的文法資料取得失敗
- **THEN** 該進度條 MUST 以未知標記呈現分母,而非顯示為 0
- **AND** 該等級的進階建議 MUST NOT 判定為達標
