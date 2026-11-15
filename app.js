/*
 * Flood Tuber Package Builder — application logic (no framework, no build step).
 *
 * File layout (top to bottom):
 *   1. translations      UI strings per language (en, fr, tr, ja, zh) + tutorial HTML
 *   2. language          setLanguage(), label/diff/sim text refresh
 *   3. state             slots, files, images, dirty flag
 *   4. slots & preview   drop zones, loadFile(), updatePreview(), blend/opacity
 *   5. settings.ini      generateSettingsIni() and the ZIP export button
 *   6. simulation       "Simulate pattern": a small state machine that mimics the
 *                        Flood Tuber OBS plugin (talking / idle / action / blink)
 *   7. magic wand        image editor: background removal (flood fill, erasers) and the
 *                        difference eraser (copies the model's pixels), undo/redo, zoom
 *   8. tutorials         tutorial dialog
 *
 * Data model: each sprite slot is identified by its base name, without extension
 * (e.g. "idle"). The extension written into the ZIP follows the real format of the file.
 *   files[name]   -> the File written into the ZIP (the user's file, or a PNG after
 *                    conversion or the magic wand)
 *   formats[name] -> { kind, ext, animated, frames, w, h }, read from the file signature
 *   images[name]  -> { img, url }: the loaded <img> and its object URL
 *   slots[name]   -> DOM references for the slot card
 *
 * The base names (SLOT_ORDER), the extensions and the settings.ini keys are a contract
 * with Flood Tuber. Change them only together.
 *
 * Target version (#targetVersion): the package is built for Flood Tuber 1.3.0 (PNG files
 * only, talk images A to C, fewer settings) or 1.4.0 (everything). Elements that only exist
 * in 1.4.0 carry data-since="1.4.0" in index.html; is13() is the test used in this file.
 *
 * To add a language: copy the `en` block below, translate every key, then add a
 * matching <button data-lang="xx"> in index.html.
 */
