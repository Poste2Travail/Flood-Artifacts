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
 *   7. magic wand        background removal editor (flood fill, eraser, undo/redo, zoom)
 *   8. tutorials         tutorial dialog
 *
 * Data model: each sprite slot is identified by its file name (e.g. "idle.png").
 *   files[name]   -> the File the user chose (or the processed PNG after the wand)
 *   images[name]  -> { img, url }: the loaded <img> and its object URL
 *   slots[name]   -> DOM references for the slot card
 *
 * The file names, the `order` array in updatePreview() and the settings.ini keys
 * are a contract with Flood Tuber. Change them only together.
 *
 * To add a language: copy the `en` block below, translate every key, then add a
 * matching <button data-lang="xx"> in index.html.
 */
const translations = {
  en: {
    title: "Flood Tuber Package Builder",
    subtitle: "Drop PNG, GIF, APNG or WebP into the slots, check the overlay, then download a ZIP with settings.ini.",
    avatarName: "Avatar name (folder):",
    slotsTitle: "Sprite slots",
    required: "required",
    clickOrDrop: "Click or drop",
    previewTitle: "Overlay preview",
    stackEmpty: "Add idle.png to see the stack.",
    globalOpacity: "Opacity:",
    diffMode: "Difference",
    diffNormal: "Normal mode",
    toggleAll: "Show / Hide all",
    settingsTitle: "settings.ini",
    generateZip: "Download ZIP package",
    credits: "Character makers that match the expression slots:",
    idleRequired: "idle.png is required!",
    simulate: "Simulate pattern",
    simulateStop: "Stop simulation",
    simIdle: "IDLE",
    simTalking: "TALKING",
    simAction: "ACTION",
    simBlink: "blink",
    wandBtn: "Magic wand: remove background",
    wandTitle: "Magic wand",
    wandHint: "Click on the background to make it transparent. Adjust the tolerance if needed.",
    wandTolerance: "Tolerance:",
    wandGlobal: "All areas of this colour",
    wandInfo: "{n} px removed",
    wandAnimWarn: "Animated GIF/APNG: only the first frame is processed.",
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
    wandRedo: "Redo",
    wandKeys: "Ctrl+click add a zone · Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+wheel zoom",
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
<li>Drop each expression into its slot. <code>idle.png</code> is required; <code>talk_a/b/c.png</code> are the mouth images while speaking, and the <code>_blink</code> variants handle blinking while speaking.</li>
<li>Check the alignment with the preview and layers (Difference mode).</li>
<li>If the background gets in the way, use the magic wand, the eraser or the magic eraser.</li>
<li>Test the behaviour with "Simulate pattern".</li>
<li>Adjust the <code>settings.ini</code> values, then download the ZIP.</li>
<li>Unzip the file and place the avatar folder where the Flood Tuber plugin looks for it (see the plugin README).</li>
</ol>`,
    generating: "Generating ZIP...",
    success: "ZIP downloaded!",
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
    slotsTitle: "Emplacements des sprites",
    required: "requis",
    clickOrDrop: "Cliquez ou déposez",
    previewTitle: "Prévisualisation / Superposition (calques)",
    stackEmpty: "Ajoutez idle.png pour voir la superposition.",
    globalOpacity: "Opacité globale :",
    diffMode: "Mode Différence",
    diffNormal: "Mode normal",
    toggleAll: "Tout afficher / masquer",
    settingsTitle: "settings.ini",
    generateZip: "Générer et télécharger le package ZIP",
    credits: "Générateurs de personnages compatibles avec les emplacements d’expressions :",
    idleRequired: "idle.png est obligatoire !",
    simulate: "Simuler le paterne",
    simulateStop: "Arrêter la simulation",
    simIdle: "REPOS",
    simTalking: "PARLE",
    simAction: "ACTION",
    simBlink: "clignement",
    wandBtn: "Baguette magique : effacer le fond",
    wandTitle: "Baguette magique",
    wandHint: "Cliquez sur le fond pour le rendre transparent. Ajustez la tolérance si besoin.",
    wandTolerance: "Tolérance :",
    wandGlobal: "Toutes les zones de cette couleur",
    wandInfo: "{n} px effacés",
    wandAnimWarn: "GIF/APNG animé : seule la première image est traitée.",
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
    wandRedo: "Rétablir",
    wandKeys: "Ctrl+clic ajouter une zone · Ctrl+Z annuler · Ctrl+Maj+Z rétablir · Ctrl+molette zoom",
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
<li>Dépose chaque expression dans son emplacement. <code>idle.png</code> est obligatoire ; <code>talk_a/b/c.png</code> sont les images de bouche pendant la parole, et les variantes <code>_blink</code> gèrent le clignement en parlant.</li>
<li>Vérifie l’alignement avec l’aperçu et les calques (Mode Différence).</li>
<li>Si le fond gêne, utilise la baguette magique, la gomme ou la gomme magique.</li>
<li>Teste le comportement avec « Simuler le paterne ».</li>
<li>Règle les valeurs de <code>settings.ini</code>, puis télécharge le ZIP.</li>
<li>Décompresse le ZIP et place le dossier de l’avatar là où le plugin Flood Tuber le cherche (voir le README du plugin).</li>
</ol>`,
    generating: "Génération du ZIP...",
    success: "ZIP téléchargé !",
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
    slotsTitle: "スプライトスロット",
    required: "必須",
    clickOrDrop: "クリックまたはドロップ",
    previewTitle: "プレビュー / 重ね合わせ（レイヤー）",
    stackEmpty: "スタックを見るには idle.png を追加してください。",
    globalOpacity: "全体の不透明度:",
    diffMode: "差分モード",
    diffNormal: "通常モード",
    toggleAll: "すべて表示 / 非表示",
    settingsTitle: "settings.ini",
    generateZip: "ZIPパッケージを生成してダウンロード",
    credits: "表情スロットに対応するキャラクター作成ツール：",
    idleRequired: "idle.png は必須です！",
    simulate: "パターンをシミュレート",
    simulateStop: "シミュレーションを停止",
    simIdle: "待機",
    simTalking: "会話中",
    simAction: "アクション",
    simBlink: "まばたき",
    wandBtn: "マジックワンド：背景を削除",
    wandTitle: "マジックワンド",
    wandHint: "背景をクリックして透明にします。必要に応じて許容値を調整してください。",
    wandTolerance: "許容値:",
    wandGlobal: "この色のすべての領域",
    wandInfo: "{n} px を削除",
    wandAnimWarn: "アニメーションGIF/APNG：最初のフレームのみ処理されます。",
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
    wandRedo: "やり直し",
    wandKeys: "Ctrl+クリックで領域を追加 · Ctrl+Z 取り消し · Ctrl+Shift+Z やり直し · Ctrl+ホイール ズーム",
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
<li>各表情を対応するスロットにドロップします。<code>idle.png</code> は必須です。<code>talk_a/b/c.png</code> は話している間の口の画像で、<code>_blink</code> の版は話している間のまばたきに使われます。</li>
<li>プレビューとレイヤー（差分モード）で位置合わせを確認します。</li>
<li>背景が邪魔なら、マジックワンド・消しゴム・マジック消しゴムを使います。</li>
<li>「パターンをシミュレート」で動きを確認します。</li>
<li><code>settings.ini</code> の値を調整し、ZIP をダウンロードします。</li>
<li>ZIP を展開し、アバターのフォルダを Flood Tuber プラグインが探す場所に置きます（プラグインの README を参照）。</li>
</ol>`,
    generating: "ZIPを生成中...",
    success: "ZIPをダウンロードしました！",
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
    slotsTitle: "精灵插槽",
    required: "必需",
    clickOrDrop: "点击或拖放",
    previewTitle: "预览 / 叠加（图层）",
    stackEmpty: "添加 idle.png 以查看叠加。",
    globalOpacity: "全局不透明度：",
    diffMode: "差异模式",
    diffNormal: "普通模式",
    toggleAll: "全部显示 / 隐藏",
    settingsTitle: "settings.ini",
    generateZip: "生成并下载 ZIP 包",
    credits: "与表情插槽匹配的角色制作工具：",
    idleRequired: "idle.png 是必需的！",
    simulate: "模拟动作模式",
    simulateStop: "停止模拟",
    simIdle: "待机",
    simTalking: "说话",
    simAction: "动作",
    simBlink: "眨眼",
    wandBtn: "魔棒：去除背景",
    wandTitle: "魔棒",
    wandHint: "点击背景使其透明。如有需要请调整容差。",
    wandTolerance: "容差：",
    wandGlobal: "此颜色的所有区域",
    wandInfo: "已删除 {n} 像素",
    wandAnimWarn: "动画 GIF/APNG：仅处理第一帧。",
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
    wandRedo: "重做",
    wandKeys: "Ctrl+点击添加区域 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · Ctrl+滚轮 缩放",
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
<li>把每个表情拖到对应插槽。<code>idle.png</code> 为必需；<code>talk_a/b/c.png</code> 是说话时的嘴部图片，<code>_blink</code> 版本负责说话时的眨眼。</li>
<li>用预览和图层（差异模式）检查对齐。</li>
<li>如果背景有干扰，使用魔棒、橡皮擦或魔法橡皮擦。</li>
<li>用“模拟动作模式”测试效果。</li>
<li>调整 <code>settings.ini</code> 的值，然后下载 ZIP。</li>
<li>解压 ZIP，把头像文件夹放到 Flood Tuber 插件查找的位置（参见插件的 README）。</li>
</ol>`,
    generating: "正在生成 ZIP...",
    success: "ZIP 已下载！",
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
    slotsTitle: "Sprite yuvaları",
    required: "zorunlu",
    clickOrDrop: "Tıklayın veya sürükleyin",
    previewTitle: "Önizleme / Üst üste bindirme (katmanlar)",
    stackEmpty: "Yığını görmek için idle.png ekleyin.",
    globalOpacity: "Genel opaklık:",
    diffMode: "Fark Modu",
    diffNormal: "Normal mod",
    toggleAll: "Tümünü göster / gizle",
    settingsTitle: "settings.ini",
    generateZip: "ZIP paketini oluştur ve indir",
    credits: "Expression yuvalarıyla uyumlu karakter oluşturucular:",
    idleRequired: "idle.png zorunludur!",
    simulate: "Paterni simüle et",
    simulateStop: "Simülasyonu durdur",
    simIdle: "BEKLEME",
    simTalking: "KONUŞUYOR",
    simAction: "AKSİYON",
    simBlink: "göz kırpma",
    wandBtn: "Sihirli değnek: arka planı sil",
    wandTitle: "Sihirli değnek",
    wandHint: "Arka planı şeffaf yapmak için üzerine tıklayın. Gerekirse toleransı ayarlayın.",
    wandTolerance: "Tolerans:",
    wandGlobal: "Bu renkteki tüm alanlar",
    wandInfo: "{n} px silindi",
    wandAnimWarn: "Animasyonlu GIF/APNG: yalnızca ilk kare işlenir.",
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
    wandRedo: "Yinele",
    wandKeys: "Ctrl+tık ile bölge ekle · Ctrl+Z geri al · Ctrl+Shift+Z yinele · Ctrl+tekerlek yakınlaştır",
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
<li>Her ifadeyi kendi yuvasına bırakın. <code>idle.png</code> zorunludur; <code>talk_a/b/c.png</code> konuşurken ağız görselleridir, <code>_blink</code> varyantları konuşurken göz kırpmayı yönetir.</li>
<li>Önizleme ve katmanlarla (Fark Modu) hizalamayı kontrol edin.</li>
<li>Arka plan sorun çıkarıyorsa sihirli değneği, silgiyi veya sihirli silgiyi kullanın.</li>
<li>"Paterni simüle et" ile davranışı test edin.</li>
<li><code>settings.ini</code> değerlerini ayarlayın, ardından ZIP'i indirin.</li>
<li>ZIP'i açın ve avatar klasörünü Flood Tuber eklentisinin aradığı yere koyun (eklentinin README dosyasına bakın).</li>
</ol>`,
    generating: "ZIP oluşturuluyor...",
    success: "ZIP indirildi!",
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
// Keyed by sprite file name, e.g. "idle.png". See the data model at the top of the file.
const slots = {};
const files = {}; // name -> File
const images = {}; // name -> { img, url }

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

  slots[name] = { dropzone, input, slot, wandBtn: null };

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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadFile(name, file);
    }
  });

  input.addEventListener('change', () => {
    if (input.files[0]) loadFile(name, input.files[0]);
  });
});

/**
 * The only place that fills `files` and `images` for a slot.
 * Called by drag-and-drop, the file picker, and the magic wand (to store the edited PNG).
 * Decodes the image, shows a thumbnail in the slot and refreshes the preview.
 * @param {string} name  slot file name, e.g. "talk_a.png"
 * @param {File}   file  the image to store
 */
function loadFile(name, file) {
  files[name] = file;
  dirty = true;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  img.onload = () => {
    images[name] = { img, url };
    const { dropzone, slot } = slots[name];
    dropzone.innerHTML = `<img src="${url}" alt="${name}">`;
    slot.classList.add('filled');
    slots[name].wandBtn.hidden = false;
    updatePreview();
  };
}

/**
 * Rebuilds the preview stack and the per-layer checkboxes from `images`.
 * Layers are stacked in the fixed `order` below (idle at the bottom). The first
 * loaded layer sets the size of the stack. Must be called after any change to `images`.
 */
function updatePreview() {
  stack.innerHTML = '';
  layerControls.innerHTML = '';

  // Stacking order: this list must match the slot names in index.html
  const order = [
    'idle.png', 'blink.png', 'action.png',
    'talk_a.png', 'talk_b.png', 'talk_c.png',
    'talk_a_blink.png', 'talk_b_blink.png', 'talk_c_blink.png'
  ];

  let firstName = null;
  let z = 1;
  order.forEach(name => {
    if (!images[name]) return;
    const { url } = images[name];
    if (firstName === null) firstName = name;

    const layerImg = document.createElement('img');
    layerImg.src = url;
    layerImg.alt = name;
    layerImg.style.zIndex = z++;
    layerImg.dataset.name = name;
    layerImg.style.opacity = document.getElementById('globalOpacity').value / 100;
    // The base layer is never blended; the others use difference when enabled
    layerImg.style.mixBlendMode = (diffMode && stack.children.length > 0) ? 'difference' : 'normal';
    stack.appendChild(layerImg);

    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" checked data-name="${name}"> ${name}`;
    label.querySelector('input').addEventListener('change', e => {
      layerImg.style.display = e.target.checked ? 'block' : 'none';
    });
    layerControls.appendChild(label);
  });

  stackEmpty.hidden = stack.children.length > 0;

  // Size the stack to the first (base) layer
  if (firstName) {
    const { img } = images[firstName];
    stack.style.width = img.naturalWidth + 'px';
    stack.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
  }
}

