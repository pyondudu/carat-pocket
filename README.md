# Carat Pocket

以 SEVENTEEN 官方角色 MINITEEN 為參考的像素電子雞網頁（PWA）。屬於粉絲二創，只在朋友之間非營利分享，不公開推廣。

玩法：從 13 個角色裡選 1 個本命當主角來養，其他 12 個之後可以解鎖成夥伴；已有手搖飲（搖飲料）小遊戲、節奏應援小遊戲、商店、邀請夥伴作客；拍照與相簿先擱置。

## 開發

```bash
npm install
npm run dev      # https://localhost:5173（自簽憑證，瀏覽器警告選「繼續前往」）
npm run build    # 型別檢查 + 打包到 dist/
```

- 正式網址（給朋友玩）：https://pyondudu.github.io/carat-pocket/ ，push 到 main 會由 `.github/workflows/deploy.yml` 自動部署到 GitHub Pages。
- 手機測試：同一個 Wi-Fi 開 `https://<電腦IP>:5173`。相機需要 HTTPS，所以開發伺服器用 `@vitejs/plugin-basic-ssl`。
- 測試用按鈕：網址加 `?debug`（或 `#debug`），房間下方會出現「快轉 1／3／8 小時」「弄髒」「+500 金幣」「全部解鎖」「重來」。

## 結構

| 檔案 | 用途 |
| --- | --- |
| `src/main.ts` | 進入點、回到 App 時的離線補算 |
| `src/router.ts` | 畫面切換 |
| `src/update.ts`、`public/sw.js`、`public/manifest.webmanifest` | PWA：快取程式、新版本檢查（比對建置時寫入的 `__BUILD_ID__` 和 `version.json`）、App 資訊 |
| `src/scenes/intro.ts` | 開頭說明（第一次打開時出現，按「開始遊戲」進選本命；房間的「📖 玩法說明」按鈕也顯示這份玩法） |
| `src/state.ts` | 遊戲狀態、localStorage 存檔、「你不在的時候…」訊息 |
| `src/pet.ts` | 四項數值（飽足／心情／清潔／體力）、衰減、表情、動作 |
| `src/data/characters.ts` | 13 個角色資料（成員、喜歡的食物、MBTI、專屬原料、解鎖價格） |
| `src/draw.ts` | 角色繪製：有無五官底圖就畫底圖＋程式五官（會呼吸、眨眼、互動時跳），其次用各表情圖，都沒有就用 32×32 佔位圖 |
| `src/face.ts`、`src/data/faces.json` | 程式畫的五官（表情＝參數）與每隻的五官位置（`tools/face_rig.py` 產生） |
| `src/scenes/sheet.ts` | 角色總表（網址加 `#sheet`），檢查 13 隻 × 表情有沒有跑掉 |
| `public/sprites/<角色>/` | 正式角色圖：`happy`／`sad`／`sleep`／`shake`.png（13 隻都有）、`base.png` 無五官底圖（O.C.L 以外 12 隻）、O.C.L 另有 `sick.png` |
| `tools/` | 做角色圖的腳本：`sprites.py`（AI 生圖、後處理、搖飲料）、`face_edits.py`（從開心版改難過／睡覺）、`face_rig.py`（無五官底圖＋五官位置） |
| `src/scenes/select.ts` | 選角畫面（依 HIPHOP／VOCAL／PERFORMANCE 三個小分隊分組） |
| `src/scenes/home.ts` | 寵物房間：左上角電子鐘（真實時間 24 小時制）、窗外天色跟時間變、清潔越低地上垃圾越多、邀請夥伴作客 |
| `src/scenes/shake.ts` | 搖飲料小遊戲（選原料 → 10 秒連點 → 結果）與飲料圖鑑 |
| `src/shake.ts` | 搖飲料規則：可用原料、配方比對、品質、金幣（不碰畫面，之後搬到手錶照這份） |
| `src/data/drinks.ts` | 5 種基本原料、13 種角色專屬原料、19 款飲料配方 |
| `src/drinkart.ts` | 程式畫的雪克杯、飲料杯與克拉棒 |
| `src/scenes/rhythm.ts` | 節奏應援小遊戲（太鼓式，粉／藍兩顆按鈕＋紫色連打；背景是房間開演唱會）：說明視窗 → 選難度 → 3、2、1 倒數 → 約 30 秒 → 結算 |
| `src/rhythm.ts` | 節奏應援計分：判定分數、評級 S/A/B/C、金幣（不碰畫面） |
| `src/audio.ts` | Web Audio 合成的電子音色（supersaw、pluck、pad、riser、電子鼓）與按鍵音（應援用，不用音樂檔） |
| `src/data/songs.ts` | 應援曲子：樂譜（和弦、旋律、撥弦、鼓型）與三種難度的譜面，展開成音符的純函式 |
| `src/music.ts` | 編曲（EDM）：把樂譜的一個小節排成鼓、低音、和弦、主旋律 |
| `src/scenes/shop.ts` | 商店：紫菜包飯、本命特殊食物、解鎖夥伴（可邀請作客＋拿專屬原料） |
| `src/data/shop.ts` | 食物與邀請作客的價格 |