const translations = {
  en: {
    title: "Flood Tuber Package Builder",
    subtitle: "Drop PNG, GIF, APNG or WebP into the slots, check the overlay, then download a ZIP with settings.ini.",
    avatarName: "Avatar name (folder):",
    authorName: "Author:",
    slotsTitle: "Sprite slots",
    required: "required",
    clickOrDrop: "Click or drop",
    previewTitle: "Overlay preview",
    stackEmpty: "Add idle to see the stack.",
    globalOpacity: "Opacity:",
    diffMode: "Difference",
    diffNormal: "Normal mode",
    toggleAll: "Show / Hide all",
    settingsTitle: "settings.ini",
    generateZip: "Download ZIP package",
    credits: "Character makers that match the expression slots:",
    idleRequired: "idle is required!",
    simulate: "Simulate pattern",
    simulateStop: "Stop simulation",
    simIdle: "IDLE",
    simTalking: "TALKING",
    simAction: "ACTION",
    simBlink: "blink",
    wandBtn: "Magic wand: remove background",
    removeBtn: "Remove this sprite",
    removeDone: "Sprite removed.",
    wandTitle: "Magic wand",
    wandHint: "Click on the background to make it transparent. Adjust the tolerance if needed.",
    wandTolerance: "Tolerance:",
    wandGlobal: "All areas of this colour",
    wandInfo: "{n} px removed",
    wandApply: "Apply",
    wandCancel: "Cancel",
    wandRestore: "Restore original",
    wandDone: "Background removed!",
    wandRestored: "Original restored.",
    toolWand: "Wand",
    toolEraser: "Eraser",
    toolMagic: "Magic eraser",
    wandSize: "Size:",
    wandGrow: "Expand background:",
    wandUndo: "Undo",
    zoomFit: "Fit",
    bgLabel: "Background:",
    bgImage: "Image",
    bgReset: "Reset",
    wandRedo: "Redo",
    wandKeys: "Click adds. Click again or right-click removes. Shift+click stacks. Delete removes the last. Wand clears all.",
    wandZones: "{n} zones selected",
    tutorials: "Tutorials",
    close: "Close",
    tutoBody: `
<h3>What is this builder for?</h3>
<p>The Flood Tuber Package Builder prepares an avatar package for the Flood Tuber OBS plugin. It places your expression images under the correct file names, generates the <code>settings.ini</code> file and creates a ZIP ready to use. Everything runs in your browser: no image is sent to a server.</p>
<h3>Character generators</h3>
<p>charat.me and picrew.me are online avatar generators: you build a character from parts (face, eyes, mouth, clothes…). They help you get the expressions that match the builder's slots (open mouth, closed eyes, pose…).</p>
<p class="tuto-links"><a href="https://charat.me/" target="_blank" rel="noreferrer">charat.me</a><a href="https://picrew.me/" target="_blank" rel="noreferrer">picrew.me</a></p>
<h3>Steps</h3>
<ol>
<li>Create your images with a generator, or use your own drawings.</li>
<li>Drop each expression into its slot. <code>idle</code> is required; <code>talk_a/b/c</code> are the mouth images while speaking, and the <code>_blink</code> variants handle blinking while speaking.</li>
<li>Check the alignment with the preview and layers (Difference mode).</li>
<li>If the background gets in the way, use the magic wand, the eraser or the magic eraser.</li>
<li>Test the behaviour with "Simulate pattern".</li>
<li>Adjust the <code>settings.ini</code> values, then download the ZIP.</li>
<li>Unzip the file and place the avatar folder where the Flood Tuber plugin looks for it (see the plugin README).</li>
</ol>`,
    generating: "Generating ZIP...",
    success: "ZIP downloaded!",
    extraTalk: "Extra talk images (D, E, F)",
    talkGap: "{missing} missing before {last}: during speech, each missing step shows the previous image.",
    animTotalOver: "{file}: {frames} frames of {w}×{h} px take about {size} of video memory. Flood Tuber cuts the animation beyond 1 GB.",
    animTotalNear: "{file}: {frames} frames of {w}×{h} px take about {size} of video memory, close to the 1 GB limit where Flood Tuber cuts the animation.",
    apngFrameOver: "{file}: one decoded frame takes {size}. Flood Tuber refuses an APNG whose frame exceeds 256 MB.",
    apngFrameNear: "{file}: one decoded frame takes {size}, close to the 256 MB limit above which Flood Tuber refuses an APNG.",
    nameInvalid: "Enter an avatar name. Characters \\ / : * ? \" < > | and leading or trailing spaces and dots are removed.",
    intervalError: "{section}: the minimum must not exceed the maximum.",
    notImage: "{file}: this file is not a readable image.",
    convertedPng: "{file}: converted to PNG.",
    mouth_mode: "Mouth Mode",
    mouth_range: "Volume Range (dB)",
    targetVersion: "Flood Tuber version:",
    v13Still: "{files}: Flood Tuber 1.3.0 only reads PNG files. Exported as PNG; an animation keeps only its first frame.",
    v13Skipped: "{files}: not exported. Flood Tuber 1.3.0 only uses talk images A to C.",
    animNoEdit: "GIF or animated image: editing is not available here. Use a third-party tool such as ezgif.com.",
    toolDiff: "Difference eraser",
    wandRef: "Model:",
    diffLeft: "{n} px differ from {ref}",
    // Settings labels from official locale
    threshold: "Activation Threshold (dB)",
    release_delay: "Release Delay (ms)",
    talking_speed: "Mouth Speed (sec/frame)",
    blink_duration: "Blink Duration (ms)",
    blink_interval_min: "Min Interval (ms)",
    blink_interval_max: "Max Interval (ms)",
    action_duration: "Action Duration (ms)",
    action_interval_min: "Min Wait (ms)",
    action_interval_max: "Max Wait (ms)",
    motion_type: "Effect",
    motion_speed: "Speed (%)",
    motion_strength: "Strength",
    reference_height: "Reference Height (px)",
    mirror: "Mirror Horizontally"
  },
  fr: {
    title: "Flood Tuber Package Builder",
    subtitle: "Glissez vos images (PNG / GIF / APNG / WebP) dans les slots, vérifiez l’alignement, générez le settings.ini et téléchargez le package ZIP.",
    avatarName: "Nom de l’avatar (dossier) :",
    authorName: "Auteur :",
    slotsTitle: "Emplacements des sprites",
    required: "requis",
    clickOrDrop: "Cliquez ou déposez",
    previewTitle: "Prévisualisation / Superposition (calques)",
    stackEmpty: "Ajoutez idle pour voir la superposition.",
    globalOpacity: "Opacité globale :",
    diffMode: "Mode Différence",
    diffNormal: "Mode normal",
    toggleAll: "Tout afficher / masquer",
    settingsTitle: "settings.ini",
    generateZip: "Générer et télécharger le package ZIP",
    credits: "Générateurs de personnages compatibles avec les emplacements d’expressions :",
    idleRequired: "idle est obligatoire !",
    simulate: "Simuler le paterne",
    simulateStop: "Arrêter la simulation",
    simIdle: "REPOS",
    simTalking: "PARLE",
    simAction: "ACTION",
    simBlink: "clignement",
    wandBtn: "Baguette magique : effacer le fond",
    removeBtn: "Retirer ce sprite",
    removeDone: "Sprite retiré.",
    wandTitle: "Baguette magique",
    wandHint: "Cliquez sur le fond pour le rendre transparent. Ajustez la tolérance si besoin.",
    wandTolerance: "Tolérance :",
    wandGlobal: "Toutes les zones de cette couleur",
    wandInfo: "{n} px effacés",
    wandApply: "Appliquer",
    wandCancel: "Annuler",
    wandRestore: "Restaurer l’original",
    wandDone: "Fond supprimé !",
    wandRestored: "Original restauré.",
    toolWand: "Baguette",
    toolEraser: "Gomme",
    toolMagic: "Gomme magique",
    wandSize: "Taille :",
    wandGrow: "Élargir le fond :",
    wandUndo: "Défaire",
    zoomFit: "Ajuster",
    bgLabel: "Fond :",
    bgImage: "Image",
    bgReset: "Réinitialiser",
    wandRedo: "Rétablir",
    wandKeys: "Clic ajoute. Reclic ou clic droit retire. Maj+clic superpose. Suppr retire la dernière. Baguette efface tout.",
    wandZones: "{n} zones sélectionnées",
    tutorials: "Tutoriels",
    close: "Fermer",
    tutoBody: `
<h3>À quoi sert ce builder ?</h3>
<p>Le Flood Tuber Package Builder prépare un package d’avatar pour le plugin OBS Flood Tuber. Il range tes images d’expressions sous les bons noms de fichiers, génère le fichier <code>settings.ini</code> et crée un ZIP prêt à utiliser. Tout se fait dans ton navigateur : aucune image n’est envoyée sur un serveur.</p>
<h3>Les générateurs de personnages</h3>
<p>charat.me et picrew.me sont des générateurs d’avatars en ligne : tu composes un personnage à partir de parties (visage, yeux, bouche, vêtements…). Ils permettent d’obtenir les expressions qui correspondent aux emplacements du builder (bouche ouverte, yeux fermés, pose…).</p>
<p class="tuto-links"><a href="https://charat.me/" target="_blank" rel="noreferrer">charat.me</a><a href="https://picrew.me/" target="_blank" rel="noreferrer">picrew.me</a></p>
<h3>Étapes</h3>
<ol>
<li>Crée tes images avec un générateur, ou utilise tes propres dessins.</li>
<li>Dépose chaque expression dans son emplacement. <code>idle</code> est obligatoire ; <code>talk_a/b/c</code> sont les images de bouche pendant la parole, et les variantes <code>_blink</code> gèrent le clignement en parlant.</li>
<li>Vérifie l’alignement avec l’aperçu et les calques (Mode Différence).</li>
<li>Si le fond gêne, utilise la baguette magique, la gomme ou la gomme magique.</li>
<li>Teste le comportement avec « Simuler le paterne ».</li>
<li>Règle les valeurs de <code>settings.ini</code>, puis télécharge le ZIP.</li>
<li>Décompresse le ZIP et place le dossier de l’avatar là où le plugin Flood Tuber le cherche (voir le README du plugin).</li>
</ol>`,
    generating: "Génération du ZIP...",
    success: "ZIP téléchargé !",
    extraTalk: "Images de parole supplémentaires (D, E, F)",
    talkGap: "{missing} manquant avant {last} : pendant la parole, chaque étape manquante affiche l’image précédente.",
    animTotalOver: "{file} : {frames} images de {w}×{h} px occupent environ {size} de mémoire vidéo. Flood Tuber tronque l’animation au-delà de 1 Go.",
    animTotalNear: "{file} : {frames} images de {w}×{h} px occupent environ {size} de mémoire vidéo, proche de la limite de 1 Go au-delà de laquelle Flood Tuber tronque l’animation.",
    apngFrameOver: "{file} : une image décodée occupe {size}. Flood Tuber refuse un APNG dont une image dépasse 256 Mo.",
    apngFrameNear: "{file} : une image décodée occupe {size}, proche de la limite de 256 Mo au-delà de laquelle Flood Tuber refuse un APNG.",
    nameInvalid: "Saisissez un nom d’avatar. Les caractères \\ / : * ? \" < > | ainsi que les espaces et points en début et en fin sont retirés.",
    intervalError: "{section} : le minimum ne doit pas dépasser le maximum.",
    notImage: "{file} : ce fichier n’est pas une image lisible.",
    convertedPng: "{file} : converti en PNG.",
    mouth_mode: "Mode de la bouche",
    mouth_range: "Plage de volume (dB)",
    targetVersion: "Version de Flood Tuber :",
    v13Still: "{files} : Flood Tuber 1.3.0 ne lit que des fichiers PNG. Export en PNG ; une animation ne garde que sa première image.",
    v13Skipped: "{files} : non exporté. Flood Tuber 1.3.0 n’utilise que les images de parole A à C.",
    animNoEdit: "GIF ou image animée : la retouche n’est pas disponible ici. Utilisez un outil tiers comme ezgif.com.",
    toolDiff: "Gomme de différences",
    wandRef: "Modèle :",
    diffLeft: "{n} px diffèrent de {ref}",
    threshold: "Seuil d'activation (dB)",
    release_delay: "Délai de relâchement (ms)",
    talking_speed: "Vitesse de la bouche (s/image)",
    blink_duration: "Durée du clignement (ms)",
    blink_interval_min: "Intervalle mini (ms)",
    blink_interval_max: "Intervalle maxi (ms)",
    action_duration: "Durée de l'action (ms)",
    action_interval_min: "Attente mini (ms)",
    action_interval_max: "Attente maxi (ms)",
    motion_type: "Effet",
    motion_speed: "Vitesse (%)",
    motion_strength: "Force",
    reference_height: "Hauteur de référence (px)",
    mirror: "Miroir horizontal"
  },
  ja: {
    title: "Flood Tuber パッケージビルダー",
    subtitle: "画像（PNG / GIF / APNG / WebP）をスロットにドラッグ＆ドロップし、位置合わせを確認して settings.ini を生成し、ZIPパッケージをダウンロードします。",
    avatarName: "アバター名（フォルダ）:",
    authorName: "作者:",
    slotsTitle: "スプライトスロット",
    required: "必須",
    clickOrDrop: "クリックまたはドロップ",
    previewTitle: "プレビュー / 重ね合わせ（レイヤー）",
    stackEmpty: "スタックを見るには idle を追加してください。",
    globalOpacity: "全体の不透明度:",
    diffMode: "差分モード",
    diffNormal: "通常モード",
    toggleAll: "すべて表示 / 非表示",
    settingsTitle: "settings.ini",
    generateZip: "ZIPパッケージを生成してダウンロード",
    credits: "表情スロットに対応するキャラクター作成ツール：",
    idleRequired: "idle は必須です！",
    simulate: "パターンをシミュレート",
    simulateStop: "シミュレーションを停止",
    simIdle: "待機",
    simTalking: "会話中",
    simAction: "アクション",
    simBlink: "まばたき",
    wandBtn: "マジックワンド：背景を削除",
    removeBtn: "このスプライトを削除",
    removeDone: "スプライトを削除しました。",
    wandTitle: "マジックワンド",
    wandHint: "背景をクリックして透明にします。必要に応じて許容値を調整してください。",
    wandTolerance: "許容値:",
    wandGlobal: "この色のすべての領域",
    wandInfo: "{n} px を削除",
    wandApply: "適用",
    wandCancel: "キャンセル",
    wandRestore: "元に戻す",
    wandDone: "背景を削除しました！",
    wandRestored: "元の画像を復元しました。",
    toolWand: "魔法の杖",
    toolEraser: "消しゴム",
    toolMagic: "マジック消しゴム",
    wandSize: "サイズ:",
    wandGrow: "背景を拡大:",
    wandUndo: "取り消し",
    zoomFit: "全体表示",
    bgLabel: "背景:",
    bgImage: "画像",
    bgReset: "リセット",
    wandRedo: "やり直し",
    wandKeys: "クリックで追加。再クリックか右クリックで解除。Shift+クリックで重ねる。Deleteで最後を解除。ワンドで全解除。",
    wandZones: "{n} 箇所を選択中",
    tutorials: "チュートリアル",
    close: "閉じる",
    tutoBody: `
<h3>このビルダーの用途</h3>
<p>Flood Tuber Package Builder は、OBS 用 Flood Tuber プラグインのアバターパッケージを作成します。表情画像を正しいファイル名で配置し、<code>settings.ini</code> を生成して、すぐ使える ZIP を作成します。すべてブラウザ内で処理され、画像がサーバーに送信されることはありません。</p>
<h3>キャラクタージェネレーター</h3>
<p>charat.me と picrew.me はオンラインのアバター作成ツールです。顔・目・口・服などのパーツからキャラクターを組み立てられます。ビルダーの各スロットに合う表情（口を開けた顔、目を閉じた顔、ポーズなど）を用意するのに役立ちます。</p>
<p class="tuto-links"><a href="https://charat.me/" target="_blank" rel="noreferrer">charat.me</a><a href="https://picrew.me/" target="_blank" rel="noreferrer">picrew.me</a></p>
<h3>手順</h3>
<ol>
<li>ジェネレーターで画像を作るか、自分の絵を使います。</li>
<li>各表情を対応するスロットにドロップします。<code>idle</code> は必須です。<code>talk_a/b/c</code> は話している間の口の画像で、<code>_blink</code> の版は話している間のまばたきに使われます。</li>
<li>プレビューとレイヤー（差分モード）で位置合わせを確認します。</li>
<li>背景が邪魔なら、マジックワンド・消しゴム・マジック消しゴムを使います。</li>
<li>「パターンをシミュレート」で動きを確認します。</li>
<li><code>settings.ini</code> の値を調整し、ZIP をダウンロードします。</li>
<li>ZIP を展開し、アバターのフォルダを Flood Tuber プラグインが探す場所に置きます（プラグインの README を参照）。</li>
</ol>`,
    generating: "ZIPを生成中...",
    success: "ZIPをダウンロードしました！",
    extraTalk: "追加の会話画像（D、E、F）",
    talkGap: "{last} の前の {missing} がありません。会話中、欠けているステップでは直前の画像が表示されます。",
    animTotalOver: "{file}：{w}×{h} px のフレームが {frames} 枚で、ビデオメモリを約 {size} 使用します。Flood Tuber は 1 GB を超える分のアニメーションを切り捨てます。",
    animTotalNear: "{file}：{w}×{h} px のフレームが {frames} 枚で、ビデオメモリを約 {size} 使用します。Flood Tuber がアニメーションを切り捨てる 1 GB の上限に近い値です。",
    apngFrameOver: "{file}：デコード後の 1 フレームが {size} になります。Flood Tuber は 1 フレームが 256 MB を超える APNG を読み込みません。",
    apngFrameNear: "{file}：デコード後の 1 フレームが {size} になります。Flood Tuber が APNG を読み込まなくなる 256 MB の上限に近い値です。",
    nameInvalid: "アバター名を入力してください。\\ / : * ? \" < > | の文字と、先頭・末尾の空白およびピリオドは削除されます。",
    intervalError: "{section}：最小値が最大値を超えないようにしてください。",
    notImage: "{file}：このファイルは画像として読み込めません。",
    convertedPng: "{file}：PNG に変換しました。",
    mouth_mode: "口のモード",
    mouth_range: "音量の範囲 (dB)",
    targetVersion: "Flood Tuber のバージョン:",
    v13Still: "{files}：Flood Tuber 1.3.0 は PNG ファイルしか読み込みません。PNG として書き出します。アニメーションは最初のフレームだけが残ります。",
    v13Skipped: "{files}：書き出されません。Flood Tuber 1.3.0 が使う会話画像は A〜C のみです。",
    animNoEdit: "GIF またはアニメーション画像：ここでは編集できません。ezgif.com などの外部ツールを使ってください。",
    toolDiff: "差分消しゴム",
    wandRef: "モデル:",
    diffLeft: "{ref} と異なるピクセル：{n} px",
    threshold: "作動しきい値 (dB)",
    release_delay: "解放までの遅延 (ms)",
    talking_speed: "口の動作速度 (秒/フレーム)",
    blink_duration: "まばたきの長さ (ms)",
    blink_interval_min: "最小間隔 (ms)",
    blink_interval_max: "最大間隔 (ms)",
    action_duration: "アクションの長さ (ms)",
    action_interval_min: "最小待機 (ms)",
    action_interval_max: "最大待機 (ms)",
    motion_type: "エフェクト",
    motion_speed: "速度 (%)",
    motion_strength: "強さ",
    reference_height: "基準の高さ (px)",
    mirror: "左右反転"
  },
  zh: {
    title: "Flood Tuber 包构建器",
    subtitle: "将图像（PNG / GIF / APNG / WebP）拖放到插槽中，检查对齐，生成 settings.ini 并下载 ZIP 包。",
    avatarName: "头像名称（文件夹）：",
    authorName: "作者：",
    slotsTitle: "精灵插槽",
    required: "必需",
    clickOrDrop: "点击或拖放",
    previewTitle: "预览 / 叠加（图层）",
    stackEmpty: "添加 idle 以查看叠加。",
    globalOpacity: "全局不透明度：",
    diffMode: "差异模式",
    diffNormal: "普通模式",
    toggleAll: "全部显示 / 隐藏",
    settingsTitle: "settings.ini",
    generateZip: "生成并下载 ZIP 包",
    credits: "与表情插槽匹配的角色制作工具：",
    idleRequired: "idle 是必需的！",
    simulate: "模拟动作模式",
    simulateStop: "停止模拟",
    simIdle: "待机",
    simTalking: "说话",
    simAction: "动作",
    simBlink: "眨眼",
    wandBtn: "魔棒：去除背景",
    removeBtn: "移除此精灵",
    removeDone: "精灵已移除。",
    wandTitle: "魔棒",
    wandHint: "点击背景使其透明。如有需要请调整容差。",
    wandTolerance: "容差：",
    wandGlobal: "此颜色的所有区域",
    wandInfo: "已删除 {n} 像素",
    wandApply: "应用",
    wandCancel: "取消",
    wandRestore: "恢复原图",
    wandDone: "背景已去除！",
    wandRestored: "已恢复原图。",
    toolWand: "魔棒",
    toolEraser: "橡皮擦",
    toolMagic: "魔法橡皮擦",
    wandSize: "大小：",
    wandGrow: "扩大背景：",
    wandUndo: "撤销",
    zoomFit: "适应窗口",
    bgLabel: "背景：",
    bgImage: "图片",
    bgReset: "重置",
    wandRedo: "重做",
    wandKeys: "点击添加。再点或右键移除。Shift+点击叠加。Delete 移除最后一区。再点魔棒清空。",
    wandZones: "已选择 {n} 个区域",
    tutorials: "教程",
    close: "关闭",
    tutoBody: `
<h3>这个构建器有什么用？</h3>
<p>Flood Tuber Package Builder 用于为 OBS 的 Flood Tuber 插件准备头像包。它会把表情图片放到正确的文件名下，生成 <code>settings.ini</code>，并创建可直接使用的 ZIP。所有处理都在浏览器中完成，图片不会上传到服务器。</p>
<h3>角色生成器</h3>
<p>charat.me 和 picrew.me 是在线头像生成器：用脸、眼睛、嘴、服装等部件组合角色。它们可以帮你获得与构建器插槽对应的表情（张嘴、闭眼、姿势等）。</p>
<p class="tuto-links"><a href="https://charat.me/" target="_blank" rel="noreferrer">charat.me</a><a href="https://picrew.me/" target="_blank" rel="noreferrer">picrew.me</a></p>
<h3>步骤</h3>
<ol>
<li>用生成器制作图片，或使用自己的绘图。</li>
<li>把每个表情拖到对应插槽。<code>idle</code> 为必需；<code>talk_a/b/c</code> 是说话时的嘴部图片，<code>_blink</code> 版本负责说话时的眨眼。</li>
<li>用预览和图层（差异模式）检查对齐。</li>
<li>如果背景有干扰，使用魔棒、橡皮擦或魔法橡皮擦。</li>
<li>用“模拟动作模式”测试效果。</li>
<li>调整 <code>settings.ini</code> 的值，然后下载 ZIP。</li>
<li>解压 ZIP，把头像文件夹放到 Flood Tuber 插件查找的位置（参见插件的 README）。</li>
</ol>`,
    generating: "正在生成 ZIP...",
    success: "ZIP 已下载！",
    extraTalk: "额外的说话图片（D、E、F）",
    talkGap: "{last} 之前缺少 {missing}：说话时，缺少的步骤会显示上一张图片。",
    animTotalOver: "{file}：{frames} 帧 {w}×{h} px 的图像约占用 {size} 显存。超过 1 GB 的部分 Flood Tuber 会截断动画。",
    animTotalNear: "{file}：{frames} 帧 {w}×{h} px 的图像约占用 {size} 显存，接近 Flood Tuber 截断动画的 1 GB 上限。",
    apngFrameOver: "{file}：解码后的单帧占用 {size}。单帧超过 256 MB 的 APNG 会被 Flood Tuber 拒绝。",
    apngFrameNear: "{file}：解码后的单帧占用 {size}，接近 Flood Tuber 拒绝 APNG 的 256 MB 上限。",
    nameInvalid: "请输入头像名称。字符 \\ / : * ? \" < > | 以及开头和结尾的空格和句点会被删除。",
    intervalError: "{section}：最小值不能大于最大值。",
    notImage: "{file}：此文件不是可读取的图像。",
    convertedPng: "{file}：已转换为 PNG。",
    mouth_mode: "嘴部模式",
    mouth_range: "音量范围 (dB)",
    targetVersion: "Flood Tuber 版本：",
    v13Still: "{files}：Flood Tuber 1.3.0 只读取 PNG 文件。将导出为 PNG；动画只保留第一帧。",
    v13Skipped: "{files}：不会导出。Flood Tuber 1.3.0 只使用说话图片 A 到 C。",
    animNoEdit: "GIF 或动画图像：此处无法编辑。请使用 ezgif.com 等第三方工具。",
    toolDiff: "差异橡皮擦",
    wandRef: "参照图：",
    diffLeft: "与 {ref} 不同的像素：{n} px",
    threshold: "激活阈值 (dB)",
    release_delay: "释放延迟 (ms)",
    talking_speed: "嘴部速度 (秒/帧)",
    blink_duration: "眨眼时长 (ms)",
    blink_interval_min: "最小间隔 (ms)",
    blink_interval_max: "最大间隔 (ms)",
    action_duration: "动作时长 (ms)",
    action_interval_min: "最小等待 (ms)",
    action_interval_max: "最大等待 (ms)",
    motion_type: "效果",
    motion_speed: "速度 (%)",
    motion_strength: "强度",
    reference_height: "基准高度 (px)",
    mirror: "水平镜像"
  },
  tr: {
    title: "Flood Tuber Paket Oluşturucu",
    subtitle: "Görsellerinizi (PNG / GIF / APNG / WebP) yuvalara sürükleyip bırakın, hizalamayı kontrol edin, settings.ini oluşturun ve ZIP paketini indirin.",
    avatarName: "Avatar adı (klasör):",
    authorName: "Yazar:",
    slotsTitle: "Sprite yuvaları",
    required: "zorunlu",
    clickOrDrop: "Tıklayın veya sürükleyin",
    previewTitle: "Önizleme / Üst üste bindirme (katmanlar)",
    stackEmpty: "Yığını görmek için idle ekleyin.",
    globalOpacity: "Genel opaklık:",
    diffMode: "Fark Modu",
    diffNormal: "Normal mod",
    toggleAll: "Tümünü göster / gizle",
    settingsTitle: "settings.ini",
    generateZip: "ZIP paketini oluştur ve indir",
    credits: "Expression yuvalarıyla uyumlu karakter oluşturucular:",
    idleRequired: "idle zorunludur!",
    simulate: "Paterni simüle et",
    simulateStop: "Simülasyonu durdur",
    simIdle: "BEKLEME",
    simTalking: "KONUŞUYOR",
    simAction: "AKSİYON",
    simBlink: "göz kırpma",
    wandBtn: "Sihirli değnek: arka planı sil",
    removeBtn: "Bu sprite'ı kaldır",
    removeDone: "Sprite kaldırıldı.",
    wandTitle: "Sihirli değnek",
    wandHint: "Arka planı şeffaf yapmak için üzerine tıklayın. Gerekirse toleransı ayarlayın.",
    wandTolerance: "Tolerans:",
    wandGlobal: "Bu renkteki tüm alanlar",
    wandInfo: "{n} px silindi",
    wandApply: "Uygula",
    wandCancel: "İptal",
    wandRestore: "Orijinali geri yükle",
    wandDone: "Arka plan silindi!",
    wandRestored: "Orijinal geri yüklendi.",
    toolWand: "Sihirli değnek",
    toolEraser: "Silgi",
    toolMagic: "Sihirli silgi",
    wandSize: "Boyut:",
    wandGrow: "Arka planı genişlet:",
    wandUndo: "Geri al",
    zoomFit: "Sığdır",
    bgLabel: "Arka plan:",
    bgImage: "Resim",
    bgReset: "Sıfırla",
    wandRedo: "Yinele",
    wandKeys: "Tık ekler. İkinci tık veya sağ tık kaldırır. Shift+tık üstüne ekler. Delete sonuncuyu kaldırır. Değnek tümünü siler.",
    wandZones: "{n} bölge seçildi",
    tutorials: "Eğitimler",
    close: "Kapat",
    tutoBody: `
<h3>Bu oluşturucu ne işe yarar?</h3>
<p>Flood Tuber Package Builder, Flood Tuber OBS eklentisi için bir avatar paketi hazırlar. İfade görsellerinizi doğru dosya adlarıyla düzenler, <code>settings.ini</code> dosyasını üretir ve kullanıma hazır bir ZIP oluşturur. Her şey tarayıcınızda çalışır: hiçbir görsel bir sunucuya gönderilmez.</p>
<h3>Karakter oluşturucular</h3>
<p>charat.me ve picrew.me çevrim içi avatar oluşturuculardır: yüz, göz, ağız, kıyafet gibi parçalardan bir karakter oluşturursunuz. Oluşturucudaki ifade yuvalarına uygun görseller elde etmenize yardımcı olabilirler (açık ağız, kapalı gözler, poz…).</p>
<p class="tuto-links"><a href="https://charat.me/" target="_blank" rel="noreferrer">charat.me</a><a href="https://picrew.me/" target="_blank" rel="noreferrer">picrew.me</a></p>
<h3>Adımlar</h3>
<ol>
<li>Görsellerinizi bir oluşturucuyla hazırlayın veya kendi çizimlerinizi kullanın.</li>
<li>Her ifadeyi kendi yuvasına bırakın. <code>idle</code> zorunludur; <code>talk_a/b/c</code> konuşurken ağız görselleridir, <code>_blink</code> varyantları konuşurken göz kırpmayı yönetir.</li>
<li>Önizleme ve katmanlarla (Fark Modu) hizalamayı kontrol edin.</li>
<li>Arka plan sorun çıkarıyorsa sihirli değneği, silgiyi veya sihirli silgiyi kullanın.</li>
<li>"Paterni simüle et" ile davranışı test edin.</li>
<li><code>settings.ini</code> değerlerini ayarlayın, ardından ZIP'i indirin.</li>
<li>ZIP'i açın ve avatar klasörünü Flood Tuber eklentisinin aradığı yere koyun (eklentinin README dosyasına bakın).</li>
</ol>`,
    generating: "ZIP oluşturuluyor...",
    success: "ZIP indirildi!",
    extraTalk: "Ek konuşma görselleri (D, E, F)",
    talkGap: "{last} öncesinde {missing} eksik: konuşma sırasında eksik her adım bir önceki görseli gösterir.",
    animTotalOver: "{file}: {w}×{h} px boyutunda {frames} kare yaklaşık {size} video belleği kullanır. Flood Tuber animasyonu 1 GB'ın üzerinde keser.",
    animTotalNear: "{file}: {w}×{h} px boyutunda {frames} kare yaklaşık {size} video belleği kullanır; Flood Tuber'ın animasyonu kestiği 1 GB sınırına yakın.",
    apngFrameOver: "{file}: çözülmüş tek bir kare {size} yer kaplar. Flood Tuber, bir karesi 256 MB'ı aşan APNG'yi reddeder.",
    apngFrameNear: "{file}: çözülmüş tek bir kare {size} yer kaplar; Flood Tuber'ın APNG'yi reddettiği 256 MB sınırına yakın.",
    nameInvalid: "Bir avatar adı girin. \\ / : * ? \" < > | karakterleri ile baştaki ve sondaki boşluklar ve noktalar kaldırılır.",
    intervalError: "{section}: en küçük değer en büyük değeri aşmamalıdır.",
    notImage: "{file}: bu dosya okunabilir bir görsel değil.",
    convertedPng: "{file}: PNG'ye dönüştürüldü.",
    mouth_mode: "Ağız Modu",
    mouth_range: "Ses Aralığı (dB)",
    targetVersion: "Flood Tuber sürümü:",
    v13Still: "{files}: Flood Tuber 1.3.0 yalnızca PNG dosyalarını okur. PNG olarak dışa aktarılır; animasyonun yalnızca ilk karesi kalır.",
    v13Skipped: "{files}: dışa aktarılmadı. Flood Tuber 1.3.0 yalnızca A–C konuşma görsellerini kullanır.",
    animNoEdit: "GIF veya animasyonlu görsel: düzenleme burada kullanılamaz. ezgif.com gibi üçüncü taraf bir araç kullanın.",
    toolDiff: "Fark silgisi",
    wandRef: "Model:",
    diffLeft: "{n} px {ref} görselinden farklı",
    threshold: "Aktivasyon Eşiği (dB)",
    release_delay: "Bırakma Gecikmesi (ms)",
    talking_speed: "Ağız Hızı (sn/kare)",
    blink_duration: "Kırpma Süresi (ms)",
    blink_interval_min: "Min Aralık (ms)",
    blink_interval_max: "Maks Aralık (ms)",
    action_duration: "Aksiyon Süresi (ms)",
    action_interval_min: "Min Bekleme (ms)",
    action_interval_max: "Maks Bekleme (ms)",
    motion_type: "Efekt",
    motion_speed: "Hız (%)",
    motion_strength: "Güç",
    reference_height: "Referans Yüksekliği (px)",
    mirror: "Yatay Olarak Aynala"
  }
};

