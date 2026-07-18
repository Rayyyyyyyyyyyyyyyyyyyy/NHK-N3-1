# 日本語道場 — N2 → N1

手機優先的日文 JLPT 學習單頁應用（純 HTML/CSS/JavaScript，無框架、無打包工具）。

## 功能

- **首頁**：整體進度、今日菜單、進度匯出／匯入（base64 進度碼）、備考路線
- **單字**：約 1,748 字 N2 單字庫（翻卡記憶／讀音測驗雙模式），點漢字可查 [kanjiapi.dev](https://kanjiapi.dev) 音讀訓讀
- **文法**：內建 30 題句子填空
- **讀解**：內建 3 篇文章＋延伸練習連結（NHK 從新聞學日語／NHK NEWS WEB EASY）
- **聽力**：內建 8 題語音朗讀測驗（speechSynthesis）＋ YouTube 文法課程播放清單

## 本地開發

純靜態網站，任何靜態伺服器皆可：

```bash
python3 -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 資料出處

- 單字資料：Jonathan Waller ([tanos.co.uk](https://www.tanos.co.uk/jlpt/)) CC-BY
- 漢字資料：[kanjiapi.dev](https://kanjiapi.dev)

## 儲存

進度僅使用 `localStorage`（key: `nihongo_dojo_v2`），不使用其他儲存 API或後端伺服器。