document.getElementById('globalOpacity').addEventListener('input', e => {
  document.querySelectorAll('#stack img').forEach(img => {
    img.style.opacity = e.target.value / 100;
  });
});

document.getElementById('diffMode').addEventListener('click', () => {
  diffMode = !diffMode;
  document.querySelectorAll('#stack img').forEach((img, i) => {
    img.style.mixBlendMode = (diffMode && i > 0) ? 'difference' : 'normal';
  });
  updateDiffLabel();
});

document.getElementById('toggleAll').addEventListener('click', () => {
  const checks = layerControls.querySelectorAll('input[type="checkbox"]');
  const allChecked = Array.from(checks).every(c => c.checked);
  checks.forEach(c => {
    c.checked = !allChecked;
    c.dispatchEvent(new Event('change'));
  });
});

/**
 * Serialises the settings form into the text of settings.ini.
 * The keys are read by Flood Tuber. Add a key here and in index.html only if
 * Flood Tuber supports it. Values are copied as typed (no validation).
 * @returns {string} the [Settings] section
 */
function generateSettingsIni() {
  const get = id => document.getElementById(id).value;
  const mirror = document.getElementById('mirror').checked ? '1' : '0';
  return `[Settings]
threshold=${get('threshold')}
release_delay=${get('release_delay')}
talking_speed=${get('talking_speed')}
blink_duration=${get('blink_duration')}
blink_interval_min=${get('blink_interval_min')}
blink_interval_max=${get('blink_interval_max')}
action_duration=${get('action_duration')}
action_interval_min=${get('action_interval_min')}
action_interval_max=${get('action_interval_max')}
motion_type=${get('motion_type')}
motion_speed=${get('motion_speed')}
motion_strength=${get('motion_strength')}
mirror=${mirror}
reference_height=${get('reference_height')}
`;
}