// Language currently shown in the UI: 'en' | 'fr' | 'tr' | 'ja' | 'zh'.
// Changed only through setLanguage(). English is the default.
let currentLang = 'en';
let appReady = false; // true once every section below has run (see the end of the file)
let diffMode = false;
let simulating = false;

/**
 * Switches the whole UI to `lang`.
 * Updates every [data-i18n] element, the settings labels, the diff/simulate
 * button labels, the tutorial content and the language buttons.
 * @param {'en'|'fr'|'tr'|'ja'|'zh'} lang
 */
function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  // Update settings labels
  const labelMap = {
    threshold: 'threshold',
    release_delay: 'release_delay',
    talking_speed: 'talking_speed',
    mouth_mode: 'mouth_mode',
    mouth_range: 'mouth_range',
    blink_duration: 'blink_duration',
    blink_interval_min: 'blink_interval_min',
    blink_interval_max: 'blink_interval_max',
    action_duration: 'action_duration',
    action_interval_min: 'action_interval_min',
    action_interval_max: 'action_interval_max',
    motion_type: 'motion_type',
    motion_speed: 'motion_speed',
    motion_strength: 'motion_strength',
    reference_height: 'reference_height',
    mirror: 'mirror'
  };
  Object.keys(labelMap).forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      const label = input.closest('label');
      if (label && translations[lang][labelMap[id]]) {
        const textNode = Array.from(label.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (textNode) textNode.textContent = translations[lang][labelMap[id]] + ' ';
      }
    }
  });
  updateDiffLabel();
  updateSimLabel();
  renderTuto();
  if (appReady) refreshWarnings();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
}

// The diff button's label depends on the current state and language
function updateDiffLabel() {
  const btn = document.getElementById('diffMode');
  const label = btn.querySelector('span');
  const t = translations[currentLang];
  label.textContent = diffMode ? t.diffNormal : t.diffMode;
  btn.setAttribute('aria-pressed', String(diffMode));
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

// Apply initial language
setLanguage(currentLang);

// ---------- Application state ----------
// Keyed by slot base name, e.g. "idle". See the data model at the top of the file.
const slots = {};
const files = {}; // name -> File written into the ZIP
const formats = {}; // name -> { kind, ext, animated, frames, w, h }
const images = {}; // name -> { img, url }

// Talk images in cycle order. A, B, C are the base; D, E, F are optional extras.
const TALK = ['talk_a', 'talk_b', 'talk_c', 'talk_d', 'talk_e', 'talk_f'];
// Every slot, in preview stacking order (idle at the bottom) and ZIP order.
// Must match the data-name attributes in index.html.
const SLOT_ORDER = ['idle', 'blink', 'action', ...TALK, ...TALK.map(n => n + '_blink')];
// Slots hidden behind the "extra talk images" option
const EXTRA_SLOTS = SLOT_ORDER.filter(n => /^talk_[def]/.test(n));

// Replaces {key} placeholders in a translated string
function fmt(text, values) {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}

// ---------- Target plugin version ----------
// Flood Tuber 1.3.0 only reads .png files, uses talk images A to C and ignores the
// settings added in 1.4.0. The choice changes file names, visible slots, visible settings,
// the simulation and the content of the ZIP.
const targetSelect = document.getElementById('targetVersion');
const is13 = () => targetSelect.value === '1.3.0';
// Talk images and slots that exist in the chosen version
const activeTalk = () => (is13() ? TALK.slice(0, 3) : TALK);
const activeSlots = () => (is13() ? SLOT_ORDER.filter(n => !EXTRA_SLOTS.includes(n)) : SLOT_ORDER);

// File name written into the ZIP: imposed base name + extension of the real format
// (always .png for Flood Tuber 1.3.0)
function outName(name) {
  if (is13()) return `${name}.png`;
  return `${name}.${formats[name] ? formats[name].ext : 'png'}`;
}

// The editing tools work on one still image and save a PNG: they are not offered for a
// GIF or an animated file, which would lose its animation.
function canEdit(name) {
  const f = formats[name];
  return !!f && !f.animated && f.kind !== 'gif';
}

// ---------- Image formats ----------
// Flood Tuber 1.4.0 looks up each slot as .png, then .apng, .gif, .webp, and keeps the
// extension of a GIF, WebP or APNG (a GIF animates only when the name ends in .gif).
// The extension written here comes from the file signature, never from the dropped name.

/**
 * Identifies a PNG / APNG / GIF / WebP file from its first bytes and counts its frames.
 * @param {Uint8Array} b  whole file
 * @returns {{kind: string, ext: string, animated: boolean, frames: number, w: number, h: number}|null}
 *          null when the file is none of these formats (JPEG, BMP…)
 */
function sniffImage(b) {
  const be32 = i => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const le16 = i => b[i] | (b[i + 1] << 8);
  const le24 = i => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  const le32 = i => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
  const tag = i => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

  // PNG / APNG: an acTL chunk before the first IDAT marks an animation
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 24 && PNG_SIG.every((v, i) => b[i] === v)) {
    let w = 0, h = 0, frames = 1, animated = false;
    let pos = 8;
    while (pos + 12 <= b.length) {
      const len = be32(pos);
      const type = tag(pos + 4);
      if (type === 'IHDR') { w = be32(pos + 8); h = be32(pos + 12); }
      else if (type === 'acTL') { frames = Math.max(1, be32(pos + 8)); animated = frames > 1; }
      else if (type === 'IDAT' || type === 'IEND') break;
      pos += 12 + len;
    }
    // Same rule as GIF and WebP: the extension is the format Flood Tuber 1.4.0 looks up.
    // An animated PNG is .apng even when the dropped file was named .png.
    const ext = animated ? 'apng' : 'png';
    return { kind: 'png', ext, animated, frames, w, h };
  }

  // GIF: count the image descriptors
  if (b.length >= 13 && (tag(0) + String.fromCharCode(b[4], b[5])).match(/^GIF8[79]a$/)) {
    const w = le16(6), h = le16(8);
    let pos = 13 + ((b[10] & 0x80) ? 3 * (1 << ((b[10] & 7) + 1)) : 0);
    let frames = 0;
    const skipBlocks = () => {
      while (pos < b.length) {
        const size = b[pos++];
        if (size === 0) break;
        pos += size;
      }
    };
    while (pos < b.length) {
      const block = b[pos];
      if (block === 0x21) { pos += 2; skipBlocks(); }
      else if (block === 0x2c) {
        frames++;
        const packed = b[pos + 9];
        pos += 10 + ((packed & 0x80) ? 3 * (1 << ((packed & 7) + 1)) : 0);
        pos++; // LZW minimum code size
        skipBlocks();
      } else break; // 0x3B trailer, or damaged data
    }
    frames = Math.max(1, frames);
    return { kind: 'gif', ext: 'gif', animated: frames > 1, frames, w, h };
  }

  // WebP: the VP8X header carries the animation flag, each ANMF chunk is one frame
  if (b.length >= 16 && tag(0) === 'RIFF' && tag(8) === 'WEBP') {
    let w = 0, h = 0, frames = 0, animated = false;
    let pos = 12;
    while (pos + 8 <= b.length) {
      const type = tag(pos);
      const size = le32(pos + 4);
      if (type === 'VP8X') {
        animated = (b[pos + 8] & 0x02) !== 0;
        w = le24(pos + 12) + 1;
        h = le24(pos + 15) + 1;
      } else if (type === 'ANMF') frames++;
      pos += 8 + size + (size & 1);
    }
    frames = Math.max(1, frames);
    return { kind: 'webp', ext: 'webp', animated: animated && frames > 1, frames, w, h };
  }

  return null;
}

