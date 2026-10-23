# Carat Pocket 專案說明（給 Claude）

- 完整計畫與里程碑：`~/.claude/plans/app-mossy-sutton.md`；進度清單在 `README.md`。
- 技術：Vite 6 + TypeScript，Canvas 2D 畫房間與角色（房間以 64 格像素畫再放大 4 倍；佔位圖關閉 imageSmoothing，AI 角色圖縮小時開啟），DOM 做按鈕與數值條。不用遊戲引擎、不用框架。
- 存檔只在使用者自己的瀏覽器（localStorage，key `carat-pocket-save`，有 `version` 欄位）；改存檔結構時要升版本。
- 角色繪製一律經過 `src/draw.ts` 的 `drawCharacter` / `characterCanvas`，換成 sprite 時只改這個檔。
- 數值衰減以 `state.lastSeen` 為唯一起點（`catchUp` 與房間的 `tick` 共用），避免重複扣。
- 驗證：`npm run build` 必須通過；畫面可用 `?debug` 快轉時間測表情與離線訊息。
- 素材：用 `~/ai_image.py`（OpenAI，會花錢），使用者同意後才批次。改這支全域腳本前要先問使用者。
- 角色圖流程（TAMTAM 試出來的）：`--ref` 官方圖（從介紹頁裁出，`assets-src/ref/`）＋已核准的開心版；中畫質、`-b transparent`、一次一個表情、提示詞逐項寫外型、no props。後處理：毛色以開心版校色、四張同一縮放比例、底部對齊 300×280 畫布。不要硬轉真像素格（AI 的格子不規則，會鋸齒）。詳細紀錄在總計畫檔。
- 新增角色圖：放進 `public/sprites/<id>/`，並把 id 加進 `src/draw.ts` 的 `SPRITE_IDS`。
- 手機試玩：VM 的網路手機連不到，改用私人 Artifact（https://claude.ai/artifact/9GoFNK4eWXnMP7Tpdreu7x）。做法：`npm run build` 後把 dist 的 css/js 內嵌成單一 HTML，`public/sprites/` 用 Artifact 的 `files` 附上。Artifact 網址不能帶 query，所以快轉用 `#debug`。
- 食物每小時自動補 1 個（上限 10）是商店完成前的暫時措施，做商店時要拿掉（`src/state.ts` 的 `passTime`）。
- `參考資料/` 是官方圖，不可進 git。