// ZIP export: requires idle.png, then writes <avatar name>/<slot files> and settings.ini
// into a JSZip archive and triggers a download.
document.getElementById('generateZip').addEventListener('click', async () => {
  const avatarName = document.getElementById('avatarName').value.trim() || 'My Avatar';
  const btn = document.getElementById('generateZip');
  const loader = document.getElementById('loader');
  const t = translations[currentLang];

  if (!files['idle.png']) {
    setStatus(t.idleRequired, 'bad');
    return;
  }

  btn.disabled = true;
  loader.hidden = false;
  setStatus(t.generating, 'busy');

  try {
    const zip = new JSZip();
    const folder = zip.folder(avatarName);

    // Add images with correct names
    for (const [name, file] of Object.entries(files)) {
      folder.file(name, file);
    }

    // Add settings.ini
    folder.file('settings.ini', generateSettingsIni());

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${avatarName.replace(/[^a-z0-9]/gi, '_')}_FloodTuber.zip`;
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
// state: 'IDLE' (resting), 'TALKING' (mouth animation), 'ACTION' (action.png shown).
// Timers are in seconds. `blinking` is independent of the main state.
const sim = {
  rafId: null,
  last: 0,
  state: 'IDLE',          // IDLE | TALKING | ACTION
  holdTimer: 0,           // time since last speech (release_delay)
  talkAnimTimer: 0,
  frameIdx: 0,            // 0, 1, 2 -> talk_a, talk_b, talk_c
  actionTimer: 0,
  nextAction: 0,
  blinkTimer: 0,
  blinking: false,
  nextBlink: 0,
  effectTimer: 0,
  speaking: false,
  speakTimer: 0
};

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
    talkInterval: Math.max(0.01, num('talking_speed')),
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

// Equivalent of select_avatar_texture(): picks the layer to display
function pickLayer() {
  if (sim.state === 'ACTION' && hasLayer('action.png')) return 'action.png';

  if (sim.state === 'TALKING') {
    const talk = ['talk_a.png', 'talk_b.png', 'talk_c.png'];
    const talkBlink = ['talk_a_blink.png', 'talk_b_blink.png', 'talk_c_blink.png'];
    let i = sim.frameIdx;
    // Fallbacks: if talk_c is missing, use talk_b; if talk_b is missing, use talk_a
    if (!hasLayer(talk[i]) && i === 2) i = 1;
    if (!hasLayer(talk[i]) && i === 1) i = 0;

    let pick = null;
    if (sim.blinking && hasLayer(talkBlink[i])) pick = talkBlink[i];
    else if (hasLayer(talk[i])) pick = talk[i];
    // Blink fallback when the "talking + blink" variant is missing
    if (sim.blinking && !hasLayer(talkBlink[i]) && hasLayer('blink.png')) pick = 'blink.png';

    return pick || 'idle.png';
  }

  if (sim.blinking && hasLayer('blink.png')) return 'blink.png';
  return 'idle.png';
}

function simStateText() {
  const t = translations[currentLang];
  const label = { IDLE: t.simIdle, TALKING: t.simTalking, ACTION: t.simAction }[sim.state];
  return sim.blinking ? `${label} · ${t.simBlink}` : label;
}

// One simulation step (same order as flood_tuber_tick)
function simTick(dt, p) {
  // Simulated speech: alternating bursts / silences
  sim.speakTimer -= dt;
  if (sim.speakTimer <= 0) {
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
      sim.frameIdx = (sim.frameIdx + 1) % 3;
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

  // Blinks (only if blink.png is loaded)
  if (hasLayer('blink.png')) {
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
 * Starts the "Simulate pattern" loop (requestAnimationFrame). Requires idle.png.
 * Resets the simulation state, then calls simTick() once per frame.
 */
function startSimulation() {
  if (!files['idle.png']) {
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
    nextAction: p.actionMin,
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
// Their union (combinedMask) is rendered as transparency. "Apply" writes the result back
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
const wand = {
  name: null, data: null, w: 0, h: 0,
  flood: null, manual: null, mask: null, removed: 0,
  seeds: [], animated: false, // seeds: pixel indices of the clicked points (Ctrl+click adds one)
  tool: 'flood', stroke: null, history: [], redo: [], zoom: 0 // zoom 0 = fit to window
};
const originals = {}; // name -> original File, for "Restore original"

/**
 * Opens the magic wand editor for slot `name` with a fresh copy of its pixels.
 * Animated GIF/APNG are detected here: only the first frame is edited.
 * @param {string} name  slot file name
 */
function openWand(name) {
  if (!images[name]) return;
  const img = images[name].img;
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);

  const f = files[name];
  Object.assign(wand, {
    name, data: cx.getImageData(0, 0, w, h), w, h,
    flood: null, manual: null, mask: null, removed: 0, seeds: [],
    history: [], redo: [], stroke: null, grow: 0,
    animated: !!f && (f.type === 'image/gif' || /\.(gif|apng)$/i.test(f.name))
  });

  wandCanvas.width = w;
  wandCanvas.height = h;
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
 * @param {Uint8Array|null} mask
 * @returns {ImageData}
 */
function buildOutput(mask) {
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
  wandCtx.putImageData(out, 0, 0);

  const t = translations[currentLang];
  const parts = [];
  if (removed > 0) parts.push(t.wandInfo.replace('{n}', removed));
  if (wand.seeds.length > 1) parts.push(t.wandZones.replace('{n}', wand.seeds.length));
  if (wand.animated) parts.push(t.wandAnimWarn);
  wandInfo.textContent = parts.join(' · ');
}

/**
 * Recomputes the wand selection: the union of the flood fill of every seed point.
 * Called when a point is clicked, and when the tolerance or "All areas" change.
 */
function refreshWandMask() {
  if (!wand.seeds.length) {
    wand.flood = null;
    renderWand();
    return;
  }
  const tol = Number(wandTol.value);
  const global = wandGlobal.checked;
  const union = new Uint8Array(wand.w * wand.h);
  for (const seed of wand.seeds) {
    const { mask } = computeMask(seed, tol, global);
    for (let i = 0; i < union.length; i++) {
      if (mask[i]) union[i] = 1;
    }
  }
  wand.flood = union;
  renderWand();
}

function snapshotWand() {
  return {
    flood: wand.flood ? wand.flood.slice() : null,
    manual: wand.manual ? wand.manual.slice() : null,
    seeds: wand.seeds.slice()
  };
}

function restoreWand(s) {
  wand.flood = s.flood;
  wand.manual = s.manual;
  wand.seeds = s.seeds.slice();
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
}

function canvasPoint(e) {
  const rect = wandCanvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - rect.left) * wand.w / rect.width),
    y: Math.floor((e.clientY - rect.top) * wand.h / rect.height)
  };
}

// Erases a disc of pixels; in "magic eraser" mode, only the start point's colour
function paintAt(x, y) {
  const { w, h } = wand;
  const r = Number(wandSize.value);
  const r2 = r * r;
  const d = wand.data.data;
  const thr = Number(wandTol.value) * 2.55;
  if (!wand.manual) wand.manual = new Uint8Array(w * h);
  const magic = wand.tool === 'magic';
  const seed = wand.stroke ? wand.stroke.seed : 0;

  for (let dy = -r; dy <= r; dy++) {
    const py = y + dy;
    if (py < 0 || py >= h) continue;
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const px = x + dx;
      if (px < 0 || px >= w) continue;
      const i = py * w + px;
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
  b.addEventListener('click', () => setTool(b.dataset.tool));
});

// ---------- Brush preview (Eraser / Magic eraser) ----------
// A translucent circle follows the pointer and shows the area the brush will clear,
// at the current Size (in image pixels, scaled to the zoom level on screen).
const brushCursor = document.createElement('div');
brushCursor.className = 'brush-cursor';
brushCursor.hidden = true;
wandCanvas.parentElement.appendChild(brushCursor);
let brushPointer = null; // last pointer position over the canvas (client coordinates)

/** Shows, moves or hides the brush circle depending on the tool and pointer position. */
function updateBrushCursor() {
  const isBrush = wand.tool === 'eraser' || wand.tool === 'magic';
  if (!isBrush || !brushPointer || !wand.data) {
    brushCursor.hidden = true;
    return;
  }
  const cr = wandCanvas.getBoundingClientRect();
  const inside = brushPointer.x >= cr.left && brushPointer.x <= cr.right &&
                 brushPointer.y >= cr.top && brushPointer.y <= cr.bottom;
  if (!inside) {
    brushCursor.hidden = true;
    return;
  }
  // Position relative to the scrollable wrapper, so it stays under the pointer when scrolled
  const wrap = wandCanvas.parentElement;
  const wr = wrap.getBoundingClientRect();
  const diameter = 2 * Number(wandSize.value) * displayScale();
  brushCursor.style.width = diameter + 'px';
  brushCursor.style.height = diameter + 'px';
  brushCursor.style.left = (brushPointer.x - wr.left + wrap.scrollLeft) + 'px';
  brushCursor.style.top = (brushPointer.y - wr.top + wrap.scrollTop) + 'px';
  brushCursor.classList.toggle('is-magic', wand.tool === 'magic');
  brushCursor.hidden = false;
}

wandCanvas.addEventListener('pointermove', e => {
  brushPointer = { x: e.clientX, y: e.clientY };
  updateBrushCursor();
});
wandCanvas.addEventListener('pointerleave', () => {
  brushPointer = null;
  brushCursor.hidden = true;
});
wandSize.addEventListener('input', updateBrushCursor);
document.querySelectorAll('.tool').forEach(b => b.addEventListener('click', updateBrushCursor));

document.getElementById('wandUndo').addEventListener('click', undoWand);
document.getElementById('wandRedo').addEventListener('click', redoWand);

// Editor shortcuts (only while the editor is open)
document.addEventListener('keydown', e => {
  if (!wandDialog.open || !(e.ctrlKey || e.metaKey)) return;
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

wandCanvas.addEventListener('pointerdown', e => {
  if (!wand.data || e.button !== 0) return;
  const p = canvasPoint(e);
  if (wand.tool === 'flood') {
    if (p.x < 0 || p.y < 0 || p.x >= wand.w || p.y >= wand.h) return;
    pushHistory();
    const seed = p.y * wand.w + p.x;
    // Ctrl+click (Cmd+click on Mac) adds a zone; a plain click starts a new selection
    if (e.ctrlKey || e.metaKey) wand.seeds.push(seed);
    else wand.seeds = [seed];
    refreshWandMask();
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
  if (!m || !m.some(v => v)) {
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
    loadFile(name, new File([blob], name, { type: 'image/png' }));
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
