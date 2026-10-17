/* 字体选择器：与 settings.js 的同步 setter 分离；只加载当前选择的字体。
   ----------------------------------------------------------------------------
   *** 这份清单必须与下面两处逐字一致，否则点了不生效 ***
     1. themes/fomalhaut/source/css/_custom/custom.css 的「字体引入」一节（@font-face 的 family 名）
     2. source/js/modules/settings.js 的 FONT_LIST / CODE_FONT_LIST 白名单
   为什么三处都要一致：面板按钮 id 是 swf_ / swfc_ + family 名，点按钮时这里会先
   document.fonts.load('16px "family"') 探一下 —— 探不到（没有对应的 @font-face）就判定
   「字体未能加载」直接放弃；而 settings.js 的白名单管的是「刷新后还在不在」，
   不在白名单里的值每次刷新都会被写回默认值。v1.0.6 之前这三份清单各写各的
   （面板 12 个 / @font-face 6 个 / 白名单 4+3 个），结果 8 个正文选项里有 7 个点了没反应。

   选字原则：全部为 SIL OFL 1.1 的开源可商用字体，全部有真实可用的单文件 woff2，
   全部来自 jsDelivr 上的 @fontsource/* 包。加字体时三处一起加。 */
var APPEARANCE_TEXT_FONTS = [
  ['LXGW', '霞鹜文楷', '温润文楷 · 默认', 'reading'],
  ['LXGWNeoXiHei', '霞鹜新晰黑', '清晰黑体 · 技术文章', 'reading'],
  ['SourceHanSerif', '思源宋体', '书卷气 · 随笔', 'reading'],
  ['default', '系统默认', '无需下载 · 跟随设备', 'reading'],
  ['ZCOOLKuaiLe', '站酷快乐体', '圆润可爱 · 短句', 'decorative'],
  ['MaShanZheng', '马善政毛笔楷书', '个性书写 · 标题', 'decorative'],
  ['LongCang', '龙藏体', '毛笔行草 · 装饰', 'decorative']
];
var APPEARANCE_CODE_FONTS = [
  ['JetBrainsMono', 'JetBrains Mono', '经典等宽 · 默认'],
  ['FiraCode', 'Fira Code', '连字友好 · 等宽'],
  ['SourceCodePro', 'Source Code Pro', 'Adobe 出品 · 等宽'],
  ['MapleMono', 'Maple Mono', '柔和圆润 · 等宽'],
  ['Hack', 'Hack', '辨识度优先 · 等宽']
];
/* 旧版面板留下的 family 名 → 新名字。只用于把访客已有的 localStorage 迁移过来，
   别处不要引用；查不到映射的值交给 settings.js 的白名单逻辑回落到默认。 */
