# 日本語道場 — N5 → N1

手機優先的日文 JLPT 學習單頁應用（純 HTML/CSS/JavaScript，無框架、無打包工具）。

五階段修煉制：N5／N4／N3／N2／N1 可自由切換，四個學習分頁（單字／文法／讀解／聽力）皆依目前等級顯示對應內容與進度。

## 功能

- **首頁**：五個等級各一組整體進度、進階建議（達標可一鍵切換到下一等級）、今日菜單、進度匯出／匯入（base64 進度碼）、備考路線
- **單字**：N5 718 字／N4 666 字／N3 2,139 字／N2 1,748 字／N1 2,699 字，翻卡記憶／讀音測驗雙模式，誘答同等級抽取，點漢字可查 [kanjiapi.dev](https://kanjiapi.dev) 音讀訓讀
- **文法**：N5 80 題／N4 81 題／N3 20 題／N2 30 題／N1 15 題句子填空
- **讀解**：N5 2 篇／N4 2 篇／N3 1 篇／N2 2 篇／N1 1 篇＋延伸練習連結（NHK 從新聞學日語／NHK NEWS WEB EASY）
- **聽力**：N5 4 題／N4 4 題／N3 4 題／N2 4 題／N1 3 題語音朗讀測驗（speechSynthesis）＋ YouTube 文法課程播放清單

## 本地開發

純靜態網站，任何靜態伺服器皆可：

```bash
python3 -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 資料出處

- **單字**：Jonathan Waller ([tanos.co.uk](https://www.tanos.co.uk/jlpt/)) CC-BY，經 [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list) 整理；繁體中文釋義為本專案自行翻譯
- **N5・N4 文法點清單**：[Sigmabond01/jlpt-grammar-api](https://github.com/Sigmabond01/jlpt-grammar-api)（MIT）——題庫的涵蓋範圍依此清單建立，例句與繁中解析為本專案自行撰寫
- **N3・N2・N1 文法／讀解／聽力**：使用者提供的題庫內容
- **N5・N4 讀解／聽力**：本專案自行撰寫
- **漢字**：[kanjiapi.dev](https://kanjiapi.dev)（執行時即時查詢）

## 儲存

進度僅使用 `localStorage`（key: `nihongo_dojo_v3`；N5/N4/N3/N2/N1 分別記錄 vKnown／vLearning／gDone／lDone／lCorrect／rDone），不使用其他儲存 API或後端伺服器。若偵測到更舊的不分級資料（`nihongo_dojo_v2`），會自動遷移到 N2 對應欄位。
