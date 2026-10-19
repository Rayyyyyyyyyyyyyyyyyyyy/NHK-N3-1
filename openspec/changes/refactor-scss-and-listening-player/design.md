## Decisions

1. SCSS 用 @use 分模組：abstracts 僅 tokens／breakpoint mixins，不輸出 CSS；base 管全域字型／表單／焦點；layout 管 app shell；components 管重用 primitive 與播放器；pages 管首頁／任務／練習配置。main.scss 只列載入順序與 Tailwind layers。不把 1600 行原檔逐段搬家，合併重複 selector，狀態與斷點以適度巢狀集中，限制巢狀深度。
2. 色彩仍經既有 Tailwind theme()，由 SCSS 封裝 token function 讀取；既有模板 utility 的優先順序由 @layer components 確保，不用 !important 疊補樣式。Sass 是建置期依賴，沿用 npm lockfile，不升級其他直接依賴。
3. 共用 useJapaneseSpeech 擁有單一全域有效播放與每輪新 utterance。事件需檢查實例／輪次，舊 end／error 不可污染新播放；取消其他題、背景、卸載、停止都清除當輪進度，卸載非播放題不可取消另一題。
4. 進度使用 charIndex／文字長度；end 才顯示 100%。沒有 boundary 時使用 indeterminate 狀態，沒有可拖曳 seek 或虛構時間。暫停保持進度，繼續同一 utterance；失敗可重試並顯示原文，播放本身不記學習。
5. 桌面網格 stretch＋等高 rows，內容可增高，不裁切答案／解析；手機 auto rows。版型仍單一 Vue 實例，保留桌面／手機既有導覽。

## Verification

mock native SpeechSynthesis events 測試進度、暫停／繼續、重播／切題、舊回應、錯誤／無 boundary、背景與卸載；既有學習回歸、Sass／Vite 編譯、型別、資料、OpenSpec strict。實際語音引擎與卡片像素等高不以 mock 宣稱驗證，依使用者規範不操作瀏覽器。
