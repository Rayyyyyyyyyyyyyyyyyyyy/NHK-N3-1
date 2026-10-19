## ADDED Requirements

### Requirement: 樣式必須以 SCSS 模組組織

應用 MUST 由單一 SCSS 入口載入基礎、版面、共用元件與頁面模組；同一元件的狀態與斷點 MUST 集中維護，MUST 移除重複追加覆寫的舊 CSS 入口。色彩 MUST 共用既有 theme，保留現有手機／桌面行為及 Tailwind utilities。

#### Scenario: 建置樣式
- **WHEN** 執行正式建置
- **THEN** Sass 與 Tailwind MUST 成功編譯
- **AND** 應用 MUST 不再載入舊 style.css

#### Scenario: 維護版型
- **WHEN** 調整桌面或手機斷點
- **THEN** 定義 MUST 位於負責該版面的模組
- **AND** MUST NOT 以重複全域 selector 附加相反值
