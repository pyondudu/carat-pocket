# Carat Pocket

以 SEVENTEEN 官方角色 MINITEEN 為參考的像素電子雞網頁（PWA）。屬於粉絲二創，只在朋友之間非營利分享，不公開推廣。

玩法：從 13 個角色裡選 1 個本命當主角來養，其他 12 個之後可以解鎖成夥伴；之後會加入拍照套相框、搖飲料小遊戲、商店與相簿。

## 開發

```bash
npm install
npm run dev      # https://localhost:5173（自簽憑證，瀏覽器警告選「繼續前往」）
npm run build    # 型別檢查 + 打包到 dist/
```

- 手機測試：同一個 Wi-Fi 開 `https://<電腦IP>:5173`。相機需要 HTTPS，所以開發伺服器用 `@vitejs/plugin-basic-ssl`。
- 測試用快轉：網址加 `?debug`（或 `#debug`），房間下方會出現「快轉 1／3／8 小時」與「重來」按鈕。

## 結構

| 檔案 | 用途 |
| --- | --- |
| `src/main.ts` | 進入點、回到 App 時的離線補算 |
| `src/router.ts` | 畫面切換 |
| `src/state.ts` | 遊戲狀態、localStorage 存檔、「你不在的時候…」訊息 |
| `src/pet.ts` | 四項數值（飽足／心情／清潔／體力）、衰減、表情、動作 |
| `src/data/characters.ts` | 13 個角色資料（成員、喜歡的食物、MBTI、專屬原料、解鎖價格） |
| `src/draw.ts` | 角色繪製：有無五官底圖就畫底圖＋程式五官（會呼吸、眨眼、互動時跳），其次用各表情圖，都沒有就用 32×32 佔位圖 |
| `src/face.ts`、`src/data/faces.json` | 程式畫的五官（表情＝參數）與每隻的五官位置（`tools/face_rig.py` 產生） |
| `src/scenes/sheet.ts` | 角色總表（網址加 `#sheet`），檢查 13 隻 × 表情有沒有跑掉 |
| `public/sprites/<角色>/` | 正式角色圖：`happy`／`sad`／`sleep`／`shake`.png（13 隻都有）、`base.png` 無五官底圖（O.C.L 以外 12 隻）、O.C.L 另有 `sick.png` |
| `tools/` | 做角色圖的腳本：`sprites.py`（AI 生圖、後處理、搖飲料）、`face_edits.py`（從開心版改難過／睡覺）、`face_rig.py`（無五官底圖＋五官位置） |
| `src/scenes/select.ts` | 選角畫面（依 HIPHOP／VOCAL／PERFORMANCE 三個小分隊分組） |
| `src/scenes/home.ts` | 寵物房間 |

`參考資料/`（官方圖）與 `assets-src/`（生圖原檔）不進 git。

## 進度

- [x] 1. 專案骨架、角色資料、選角、寵物房間、存檔與離線補算
- [ ] 2. 拍照 + 相框合成 + 相簿
- [ ] 3. 搖飲料小遊戲（連點「搖！」按鈕，不用搖晃感測）+ 金幣 + 圖鑑
- [ ] 4. 商店與解鎖
- [ ] 5. 用 OpenAI 生成像素角色與素材，取代佔位圖（13 隻角色表情已完成，O.C.L 以外改為底圖＋程式五官，會呼吸、眨眼、互動時跳；食物、房間等素材待做）
- [ ] 6. PWA（manifest + service worker）
- [ ] 7. 部署到免費 HTTPS 網址分享給朋友
- [ ] 8. 實體電子雞：Waveshare ESP32-S3-Touch-AMOLED-2.06 手錶開發板（帶電池版，已下單，等到貨），改寫成 C++，燒錄檔放共用資料夾在 Windows 用網頁工具燒
