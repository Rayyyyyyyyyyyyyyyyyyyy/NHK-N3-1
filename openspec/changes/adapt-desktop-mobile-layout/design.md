## Context

src/style.css 將 banner-content、app-main 與 site-footer 皆限制 520px；App 固定全寬底部五分頁。HomePage 先渲染五級完整進度，再出現 TodayTasks。使用者明確要求區分 web 與 mobile 的 RWD 版型，並提供目前 Chrome 截圖作為視覺依據。

## Decisions

1. 使用 CSS media queries 做版面分工，不依 JS viewport 分別掛載兩套頁面。唯一 RouterView、TodayTasks、進度 store 與題庫 effects 保持相同；resize 不應重設作答或產生重複請求。
2. <768px 單欄與底部五分頁，768–1023px 使用較寬內容與適度網格，>=1024px 固定側欄約 216px、隱藏底部導覽。桌面首頁最大約 1200px；一般練習仍限制閱讀寬度，讀解與聽力可用較寬工作區。
3. 首頁 DOM 順序即主要操作順序：頁面標題 → 今日任務／複習 → 目前等級／進階建議 → 可展開的五級進度與備份／備考。1280px 起主側欄分工，較小桌面先保留主欄寬度，手機依相同 DOM 順序堆疊，避免 CSS 大幅重排造成鍵盤順序差異。
4. 延用 indigo／paper、淺色、明朝體與手機安全區。標準化表單、焦點、觸控目標、長字換行、min-width:0 及按鈕換行；維持現有 async／empty／error／missing／ready 的契約。只有確認 missing 才提供修復操作。
5. 使用原生 details／summary 放次要資訊，保留鍵盤操作與原有進度備份表單。視覺變更不改業務判斷、不新增進度狀態所有者。

## Verification

非瀏覽器元件測試確認單一主要內容、導覽／等級切換、任務與錯誤狀態、總覽／備份語意及原文／題目結構；既有學習回歸套件、npm run check、npm run build、OpenSpec strict validation。CSS／建置可證明規則與資源產出，不證明實際像素排版。真實手機／桌面視覺、overflow 與鍵盤焦點保持未驗證，不為此中止已授權實作。
