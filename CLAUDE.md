# Agent 工作指引

先讀 [ARCHITECTURE.md](ARCHITECTURE.md) 中與本次變更相關的決策；本文件不重複維護架構規則。操作指令與部署注意事項見 [README.md](README.md)。

- 本專案使用 Vue 3 SFC、TypeScript、Pinia、vue-router、Tailwind、VueUse 與 Vite；套件管理使用 npm 與 `package-lock.json`。
- 在現有工作樹上先確認變更，不覆蓋他人的未提交工作。涉及 OpenSpec 的工作先讀對應 change 的 proposal、design、specs 與 tasks；已知 D4／部署規格衝突的處理記於架構文件。
- 進度規則放在純 domain，瀏覽器儲存由 service 包裝，跨頁進度由單一 store 擁有。維持現有依賴方向，避免在頁面建立第二份完成紀錄。
- 題庫是受保護的內容資產。新增文法題保留既有 ID；不要重編號或為了讓檢查通過修改題意。題庫數量變更時同步 `counts.json`，再執行資料檢查。
- 根據改動先跑相關測試，完成可執行變更時執行 `npm run check`；影響建置或資源路徑時加跑 `npm run build` 與必要的 preview 驗證。區分已實作、局部測試通過、本機可用與線上驗證，未執行的檢查不可宣稱通過。
- 執行 `npm run build` 會產生 `dist/`；不要提交建置產物。不要把 Vite 原始入口推到仍服務根目錄的 Pages 主分支，遵循架構文件的分階段切換。
- 改變持久狀態、對外邊界或重要設計意圖時，在同一變更更新最近的架構記錄。一般檔案重新命名或內部整理不需要新增決策文件。
- 使用繁體中文說明結果，列出實際驗證與尚未完成的外部操作。
