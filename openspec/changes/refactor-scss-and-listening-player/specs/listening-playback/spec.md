## ADDED Requirements

### Requirement: 聽力必須提供誠實的播放進度

聽力與聽力錯題 MUST 共用具語意的進度條、播放狀態與暫停／繼續／停止控制。progress MUST 依有效 utterance 的 boundary 更新，end 後為 100%；未回報 boundary 時 MUST 顯示 indeterminate，不捏造秒數或聲稱可 seek。

#### Scenario: 正常播放
- **WHEN** 語音回報中段 boundary，再回報 end
- **THEN** 進度 MUST 先反映朗讀位置，結束後為 100%

#### Scenario: 暫停及停止
- **WHEN** 使用者暫停再繼續，或停止
- **THEN** 暫停 MUST 保留進度並繼續同一 utterance，停止 MUST 清除進度

#### Scenario: 未提供位置事件
- **WHEN** 引擎播放但不回報 boundary
- **THEN** UI MUST 顯示播放中與不定進度，不能固定假百分比

### Requirement: 播放事件必須屬於當前語音輪次

新播放 MUST 停止舊播放，舊 end／error MUST NOT 更新新輪次。背景及有效播放元件卸載 MUST 停止；卸載其他未播放元件 MUST NOT 中斷當前播放。語音失敗 MUST 可重試並提供原文，不增加學習活動。

#### Scenario: 切換題目或重播
- **WHEN** 新輪次開始後舊語音回報完成
- **THEN** 新輪次進度 MUST 不受影響

#### Scenario: 背景與卸載
- **WHEN** 頁面進背景或有效播放元件卸載
- **THEN** 語音 MUST 停止且當輪進度清除

### Requirement: 桌面聽力卡片必須等高且內容完整

桌面聽力網格 MUST 讓題目卡片等高，展開解析或逐字稿後 MUST 由內容撐高，不裁切；手機 MUST 回到自然高度。

#### Scenario: 一題已答另一題未答
- **WHEN** 桌面一題顯示解析及逐字稿
- **THEN** 同一網格的卡片 MUST 等高且保留完整內容
