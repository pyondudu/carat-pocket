# Carat Pocket 專案說明（給 Claude）

**所有給使用者看的文字都用繁體中文，包括工具呼叫之間的一句話進度訊息。** 這個專案的程式碼和指令輸出都是英文，使用者已經多次抓到短進度句變成英文。

- 完整計畫與里程碑：`~/.claude/plans/app-mossy-sutton.md`；進度清單在 `README.md`。
- 技術：Vite 6 + TypeScript，Canvas 2D 畫房間與角色（房間以 64 格像素畫再放大 4 倍；佔位圖關閉 imageSmoothing，AI 角色圖縮小時開啟），DOM 做按鈕與數值條。不用遊戲引擎、不用框架。
- 存檔只在使用者自己的瀏覽器（localStorage，key `carat-pocket-save`，有 `version` 欄位）；改存檔結構時要升版本。
- 角色繪製一律經過 `src/draw.ts` 的 `drawCharacter` / `characterCanvas`，換成 sprite 時只改這個檔。
- 數值衰減以 `state.lastSeen` 為唯一起點（`catchUp` 與房間的 `tick` 共用），避免重複扣。
- 驗證：`npm run build` 必須通過；畫面可用 `?debug` 快轉時間測表情與離線訊息。
- 素材：用 `~/ai_image.py`（OpenAI，會花錢），使用者同意後才批次。改這支全域腳本前要先問使用者。
- 角色圖流程（TAMTAM 試出來的）：`--ref` 官方圖（從介紹頁裁出，`assets-src/ref/`）＋已核准的開心版；中畫質、`-b transparent`、一次一個表情、提示詞逐項寫外型、no props。後處理：毛色以開心版校色、四張同一縮放比例、底部對齊 300×280 畫布。不要硬轉真像素格（AI 的格子不規則，會鋸齒）。詳細紀錄在總計畫檔。
- 新增角色圖：放進 `public/sprites/<id>/`，並把 id 加進 `src/draw.ts` 的 `SPRITE_IDS`（13 隻都已加入）。
- 其他表情一律從核准的開心版做，免費且比例不會跑：難過／睡覺用 `tools/face_edits.py`（清掉五官再畫新的，座標是 1024 原圖；取色點寫 `None` 會用左右膚色漸變填），搖飲料用 `tools/sprites.py shake`（開心版＋程式畫的雪克杯）。改完都要跑 `tools/sprites.py process <id>`；從開心版改的表情要加進 `FROM_HAPPY`，才不會重複校色。O.C.L、TAMTAM 的難過／睡覺是使用者核准的 AI 版，不要重做。
- 程式五官（使用者 2026-10-24 試過 TAMTAM 後決定採用；O.C.L 以外 12 隻已完成）：`tools/face_rig.py` 的 `RIGS` 寫眼睛、嘴巴的清除範圍（1024 原圖座標），跑完產生 `public/sprites/<id>/base.png` 和 `src/data/faces.json`。開心時遊戲直接從 happy.png 複製原本的眼睛嘴巴（角色招牌的眼睛不會被換掉），其他表情在 `src/face.ts` 的 `EXPRESSIONS` 改參數，不用再生圖。O.C.L 是三隻疊在一起、難過／睡覺是核准的 AI 版，維持用 PNG；牠的生病版 `sick.png` 是 `face_edits.py` 從開心版改的（沒有 sick.png 的角色會借用 sad.png）。用 `#sheet` 總表檢查。
- 看總表不要把 PNG 壓成 256 色，顏色會跑掉（葉子變褐色）。
- 手機試玩：VM 的網路手機連不到，改用私人 Artifact（https://claude.ai/artifact/9GoFNK4eWXnMP7Tpdreu7x）。做法：`npm run build` 後把 dist 的 css/js 內嵌成單一 HTML，`public/sprites/` 用 Artifact 的 `files` 附上。Artifact 網址不能帶 query，所以快轉用 `#debug`。
- 搖飲料（2026-10-24 使用者定案）：基本原料牛奶、紅茶、綠茶、冰塊、果糖；每隻角色一種專屬原料（`characters.ts` 的 `ingredient`，使用者指定），解鎖夥伴才拿得到；19 款飲料的名稱與配方是使用者改過的，改之前先問。規則在 `src/shake.ts`，存檔版本 2 加了 `codex`。
- 商店（2026-10-24 使用者定案）：養成只有一開始選的本命，不能換主角；解鎖夥伴（500）只拿到牠的專屬原料。商店只賣本命的特殊食物（`characters.ts` 的 `specialFood`，名稱使用者改過，改之前先問）。自動補食物使用者決定保留，但改成每 4 小時 1 個、最多 3 個（`src/state.ts` 的 `passTime`）。存檔版本 3 加了 `specialFood`。
- 邀請作客（2026-10-24 使用者定案）：從已解鎖夥伴選 1 隻，要花金幣（`src/data/shop.ts` 的 `INVITE_PRICE`，暫定 50；使用者說不能免費，不然不會去賺金幣），待 `GUEST_HOURS`＝2 小時、沒有冷卻。客人和本命一樣大、一起縮小並排；客人在時本命心情衰減減半（`passTime` 依 `guest.until` 切成兩段）。存檔版本 4 加了 `guest`。搖飲料只有本命、不放窗戶（`drawRoom(ctx, false)`）。
- 房間背景（`home.ts` 的 `drawRoom`）：左上角電子鐘（真實時間、24 小時制，不可擋角色）、窗戶（白天／傍晚／晚上天色跟時間）、地上垃圾跟清潔值。房間 nav 是搖飲料、商店、待推出、待推出；後兩格原本是拍照、相簿，使用者要先擱置、之後再決定。
- `參考資料/` 是官方圖，不可進 git。