/**
 * Re-encodes any image the browser can decode (JPEG, BMP…) as a real PNG.
 * @param {File} file
 * @returns {Promise<Blob|null>} null when the file is not a readable image
 */
function reencodeAsPng(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob(blob => resolve(blob), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

const slotElements = document.querySelectorAll('.slot');
const stack = document.getElementById('stack');
const stackEmpty = document.getElementById('stackEmpty');
const layerControls = document.getElementById('layerControls');
const statusEl = document.getElementById('status');

// Shows a status message; tone = '' | 'busy' | 'ok' | 'bad' (colours defined in style.css)
function setStatus(text, tone = '') {
  statusEl.textContent = text;
  statusEl.className = tone ? `is-${tone}` : '';
}

// Setup drop zones
slotElements.forEach(slot => {
  const name = slot.dataset.name;
  const dropzone = slot.querySelector('.dropzone');
  const input = slot.querySelector('input[type="file"]');

  slots[name] = { dropzone, input, slot, wandBtn: null, removeBtn: null };

  // Magic wand button in the slot header (visible once an image is loaded)
  const wandBtn = document.createElement('button');
  wandBtn.type = 'button';
  wandBtn.className = 'wand';
  wandBtn.hidden = true;
  wandBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg><span class="sr" data-i18n="wandBtn">Baguette magique</span>`;
  wandBtn.addEventListener('click', e => {
    e.stopPropagation(); // don't open the slot's file picker
    openWand(name);
  });
  slot.querySelector('.slot-head').appendChild(wandBtn);
  slots[name].wandBtn = wandBtn;

  // Red cross: empties the slot (the sprite leaves the preview and the ZIP)
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'wand remove';
  removeBtn.hidden = true;
  removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg><span class="sr" data-i18n="removeBtn">Remove this sprite</span>`;
  removeBtn.addEventListener('click', e => {
    e.stopPropagation(); // don't open the slot's file picker
    clearSlot(name);
  });
  slot.querySelector('.slot-head').appendChild(removeBtn);
  slots[name].removeBtn = removeBtn;

  // Shown instead of the wand button when the file cannot be edited here (see canEdit)
  const note = document.createElement('p');
  note.className = 'slot-note';
  note.hidden = true;
  note.dataset.i18n = 'animNoEdit';
  note.textContent = translations[currentLang].animNoEdit;
  slot.appendChild(note);
  slots[name].note = note;

  // Click anywhere on the slot opens the file dialog
  slot.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT') {
      input.click();
    }
  });

  // Keyboard: Enter / Space open the file dialog
  slot.addEventListener('keydown', (e) => {
    if (e.target === slot && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      input.click();
    }
  });

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    // No MIME filter: .apng often has an empty type. loadFile() checks the content.
    const file = e.dataTransfer.files[0];
    if (file) loadFile(name, file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) loadFile(name, input.files[0]);
  });
});

/**
 * The only place that fills `files`, `formats` and `images` for a slot.
 * Called by drag-and-drop, the file picker, and the magic wand (to store the edited PNG).
 * Reads the real format from the file signature. PNG, APNG, GIF and WebP are kept
 * byte for byte; anything else (JPEG, BMP…) is re-encoded as a PNG.
 * @param {string} name  slot base name, e.g. "talk_a"
 * @param {File}   file  the image to store
 */
async function loadFile(name, file) {
  const shown = file.name || name;
  const fail = () => setStatus(fmt(translations[currentLang].notImage, { file: shown }), 'bad');

  let info;
  try {
    info = sniffImage(new Uint8Array(await file.arrayBuffer()));
  } catch (err) {
    fail();
    return;
  }

  let converted = false;
  if (!info) {
    const blob = await reencodeAsPng(file);
    if (!blob) {
      fail();
      return;
    }
    file = new File([blob], `${name}.png`, { type: 'image/png' });
    info = { kind: 'png', ext: 'png', animated: false, frames: 1, w: 0, h: 0 };
    converted = true;
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    if (images[name]) URL.revokeObjectURL(images[name].url);
    files[name] = file;
    formats[name] = { ...info, w: info.w || img.naturalWidth, h: info.h || img.naturalHeight };
    images[name] = { img, url };
    dirty = true;
    const { dropzone, slot } = slots[name];
    dropzone.innerHTML = `<img src="${url}" alt="${outName(name)}">`;
    slot.classList.add('filled');
    slot.querySelector('.slot-name').textContent = outName(name);
    slots[name].wandBtn.hidden = !canEdit(name);
    slots[name].note.hidden = canEdit(name);
    slots[name].removeBtn.hidden = false;
    updateExtraSlots();
    updatePreview();
    refreshWarnings();
    if (converted) setStatus(fmt(translations[currentLang].convertedPng, { file: shown }), 'ok');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    fail();
  };
  img.src = url;
}

/**
 * Empties a slot: drops its sprite from `files`, `formats`, `images` and `originals`,
 * resets the thumbnail and refreshes the preview. Called by the red cross in the slot header.
 * @param {string} name  slot base name, e.g. "talk_a"
 */
function clearSlot(name) {
  if (images[name]) URL.revokeObjectURL(images[name].url);
  delete images[name];
  delete files[name];
  delete formats[name];
  delete originals[name];
  const { dropzone, slot, input, wandBtn, removeBtn, note } = slots[name];
  dropzone.innerHTML = `<span class="hint" data-i18n="clickOrDrop">${translations[currentLang].clickOrDrop}</span>`;
  slot.classList.remove('filled');
  slot.querySelector('.slot-name').textContent = name;
  note.hidden = true;
  wandBtn.hidden = true;
  removeBtn.hidden = true;
  input.value = ''; // so picking the same file again still fires "change"
  dirty = true;
  updatePreview();
  refreshWarnings();
  setStatus(translations[currentLang].removeDone, 'ok');
}

// ---------- Extra talk images (D, E, F) ----------
// Hidden by default, like in the plugin. They stay visible while one of them holds an image.
const extraToggle = document.getElementById('extraTalk');

function updateExtraSlots() {
  if (EXTRA_SLOTS.some(n => files[n])) extraToggle.checked = true;
  extraToggle.closest('label').hidden = is13(); // D, E, F do not exist in 1.3.0
  EXTRA_SLOTS.forEach(n => {
    slots[n].slot.hidden = is13() || !extraToggle.checked;
  });
}
extraToggle.addEventListener('change', updateExtraSlots);
updateExtraSlots();

/**
 * Applies the target plugin version to the page: hides what the version does not have,
 * then refreshes the file names, the preview and the warnings. Nothing is deleted:
 * switching back to 1.4.0 brings everything back.
 */
function applyTarget() {
  document.querySelectorAll('[data-since="1.4.0"]').forEach(el => {
    el.hidden = is13();
  });
  updateExtraSlots();
  SLOT_ORDER.forEach(n => {
    if (files[n]) slots[n].slot.querySelector('.slot-name').textContent = outName(n);
  });
  updatePreview();
  refreshWarnings();
}
targetSelect.addEventListener('change', applyTarget);

// ---------- Warnings ----------
// Limits of the plugin's animation decoder. Every frame becomes a full-size RGBA texture.
const APNG_FRAME_LIMIT = 256 * 1024 * 1024; // one decoded frame (width x height x 4): APNG refused above
const ANIM_TOTAL_LIMIT = 1024 * 1024 * 1024; // all frames: animation cut above
const NEAR_LIMIT = 0.8; // warn from 80 % of a limit

function formatBytes(n) {
  const fr = currentLang === 'fr';
  if (n >= 1024 * 1024 * 1024) {
    const gb = (n / (1024 * 1024 * 1024)).toFixed(2);
    return fr ? gb.replace('.', ',') + ' Go' : gb + ' GB';
  }
  return Math.round(n / (1024 * 1024)) + (fr ? ' Mo' : ' MB');
}

/**
 * Rebuilds the warning list under the slots: gaps in the talk cycle and animated files
 * that exceed, or come close to, the plugin's memory limits. Warnings never block the export.
 */
function refreshWarnings() {
  const t = translations[currentLang];
  const msgs = [];

  // Talk cycle: runs from A to the last image defined; a missing step shows the previous image
  const talk = activeTalk();
  let last = -1;
  talk.forEach((n, i) => { if (files[n]) last = i; });
  const missing = talk.slice(0, Math.max(0, last)).filter(n => !files[n]);
  if (missing.length) msgs.push(fmt(t.talkGap, { missing: missing.join(', '), last: talk[last] }));

  // Flood Tuber 1.3.0: what the export changes or leaves out
  if (is13()) {
    const still = activeSlots().filter(n => formats[n] && formats[n].kind !== 'png');
    if (still.length) msgs.push(fmt(t.v13Still, { files: still.map(n => `${n}.${formats[n].ext}`).join(', ') }));
    const skipped = EXTRA_SLOTS.filter(n => files[n]);
    if (skipped.length) msgs.push(fmt(t.v13Skipped, { files: skipped.join(', ') }));
  }

  activeSlots().forEach(name => {
    const f = formats[name];
    if (!f || !f.animated) return;
    if (is13() && f.kind !== 'png') return; // exported as a still PNG
    const frame = f.w * f.h * 4;
    const total = frame * f.frames;
    const file = outName(name);
    if (f.kind === 'png' && frame > APNG_FRAME_LIMIT * NEAR_LIMIT) {
      msgs.push(fmt(frame > APNG_FRAME_LIMIT ? t.apngFrameOver : t.apngFrameNear, { file, size: formatBytes(frame) }));
    }
    if (total > ANIM_TOTAL_LIMIT * NEAR_LIMIT) {
      msgs.push(fmt(total > ANIM_TOTAL_LIMIT ? t.animTotalOver : t.animTotalNear,
        { file, frames: f.frames, w: f.w, h: f.h, size: formatBytes(total) }));
    }
  });

  const box = document.getElementById('warnings');
  box.innerHTML = '';
  msgs.forEach(m => {
    const li = document.createElement('li');
    li.textContent = m;
    box.appendChild(li);
  });
  box.hidden = msgs.length === 0;
}

// ---------- Preview zoom ----------
// preview.zoom = 0 fits the whole stack in the viewer; any other value is the on-screen
// scale (1 = real image size). preview.scale is the scale actually displayed.
const preview = { zoom: 0, scale: 1, nw: 0, nh: 0 };
const previewViewer = document.getElementById('previewViewer');
const previewZoomLabel = document.getElementById('previewZoomLabel');
const PREVIEW_PAD = 16; // must match the .viewer padding in style.css

// Sizes the stack from the base layer's natural size and the viewer's current size
function applyPreviewZoom() {
  if (!preview.nw) {
    stack.style.width = '';
    stack.style.height = '';
    preview.scale = 1;
    previewZoomLabel.textContent = '100 %';
    return;
  }
  const fit = Math.min(
    (previewViewer.clientWidth - 2 * PREVIEW_PAD) / preview.nw,
    (previewViewer.clientHeight - 2 * PREVIEW_PAD) / preview.nh
  );
  preview.scale = preview.zoom || Math.max(0.05, fit);
  stack.style.width = Math.round(preview.nw * preview.scale) + 'px';
  stack.style.height = Math.round(preview.nh * preview.scale) + 'px';
  previewZoomLabel.textContent = Math.round(preview.scale * 100) + ' %';
}

function zoomPreview(factor) {
  preview.zoom = Math.min(8, Math.max(0.05, preview.scale * factor));
  applyPreviewZoom();
}

function fitPreview() {
  preview.zoom = 0;
  applyPreviewZoom();
}

