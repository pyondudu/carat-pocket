# Carat Pocket 專案說明（給 Claude）

**所有給使用者看的文字都用繁體中文，包括工具呼叫之間的一句話進度訊息。** 這個專案的程式碼和指令輸出都是英文，使用者已經多次抓到短進度句變成英文。

遊戲裡稱呼角色用「他／他們」，不用「牠」；數量單位用「個」（例如「13 個角色」），遊戲文字不要出現「隻」（使用者 2026-10-24 指定）。

可以點的東西一定要看得出是按鈕（有框線、陰影），不要做成像文字的無框按鈕；次要按鈕用 `secondary`（使用者 2026-10-24 反映「請 XX 先回家」看不出能點）。

文字盡量置中；放不下一行時用 `\n` 在逗號處換行（`.modal p` 有 `white-space: pre-line`），或把說明縮短成一行，不要讓瀏覽器在詞中間斷開（使用者 2026-10-24 要求）。

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
- 商店（2026-10-24 使用者定案）：養成只有一開始選的本命，不能換主角；解鎖夥伴（每隻 400，原本 500，使用者覺得門檻太高調降）可以邀請作客並拿到牠的專屬原料。商店只賣本命的特殊食物（`characters.ts` 的 `specialFood`，名稱使用者改過，改之前先問）。自動補食物使用者決定保留，但改成每 4 小時 1 個、最多 3 個（`src/state.ts` 的 `passTime`）。存檔版本 3 加了 `specialFood`。
- 特殊食物圖示（2026-10-24 使用者要求風格統一）：13 個都是 `tools/food_icons.py` 畫的 16 格像素圖（輸出 `public/icons/food/`），`specialIcon` 寫 `img:<名稱>`，經過 `ui.ts` 的 `foodIcon` 顯示；不要換回表情符號。
- 邀請作客（2026-10-24 使用者定案）：從已解鎖夥伴選 1 隻，要花金幣（`src/data/shop.ts` 的 `INVITE_PRICE`，暫定 50；使用者說不能免費，不然不會去賺金幣），待 `GUEST_HOURS`＝2 小時、沒有冷卻。兩隻同框時照官方娃娃的實際身高比例畫（`characters.ts` 的 `heightCm`，使用者量的；`home.ts` 的 `pairLayout` 用 `draw.ts` 的 `contentBox` 扣掉圖片留白，腳底對齊、水平置中）；一個人時大小不變；邀請當下心情 +20、體力 −15（`pet.ts` 的 `applyInvite`；原本是「心情下降減半」，使用者看成扣心情，改成直接加減），體力不到 15 不能邀請。作客時頭上飄粉藍音符（`drawNotes`）。睡覺和作客不能同時發生：睡覺時不能邀請（邀請按鈕變灰），有客人時不能睡覺（起床隨時可以）。存檔版本 4 加了 `guest`。搖飲料只有本命、不放窗戶（`drawRoom(ctx, false)`）。
- 房間背景（`home.ts` 的 `drawRoom`）：左上角電子鐘（真實時間、24 小時制，不可擋角色）、窗戶（白天／傍晚／晚上天色跟時間）、地上垃圾跟清潔值。房間 nav 是手搖飲、商店、應援、待推出；最後一格原本是相簿，使用者要先擱置、之後再決定。
- 給朋友玩：GitHub Pages（https://pyondudu.github.io/carat-pocket/），repo 公開，push 到 main 自動部署。所以 `public/` 和 git 裡的東西都會公開，不能放官方原圖或金鑰。開頭說明在 `src/scenes/intro.ts`（還沒選本命時出現）。玩家要重來：「📖 玩法說明」最下面的「🔄 重新開始」，會再確認一次才刪存檔，回到開頭說明頁（使用者 2026-10-24 反映找不到重來；Chrome 刪網站設定不一定會清掉存檔）。
- PWA（2026-10-24）：圖示是像素風的克拉鑽石（32 格、左粉右藍 6 段漸層、切面間 1 格白線；形狀照使用者給的平面參考圖，使用者從預覽選「32 格・小」；`tools/icon.py` → `public/icons/`，`diamond-px.png` 是說明頁用的透明版）。說明頁不放角色，說明頁標題和房間左上角（原本是角色名字）都用像素字 Silkscreen Bold 寫「Carat Pocket」（使用者選的；`src/fonts/silkscreen-title.woff2` 只含「Carat Pocket」的字母，要加字得重新下載）。`public/sw.js` 首頁先上網抓、其他檔案先用快取再背景更新，所以改了角色圖之後，玩家要多開一次才會看到新圖。主畫面圖示改樣子時要換檔名（目前 `diamond-px-192/512.png`），圖示、manifest、version.json 不可經過快取（安裝時圖示對不上，Android 會「無法開啟應用程式」）；同網域有 PartTrail 等，清快取只能刪 `carat-pocket` 開頭的。2026-10-24 使用者的 Android 一直「無法開啟應用程式」，改 manifest、換圖示檔名都沒用，最後在 Chrome「網站設定」刪掉 `pyondudu.github.io` 的資料就裝起來了（代價：同網域的 PartTrail、ToothTally 要重新登入，Carat Pocket 存檔清空）。新版本提示在 `src/update.ts`，比對 `__BUILD_ID__` 和 `version.json`（`vite.config.ts` 產生）。
- `參考資料/` 是官方圖，不可進 git。
- 手錶版（2026-10-25，手錶還沒到貨）：Waveshare ESP32-S3-Touch-AMOLED-2.06，用 ESP-IDF 5.5.2＋LVGL 9（官方文件 https://docs.waveshare.net/ESP32-S3-Touch-AMOLED-2.06/ ）。ESP-IDF 在 `~/esp/esp-idf`（用前 `. ~/esp/esp-idf/export.sh`），官方範例在 `~/esp/waveshare-amoled206`，不放進這個 repo。燒錄檔用 `esptool merge_bin` 合成單一 .bin（位址 0x0）放 `/mnt/hgfs/share/`，使用者在 Windows 用網頁工具燒；官方 demo 測試檔已編好（`amoled206_lvgl_demo.bin`）。範例設定寫 16MB Flash，實際是 32MB，寫遊戲時要改。
- 應援節奏小遊戲（2026-10-25 使用者定案）：`src/scenes/rhythm.ts`，版面跟手搖飲一樣（上房間、中間音符軌道、下面粉／藍兩顆大按鈕，為了之後移植手錶）；太鼓式音符由右往左流，紫色是拉長的連打（粉藍都算、不影響 combo）。背景是「房間開演唱會」（`drawStage`：房間調暗、彩燈、小舞台、聚光燈；時鐘不調暗、彩燈不擋時鐘）。本命拿克拉棒（`drinkart.ts` 的 `drawCaratBong`，照十週年紀念款自己畫的像素圖，官方參考圖在 `參考資料/` 不進 git），揮棒時冒音符。音樂用 `src/audio.ts` 即時合成，音符以 AudioContext 時間為準。曲子是原創的「克拉派對」（暫定名，`src/data/songs.ts`，使用者指定參考〈Very Nice〉的感覺、不用原曲旋律；侵權疑慮已跟使用者說明過），一首分簡單／普通／困難三份譜面，一局約 30 秒（使用者嫌 71 秒太長）；編曲在 `src/music.ts`。連打後自動空一拍（`ROLL_GAP`）。目前是預覽版（不扣體力、不給金幣）；正式版計畫在 `~/.claude/plans/sparkling-finding-giraffe.md`。「搖飲料」在按鈕和標題改叫「手搖飲」。