`參考資料/`（官方圖）與 `assets-src/`（生圖原檔）不進 git。

## 進度

- [x] 1. 專案骨架、角色資料、選角、寵物房間、存檔與離線補算
- [ ] 2. 拍照 + 相框合成 + 相簿（先擱置；房間上排是餵食、清潔、睡覺／起床、商店，下排是手搖飲、節奏應援、待推出、待推出，之後再決定要做什麼）
- [x] 3. 搖飲料小遊戲（點第一下才開始倒數，10 秒連點「搖！」，次數分普通／好喝／完美）+ 金幣 + 19 款飲料圖鑑；每搖一次體力 −10、心情 +10（2026-10-27 小遊戲統一）
- [x] 4. 商店與解鎖：紫菜包飯 10（最多 30 個）、本命特殊食物 30（飽足 +50、心情 +30）、夥伴每隻 400（原 500，2026-10-24 調降；可邀請作客＋專屬原料，養成只有本命）；每天早上 9:00 發 3 個紫菜包飯（好幾天沒開也只發一次，2026-10-27 取代每 4 小時自動補；存檔版本 6 加 `dailyFoodAt`）
- [x] 4.5 邀請夥伴作客：每次 50 金幣、待 2 小時，兩隻照官方娃娃的身高比例並排；邀請時心情 +20、體力 −10；離線回來會說誰來玩過
- [ ] 5. 用 OpenAI 生成像素角色與素材，取代佔位圖（13 隻角色表情已完成，O.C.L 以外改為底圖＋程式五官，會呼吸、眨眼、互動時跳；食物、房間等素材待做）
- [x] 6. PWA：可加到主畫面（像素克拉鑽石圖示，`tools/icon.py` 產生）、快取後沒網路也能玩、網站更新時顯示「有新版本，點這裡更新」（2026-10-24）
- [x] 7. 部署到免費 HTTPS 網址分享給朋友：GitHub Pages https://pyondudu.github.io/carat-pocket/（2026-10-24）
- [x] 7.5 節奏應援小遊戲（2026-10-26 正式版）：原創曲「克拉派對」約 30 秒，分簡單／普通／困難；進來先跳說明視窗，選難度按開始後房間中央 3、2、1 倒數；評級 S/A/B/C，金幣依得分（上限 簡單 30／普通 45／困難 60），一局體力 −10、心情 +10（睡覺或體力不到 10 不能玩），存檔記每個難度的最高分（版本 5 加 `rhythm`）
- [ ] 8. 實體電子雞：Waveshare ESP32-S3-Touch-AMOLED-2.06 手錶開發板（帶電池版，已下單，等到貨），用 ESP-IDF＋LVGL 9 改寫成 C++（官方文件 https://docs.waveshare.net/ESP32-S3-Touch-AMOLED-2.06/ ），燒錄檔放共用資料夾在 Windows 用網頁工具燒