document.getElementById('previewZoomIn').addEventListener('click', () => zoomPreview(1.25));
document.getElementById('previewZoomOut').addEventListener('click', () => zoomPreview(1 / 1.25));
document.getElementById('previewZoomFit').addEventListener('click', fitPreview);
window.addEventListener('resize', applyPreviewZoom);

// Ctrl + wheel over the preview zooms it (the page itself does not zoom)
previewViewer.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoomPreview(e.deltaY < 0 ? 1.1 : 1 / 1.1);
}, { passive: false });

// Keys + / - / 0 zoom the preview, unless the editor is open or a field has focus
document.addEventListener('keydown', e => {
  if (wandDialog.open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomPreview(1.25); }
  else if (e.key === '-') { e.preventDefault(); zoomPreview(1 / 1.25); }
  else if (e.key === '0') { e.preventDefault(); fitPreview(); }
});

// ---------- Preview background (to check missing pixels) ----------
// Painted on the stack, so it sits exactly behind the sprite: any transparent pixel that
// should have been filled shows up against it. Colour and image can be combined.
const previewBgColor = document.getElementById('previewBgColor');
const previewBgFile = document.getElementById('previewBgFile');
let previewBgUrl = null;

previewBgColor.addEventListener('input', () => {
  stack.style.backgroundColor = previewBgColor.value;
});
document.getElementById('previewBgImage').addEventListener('click', () => previewBgFile.click());
previewBgFile.addEventListener('change', () => {
  const file = previewBgFile.files[0];
  if (!file) return;
  if (previewBgUrl) URL.revokeObjectURL(previewBgUrl);
  previewBgUrl = URL.createObjectURL(file);
  stack.style.backgroundImage = `url("${previewBgUrl}")`;
  stack.style.backgroundSize = 'cover';
  stack.style.backgroundPosition = 'center';
  previewBgFile.value = ''; // so the same file can be picked again
});
document.getElementById('previewBgReset').addEventListener('click', () => {
  stack.style.backgroundColor = '';
  stack.style.backgroundImage = '';
  stack.style.backgroundSize = '';
  stack.style.backgroundPosition = '';
  previewBgColor.value = '#ffffff';
  if (previewBgUrl) {
    URL.revokeObjectURL(previewBgUrl);
    previewBgUrl = null;
  }
});

/**
 * Rebuilds the preview stack and the per-layer checkboxes from `images`.
 * Layers are stacked in SLOT_ORDER (idle at the bottom), limited to the slots of the
 * target version. The first
 * loaded layer sets the size of the stack. Must be called after any change to `images`.
 */
function updatePreview() {
  stack.innerHTML = '';
  layerControls.innerHTML = '';

  let firstName = null;
  let z = 1;
  activeSlots().forEach(name => {
    if (!images[name]) return;
    const { url } = images[name];
    if (firstName === null) firstName = name;

    const layerImg = document.createElement('img');
    layerImg.src = url;
    layerImg.alt = outName(name);
    layerImg.style.zIndex = z++;
    layerImg.dataset.name = name;
    layerImg.style.opacity = document.getElementById('globalOpacity').value / 100;
    stack.appendChild(layerImg);

    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" checked data-name="${name}"> ${outName(name)}`;
    label.querySelector('input').addEventListener('change', e => {
      layerImg.style.display = e.target.checked ? 'block' : 'none';
      renderDiff();
    });
    layerControls.appendChild(label);
  });

  stackEmpty.hidden = stack.children.length > 0;

  // Size the stack from the first (base) layer, then fit or zoom it to the viewer
  if (firstName) {
    const { img } = images[firstName];
    preview.nw = img.naturalWidth;
    preview.nh = img.naturalHeight;
  } else {
    preview.nw = 0;
    preview.nh = 0;
  }
  applyPreviewZoom();
  renderDiff();
}

document.getElementById('globalOpacity').addEventListener('input', e => {
  document.querySelectorAll('#stack img').forEach(img => {
    img.style.opacity = e.target.value / 100;
  });
});

// ---------- Difference view ----------
// The reference is always the idle image, even when its checkbox is off. The other visible layers
// are composited in stacking order (as in the preview). Each pixel where that composite
// differs from idle is painted in a strong colour; the unchanged idle is shown faintly.
const DIFF_TOLERANCE = 40;          // largest channel difference (0-255) still counted as equal
const DIFF_COLOR = [255, 40, 140];  // colour of the differing pixels
const diffStat = document.getElementById('diffStat');

// Pixels of `img` drawn into a W x H box the way object-fit: contain does in the preview
function layerPixels(img, W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  return ctx.getImageData(0, 0, W, H).data;
}

// Rebuilds the difference canvas over the stack (no-op when the mode is off)
function renderDiff() {
  stack.querySelectorAll('canvas.diff-canvas').forEach(c => c.remove());
  stack.classList.toggle('diff-on', diffMode);
  diffStat.textContent = '';
  if (!diffMode || !images.idle) return;

  const ref = images.idle.img;
  const W = ref.naturalWidth;
  const H = ref.naturalHeight;
  const idle = layerPixels(ref, W, H);

  // Composite the visible layers bottom to top ("over", straight colour, alpha 0..1)
  const comp = new Float32Array(W * H * 4);
  stack.querySelectorAll('img').forEach(img => {
    const box = document.querySelector(`#layerControls input[data-name="${img.dataset.name}"]`);
    if (box && !box.checked) return;
    const px = layerPixels(img, W, H);
    for (let i = 0; i < px.length; i += 4) {
      const sa = px[i + 3] / 255;
      if (sa === 0) continue;
      const da = comp[i + 3];
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) {
        comp[i + k] = (px[i + k] * sa + comp[i + k] * da * (1 - sa)) / oa;
      }
      comp[i + 3] = oa;
    }
  });

  const out = new ImageData(W, H);
  const o = out.data;
  let diff = 0;
  for (let i = 0; i < o.length; i += 4) {
    const ia = idle[i + 3];      // reference alpha, 0..255
    const ca = comp[i + 3] * 255; // composite alpha, 0..255
    if (ia < 8 && ca < 8) continue; // empty on both sides: stays transparent

    let d;
    if (ia >= 8 && ca >= 8) {
      d = Math.max(
        Math.abs(ca - ia),
        Math.abs(comp[i] - idle[i]),
        Math.abs(comp[i + 1] - idle[i + 1]),
        Math.abs(comp[i + 2] - idle[i + 2])
      );
    } else {
      d = 255; // only one side has a pixel here
    }

    if (d > DIFF_TOLERANCE) {
      o[i] = DIFF_COLOR[0];
      o[i + 1] = DIFF_COLOR[1];
      o[i + 2] = DIFF_COLOR[2];
      o[i + 3] = 255;
      diff++;
    } else {
      const grey = idle[i] * 0.3 + idle[i + 1] * 0.59 + idle[i + 2] * 0.11;
      o[i] = o[i + 1] = o[i + 2] = grey;
      o[i + 3] = 70;
    }
  }

  const c = document.createElement('canvas');
  c.className = 'diff-canvas';
  c.width = W;
  c.height = H;
  c.getContext('2d').putImageData(out, 0, 0);
  stack.appendChild(c);

  diffStat.textContent = `Δ ${(100 * diff / (W * H)).toFixed(1)} %`;
  diffStat.title = 'Share of pixels that differ from idle';
}

document.getElementById('diffMode').addEventListener('click', () => {
  diffMode = !diffMode;
  updateDiffLabel();
  renderDiff();
});

document.getElementById('toggleAll').addEventListener('click', () => {
  const checks = layerControls.querySelectorAll('input[type="checkbox"]');
  const allChecked = Array.from(checks).every(c => c.checked);
  checks.forEach(c => {
    c.checked = !allChecked;
    c.dispatchEvent(new Event('change'));
  });
});

// ---------- Avatar name ----------
/**
 * Same rule as the plugin for the avatar folder name: drop control characters and
 * \ / : * ? " < > |, then spaces and dots at both ends. Accents and non-Latin
 * characters are kept. An empty result means the name is refused.
 * @param {string} raw
 * @returns {string}
 */
function cleanAvatarName(raw) {
  return raw.replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, '').replace(/^[ .]+|[ .]+$/g, '');
}

const avatarNameInput = document.getElementById('avatarName');
avatarNameInput.addEventListener('change', () => {
  avatarNameInput.value = cleanAvatarName(avatarNameInput.value);
});

// ---------- Settings values ----------
// Ranges and number formats of the plugin. `dec` = decimals always written, otherwise integer.
const SETTING_RULES = {
  threshold: { min: -60, max: 0, dec: 1 },
  release_delay: { min: 0, max: 2000 },
  talking_speed: { min: 0.01, max: 1, dec: 2 },
  mouth_range: { min: 1, max: 60 },
  blink_duration: { min: 0 },
  blink_interval_min: { min: 0 },
  blink_interval_max: { min: 0 },
  action_duration: { min: 0 },
  action_interval_min: { min: 0 },
  action_interval_max: { min: 0 },
  motion_speed: { min: 0, max: 500 },
  motion_strength: { min: 0, max: 50 },
  reference_height: { min: 64, max: 4096 }
};

/**
 * Brings a numeric setting back into its range and format, writes it back into the
 * field and returns the text for settings.ini. An unreadable value becomes the default.
 * @param {string} id  input id
 * @returns {string}
 */
function normalizeSetting(id) {
  const input = document.getElementById(id);
  const rule = SETTING_RULES[id];
  let v = parseFloat(input.value);
  if (!Number.isFinite(v)) v = parseFloat(input.defaultValue);
  if (rule.min !== undefined) v = Math.max(rule.min, v);
  if (rule.max !== undefined) v = Math.min(rule.max, v);
  let text;
  if (rule.dec) {
    // At most 3 decimals, and always at least `dec` of them ("-30" -> "-30.0")
    const [whole, frac = ''] = String(Number(v.toFixed(3))).split('.');
    text = `${whole}.${frac.padEnd(rule.dec, '0')}`;
  } else {
    text = String(Math.round(v));
  }
  input.value = text;
  return text;
}

Object.keys(SETTING_RULES).forEach(id => {
  document.getElementById(id).addEventListener('change', () => normalizeSetting(id));
});

/**
 * Serialises the settings form into the text of settings.ini.
 * Sections and keys are read as written by Flood Tuber: [General], [Audio], [Blink],
 * [Action], [Motion]. Text values stay in English whatever the interface language.
 * `mirror` and the three [Motion] keys are always written: when a settings.ini exists
 * without them, the plugin resets them to its defaults.
 * For Flood Tuber 1.3.0, the keys added in 1.4.0 are not written.
 * @param {string} name  cleaned avatar name
 * @returns {string} the text of settings.ini
 */
function generateSettingsIni(name) {
  const num = normalizeSetting;
  const get = id => document.getElementById(id).value;
  const v14 = !is13(); // keys added in 1.4.0 are left out for 1.3.0

  const sections = [
    ['General', [
      `name=${name}`,
      `author=${get('author').trim()}`,
      `mirror=${document.getElementById('mirror').checked ? 'true' : 'false'}`
    ]],
    ['Audio', [
      `threshold=${num('threshold')}`,
      `release_delay=${num('release_delay')}`,
      ...(v14 ? [
        `talking_speed=${num('talking_speed')}`,
        `mouth_mode=${get('mouth_mode')}`,
        `mouth_range=${num('mouth_range')}`
      ] : [])
    ]],
    ['Blink', [
      `duration=${num('blink_duration')}`,
      `interval_min=${num('blink_interval_min')}`,
      `interval_max=${num('blink_interval_max')}`
    ]],
    ['Action', [
      `duration=${num('action_duration')}`,
      `interval_min=${num('action_interval_min')}`,
      `interval_max=${num('action_interval_max')}`
    ]],
    ['Motion', [
      `type=${get('motion_type')}`,
      `speed=${num('motion_speed')}`,
      `strength=${num('motion_strength')}`,
      ...(v14 ? [`reference_height=${num('reference_height')}`] : [])
    ]]
  ];
  return sections.map(([title, lines]) => `[${title}]\n${lines.join('\n')}\n`).join('\n');
}