var APPEARANCE_FONT_ALIASES = {
  LXGWScreen: 'LXGW',      // 霞鹜文楷Screen 没有可用的单文件 woff2，直接并回 LXGW
  ZhuZiAWan: 'ZCOOLKuaiLe',// 筑紫A丸无开源版本，换成气质相近的站酷快乐体
  HYTMR: 'MaShanZheng',    // 汉仪唐美人 → 马善政毛笔楷书
  TTQHB: 'LongCang',       // 甜甜圈海报 → 龙藏体
  Monaco_1: 'JetBrainsMono',
  Consolas_1: 'FiraCode',
  MapleMono_1: 'MapleMono',
  Hack_1: 'Hack'
};
var appearanceFontStates = { text: { seq: 0, cancel: null }, code: { seq: 0, cancel: null } };
var APPEARANCE_FONT_TIMEOUT = 12000;
function appearanceFontList(kind) { return kind === 'code' ? APPEARANCE_CODE_FONTS : APPEARANCE_TEXT_FONTS; }
function appearanceFontKey(kind) { return kind === 'code' ? 'codeFont' : 'font'; }
/* 把旧 family 名换成新的；不在映射表里就原样返回（交给白名单逻辑处理）。 */
function appearanceFontMigrate(key) {
  if (!key) return key;
  return Object.prototype.hasOwnProperty.call(APPEARANCE_FONT_ALIASES, key) ? APPEARANCE_FONT_ALIASES[key] : key;
}
function appearanceFontFamily(key) {
  return key === 'default' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Lato, Roboto, 'PingFang SC', 'Microsoft JhengHei', 'Microsoft YaHei', sans-serif" : '"' + key + '", system-ui, sans-serif';
}
function appearanceFontStatus(kind, message, error) {
  var el = document.getElementById('ap-' + kind + '-status');
  if (el) { el.textContent = message; el.dataset.state = error ? 'error' : 'ready'; }
}
function syncAppearanceFonts() {
  ['text', 'code'].forEach(function(kind) {
    var selected = localStorage.getItem(appearanceFontKey(kind));
    var item = appearanceFontList(kind).find(function(f) { return f[0] === selected; });
    appearanceFontList(kind).forEach(function(f) {
      var el = document.getElementById((kind === 'code' ? 'swfc_' : 'swf_') + f[0]);
      if (el) el.setAttribute('aria-pressed', String(selected === f[0]));
    });
    var current = document.getElementById('ap-' + kind + '-current');
    if (current) current.textContent = '当前 · ' + (item ? item[1] : '默认字体');
    var preview = document.getElementById('ap-' + kind + '-preview');
    if (preview && item) preview.style.fontFamily = appearanceFontFamily(selected);
  });
}
function initAppearanceFonts() {
  syncAppearanceFonts();
  ['text', 'code'].forEach(function(kind) {
    appearanceFontStatus(kind, appearanceFontStates[kind].cancel ? '字体加载中，当前字体保持不变…' : '点击选项加载并应用，自动保存；失败时可重新点击重试。');
  });
}
function cancelAppearanceFont(kind) {
  var state = appearanceFontStates[kind];
  state.seq++;
  if (state.cancel) state.cancel();
}
function cancelAppearanceFonts() { cancelAppearanceFont('text'); cancelAppearanceFont('code'); }
function chooseAppearanceFont(key, kind) {
  if (typeof kind === 'undefined') kind = 'text';
  if (kind !== 'text' && kind !== 'code') return Promise.resolve(false);
  var item = appearanceFontList(kind).find(function(f) { return f[0] === key; });
  if (!item) return Promise.resolve(false);
  cancelAppearanceFont(kind);
  var state = appearanceFontStates[kind], seq = state.seq;
  function apply() {
    if (state.seq !== seq) return false;
    if (kind === 'code') setCodeFont(key); else setFont(key);
    syncAppearanceFonts();
    appearanceFontStatus(kind, item[1] + '已应用，自动保存。');
    return true;
  }
  if (key === localStorage.getItem(appearanceFontKey(kind)) || key === 'default') return Promise.resolve(apply());
  if (!document.fonts || typeof document.fonts.load !== 'function') {
    appearanceFontStatus(kind, '此浏览器无法确认字体加载，已保留当前字体；可选择系统默认。', true);
    return Promise.resolve(false);
  }
  appearanceFontStatus(kind, '正在加载 ' + item[1] + '，当前字体保持不变…');
  return new Promise(function(resolve) {
    var settled = false, timer;
    function finish(ok, message) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (state.cancel === cancel) state.cancel = null;
      if (state.seq !== seq) { resolve(false); return; }
      if (ok) resolve(apply());
      else { if (message) appearanceFontStatus(kind, message, true); resolve(false); }
    }
    function cancel() { finish(false, ''); }
    state.cancel = cancel;
    timer = setTimeout(function() { finish(false, '字体加载超时，已保留当前字体；点击同一选项可重试。'); }, APPEARANCE_FONT_TIMEOUT);
    var sample = kind === 'code' ? 'const value = 0; // 0O 1lI {} [] () => 中文' : '清风翻书，阅读让世界更清晰。 Abc 0123456789';
    try {
      Promise.resolve(document.fonts.load('16px "' + key + '"', sample)).then(function(faces) {
        finish(!!faces && faces.length > 0, '字体未能加载，已保留当前字体；点击同一选项可重试。');
      }, function() { finish(false, '字体加载失败，已保留当前字体；点击同一选项可重试。'); });
    } catch (err) { finish(false, '字体加载失败，已保留当前字体；点击同一选项可重试。'); }
  });
}
function resetAppearanceFonts() {
  cancelAppearanceFonts();
  setFont('LXGW');
  setCodeFont('JetBrainsMono');
  initAppearanceFonts();
  appearanceFontStatus('text', '已恢复霞鹜文楷，仅重置字体。');
  appearanceFontStatus('code', '已恢复 JetBrains Mono，不影响背景、主题色及其他偏好。');
}
function appearanceFontOptions(items, kind) {
  return items.map(function(f) {
    var prefix = kind === 'code' ? 'swfc_' : 'swf_';
    return '<button type="button" class="ap-font-option" id="' + prefix + f[0] + '" data-font-kind="' + kind + '" aria-pressed="false" onclick="chooseAppearanceFont(&quot;' + f[0] + '&quot;,&quot;' + kind + '&quot;)"><span class="ap-font-name">' + f[1] + '</span><small>' + f[2] + '</small><span class="ap-check" aria-hidden="true">✓</span></button>';
  }).join('');
}
function appearanceFontMarkup() {
  return '<section class="ap-panel ap-font-panel" aria-label="字体选择">' +
    '<div class="ap-section-head"><div><p class="ap-eyebrow">阅读的声音</p><p class="ap-hint">先看同一段文字，再选喜欢的字体；预览区随当前选择更新。</p></div><button type="button" class="ap-btn" onclick="resetAppearanceFonts()">恢复字体默认</button></div>' +
    '<h3 class="ap-subtitle">阅读优先</h3><div id="swfs" class="ap-font-grid">' + appearanceFontOptions(APPEARANCE_TEXT_FONTS.filter(function(f) { return f[3] === 'reading'; }), 'text') + '</div>' +
    '<details class="ap-details"><summary>个性装饰 · 更适合标题与短句</summary><div class="ap-font-grid">' + appearanceFontOptions(APPEARANCE_TEXT_FONTS.filter(function(f) { return f[3] === 'decorative'; }), 'text') + '</div></details>' +
    '<div class="ap-preview"><p id="ap-text-current" class="ap-current"></p><p id="ap-text-preview" class="ap-text-sample">清风翻书，阅读让世界更清晰。<br>每一次停顿，都让文字有了呼吸。<br>Abc · 0123456789</p></div><p id="ap-text-status" class="ap-status" role="status" aria-live="polite"></p>' +
    '<h3 class="ap-subtitle">代码字体</h3><div id="swfs_code" class="ap-font-grid ap-code-grid">' + appearanceFontOptions(APPEARANCE_CODE_FONTS, 'code') + '</div>' +
    '<div class="ap-preview"><p id="ap-code-current" class="ap-current"></p><pre id="ap-code-preview" class="ap-code-sample">const greeting = "Hello, 世界";\n// 字形对比：0O · 1lI · {} [] ()\nconst values = [0, 1, 10];\nvalues.map(value =&gt; value + 1);</pre></div><p id="ap-code-status" class="ap-status" role="status" aria-live="polite"></p>' +
    '<details class="ap-details ap-license"><summary>字体来源与授权说明</summary><p class="ap-hint">全部为 SIL OFL 1.1 开源可商用字体，走 jsDelivr 上的 @fontsource/* 包（Hack 用官方 hack-font 的 web 构建）：霞鹜文楷 LXGW WenKai、思源黑体/宋体 Noto Sans/Serif SC、站酷快乐体 ZCOOL KuaiLe、马善政毛笔楷书 Ma Shan Zheng、龙藏体 Long Cang、JetBrains Mono、Fira Code、Source Code Pro、Maple Mono、Hack。装饰字体更适合标题或短句，正文长文请用阅读组。</p></details></section>';
}