// ZIP export: requires a valid avatar name, the idle image and coherent intervals, then
// writes <avatar name>/<slot files> and settings.ini into a JSZip archive and downloads it.
document.getElementById('generateZip').addEventListener('click', async () => {
  const btn = document.getElementById('generateZip');
  const loader = document.getElementById('loader');
  const t = translations[currentLang];

  const avatarName = cleanAvatarName(avatarNameInput.value);
  avatarNameInput.value = avatarName;
  if (!avatarName) {
    setStatus(t.nameInvalid, 'bad');
    avatarNameInput.focus();
    return;
  }

  if (!files.idle) {
    setStatus(t.idleRequired, 'bad');
    return;
  }

  // interval_min must not exceed interval_max
  for (const [section, prefix] of [['[Blink]', 'blink'], ['[Action]', 'action']]) {
    const min = Number(normalizeSetting(`${prefix}_interval_min`));
    const max = Number(normalizeSetting(`${prefix}_interval_max`));
    if (min > max) {
      setStatus(fmt(t.intervalError, { section }), 'bad');
      document.getElementById(`${prefix}_interval_min`).focus();
      return;
    }
  }

  btn.disabled = true;
  loader.hidden = false;
  setStatus(t.generating, 'busy');

  try {
    const zip = new JSZip();
    const folder = zip.folder(avatarName);

    // One file per slot: imposed base name, extension of the real format.
    // For Flood Tuber 1.3.0, a GIF or WebP is written as a still PNG (PNG is all it reads).
    for (const name of activeSlots()) {
      if (!files[name]) continue;
      let data = files[name];
      if (is13() && formats[name].kind !== 'png') {
        data = await reencodeAsPng(files[name]);
        if (!data) throw new Error(outName(name));
      }
      folder.file(outName(name), data);
    }

    folder.file('settings.ini', generateSettingsIni(avatarName));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${avatarName}_FloodTuber.zip`;
    a.click();
    URL.revokeObjectURL(url);

    dirty = false; // work has been downloaded in the ZIP
    setStatus(t.success, 'ok');
  } catch (err) {
    setStatus('Error: ' + err.message, 'bad');
  } finally {
    loader.hidden = true;
    btn.disabled = false;
  }
});

// ---------- Pattern simulation ----------
// Ported from flood_tuber_tick() / select_avatar_texture() (flood-tuber.cpp).
// No audio in the browser: speech is simulated with random bursts.
// Simulation state, mutated every animation frame by simTick().
// state: 'IDLE' (resting), 'TALKING' (mouth animation), 'ACTION' (action image shown).
// Timers are in seconds. `blinking` is independent of the main state.
const sim = {
  rafId: null,
  last: 0,
  state: 'IDLE',          // IDLE | TALKING | ACTION
  holdTimer: 0,           // time since last speech (release_delay)
  talkAnimTimer: 0,
  frameIdx: 0,            // index in TALK: 0 -> talk_a … 5 -> talk_f
  actionTimer: 0,
  nextAction: 0,
  blinkTimer: 0,
  blinking: false,
  nextBlink: 0,
  effectTimer: 0,
  speaking: false,
  speakTimer: 0
};

// Longest wait, in seconds of silence, before the first action of a simulation
const SIM_FIRST_ACTION = 2;

// Whole-second range, as in the plugin: min + a random draw in [0, (max - min))
function randomInterval(minS, maxS) {
  const range = Math.max(1, Math.trunc(maxS - minS));
  return minS + Math.floor(Math.random() * range);
}

/**
 * Reads the settings form and converts it to seconds / fractions for the simulation.
 * Called on every frame, so the simulation follows live changes to the form.
 */
function simParams() {
  const num = id => parseFloat(document.getElementById(id).value) || 0;
  return {
    releaseDelay: num('release_delay') / 1000,
    // 1.3.0 has neither setting: fixed speed, plain cycle
    talkInterval: is13() ? 0.1 : Math.max(0.01, num('talking_speed')),
    mouthMode: is13() ? 'Cycle' : document.getElementById('mouth_mode').value,
    mouthRange: Math.max(1, num('mouth_range')),
    blinkDuration: num('blink_duration') / 1000,
    blinkMin: num('blink_interval_min') / 1000,
    blinkMax: num('blink_interval_max') / 1000,
    actionDuration: num('action_duration') / 1000,
    actionMin: num('action_interval_min') / 1000,
    actionMax: num('action_interval_max') / 1000,
    motion: document.getElementById('motion_type').value,
    effectSpeed: num('motion_speed') / 100,
    effectStrength: num('motion_strength') / 100, // fraction of the displayed height
    mirror: document.getElementById('mirror').checked
  };
}

function hasLayer(name) {
  return !!images[name];
}

// The talk cycle runs from A to the last talk image defined (3 steps when none is loaded)
function talkFrameCount() {
  if (is13()) return 3; // 1.3.0 always cycles A, B, C
  let last = -1;
  TALK.forEach((n, i) => { if (hasLayer(n)) last = i; });
  return last < 0 ? 3 : last + 1;
}

// Equivalent of select_avatar_texture(): picks the layer to display
function pickLayer() {
  if (sim.state === 'ACTION' && hasLayer('action')) return 'action';

  if (sim.state === 'TALKING') {
    // A missing step shows the previous image
    let i = Math.min(sim.frameIdx, talkFrameCount() - 1);
    while (i > 0 && !hasLayer(TALK[i])) i--;
    const talk = TALK[i];
    const talkBlink = talk + '_blink';

    let pick = null;
    if (sim.blinking && hasLayer(talkBlink)) pick = talkBlink;
    else if (hasLayer(talk)) pick = talk;
    // Blink fallback when the "talking + blink" variant is missing
    if (sim.blinking && !hasLayer(talkBlink) && hasLayer('blink')) pick = 'blink';

    return pick || 'idle';
  }

  if (sim.blinking && hasLayer('blink')) return 'blink';
  return 'idle';
}

function simStateText() {
  const t = translations[currentLang];
  const label = { IDLE: t.simIdle, TALKING: t.simTalking, ACTION: t.simAction }[sim.state];
  return sim.blinking ? `${label} · ${t.simBlink}` : label;
}

// One simulation step (same order as flood_tuber_tick)
function simTick(dt, p) {
  // Simulated speech: alternating bursts / silences
  // A running action is left to finish before the next burst, so it can be seen in full.
  sim.speakTimer -= dt;
  if (sim.speakTimer <= 0 && sim.state !== 'ACTION') {
    sim.speaking = !sim.speaking;
    sim.speakTimer = sim.speaking ? 1.2 + Math.random() * 2.3 : 0.6 + Math.random() * 1.9;
  }

  // States: speaking / resting (with release_delay)
  if (sim.speaking) {
    sim.holdTimer = 0;
    sim.state = 'TALKING';
  } else if (sim.state === 'TALKING') {
    sim.holdTimer += dt;
    if (sim.holdTimer > p.releaseDelay) sim.state = 'IDLE';
  }

  // Mouth image cycle
  if (sim.state === 'TALKING') {
    sim.talkAnimTimer += dt;
    if (sim.talkAnimTimer > p.talkInterval) {
      const count = talkFrameCount();
      if (p.mouthMode === 'Volume') {
        // No audio here: a random level above the threshold stands in for the microphone.
        // The louder the level within mouth_range, the further the image in the cycle.
        const level = Math.random() * p.mouthRange;
        sim.frameIdx = Math.min(count - 1, Math.floor(level / p.mouthRange * count));
      } else {
        sim.frameIdx = (sim.frameIdx + 1) % count;
      }
      sim.talkAnimTimer = 0;
    }
  }

  // Actions (never while speaking)
  if (sim.state !== 'TALKING') {
    sim.actionTimer += dt;
    if (sim.state === 'ACTION') {
      if (sim.actionTimer >= p.actionDuration) {
        sim.state = 'IDLE';
        sim.actionTimer = 0;
        sim.nextAction = randomInterval(p.actionMin, p.actionMax);
      }
    } else if (sim.actionTimer >= sim.nextAction) {
      sim.state = 'ACTION';
      sim.actionTimer = 0;
    }
  }

  // Blinks (only if a blink image is loaded)
  if (hasLayer('blink')) {
    sim.blinkTimer += dt;
    if (!sim.blinking && sim.blinkTimer >= sim.nextBlink) {
      sim.blinking = true;
      sim.blinkTimer = 0;
    }
    if (sim.blinking && sim.blinkTimer >= p.blinkDuration) {
      sim.blinking = false;
      sim.blinkTimer = 0;
      sim.nextBlink = randomInterval(p.blinkMin, p.blinkMax);
    }
  } else {
    sim.blinking = false;
    sim.blinkTimer = 0;
  }

  // Movement effects while speaking
  let offX = 0;
  let offY = 0;
  if (sim.state === 'TALKING' && p.motion !== 'None') {
    sim.effectTimer += dt * p.effectSpeed;
    const t = sim.effectTimer;
    const amp = p.effectStrength;
    if (p.motion === 'Bounce') {
      offY = -Math.abs(Math.sin(t * 5)) * amp;
    } else if (p.motion === 'Shake') {
      offX = Math.sin(t * 25) * amp * 0.8;
      offY = Math.cos(t * 20) * amp * 0.8;
    } else if (p.motion === 'Oscillating') {
      offX = Math.sin(t * 3) * amp;
      offY = Math.sin(t * 6) * amp * 0.5;
    }
  } else {
    sim.effectTimer = 0;
  }

  // Display: one layer at a time, as in the plugin
  const layer = pickLayer();
  stack.querySelectorAll('img').forEach(img => {
    img.style.display = img.dataset.name === layer ? 'block' : 'none';
  });
  const h = stack.offsetHeight;
  stack.style.transform = `translate(${offX * h}px, ${offY * h}px) scaleX(${p.mirror ? -1 : 1})`;

  document.getElementById('simState').textContent = simStateText();
}

function updateSimLabel() {
  const btn = document.getElementById('simulate');
  const t = translations[currentLang];
  btn.querySelector('span').textContent = simulating ? t.simulateStop : t.simulate;
  btn.setAttribute('aria-pressed', String(simulating));
}

/**
 * Starts the "Simulate pattern" loop (requestAnimationFrame). Requires the idle image.
 * Resets the simulation state, then calls simTick() once per frame.
 */
function startSimulation() {
  if (!files.idle) {
    setStatus(translations[currentLang].idleRequired, 'bad');
    return;
  }
  const p = simParams();
  Object.assign(sim, {
    state: 'IDLE',
    holdTimer: 0,
    talkAnimTimer: 0,
    frameIdx: 0,
    actionTimer: 0,
    // Demo: the first action comes after about 2 s of silence, whatever the wait settings
    // (the plugin's default wait is 60 s or more). The next ones follow the settings.
    nextAction: Math.min(p.actionMin, SIM_FIRST_ACTION),
    blinkTimer: 0,
    blinking: false,
    nextBlink: p.blinkMin,
    effectTimer: 0,
    speaking: false,
    speakTimer: 0.5
  });

  simulating = true;
  updateSimLabel();
  document.getElementById('simState').hidden = false;
  sim.last = performance.now();

  const loop = now => {
    const dt = Math.min(0.1, (now - sim.last) / 1000);
    sim.last = now;
    simTick(dt, simParams());
    sim.rafId = requestAnimationFrame(loop);
  };
  sim.rafId = requestAnimationFrame(loop);
}

function stopSimulation() {
  simulating = false;
  cancelAnimationFrame(sim.rafId);
  sim.rafId = null;

  // Restore display according to the checkboxes
  stack.style.transform = '';
  document.querySelectorAll('#layerControls input[type="checkbox"]').forEach(c => {
    const layer = stack.querySelector(`img[data-name="${c.dataset.name}"]`);
    if (layer) layer.style.display = c.checked ? 'block' : 'none';
  });

  document.getElementById('simState').hidden = true;
  updateSimLabel();
}

document.getElementById('simulate').addEventListener('click', () => {
  if (simulating) stopSimulation();
  else startSimulation();
});

// ---------- Magic wand: background removal ----------
// Flood fill from the clicked point (or all areas of the same colour),
// per-channel tolerance on RGBA. Works on the original image for every adjustment.
// ---------- Magic wand editor (background removal) ----------
// Works on a copy of the image's pixels (wand.data). Two masks are kept:
//   wand.flood   pixels removed by the wand (flood fill or global colour match)
//   wand.manual  pixels erased with the eraser tools
// Their union (combinedMask) is rendered as transparency. A third mask, wand.restore, holds
// the pixels the difference eraser replaced with the model's pixels (wand.refData).
// "Apply" writes the result back
// through loadFile(); "Restore original" uses originals[name].
// Undo/redo store snapshots of both masks (see pushHistory / undoWand / redoWand).
const wandDialog = document.getElementById('wandDialog');
const wandCanvas = document.getElementById('wandCanvas');
const wandCtx = wandCanvas.getContext('2d', { willReadFrequently: true });
const wandTol = document.getElementById('wandTol');
const wandTolOut = document.getElementById('wandTolOut');
const wandGlobal = document.getElementById('wandGlobal');
const wandInfo = document.getElementById('wandInfo');
const wandRestoreBtn = document.getElementById('wandRestore');
const wandSize = document.getElementById('wandSize');
const wandSizeOut = document.getElementById('wandSizeOut');
const wandGrow = document.getElementById('wandGrow');
const wandGrowOut = document.getElementById('wandGrowOut');
const wandUndoBtn = document.getElementById('wandUndo');
const wandRedoBtn = document.getElementById('wandRedo');
const wandZoomLabel = document.getElementById('wandZoomLabel');

// flood: area from the wand; manual: pixels erased with the eraser
// mask : union of both (computed in renderWand)
// restore: pixels given back the model's colour by the difference eraser
const wand = {
  name: null, data: null, w: 0, h: 0,
  flood: null, manual: null, restore: null, mask: null, removed: 0,
  refName: null, refData: null, diffCache: null, // model image for the difference eraser
  resized: false, // true when the image was scaled to the model's size
  seeds: [], // pixel indices of the clicked points (each click adds one)
  tool: 'flood', stroke: null, history: [], redo: [], zoom: 0 // zoom 0 = fit to window
};
const originals = {}; // name -> original File, for "Restore original"

const wandRef = document.getElementById('wandRef');

// Largest difference between two aspect ratios still treated as "the same shape": the image
// is then stretched to the exact size instead of getting a margin of a few pixels.
const SAME_SHAPE = 0.02;

/**
 * Pixels of `img` brought to a W x H canvas. The whole image is scaled to fit and centred;
 * when its shape differs from W x H, the leftover margins stay transparent.
 * An image that already is W x H is copied untouched.
 */
function fittedPixels(img, W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const cx = c.getContext('2d', { willReadFrequently: true });
  const sx = W / img.naturalWidth;
  const sy = H / img.naturalHeight;
  let dw = W, dh = H;
  if (Math.abs(sx / sy - 1) > SAME_SHAPE) {
    const s = Math.min(sx, sy);
    dw = img.naturalWidth * s;
    dh = img.naturalHeight * s;
  }
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return cx.getImageData(0, 0, W, H);
}

/**
 * (Re)loads the editor's pixels for wand.name against the model `refName`, and clears
 * every edit. The model sets the working size: the edited image is scaled to the model's
 * size (see fittedPixels), so both line up and the saved image has the model's size.
 * Without a model, the image keeps its own size.
 * @param {string|null} refName  slot base name of the model, or null for none
 */
function loadWandPixels(refName) {
  const img = images[wand.name].img;
  const ref = refName && images[refName] ? images[refName].img : null;
  const w = (ref || img).naturalWidth;
  const h = (ref || img).naturalHeight;
  Object.assign(wand, {
    data: fittedPixels(img, w, h), w, h,
    refName: ref ? refName : null,
    refData: ref ? fittedPixels(ref, w, h).data : null,
    diffCache: null,
    resized: w !== img.naturalWidth || h !== img.naturalHeight,
    flood: null, manual: null, restore: null, mask: null, removed: 0, seeds: [],
    zoneIndex: null, // one map, pixel -> zone id (1-based). Null means "rebuild on the next hit test"
    history: [], redo: [], stroke: null
  });
  wandCanvas.width = w;
  wandCanvas.height = h;
}

/**
 * Opens the editor for slot `name` with a fresh copy of its pixels.
 * Not available for a GIF or an animated file (see canEdit).
 * The model of the difference eraser is idle by default, or the first other image loaded.
 * @param {string} name  slot base name
 */
function openWand(name) {
  if (!images[name] || !canEdit(name)) return;
  wand.name = name;
  wand.grow = 0;

  const choices = SLOT_ORDER.filter(n => n !== name && images[n]);
  wandRef.innerHTML = '';
  choices.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = outName(n);
    wandRef.appendChild(opt);
  });
  wandRef.closest('label').hidden = choices.length === 0;
  document.querySelector('.tool[data-tool="diff"]').disabled = choices.length === 0;

  loadWandPixels(wandRef.value || null);
  wandGlobal.checked = false;
  wandTol.value = 20;
  wandTolOut.textContent = wandTol.value;
  wandRestoreBtn.disabled = !originals[name];
  updateUndoButtons();
  wandSize.value = 20;
  wandSizeOut.textContent = wandSize.value;
  wandGrow.value = 0;
  wandGrowOut.textContent = '0';
  setTool('flood');
  renderWand();
  wandDialog.showModal();
  wand.zoom = 0;
  applyZoom();
}

function matches(d, i, si, thr) {
  const q = i * 4, s = si * 4;
  return Math.abs(d[q] - d[s]) <= thr &&
         Math.abs(d[q + 1] - d[s + 1]) <= thr &&
         Math.abs(d[q + 2] - d[s + 2]) <= thr &&
         Math.abs(d[q + 3] - d[s + 3]) <= thr;
}

/**
 * Computes the wand selection.
 * - global = false: 4-neighbour flood fill from pixel index `seed`.
 * - global = true : every pixel whose colour is close to the seed colour.
 * "Close" means each RGBA channel differs by at most tol * 2.55 (tol is 0-100).
 * @returns {{mask: Uint8Array, removed: number}}
 */
function computeMask(seed, tol, global) {
  const { w, h } = wand;
  const d = wand.data.data;
  const thr = tol * 2.55; // tolerance 0-100 -> per-channel difference 0-255
  const mask = new Uint8Array(w * h);
  let removed = 0;

  if (global) {
    for (let i = 0; i < w * h; i++) {
      if (matches(d, i, seed, thr)) { mask[i] = 1; removed++; }
    }
    return { mask, removed };
  }

  // 4-neighbour flood fill from the clicked point
  const stack = new Int32Array(w * h);
  let top = 0;
  const tryPush = q => {
    if (!mask[q] && matches(d, q, seed, thr)) {
      mask[q] = 1;
      stack[top++] = q;
      removed++;
    }
  };
  mask[seed] = 1;
  stack[top++] = seed;
  removed = 1;
  while (top > 0) {
    const p = stack[--top];
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) tryPush(p - 1);
    if (x < w - 1) tryPush(p + 1);
    if (y > 0) tryPush(p - w);
    if (y < h - 1) tryPush(p + w);
  }
  return { mask, removed };
}

// Union of the wand area and the eraser strokes
function combinedMask() {
  const { w, h, flood, manual } = wand;
  if (!flood && !manual) return null;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    m[i] = (flood && flood[i]) || (manual && manual[i]) ? 1 : 0;
  }
  return m;
}

/**
 * Pixels of the edited image that differ from the model, at the current tolerance
 * (each RGBA channel may differ by tolerance x 2.55). Cached until the tolerance changes.
 * `wide` is the same mask grown by DIFF_GROW: the brush copies that, so a shifted
 * edge is replaced as a whole instead of leaving a wavy second contour.
 * @returns {Uint8Array|null} null when there is no model
 */
const DIFF_GROW = 4;

function diffMask() {
  if (!wand.refData) return null;
  const tol = Number(wandTol.value);
  if (wand.diffCache && wand.diffCache.tol === tol) return wand.diffCache.mask;
  const d = wand.data.data;
  const r = wand.refData;
  const thr = tol * 2.55;
  const mask = new Uint8Array(wand.w * wand.h);
  for (let i = 0, q = 0; i < mask.length; i++, q += 4) {
    const da = d[q + 3], ra = r[q + 3];
    if (da < 8 && ra < 8) continue; // empty on both sides
    if (Math.abs(da - ra) > thr ||
        (da >= 8 && ra >= 8 && (Math.abs(d[q] - r[q]) > thr ||
                                Math.abs(d[q + 1] - r[q + 1]) > thr ||
                                Math.abs(d[q + 2] - r[q + 2]) > thr))) {
      mask[i] = 1;
    }
  }
  wand.diffCache = { tol, mask, wide: dilateMask(mask, DIFF_GROW) };
  return mask;
}

// Edge softening: colour distance (RGB) over which a pixel next to the removed area
// goes from fully transparent (background colour) to fully opaque (foreground).
// Lower = sharper, higher = softer. 215 is about half the distance between white and black.
const EDGE_RANGE = 215;
// How many pixels around the removed area are checked for edge softening.
const EDGE_RADIUS = 2;

/**
 * Grows a mask by `steps` pixels (4-neighbour dilation).
 * Used by the "Expand background" slider. Returns a new mask; the input is unchanged.
 * @param {Uint8Array} mask
 * @param {number} steps
 * @returns {Uint8Array}
 */
function dilateMask(mask, steps) {
  const { w, h } = wand;
  let cur = mask;
  for (let s = 0; s < steps; s++) {
    const next = cur.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) ||
            (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) {
          next[i] = 1;
        }
      }
    }
    cur = next;
  }
  return cur;
}

/**
 * The mask that is actually removed: the wand/eraser union, grown by the
 * "Expand background" slider. Returns null when nothing is selected.
 */
function finalMask() {
  const m = combinedMask();
  if (!m || wand.grow === 0) return m;
  return dilateMask(m, wand.grow);
}

/**
 * Builds the output pixels for a removal mask (used by the preview and by Apply).
 * - Pixels inside the mask become fully transparent.
 * - Pixels within EDGE_RADIUS of the mask become partly transparent, depending on how
 *   close their colour is to the background colour. This removes the light
 *   anti-aliased halo around outlines while keeping the dark outline itself.
 * The background colour is the mean colour of the removed pixels.
 * - Pixels touched by the difference eraser (wand.restore) take the model's pixel.
 *   wand.restore is 0..255: 255 is a full copy, a lower value blends across the brush edge.
 * @param {Uint8Array|null} mask
 * @returns {ImageData}
 */
function buildOutput(mask) {
  const out = buildMasked(mask);
  if (wand.restore && wand.refData) {
    const o = out.data;
    const r = wand.refData;
    for (let i = 0, q = 0; i < wand.restore.length; i++, q += 4) {
      const t = wand.restore[i];
      if (!t) continue;
      if (t >= 255) {
        o[q] = r[q]; o[q + 1] = r[q + 1]; o[q + 2] = r[q + 2]; o[q + 3] = r[q + 3];
        continue;
      }
      const k = 255 - t;
      o[q] = (r[q] * t + o[q] * k + 127) / 255 | 0;
      o[q + 1] = (r[q + 1] * t + o[q + 1] * k + 127) / 255 | 0;
      o[q + 2] = (r[q + 2] * t + o[q + 2] * k + 127) / 255 | 0;
      o[q + 3] = (r[q + 3] * t + o[q + 3] * k + 127) / 255 | 0;
    }
  }
  return out;
}

// Transparency part of buildOutput(): removed pixels and softened edges
function buildMasked(mask) {
  const { w, h } = wand;
  const src = wand.data.data;
  const out = new ImageData(new Uint8ClampedArray(src), w, h);
  const o = out.data;
  if (!mask) return out;

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) {
      r += src[i * 4]; g += src[i * 4 + 1]; b += src[i * 4 + 2];
      count++;
    }
  }
  if (count === 0) return out;
  r /= count; g /= count; b /= count;

  const near = dilateMask(mask, EDGE_RADIUS);
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) { o[i * 4 + 3] = 0; continue; }
    if (!near[i]) continue;
    const dr = src[i * 4] - r;
    const dg = src[i * 4 + 1] - g;
    const db = src[i * 4 + 2] - b;
    const d = Math.sqrt(dr * dr + dg * dg + db * db);
    const f = Math.min(1, d / EDGE_RANGE);
    o[i * 4 + 3] = Math.round(src[i * 4 + 3] * f);
  }
  return out;
}

/**
 * Draws the editor canvas: the output from buildOutput() for the final mask,
 * then updates the "N px removed" info line.
 */
function renderWand() {
  const { w, h } = wand;
  const m = finalMask();
  const out = buildOutput(m);
  let removed = 0;
  if (m) {
    for (let i = 0; i < w * h; i++) {
      if (m[i]) removed++;
    }
  }
  wand.mask = m;
  wand.removed = removed;

  // Difference eraser: the pixels that still differ from the model are tinted on screen
  // only. The saved image comes from buildOutput(), never from the canvas.
  const diff = wand.tool === 'diff' ? diffMask() : null;
  let left = 0;
  let shown = out;
  if (diff) {
    shown = new ImageData(new Uint8ClampedArray(out.data), w, h);
    const sd = shown.data;
    for (let i = 0, q = 0; i < diff.length; i++, q += 4) {
      if (!diff[i] || (wand.restore && wand.restore[i])) continue;
      if (sd[q + 3] < 8 && wand.refData[q + 3] < 8) continue; // removed here, empty in the model
      left++;
      sd[q] = DIFF_COLOR[0] * 0.6 + sd[q] * 0.4;
      sd[q + 1] = DIFF_COLOR[1] * 0.6 + sd[q + 1] * 0.4;
      sd[q + 2] = DIFF_COLOR[2] * 0.6 + sd[q + 2] * 0.4;
      sd[q + 3] = Math.max(sd[q + 3], 170);
    }
  }
  wandCtx.putImageData(shown, 0, 0);

  const t = translations[currentLang];
  const parts = [];
  if (removed > 0) parts.push(t.wandInfo.replace('{n}', removed));
  if (wand.seeds.length > 1) parts.push(t.wandZones.replace('{n}', wand.seeds.length));
  if (diff) parts.push(fmt(t.diffLeft, { n: left, ref: outName(wand.refName) }));
  wandInfo.textContent = parts.join(' · ');
}

/**
 * One map of which zone owns each pixel (later zones win on overlaps).
 * Two bytes per pixel, however many zones there are, instead of a full mask per zone.
 * @returns {Uint16Array} 0 = outside, otherwise the zone number starting at 1
 */
function buildZoneIndex() {
  const index = new Uint16Array(wand.w * wand.h);
  const tol = Number(wandTol.value);
  const global = wandGlobal.checked;
  let id = 1;
  for (const seed of wand.seeds) {
    const { mask } = computeMask(seed, tol, global);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) index[i] = id;
    }
    id++;
  }
  return index;
}

/** Rebuilds the removed area from every seed, and the zone map that goes with it. */
function refreshWandMask() {
  if (!wand.seeds.length) {
    wand.flood = null;
    wand.zoneIndex = null;
    renderWand();
    return;
  }
  const index = buildZoneIndex();
  const union = new Uint8Array(index.length);
  for (let i = 0; i < index.length; i++) {
    if (index[i]) union[i] = 1;
  }
  wand.zoneIndex = index;
  wand.flood = union;
  renderWand();
}

// Adds the newest seed onto the map already on screen. One flood, not one per zone.
function appendZone(seed) {
  const { mask } = computeMask(seed, Number(wandTol.value), wandGlobal.checked);
  const id = wand.seeds.length;
  const index = wand.zoneIndex;
  const union = wand.flood;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    union[i] = 1;
    index[i] = id;
  }
  renderWand();
}

// Undo restores the union, not the map. The next hit test builds the map once.
function ensureZoneIndex() {
  if (wand.zoneIndex) return;
  if (!wand.seeds.length) return;
  wand.zoneIndex = buildZoneIndex();
}

function snapshotWand() {
  return {
    flood: wand.flood ? wand.flood.slice() : null,
    manual: wand.manual ? wand.manual.slice() : null,
    restore: wand.restore ? wand.restore.slice() : null,
    seeds: wand.seeds.slice()
  };
}

function restoreWand(s) {
  wand.flood = s.flood;
  wand.manual = s.manual;
  wand.restore = s.restore;
  wand.seeds = s.seeds.slice();
  wand.zoneIndex = null;
  renderWand();
  updateUndoButtons();
}

function updateUndoButtons() {
  wandUndoBtn.disabled = wand.history.length === 0;
  wandRedoBtn.disabled = wand.redo.length === 0;
}

// Saves the state before an undoable action; any new action clears redo
function pushHistory() {
  wand.history.push(snapshotWand());
  if (wand.history.length > 20) wand.history.shift();
  wand.redo = [];
  updateUndoButtons();
}

function undoWand() {
  if (!wand.history.length) return;
  wand.redo.push(snapshotWand());
  restoreWand(wand.history.pop());
}

function redoWand() {
  if (!wand.redo.length) return;
  wand.history.push(snapshotWand());
  restoreWand(wand.redo.pop());
}

function setTool(tool) {
  wand.tool = tool;
  document.querySelectorAll('.tool').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.tool === tool));
  });
  if (wand.data) renderWand(); // the difference tint depends on the tool
}

// Changing the model reloads the pixels: the working size and the differences depend on it
wandRef.addEventListener('change', () => {
  loadWandPixels(wandRef.value || null);
  updateUndoButtons();
  renderWand();
  applyZoom();
});

function canvasPoint(e) {
  const rect = wandCanvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - rect.left) * wand.w / rect.width),
    y: Math.floor((e.clientY - rect.top) * wand.h / rect.height)
  };
}

// Erases a disc of pixels; in "magic eraser" mode, only the start point's colour.
// In "difference eraser" mode, nothing is erased. Pixels of the disc that differ from
// the model, plus DIFF_GROW pixels around them, take the model's pixel. The last
// pixels of the disc are blended so the brush edge itself does not draw a ring.
const DIFF_FEATHER = 2;

function paintAt(x, y) {
  const { w, h } = wand;
  const r = Number(wandSize.value);
  const r2 = r * r;
  const d = wand.data.data;
  const thr = Number(wandTol.value) * 2.55;
  const diff = wand.tool === 'diff' ? diffMask() : null;
  if (wand.tool === 'diff') {
    if (!diff) return;
    if (!wand.restore) wand.restore = new Uint8Array(w * h);
  } else if (!wand.manual) {
    wand.manual = new Uint8Array(w * h);
  }
  const wide = diff && wand.diffCache ? wand.diffCache.wide : null;
  const magic = wand.tool === 'magic';
  const seed = wand.stroke ? wand.stroke.seed : 0;
  const feather = Math.min(DIFF_FEATHER, r);

  for (let dy = -r; dy <= r; dy++) {
    const py = y + dy;
    if (py < 0 || py >= h) continue;
    for (let dx = -r; dx <= r; dx++) {
      const dist2 = dx * dx + dy * dy;
      if (dist2 > r2) continue;
      const px = x + dx;
      if (px < 0 || px >= w) continue;
      const i = py * w + px;
      if (wide) {
        if (!wide[i]) continue;
        let wgt = 255;
        if (feather > 0) {
          const dist = Math.sqrt(dist2);
          if (dist > r - feather) wgt = Math.max(1, (255 * (r - dist) / feather + 0.5) | 0);
        }
        if (wgt > wand.restore[i]) wand.restore[i] = wgt;
        continue;
      }
      if (magic && !matches(d, i, seed, thr)) continue;
      wand.manual[i] = 1;
    }
  }
}

let wandRenderQueued = false;
function scheduleWandRender() {
  if (wandRenderQueued) return;
  wandRenderQueued = true;
  requestAnimationFrame(() => {
    wandRenderQueued = false;
    renderWand();
  });
}

// Scale actually displayed (1 = real image size)
function displayScale() {
  if (wand.zoom) return wand.zoom;
  const w = wandCanvas.getBoundingClientRect().width;
  return w && wand.w ? w / wand.w : 1;
}

/**
 * Applies wand.zoom to the canvas size. wand.zoom = 0 means "fit to the window".
 */
function applyZoom() {
  const z = wand.zoom;
  wandCanvas.classList.toggle('zoomed', !!z);
  if (z) {
    wandCanvas.style.width = Math.round(wand.w * z) + 'px';
    wandCanvas.style.height = Math.round(wand.h * z) + 'px';
  } else {
    wandCanvas.style.width = '';
    wandCanvas.style.height = '';
  }
  wandZoomLabel.textContent = Math.round(displayScale() * 100) + ' %';
}

function zoomBy(factor) {
  wand.zoom = Math.min(16, Math.max(0.1, displayScale() * factor));
  applyZoom();
}

document.getElementById('wandZoomMinus').addEventListener('click', () => zoomBy(1 / 1.25));
document.getElementById('wandZoomPlus').addEventListener('click', () => zoomBy(1.25));
document.getElementById('wandZoomFit').addEventListener('click', () => {
  wand.zoom = 0;
  applyZoom();
});

wandSize.addEventListener('input', () => {
  wandSizeOut.textContent = wandSize.value;
});

// "Expand background": grows the removed area by N pixels to eat the remaining halo.
wandGrow.addEventListener('input', () => {
  wandGrowOut.textContent = wandGrow.value;
  wand.grow = Number(wandGrow.value);
  renderWand();
});

document.querySelectorAll('.tool').forEach(b => {
  b.addEventListener('click', () => {
    // A second click on Wand clears every zone. One zone is removed by clicking it
    // again (or right-clicking it). Switching to another tool and back keeps the zones.
    if (b.dataset.tool === 'flood' && wand.tool === 'flood') {
      if (wand.seeds.length) {
        pushHistory();
        wand.seeds = [];
        refreshWandMask();
      }
      return;
    }
    setTool(b.dataset.tool);
  });
});

// ---------- Brush preview (Eraser / Magic eraser / Difference eraser) ----------
// A translucent circle follows the pointer and shows the area the brush will clear,
// at the current Size (in image pixels, scaled to the zoom level on screen).
const brushCursor = document.createElement('div');
brushCursor.className = 'brush-cursor';
brushCursor.hidden = true;
wandCanvas.parentElement.appendChild(brushCursor);
let brushPointer = null; // last pointer position over the canvas (client coordinates)

/** Shows, moves or hides the brush circle depending on the tool and pointer position. */
function updateBrushCursor() {
  const isBrush = wand.tool === 'eraser' || wand.tool === 'magic' || wand.tool === 'diff';
  if (!isBrush || !brushPointer || !wand.data) {
    brushCursor.hidden = true;
    return;
  }
  // Tied to the editor's wrapper, not to the canvas edge: the circle stays visible over the
  // padding and while a stroke continues past the canvas (the pointer is captured then).
  const wrap = wandCanvas.parentElement;
  const wr = wrap.getBoundingClientRect();
  const inside = brushPointer.x >= wr.left && brushPointer.x <= wr.right &&
                 brushPointer.y >= wr.top && brushPointer.y <= wr.bottom;
  if (!inside) {
    brushCursor.hidden = true;
    return;
  }
  // Position relative to the scrollable wrapper, so it stays under the pointer when scrolled
  const diameter = 2 * Number(wandSize.value) * displayScale();
  brushCursor.style.width = diameter + 'px';
  brushCursor.style.height = diameter + 'px';
  brushCursor.style.left = (brushPointer.x - wr.left + wrap.scrollLeft) + 'px';
  brushCursor.style.top = (brushPointer.y - wr.top + wrap.scrollTop) + 'px';
  brushCursor.classList.toggle('is-magic', wand.tool === 'magic');
  brushCursor.hidden = false;
}

// Listening on the wrapper: moves over the canvas bubble up here, and so do moves made
// while a stroke has captured the pointer.
const brushWrap = wandCanvas.parentElement;
brushWrap.addEventListener('pointermove', e => {
  brushPointer = { x: e.clientX, y: e.clientY };
  updateBrushCursor();
});
brushWrap.addEventListener('pointerleave', () => {
  brushPointer = null;
  brushCursor.hidden = true;
});
wandSize.addEventListener('input', updateBrushCursor);
document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', updateBrushCursor));

document.getElementById('wandUndo').addEventListener('click', undoWand);
document.getElementById('wandRedo').addEventListener('click', redoWand);

// Editor shortcuts (only while the editor is open)
document.addEventListener('keydown', e => {
  if (!wandDialog.open) return;
  const inField = e.target.closest && e.target.closest('input, textarea, select');
  // Delete / Backspace removes the last zone. Right-click is not available from the keyboard.
  if (!inField && !e.ctrlKey && !e.metaKey && !e.altKey &&
      (e.key === 'Delete' || e.key === 'Backspace') && wand.tool === 'flood' && wand.seeds.length) {
    e.preventDefault();
    dropZone(wand.seeds.length - 1);
    return;
  }
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoWand(); }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redoWand(); }
  else if (k === '+' || k === '=') { e.preventDefault(); zoomBy(1.25); }
  else if (k === '-') { e.preventDefault(); zoomBy(1 / 1.25); }
  else if (k === '0') { e.preventDefault(); wand.zoom = 0; applyZoom(); }
});

// Ctrl + wheel: zoom the editor (not the page)
wandDialog.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
}, { passive: false });

// Work-loss protection: warn if the page is left while images or settings
// have not been downloaded in a ZIP
let dirty = false;

document.addEventListener('change', e => {
  if (!e.target.closest('#wandDialog')) dirty = true;
});

window.addEventListener('beforeunload', e => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

// Index of the zone that covers this pixel, or -1. The clicked seed wins if the pointer
// is on it. Otherwise the newest zone covering the pixel wins.
function zoneIndexAt(pixel) {
  const exact = wand.seeds.indexOf(pixel);
  if (exact !== -1) return exact;
  if (!wand.flood || !wand.flood[pixel]) return -1;
  ensureZoneIndex();
  const id = wand.zoneIndex[pixel];
  return id ? id - 1 : -1;
}

function dropZone(index) {
  pushHistory();
  wand.seeds.splice(index, 1);
  refreshWandMask();
}

wandCanvas.addEventListener('pointerdown', e => {
  if (!wand.data || e.button !== 0) return;
  const p = canvasPoint(e);
  if (wand.tool === 'flood') {
    if (p.x < 0 || p.y < 0 || p.x >= wand.w || p.y >= wand.h) return;
    const seed = p.y * wand.w + p.x;
    // Shift forces a new zone, so a click inside an existing one can still add.
    if (!e.shiftKey) {
      const zone = zoneIndexAt(seed);
      if (zone >= 0) {
        dropZone(zone);
        return;
      }
    } else if (wand.seeds.includes(seed)) {
      return;
    }
    pushHistory();
    wand.seeds.push(seed);
    // Stacking only paints the new zone. A full rebuild happens when the map is missing
    // (first zone, or just after undo) and when a zone is removed.
    if (wand.zoneIndex && wand.flood && wand.zoneIndex.length === wand.w * wand.h) appendZone(seed);
    else refreshWandMask();
    return;
  }
  // Eraser: a brush stroke starts here
  pushHistory();
  wand.stroke = { seed: Math.min(wand.h - 1, Math.max(0, p.y)) * wand.w + Math.min(wand.w - 1, Math.max(0, p.x)) };
  wandCanvas.setPointerCapture(e.pointerId);
  paintAt(p.x, p.y);
  renderWand();
});

wandCanvas.addEventListener('pointermove', e => {
  if (!wand.stroke) return;
  const p = canvasPoint(e);
  paintAt(p.x, p.y);
  scheduleWandRender();
});

function endStroke() {
  if (!wand.stroke) return;
  wand.stroke = null;
  renderWand();
}
wandCanvas.addEventListener('pointerup', endStroke);
wandCanvas.addEventListener('pointercancel', endStroke);

// Right-click removes only the zone under the pointer. It does not add one.
wandCanvas.addEventListener('contextmenu', e => {
  if (!wandDialog.open || !wand.data || wand.tool !== 'flood') return;
  e.preventDefault();
  const p = canvasPoint(e);
  if (p.x < 0 || p.y < 0 || p.x >= wand.w || p.y >= wand.h) return;
  const zone = zoneIndexAt(p.y * wand.w + p.x);
  if (zone >= 0) dropZone(zone);
});

wandTol.addEventListener('input', () => {
  wandTolOut.textContent = wandTol.value;
  refreshWandMask();
});

wandGlobal.addEventListener('change', refreshWandMask);

document.getElementById('wandCancel').addEventListener('click', () => wandDialog.close());

document.getElementById('wandApply').addEventListener('click', () => {
  const name = wand.name;
  if (!name) return;
  const m = finalMask();
  // Nothing to save: no pixel removed, none taken from the model, size unchanged
  const changed = (m && m.some(v => v)) || (wand.restore && wand.restore.some(v => v)) || wand.resized;
  if (!changed) {
    wandDialog.close();
    return;
  }
  // Same output as the preview, so what you see is what gets saved
  const out = buildOutput(m);
  const c = document.createElement('canvas');
  c.width = wand.w;
  c.height = wand.h;
  c.getContext('2d').putImageData(out, 0, 0);
  c.toBlob(blob => {
    if (!originals[name]) originals[name] = files[name];
    loadFile(name, new File([blob], `${name}.png`, { type: 'image/png' }));
    wandDialog.close();
    setStatus(translations[currentLang].wandDone, 'ok');
  }, 'image/png');
});

wandRestoreBtn.addEventListener('click', () => {
  const name = wand.name;
  if (!name || !originals[name]) return;
  const original = originals[name];
  delete originals[name];
  loadFile(name, original);
  wandDialog.close();
  setStatus(translations[currentLang].wandRestored, 'ok');
});

// Buttons created here did not exist yet during the first setLanguage call
appReady = true;
applyTarget();
setLanguage(currentLang);

// ---------- Tutorials ----------
const tutoDialog = document.getElementById('tutoDialog');
// Tutorial content comes from the translations (tutoBody)
function renderTuto() {
  const el = document.getElementById('tutoContent');
  if (el) el.innerHTML = translations[currentLang].tutoBody;
}

document.getElementById('tutoBtn').addEventListener('click', () => tutoDialog.showModal());
document.getElementById('tutoClose').addEventListener('click', () => tutoDialog.close());

// Initial preview
updatePreview();
