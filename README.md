# hexo-theme-fomalhaut · v1.0.15

> 一套「克隆即用」的 Hexo 卡片式博客源码。主题基于 [Butterfly 4.3.1](https://butterfly.js.org/) 深度二次开发，
> 并把**站点配置**与**主题代码**彻底分开：改配置就能搭起自己的站，升级主题不会冲掉你自己的改动。

![hexo](https://img.shields.io/badge/Hexo-6.3.0-0e83c?style=flat-square&logo=hexo)
![node](https://img.shields.io/badge/Node.js-18%20%7C%2020%20%7C%2022-339933?style=flat-square&logo=nodedotjs)
![theme](https://img.shields.io/badge/Theme-Fomalhaut%20v1.0.15-6513df?style=flat-square)
![license](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)
![stars](https://img.shields.io/github/stars/MuyuDada/hexo-theme-fomalhaut?style=flat-square&logo=github&label=Stars)
![forks](https://img.shields.io/github/forks/MuyuDada/hexo-theme-fomalhaut?style=flat-square&logo=github&label=Forks)

[界面预览](#六界面预览) · [快速开始](#五快速开始约-10-分钟) · [功能配置](#八主要功能怎么配) · [写文章](#九怎么开始写文章) · [文件地图](#七目录结构与文件地图) · [常见改动](#十最常改的地方速查)

---

## 目录

- [更新日志](#更新日志)
- [一、这是什么](#一这是什么)
- [二、项目架构](#二项目架构)
- [三、相比上一版改了什么](#三相比上一版改了什么)
- [四、环境要求](#四环境要求)
- [五、快速开始（约 10 分钟）](#五快速开始约-10-分钟)
- [六、界面预览](#六界面预览)
- [七、目录结构与文件地图](#七目录结构与文件地图)
- [八、主要功能怎么配](#八主要功能怎么配)
- [九、怎么开始写文章](#九怎么开始写文章)
- [十、最常改的地方（速查）](#十最常改的地方速查)
- [十一、外挂标签速查](#十一外挂标签速查)
- [十二、部署](#十二部署)
- [十三、常见问题](#十三常见问题)
- [十四、授权与致谢](#十四授权与致谢)

---

## 更新日志

### v1.0.15 — 美化面板字体统一：懒渲染面板纳入收集 + 两处硬编码系统字体（2026-10-24）

v1.0.13 修完正文缺字后，美化设置面板里还是一堆字不一样。查下来是两类问题叠在一起：

**一、面板里的粗体标签整片回落**

`氛围特效 / 霓虹彩灯 / 萤火虫微光 / 昼夜切换 / 霞鹜文楷 / 站酷快乐体 / 龙藏体 …` 计算样式明明是 `LXGW` + `weight:600`，实际却由微软雅黑渲染 —— 700 档子集里没有这些字。

原因是面板由 `createWinbox()` 在**点开时才**创建，页面加载完的 DOM 里根本没有这些节点。收集脚本只扫首屏，自然一个都收不到。

收集器补了采集前钩子（默认先 `createWinbox()`）：

```bash
node tools/collect-bold-chars.cjs --json .bold-chars.json   # 1156 个粗体字（原 1124）
python tools/subset-bold-font.py                            # 1192 码位 / 261912 B
```

相对时间这类 JS 动态文案（1 分钟内是「刚刚」，之后变「N 分钟前」）没法靠某一次采集命中，改成固定进安全集。

**二、两处 CSS 直接把字体写死**

| 位置 | 原值 | 现象 |
| --- | --- | --- |
| `.settings .ap-current`（「当前 · 霞鹜文楷」） | `system-ui, sans-serif` | 整行都是系统字体 |
| `.winbox .wb-title`（标题栏「美化设置」） | `Arial, sans-serif` | 中文落到 Noto Sans SC |

标题栏那处有个坑：WinBox 是**运行时**才往 head 里注入 `.wb-title{font-family:Arial,…}` 的 `<style>`，排在 `index.css` 之后，同特异性直接压过我们 —— 选择器必须写成 `.winbox .wb-title`（0,2,0）。

复核（CDP `getPlatformFontsForNode`，面板打开状态下）：微软雅黑节点 **16 → 0**，只剩 emoji 与 Font Awesome 图标。

### v1.0.14 — 修好线上小猫加载图 404：`images/` 规则误伤 `source/assets/images/`（2026-10-24）

全屏加载动画的像素小猫在生产环境**一直没显示过**，本地却完全正常。原因是它压根没进仓库：

```
.gitignore:28  images/      ← 匹配任意层级的 images 目录
source/assets/images/loading-cat.gif   → 被静默忽略，从未提交
```

本地文件在磁盘上，所以 `hexo generate` 照样拷进 `public/`；Netlify 从仓库构建，自然拿不到：

```bash
curl -o /dev/null -w '%{http_code}' https://muyublog.netlify.app/assets/images/loading-cat.gif
# 404
```

改法是把规则锚定到根目录（`images/` → `/images/`），再把文件补进仓库。顺手核了一遍 `source/assets` 下 46 个文件与 git 跟踪数，只有这一个漏网。

> 这类问题不会报错也不会进 CI —— 构建通过、页面正常，只是少一张图。以后加 `source/` 下的静态资源，记得 `git status` 里能看到它。

### v1.0.13 — 粗体缺字修复：700 档子集按 110 页重建（2026-10-24）

正文 400 档走官方 97 片 `unicode-range`，缺字会自动落到别的片；**700 档不是**——它是「只含站点实际粗体字」的自托管子集，子集里没有的字会直接掉到系统字体，于是页面上就出现「个别字跟旁边不一样」。

上一版按 80 个页面收集。之后新增的文章带进了新的粗体字，`/posts/3ab5b430` 上就有六个字被微软雅黑接管：

```
缝 透 允 批 契 阴
```

用 `CSS.getPlatformFontsForNode` 复现（`document.fonts.check()` 对缺字一律返回 true，不能用来判断）：

```
[Microsoft YaHei(1)] 允许容器把它压到「能折行的宽度」
```

重跑收集 + 重建子集：110 个页面、1124 个粗体字、1160 个码位、**254124 B**（+31 KB）。缺的 28 个仍是 emoji，文楷本来就没有。顺手给 `src` 补了 `?v=` 缓存串。

流程固化成两个脚本，以后新增粗体文案照跑即可：

```bash
npx hexo clean && npx hexo generate
node tools/collect-bold-chars.cjs --json .bold-chars.json   # CDP 遍历全站，取 computedStyle 粗体节点
python tools/subset-bold-font.py                            # 合并旧码位后重新 subset
```

`node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**（`custom.css` 的基线哈希已同步）。

### v1.0.12 — 文章封面与资料卡背景改走随机图片 API（2026-10-19）

站点一直在用 [栗次元](https://t.alcy.cc) 的 `https://t.alcy.cc/pc` 做整页背景。这次把**文章封面**和**侧栏资料卡背景**也接上同一套随机图。

#### 1. 为什么不用分类直出端点

`https://t.alcy.cc/moe` 这种端点**同一个 URL 每次请求返回不同图片**（实测连续两次 331546 / 666330 B），`Cache-Control: max-age=2592000` 完全失效，每次刷新都要重新下几百 KB。

改用 JSON 接口拿**稳定 pic 路径**：

```
GET https://t.alcy.cc/json?moe=12
-> {"data":[{"id":"29.webp","link":"https://t.alcy.cc/pic/moe/29.webp"}, ...]}
```

稳定路径带 `Cache-Control: max-age=2592000` + `EO-Cache-Status: HIT`，同一 URL 内容恒定，浏览器能真缓存。

#### 2. `?w=` 是唯一有效的缩图参数（关键发现）

| 参数 | 结果 |
| --- | --- |
| `?w=640` | ✅ 200，1.1 MB 原图 → **30-50 KB** |
| `?width=` `?size=` `?s=` `?q=` | ❌ 都是在换图，不是缩图 |
| `?w=400` | ❌ 返回 0 字节 |
| `?imageMogr2/thumbnail/400x` `?x-oss-process=…` `?imageView2/…` | ❌ 200 但 Content-Length 与原图完全相同（参数被忽略） |

#### 3. 实现（`source/js/inject/random-images.js`）

- 四个分类 `moe / xhl / fj / pc` 各取 12 条，合并成一个池子存 `localStorage`（键 `muyu_random_pool_v1`，TTL 一天）。
- 每次刷新从池里随机分配：封面走 `?w=640`，资料卡走 `?w=600`。
- 覆盖面：
  - `.recent-post-cover img.article-cover` —— 首页文章卡片（314×200）
  - `.article-sort-item-img img` —— `/archives/` 时间线缩略图（96×72）
  - `img.prev-cover` / `img.next-cover` —— 文章页上下篇卡
  - `#aside-content > .card-widget.card-info` —— 侧栏资料卡背景（330×410）
- **必须写 `data-lazy-src` 而不是 `src`**：主题的 `themes/fomalhaut/scripts/filters/post_lazyload.js:13` 会把页面里每个 `<img>` 换成 1×1 占位 gif 并把真地址挪到 `data-lazy-src`，脚本要在 lazyload 扫描前改写这个属性，改完再调 `window.lazyLoadInstance.update()`。
- **接口全挂时静默退出**，保持主题原有的 12 张本地 `.avif`，不会出现空白封面。
- 回滚：删掉 `_config.fomalhaut.yml` 里那行 `<script>` 即可。

#### 4. 顺带修的一个老 bug（`themes/fomalhaut/scripts/helpers/inject_head_js.js`）

`saveToLocal.get()` 直接 `JSON.parse` 读到的值。若 `localStorage` 里存的是裸字符串（例如 `localStorage.setItem("theme","dark")`），会抛 `SyntaxError: Unexpected token 'd', "dark" is not valid JSON`，**并且中断同一个 `<script>` 内后续的 `<html>` 属性初始化**（`data-theme` / `hide-aside` 全部失效）。改成 `try/catch` + 非对象直接丢弃，坏数据顺手清键。

#### 5. 验证

- 首页 9 张封面、归档 12 张缩略图、文章页上下篇 2 张、资料卡背景，**全部命中随机图**。
- pjax 换页（首页 → 归档 → 标签 → 首页）四态均正确重分配。
- 1440 / 420 两档、浅色 / 深色全部正常；`node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**。

### v1.0.11 — 正文字体改走 jsDelivr 官方分片 + 700 档精简（2026-10-19）

把 v1.0.10 的自托管单文件子集换成上游官方的 **97 片 unicode-range 方案**，顺带把 700 档从 970 KB 压到 223 KB。

#### 1. 400 档：官方分片（`source/assets/fonts/lxgw-screen-cdn/lxgwwenkaiscreen.css`）

`lxgw-wenkai-screen-webfont@1.7.0` 打包了 97 个 `@font-face`，每块自带 `unicode-range`，浏览器只下载本页真正用到的片。清单 CSS 自托管（110791 B），但里面 97 条 `url()` 已全部改写成 jsDelivr 绝对地址 —— 19 MB 的分片不跟仓库走。

- **family 改名**：清单原本注册 `'LXGW WenKai Screen'`，而全站字体链（`settings.js` 的 `FONT_LIST` / `--global-font` / 美化面板按钮 id）读的都是字面量 `LXGW`。清单既已本地化，就直接把 97 处 `font-family` 改成 `LXGW`，省掉一层别名；
- **必须用 `<link>` 不能用 `@import`**：`custom.css` 被 `index.styl` 打包进 `index.css`，`@import` 落在第 338 行（前面已有大量规则），CSS 规范要求 `@import` 必须排在所有规则之前，否则整条被浏览器丢弃。改由 `_config.fomalhaut.yml:983` 的 `inject.head` 引入；
- **去掉字体 preload**：分片方案下预载单个整包没有意义，反而白下一份用不到的整包；
- 三处同步：`custom.css` 的 `@font-face` 换成说明注释、`_config.fomalhaut.yml` 的 preload 换成 `<link>`、`source/box/astronomy/voyager.html:10` 同样改 `@import`。

实测覆盖（`.chkfont2.cjs`，CDP `CSS.getPlatformFontsForNode`）：报障 14 字「窝页宝为风给电脑状态加载标签」**全部真实由 `LXGW WenKai Screen` 渲染**，`#site-title` / `.article-title` / `.footer-brand-name` 等粗体节点走 `LXGW WenKai Lite Medium`。全站 19 个页面 1671 个粗体文本节点，**字体回落 0 处**。

#### 2. 700 档：按实际用字精简（`source/assets/fonts/lxgw-wenkai-subset-700.woff2`）

分片方案只提供 400，粗档仍要用自托管的 Lite Medium。原来那份是整包 970548 B，现在按站点真实用字重建：

- 用 CDP 遍历 `public` 下**全部 80 个页面**，按计算样式筛出「家族首项是 LXGW 且 `font-weight >= 600`」的文本节点，收集去重得到 **1044 个粗体字符**；
- 补数字、大小写字母、常用中英标点与符号（共 1089 个字符，源里命中 1064 个），`fontTools.subset` 输出 **223132 B**；
- 缺的 25 个码位**全是 emoji**（📌 👎 🧩 🌿 🍔 💻 🙏 🔧 🖼 🎨 ✨ 🕸 🛰 📦 🧰 📁 🧑 📃 📇 📮 🚀 🔗 🧪 等），文楷本来就不含，回落到系统 emoji 字体是正确的。

#### 3. 每页字体成本（`performance.getEntriesByType('resource')`，禁缓存实测）

| 页面 | CDN 分片 | 本地 700 档 | 合计 |
| --- | --- | --- | --- |
| 首页 | 24 片 / 1213.6 KB | 135.1 KB | 1348.7 KB |
| 归档 | 18 片 / 895.0 KB | 135.1 KB | 1030.1 KB |
| 留言板 | 17 片 / 831.7 KB | 135.1 KB | 966.9 KB |
| 文章页 | 31 片 / 1472.2 KB | 135.1 KB | 1607.3 KB |

> 分片方案比单文件子集（固定 1084208 B）更费字节，但用户指定要这个方案。回滚路径：删掉 `inject.head` 的 `<link>`，恢复 `custom.css` 里被注释掉的 `@font-face` 即可。

#### 4. 测试

`node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**。`tools/tests/navigation.test.cjs:99` 的 `custom.css` SHA256 基线第五次复核，更新为 `af283326fa871d3338be5f9e9cd17f0d1dbc7d2164641cd8960d412771fd81bc`（LF 规范化后）。

### v1.0.10 — 屏幕阅读版字体 + 像素小猫加载动画 + 导航切换过渡（2026-10-19）

三件事：正文默认字体换成「霞鹜文楷·屏幕阅读版」，全屏加载动画换成像素小猫，导航在滚动切换时的过渡对齐 miraii.cn。

#### 1. 默认字体换成 LXGW WenKai Screen（`themes/fomalhaut/source/css/_custom/custom.css`）

上游 `lxgw/LxgwWenKai-Screen` 的 `v1.522` 发布 `LXGWWenKaiScreen.ttf`（25673994 B）。它的 upem 是 **2048**、ascender 1900 / descender -500，跟旧子集的 1000 / 928 / -256 不同，但 28 个抽样字的 advance 换算到同一 upem 后**逐字一致**（worst 0.0 units），换上去不会撑动版面。

- 子集化：把旧子集的 4752 个码位导出成 `unicodes.txt`，`fontTools.subset --flavor=woff2 --layout-features=kern,liga,vert,locl,ccmp --glyph-names` → `source/assets/fonts/lxgw-screen-subset-400.woff2`（**1084208 B**）；
- Screen 上游**只有 Regular 一个权重**，没有 Medium/Bold，所以 400 档换 Screen、**700 档继续用旧文楷 Medium**（`lxgw-wenkai-subset-700.woff2`）；
- 新码位只比旧子集**少 6 个**（U+2680–U+2685 骰子符号，站点不用），其余全覆盖；
- 三处同步：`custom.css` 的 `@font-face` src、`_config.fomalhaut.yml` 的字体 preload、`source/box/astronomy/voyager.html` 的内联 `@font-face`。

> 验证只能用 CDP `CSS.getPlatformFontsForNode` —— `document.fonts.check()` 对这些字全返回 true（只表示有匹配 face，不代表含该字形），canvas 差分与 `measureText` 同样假阴性。

#### 2. 全屏加载动画换成像素小猫（`source/css/page-loader-cat.css` + `load_style/pagecat.pug` + `loading-js.pug`）

视觉整套移植自 Firefly-yuan 的 `PageLoader`：像素对话框（4 向 `box-shadow` 做描边）+ 会眨眼的小猫 + 顶气泡台阶 + 两颗像素星 + 6 段纵向渐变的汉堡进度条（刻度线 + 芝麻），文案「小猫正在准备汉堡…」「喵～马上就好」。

- 猫图 `source/assets/images/loading-cat.gif`（24878 B，112×112 像素画）；**注意不能写成 `<img>`** —— 主题的 `scripts/filters/post_lazyload.js:13` 会把所有 `<img>` 换成 1×1 占位，改用 `span` 的 `background-image` 绕开；
- 遮罩底色浅色 `rgba(207,246,247,0.94)` / 深色 `rgba(25,25,25,0.94)`，配 `backdrop-filter: blur(14px) saturate(1.1)`；
- 新增 `pagecat` 这个 `load_style` 值（`loading.pug` 的 `case` 加分支 + `_config.fomalhaut.yml` 改 `preloader.load_style: pagecat`），原 `heo` 保留可回滚；
- `#loading-box` 这个 id 与 `window.preloader.initLoading/endLoading` 是硬契约（`pjax.pug`、`source/js/pjax-guard.js` 都依赖），一个都没动；
- `loading-js.pug` 顺带修了原来的 `window.addEventListener("load", preloader.endLoading())` —— **多了个括号**，加载事件还没来就先执行了，遮罩秒收。改成真正等 `load`，并加 650ms 最短可见时长（否则本地秒开根本看不见动画）。

#### 3. 导航滚动切换的过渡（`source/css/nav-pill.css`）

上一版玻璃条是**硬切**的：滚过阈值那一帧 `::before` 的 alpha 直接跳到 0.82，观感是「啪」地糊上来一整条。对齐 miraii.cn 的曲线 —— `opacity 0.18s ease` + `transform 0.24s cubic-bezier(0.2,0,0,1)`，未滚动态 `opacity:0; translateY(-6px)`，滚动态 `opacity:1; translateY(0)`，两者共用同一条 transition。

三个坑：

- **transition 写在两处、后写的那条赢**：滚动态那条规则特异性更高，光在基态写 transition 不管用，`opacity`/`transform` 必须在滚动态那条里也列一遍，否则一帧内糊满；
- **深色下多一层实心通栏**：`navigation.css:178-182` 的深色规则带 `[data-theme="dark"]` 前缀，特异性 **(0,3,1)** 高于清除规则的 (0,2,1)，`!important` 压不住 → ≥1200px 深色下滚完还是 `rgba(37,39,42,0.92)` 的一整条板子。补一条 `[data-theme]` 版把特异性抬到同档，靠加载顺序取胜；
- **菜单药丸也要「化掉」**：miraii 滚动后把 `.menu-shell` 的 `background` 与 `border-color` 双双变透明，只剩文字趴在白条上 —— 这才是「沉浸」的本质。这里照做，文字改用 `navigation.css` 的 `--navigation-fg`（浅色 `#292c30` / 深色 `#eceef0`）。

**顺带修的**：首页往下滚时，`#page-name` 原本会弹出来显示站名，和左侧 `#site-name` 一字不差地重复（「Muyuの小窝」出现两次）。`source/js/modules/nav.js` 里加了一段判断 —— 当 `pageTitleOf()` 的结果与 `#site-name` 文本相同时（即首页），保留菜单药丸、不切标题。

#### 4. 页脚运行时长起点

`source/js/modules/footer-time.js` 的 `grt` 从 `08/09/2022` 改为 **`10/01/2026`**，并把 `_config.fomalhaut.yml` 的 `runtimeshow.publish_date` 同步成 `10/1/2026 00:00:00` —— 小站资讯卡的「已运行 N 天」读的就是这个字段，不同步会跟页脚各说各话。

**测试**：`node --test "tools/tests/*.test.cjs"` → 441 passed / 0 failed。`navigation.test.cjs` 的 `custom.css` SHA256 基线第四次复核更新为 `4d6e0465…09157`（只动 `@font-face` 的 src 与注释，导航规则未动）。


### v1.0.9 — 滚动后的导航变「悬浮玻璃条」（2026-10-19）

上一版把导航收成了胶囊工具栏，但只做了**首屏**的形态。滚过首屏之后，`navigation.css:136` 会把整条导航刷成 `rgba(251,250,247,0.96)` 的**不透明象牙白通栏**加一条 1px 底边框 —— 一条横贯 1440px 的实色带把首屏大图和正文硬切两段，带子里还浮着一串深色胶囊。就是白条 + 深药丸，割裂感全在这里。

**miraii.cn 怎么处理的**（CDP 逐层量过）：它的 `nav` 自身背景是 `rgba(0,0,0,0)`，真正可见的白底挂在 `div.header-inner::before` 上 —— `inset:6px 0` / `border-radius:16px` / `rgba(253,253,253,0.88)`。白底不是通栏，而是一枚内缩 6px、四角 16px 的悬浮条。更关键的是它滚动后连胶囊底也不要了：`.menu-shell` 的 `background` 与 `border-color` 双双变透明，只剩纯文字趴在白条上。

**改法**（`source/css/nav-pill.css` 新增一节）：

- `#nav` 自身背景/边框/阴影全部清空，白底改挂 `#nav::before`：上下内缩 6px、左右内缩 24px（= `#nav` 的 padding）、圆角 16px、`z-index:-1`；
- `::before` **必须写 `position:absolute`** —— `#nav` 是 flex 容器，留在文档流里它会变成第一个 flex item，把站名、菜单、按钮全部挤位；
- 白条自己承担毛玻璃（`backdrop-filter: blur(12px) saturate(1.5)`），母体不再重复模糊（两层 backdrop-filter 会二次采样变糊）；
- 滚动态把站名胶囊 / `#page-name` / 右侧三个圆钮的底与描边一并去掉，只留文字和图标，hover 给一层 `rgba(15,23,42,.05)` 的极淡衬底；
- 深色下白条换 `rgba(30,32,35,0.88)` 玻璃，文字回到 `#eceef0`；
- ≤768px 内缩降到 12px（`head.styl` 的 `maxWidth768` 把 `#nav` padding 收到 16px），圆角 14px。

**顺带修的穿帮**：猫绳 `#myscoll` 由 `cursor.js:201` 以内联 style 写成 `position:fixed; top:0; z-index:9999`，比导航的 91 还高。滚动后它从 y=0 起画、右缘落在 1384，正好把玻璃条的右端劈开。压到 `z-index: 88`，绳子从导航条下沿「钻出来」—— 视觉上等于挂在栏下方，不用动 JS。

**测试**：`node --test "tools/tests/*.test.cjs"` → 441 passed / 0 failed。
### v1.0.8 — 导航胶囊化 + 页脚两段式（2026-10-19）

照 [miraii.cn](https://miraii.cn/) 改的两块「框架」：顶部导航收成一条胶囊工具栏，页脚从原来的一坨链接堆改成「品牌 + 短链 + 友链」的主段加一条实心底栏。

**导航（`source/css/nav-pill.css`）**

- 菜单收进 44px 高的半透明药丸（`rgba(15,23,42,.52)` + 1px 白边 + `9999px` 圆角），一级项 15px/36px 高，图标染主题青；
- 右侧搜索/美化/夜间模式三件套改成 44×44 的圆钮；二级菜单改成横向白药丸，`top: calc(100% + 8px)` 悬停展开；
- **没有直接改 `source/css/navigation.css`**：那份文件被 `tools/tests/navigation.test.cjs` 逐条断言选择器/属性/`!important`，还锁了 5 个文件的 SHA256。新开一份排在它后面做外观覆盖，测试契约零改动。
- 三个实测出来的坑：①药丸纵向位置 — `custom.css` 和 `navigation.css` 都用 `transform: translateX(-50%) !important`，普通声明盖不住，必须写 `top:50% !important` + `translate(-50%,-50%) !important`；②二级菜单跑到药丸上方 — `.menus_item` 变 flex 容器后，绝对定位子元素的静态位置由 flex 对齐决定，必须显式 `top: calc(100% + 8px)`；③主题那条 3px 下划线穿过胶囊 — `custom.css` 的 `#nav *::after { background-color: … !important }` 会盖掉 `display:none` 之外的写法，`background-color` 也得 `!important`。

**页脚（`themes/fomalhaut/layout/includes/footer.pug` + `source/css/footer-blocks.css` + `source/js/inject/footer-links.js`）**

- 主段 `.footer-main`：左「站名 + 副标题 + 开启星辰之旅」，右 11 条短链（归档/分类/标签/画廊/音乐/统计/旧时光/留言/打赏/关于/llms）+ 友链（首屏 4 个，「换一批」轮换，共 8 个）；背景是「白→透明」纵向渐变压在头图上，不是实心色块；
- 底栏 `.footer-bottom`：左侧版权 + 6 枚徽章，右侧 `#workboard` 运行时长/旅行者 1 号距离，纯白（深色 `rgb(13,13,13)`）实底 + 顶部 1px 分隔线；
- **遮罩 bug**：白天页脚一片灰。`custom.css` 的 `[data-theme="light"] #footer:before { background-color: rgba(0,0,0,.25) !important }` 特异性 (0,2,0) 高于裸 `#footer::before`，光靠排后面盖不住 —— 必须写同特异性选择器 + `!important` 才能清掉；
- **悬浮件避让**：`#rightside`（右下 38×215 圆钮列，`z-index:100`）与 `#fps`（左下 115×30，`z-index:1000`）都是 `position:fixed`，不随文档流动。用两个 CSS 变量 `--ft-safe-r: 96px` / `--ft-safe-b: 48px` 在四处 padding 里统一留白，换掉原来那条只对 `min-width:901px` 生效的 `@media`；
- **底栏徽章折行**：flex 子项默认 `min-width:auto`，1440px 下会被压成 5+1 两行。`.footer-bottom-left { flex: 0 0 auto }` 锁死左侧宽度，压力转给右侧文本换行。

**顺带清掉的占位残留**

| 位置 | 原来 | 现在 |
| --- | --- | --- |
| `source/js/modules/console-art.js` | `欢迎来到Demoの小家!` / `By Demo` / `Powered by Demo` | `Muyuの小窝` / `By MuyuDada` / `Powered by Fomalhaut` |
| `source/js/modules/nav.js` | `document.title.split(" \| Demo")[0]`、`title.endsWith("\| Demo")` | 统一走 `pageTitleOf()`：优先读 `GLOBAL_CONFIG_SITE.title`，退回按 `" \| "` 切 |
| `source/js/modules/footer-time.js` | `new Date("01/10/2026")` | `new Date("08/09/2022")`（与 `footer.owner.since` / 控制台口径一致） |
| `source/manifest.json` | `"name": "Demo"` / `"short_name": "Demo"` | `Muyuの小窝` / `Muyu` |
| `source/css/mobile-drawer.css` | `content: "Demo"` | `content: "MUYU"` |
| `_config.fomalhaut.yml` 的 `runtimeshow.publish_date` | `1/10/2026` | `8/9/2022`（小站资讯卡的「已运行」天数读的就是它） |

摸鱼牌也从两张 shields 风格 SVG（左段写着 `Demo`）改成纯文本胶囊 `🌴 放假摸鱼中`，不再有位图缩放发虚的问题。

**测试**：`node --test "tools/tests/*.test.cjs"` → 441 passed / 0 failed。

### v1.0.7 — 霞鹜文楷换成本地简体子集（2026-10-19）

这一版修的是一类很隐蔽的「字体没渲染」：不是加载失败，而是**字库里没有那些字**。

**现象**：首页标题「Muyuの小窝」的「窝」、导航「主页」的「页」、「八宝箱」的「宝」，
文章标题里的「为」「风」「给」，侧栏统计卡里的「电脑状态」「加载」，分类条的「标签」——
这些字全都不是霞鹜文楷，而是回落到微软雅黑/苹方，同一个词里一半文楷一半黑体。

**根因**：`LXGW` 的 `@font-face` 指向 `@fontsource/lxgw-wenkai-tc`，那是**繁体子集**。
用 fontTools 量过：6681 个字形，GB2312 只覆盖 3837 个（51.5%），上面那些**简体专有码位全都缺**
（窝 U+7A9D 不在、繁体的 窩 U+7AA9 在；页 U+9875 缺、頁 U+9801 在……）。
浏览器只能逐字回落，所以看起来「有的字渲染成功、有的没有」。

**修法**：自己切一份简体子集，自托管到 `source/assets/fonts/`：

| 文件 | 大小 | 内容 |
| --- | --- | --- |
| `lxgw-wenkai-subset-400.woff2` | 953812 B | 站点字符集 ∪ GB2312 一级 3755 字 ∪ 拉丁/标点核心区，共 5406 字符 |
| `lxgw-wenkai-subset-700.woff2` | 970548 B | 同上，源用上游 Medium（`usWeightClass=500`） |

- 字体源是 LxgwWenKai-**Lite** v1.530（13.9 MB TTF）。上游只有 Light/Medium/Regular，**没有真 Bold**，
  所以「粗体」用 Medium 顶，比合成粗体干净得多；
- 子集用 `fontTools.subset` 生成，命令与重新生成的步骤写在 `custom.css` 的字体注释里；
- 覆盖实测：站点正文 1989 个非 ASCII 字符里只缺 97 个，**全是 emoji**（U+1F300 段），本就该回落；
  用户报障的 12 个字（窝页宝为风给电脑态载标签）**零缺失**；
- 两个文件合计 1.92 MB，比原来那两个繁体子集（1952032 + 2040744 B ≈ 4 MB）**省一半**，
  而且是同源域名、不再等 jsDelivr；
- `_config.fomalhaut.yml` 的 `<link rel="preload">` 跟着从 CDN 绝对地址换成本地
  `/assets/fonts/lxgw-wenkai-subset-400.woff2`（只预载 400，700 让 CSS 解析后自己懒加载）；
- `source/box/astronomy/voyager.html` 里也有一份同款 `@font-face`（独立页，不继承主题 CSS），一并换掉。

**踩到的坑**：第一次改完，浏览器里 400 那档死活加载不出来（`document.fonts` 只有 `700:loaded`）。
查 CSSOM 发现 `@font-face` 里 `src` 整行消失 —— 因为注释正文里写了 `public/**/*.{html,js,json,css}`，
其中的 `*/` 提前把 CSS 注释闭合了，把紧随其后的 `src` 一起当垃圾丢掉。
**CSS 注释里不要出现 `*/`**，哪怕是举例的文件 glob。

> 改字体注释或 `src` 后记得 `npx hexo clean && npx hexo generate`：
> `public/css/index.css` 是从 `themes/fomalhaut/source/css/index.styl` 编译来的，
> 增量构建有时不会重编 styl，只改源码会看到「改了没生效」的假象。

### v1.0.6 — 修好美化面板的字体（2026-10-19）

这一版只干一件事：把「美化设置 → 字体」里点了没反应的问题修干净。

**问题**：面板列了 12 个字体选项，但实际只有 6 个真加了 `@font-face`。`settings.js` 的白名单又是另外 7 个名字。三份清单各写各的，后果是——

- 默认项 `LXGWScreen` 不在白名单里，每次刷新都会被写回 `LXGW`；
- 点其余 7 个正文选项，`document.fonts.load('16px "族名"')` 因为压根没有这个 `@font-face`，永远返回空，直接落进「字体未能加载，已保留当前字体」的失败分支；
- 代码字体同理，4 个选项里 3 个是死的。

**修法**：三处清单统一。

| 位置 | 作用 | 改了什么 |
| --- | --- | --- |
| `themes/fomalhaut/source/css/_custom/custom.css` | 真正的 `@font-face` | 从 6 个补齐到 **19 个**（11 款字体，其中 8 款各带 400 与 700 两档、3 款装饰体上游只有 400），并删掉一段重复的 `LXGW` 定义 |
| `source/js/modules/appearance-fonts.js` | 面板按钮与预览 | `APPEARANCE_TEXT_FONTS` 改 7 条、`APPEARANCE_CODE_FONTS` 改 5 条 |
| `source/js/modules/settings.js` | `FONT_LIST` / `CODE_FONT_LIST` 白名单 | 与面板逐字一致 |

**阅读 4 款**：霞鹜文楷（默认）/ 霞鹜新晰黑 / 思源宋体 / 系统默认
**个性装饰 3 款**：站酷快乐体 / 马善政毛笔楷书 / 龙藏体（收在折叠区，选中才下载）
**代码 5 款**：JetBrains Mono（默认）/ Fira Code / Source Code Pro / Maple Mono / Hack

（「系统默认」用系统字体栈，不需要 `@font-face`；其余 12 个面板项对应 11 款字体、19 个 `@font-face`。）

**还有一个隐性问题：只有 400 一个字重。** 站内 `#site-title`（46.5px）、公告栏胶囊 `.a-chip`、欢迎信息 `span` 都用 `font-weight: 700/800`，而补齐前的 11 款字体各自只注册了 `font-weight: normal` 一个 face —— 浏览器只能把 400 的字形**机械加粗**（synthetic bold），中文笔画直接糊成一团，13px 的胶囊和 11px 的计数尤其明显。修法：

- 8 款上游有真粗体的字体（霞鹜文楷 / 霞鹜新晰黑 / 思源宋体 / JetBrains Mono / Fira Code / Source Code Pro / Maple Mono / Hack）各补一个 `font-weight: 700` 的 `@font-face`，逐条实测 200（如 `hack-bold.woff2` 108008 B；霞鹜文楷当时用的 `lxgw-wenkai-tc-chinese-traditional-700-normal.woff2` 2040744 B 已在 v1.0.7 换成本地简体子集）；
- 站酷快乐体 / 马善政毛笔楷书 / 龙藏体上游只有 400（`@fontsource` 与 Google Fonts 都没发布 700），改用全局 `html { font-synthesis-weight: none }` 禁掉合成粗体，它们按 400 原字形显示 —— 不再发糊，代价是没有真正加粗；
- 实测：`document.fonts` 里 8 款显示 `400/loaded,700/loaded`、3 款只有 `400/loaded`；`#site-title` 的 computed `fontSynthesisWeight` 为 `none`，全站 77 个粗体文本节点全部命中自定义字体。

- 全部换成 [jsDelivr](https://www.jsdelivr.com/) 上 `@fontsource/*` 的单文件 woff2（Hack 用 `hack-font` 官方包的 web 构建），逐条实测 200 且 `content-type` 正确；
- 「霞鹜文楷 Screen」在 @fontsource 上没有可用的单文件版（只有 100 多段 subset，要先 `@import` 一份 106 KB 的 CSS 再拉上百个小文件），所以并回 `LXGW`；「筑紫A丸」「汉仪唐美人」「甜甜圈海报」都是商业字体没有开源版本，换成气质相近的三款开源装饰体；
- 新增 `APPEARANCE_FONT_ALIASES` + `appearanceFontMigrate()`：老访客 `localStorage` 里的 `LXGWScreen` / `Monaco_1` / `ZhuZiAWan` 等旧值会先被翻译成新名字再走白名单，不会被静默清掉；
- `@font-face` 只在真有元素用到该 family 时才下载，多列几款装饰字体不拖慢首屏；
- 顺手把 `tools/tests/appearance-fonts.test.cjs` 的夹具迁到新清单（此前它把面板那 12 个名字硬编码进 VM 里的白名单，**伪造出了「全都合法」的假象，所以测试完全测不出这个 bug**）。13 个测试文件现共 **441 个断言、0 失败**。

> **加字体时三处一起改**，少一处就还是「点了没反应」。字体如果上游有 700 字重，记得把两个 `@font-face` 都加上 —— 只注册 400 会让粗体文字走合成粗体，中文笔画会糊。

### v1.0.5 — 站点身份落定与三处补齐（2026-10-19）

这一版把「示例站」变成「真实在跑的站」，并对照 [Firefly-yuan](https://github.com/MuyuDada/Firefly-yuan) 补了三块此前缺的能力：分类快捷导航条、标签关系图、友人帐增强。同时把全站 200 多处 `Demo` / `yourname` / `example.com` / `picsum` 占位换成真实值或本地资源。

**站点身份**（`_config.yml`、`_config.fomalhaut.yml`）

- 标题改「Muyuの小窝」、作者 MuyuDada、时区 `Asia/Shanghai`、关键词与描述换成真实文案；
- 头像换成真实 GIF（`source/assets/avatar.gif`），社交改为 GitHub / B站 / 邮箱 / RSS 四项，侧栏作者卡按钮指向真实仓库，公告卡文案与入口全部重写；
- 关于页整页重写为六节：关于我、我做的小东西、本站跑在哪、技术栈&框架、关于本站、找到我；线路卡的实时延迟徽标由 `source/js/inject/about-route-probe.js` 运行时探测，**不写死任何 ping / TTFB 数值**（本机到各线路的握手耗时波动极大，写死会立刻过期）。

**搜索与评论**（`_config.fomalhaut.yml`、`themes/fomalhaut/source/js/search/`）

- Algolia 一直没建索引（`algolia_search.enable` 开着但点搜索框没结果），改走 `hexo-generator-search` 生成的 `/search.xml`：`algolia_search.enable: false` / `local_search.enable: true`；
- 补上主题里缺失的前端 `themes/fomalhaut/source/js/search/local-search.js`（此前该目录只有 `algolia.js`，这也是本地搜索一直没启用的原因之一）；
- 评论从 Twikoo 切到 Waline，指向自建 `https://comment.muyudada.dpdns.org/`，开了登录、昵称邮箱必填、微博 / B站 / Bmoji 三套表情。

**三个补齐的页面**

- `/comments/` 留言板：页头光晕 + 三张提示卡（文章留言 / 友链 / 私信），评论区由主题自动渲染；
- `/sponsor/` 打赏：支付宝、微信、爱发电三张卡 + 打赏名单 + 空态，二维码在 `source/assets/sponsor/`；
- `/llms.txt`：`scripts/llms-txt.js` 生成，站点简介 + 11 个关键页面 + 最近 20 篇文章；**响应带 UTF-8 BOM**，因为静态托管或 Windows 编辑器对无 BOM 的 `.txt` 会按 ANSI/GBK 解码，中文直接乱码。

**分类快捷导航条**（新增 `scripts/category-bar.js`、`source/js/inject/category-bar.js`、`source/css/category-bar.css`）

- 构建期在首页 / 归档 / 分类 / 标签 / 统计页的 `#content-inner` **开标签之前**插入 `#category-bar`：首页图标胶囊 + 归档胶囊（带总篇数）+ 分类胶囊 + 「更多」；
- 插在 `main` 之前而不是里面：`main.layout` 是 flex **行**容器，塞进去会变成第三个 flex item，被压成内容宽度还会吃到 `.layout > div:first-child` 的卡片内边距；`#body-wrap` 是 flex column，放在 `main` 前面才能自然占满一行。另外 `#body-wrap` 是 pjax 的替换单元，放外面也不会残留高亮；
- `.category-bar` 必须显式写 `width: 100%`：flex column 里**左右 `margin: auto` 会让 flex item 变成 shrink-to-fit**，只写 `max-width` 的话导航条只有内容那么宽；
- 行为层按路径点亮当前项、滚轮映射为横向滚动（到头放行页面滚动）、两侧渐隐提示、当前项居中；幂等标记 `data-cb-ready`，同时监听 `DOMContentLoaded` 与 `pjax:complete`；
- 分类链接用 `cat.path` 时踩过坑：hexo 给的是不带前导斜杠的 `categories/开始使用/`，直接用会变成相对当前页的链接，现逐段 `encodeURIComponent` 并补前导 `/`。

**标签关系图**（新增 `scripts/tag-graph.js`、`source/js/tag-graph.js`、`source/css/tag-graph.css`）

- 构建期助手 `tag_graph_data` 从文章标签两两共现建图，**阈值自适应**：先数 ≥2 次的边，不足 8 条就降到 1（小站否则整张图没有一条边）；
- 前端读 `#tag-graph-data` 的 JSON 渲染，节点大小按 `sqrt(文章数/最大值)` 缩放、按文章数分「高频 / 常用 / 低频」三档配色（从 `--theme-color` 派生色相偏移），换主题色自动重绘；
- 脚本**没有写在 pug 里**：主题 pjax 只替换 `#body-wrap` 内 DOM，页面内 `<script>` 不会重新执行，「首页 pjax 点进 /tags/」时画不出来。

**友人帐增强**（`themes/fomalhaut/layout/includes/page/flink_style/volantis.pug`、`source/js/friend-latency.js`、`source/_data/link.yml`）

- 原来只有 `class_name` 命中三个写死字符串才渲染带截图的大卡，其余全走 `mini-link`；现改为按分组字段 `i.mini` 分流，大卡加 `data-friend-link` 与延迟徽标占位；
- 延迟探测：`fetch(mode:'no-cors')` + 5 秒 `AbortController` 超时，≤2000ms 绿 / 更慢橙 / 超时红；并发上限 4、每 120ms 放行一个、优先 `requestIdleCallback`；已探测的卡打 `data-latency-done`，pjax 回来不重复打请求；
- 友链数据换成 11 位真实朋友 + 技术站 + 工具站三组（工具站用 `mini: true`），友人帐正文补「本站信息」与「加入本站友链」互换原则、提交模板、截图接口说明。

**贡献日历接真实数据**（`_config.yml`、`source/js/gitcalendar.js`）

- 从占位的自建数据仓库换成 `https://github-contributions-api.jogruber.de/v4/MuyuDada?y=last`；
- `gitcalendar.js` 新增 `git_normalize()`：把该 API 的扁平 `{contributions:[{date,count,level}]}` 转成脚本原本需要的「53 周 × 7 天」二维数组（回溯到 53 周前、逐日查表、缺失填 0），已是二维数组则原样返回。

**全站去占位**

- 外观面板的 32 张 picsum 占位壁纸换成 12 张本地 AVIF（`source/assets/wallpaper/`，6 横 6 竖），分类从「二次元 / 风景 / 萌宠 / 手机」改为「桌面壁纸 / 手机壁纸」，渐变与纯色保留；
- 默认封面（原来 256 行 picsum）换成 12 条本地壁纸；`custom.css` 的侧栏卡背景、`lantern.css` 的灯笼背景、画廊页 54 张图、两篇文章封面全部换成本地资源；
- **默认背景改成随机图 API**：`--default-bg` = `https://t.alcy.cc/pc`（横屏）、`--darkmode-bg` = `/ys`（二次元）、`--mobileday-bg` = `/mp`（竖屏）、`--mobilenight-bg` = `/moe`（萌图），每次加载换一张；本地 12 张壁纸仍留在 `source/assets/wallpaper/` 当固定选项；
- `README.md`、`themes/fomalhaut/package.json`、`themes/fomalhaut/README.md` 里的 `fomalhaut1998` 与 `yourname` 清干净；`api/` 与 `functions/` 两个 AI 代理的 CORS 白名单改成 `muyudada.dpdns.org`；
- **`_config.yml` 的 `url` 与 `deploy.repository` 仍是占位**（按需求保留），所以 `sitemap.xml` / `atom.xml` / `llms.txt` 里的绝对链接仍是 `https://example.com/...`。

**顺手修掉的坑**

- 页脚 `.ft-img-group` 原来 8 个硬编码占位（example.com + picsum 头像 + 4 个「广告位招租」），改成读 `_data/link.yml` 第一组前 8 位；
- 页脚链接补 `/sponsor/` 与 `/llms.txt`，导航「网站」分组新增「打赏」；
- 朋友圈页在数据源 404 时补了一个说明块（`#cf-fallback`），拿到数据就自动移除，不再是一片空白；
- **改 `.styl` 后必须 `npx hexo clean` 再 `generate`**：增量构建不会重编 stylus，只改 styl 会看到旧样式（这次踩过一次）。

### v1.0.4 — 美化面板预览化与导航改版（2026-10-11）

这一版把「美化设置面板」从一长条滑条重做成可预览的分区，新增 5 个前端模块与 8 个回归脚本；顶栏导航抽出一份独立样式表并按设备能力降级磨砂；夜间切换改成三段小动画，整屏遮挡从 3000ms 压到约 900ms；另修一批小毛病（数字框裁切、目录连点互抢、搜索提示残留、帧率条对比度）。

**面板分区与「关掉即停下」**（`source/js/modules/settings.js`、`cursor.js`、`source/js/inject/beauty-boot.js`）

- 原来一长条滑条拆成「氛围特效 / 互动挂件 / 布局与部件」三块 `bf-panel`（两列网格、面板变窄自动单列），卡片不透明度与背景滤镜留在最上面；猫咪挂件（`nekoOn`）与听话鼠标（`cursorOn`）各给一个开关、默认开启，点击涟漪反过来只有显式开过才算开；
- 关掉是真停下：`setNekoEnabled()` 清掉时钟定时器与 rAF、卸掉 pointer / rect 计算，`Cursor.setEnabled(false)` 走 `pause()` + `observer.disconnect()`，开回来再 `refresh()` + `observe()`；`beauty-boot.js` 首帧先恢复隐藏状态，避免加载瞬间闪一下。

**主题色可自定义 + 预设色板整理为十一色**（`settings.js`、`source/css/site-inject.css`）

- 面板加一个原生取色圈（视觉直径 24px、热区 44px、环宽 3px）：值以严格校验的六位 HEX 存 `themeCustomColor`，首帧校验不合法就回落默认青绿；
- 预设删掉紫 / 灰 / 黑三个旧选项、补上抹茶绿，共十一色（红 / 橙 / 黄 / 抹茶 / 青绿 / 玉石绿 / 晴空蓝 / 柔靛蓝 / 雾蓝灰 / 紫罗兰 / 樱花粉），旧键自动迁移（`purple → purepurple`、`gray` / `black → darkblue`），375px 宽自动 6+5 换行；
- 新增 `themeOnColorInk()` 按 WCAG 相对亮度算 `--on-theme` / `--on-theme-away`：按钮、选中项、目录当前项、`::selection` 与 AI 助手面板都改读它，浅色主题色上不再白字发虚。

**字体与背景预览化**（新增 `source/js/modules/appearance-fonts.js`、`appearance-backgrounds.js`）

- 字体：阅读 4 / 个性 3 / 代码 5 三组（含「系统默认」），正文与代码各一块实时预览；只对合法 key 请求 `document.fonts.load`、12 秒超时、最新请求胜、失败不写偏好可重试；「恢复默认」只重置两个字体键；
- 背景：32 张壁纸 + 8 个渐变 + 7 个纯色 + 8 个在线接口全保留，一级分「壁纸 / 色彩 / 自定义」、壁纸再分四类；打开分类才给 `<img>` 赋 `src`，切换走 `Image` 预加载 + 12 秒超时 + token 取消，失败保留旧图；
- 两个模块都是全局脚本、在 `settings.js` 之前加载，旧的 `setFont` / `setCodeFont` / `setBg` / `resetBg_` 契约不变，原来的入口照常可用。

**两个新特效：萤火虫与雪花重写**（新增 `source/js/modules/fireflies.js`、`snow.js`）

- 萤火虫（默认关闭）纯 CSS 呼吸与慢漂，不起 canvas / rAF / 定时器轮询：桌面 14 只、≤600px 8 只，待在底部 44vh、负层级在正文卡片之后、`pointer-events: none`，暂停靠 `data-paused`；
- 雪花删掉 `effects.js` 里的 canvas 圆点循环，改用两张预渲染雪片图按大小 / 透明度 / 速度分层下落：dt 上限 50ms、epoch 防过期回调，只有真落到底部才抬高宽度有界的高度图，最高厚度随视口 14–30px；深色 / 后台 / 手机 / 减少动态都暂停，并与萤火虫互斥（只留最后开启的一项）。

**点击涟漪**（新增 `source/js/modules/ripple.js`）

- 第 4 个互动挂件、默认关闭：按下那刻才建 1 个爆发节点 + 两圈同心水纹，700ms 后连节点一起回收、同时最多 6 枚；只认主指针左键，关闭时连 `pointerdown` 监听都不挂。

**顶栏导航改版**（新增 `source/css/navigation.css`）

- 桌面工具区 44×44px 触控区、间距 8px、两侧留白 24px；≤800px 改 4px / 12px，≤480px 站名 20px；站名容器不再裁掉主题的霓虹光晕，只有 ≤360px 才退回省略号；
- 磨砂按能力降级：稳定态默认关 `backdrop-filter`、只留 alpha 0.96 的底色，仅在 ≥1200px + 精细指针 + 支持 `hover:hover` 时开 6px 轻磨砂 —— 滚动时不用为合成层买单；
- 首页与「回到顶部」的 hover 伪元素宽度改成跟随链接 100%、高度收紧 40px，图标 flex 居中（原来继承整块尺寸加固定 `line-height`，视觉总偏上）。

**夜间切换与遮罩**（`source/js/modules/shell.js`、`site-inject.css`）

- 夜间切换重写成三拍：日落 / 日出 450ms + 暮色与第一批星 450ms + 星夜铺满 600ms + 从点击位置圆形揭幕 350ms，原来 3000ms 的整屏遮挡压到约 900ms；面板给「关闭 / 轻 / 标准 / 华丽」四档，全部时长由本次切换自持、不再读全局变量；
- 连点残留修掉：遮罩改由本次切换自持（不再用「取第一个 `.Cuteen_DarkSky`」的写法），第二次点击先清遮罩再瞬时切换，系统开了「减少动态」也直接瞬时；夜间壁纸用 `requestIdleCallback` 空闲预热，切过去不再空白。

**一批小修**（`site-inject.css`、`source/js/inject/scroll-gap-fix.js`、`search-lazy.js`、`source/js/modules/reading.js`）

- 数字框被主题限宽 50px：用 `:is(...)` 提特异性 + `max-width: none` + `min-width / flex: 0 0 76px`，三位数不再裁切；透明度数字并进同一套规则（实测输入框 76×44 CSS px，桌面与 390×844 一致）；
- 帧率状态条四轮：紧凑状态条（桌面高 30px / 手机 28px、左下 12px + 安全区、`pointer-events: none`）+ `data-state` 着色，小字对比度 3.21 → 4.91；随后按观感回退配色，再把「琥珀」与「红」的 Lab ΔE 从 43.2 拉到 63.5；
- 目录连点互相打架：`scroll-gap-fix` 升到 v4，加世代号 `seq`，让过期的滚动校正链立刻退出（v3 每次点击各起一条最多 3 轮的链、互不知情，轮流把页面拉回自己那边）；
- 搜索提示改成脚本自持节点、插在命中容器之前（旧写法把提示写进容器并用属性记插没插过，容器被 instantsearch 换掉后属性还在、清理分支进不去）；`onerror` 不再被当成功吞掉，库就绪后 300ms 检查搜索框、缺失就回退。

**回归脚本 5 → 13 个**（`tools/tests/`）

- 新增 `beauty-switches` / `theme-color` / `appearance-fonts` / `appearance-backgrounds` / `fireflies` / `snow` / `ripple` / `navigation` 八个脚本，覆盖「开关是不是真停表」、颜色校验与旧键迁移、面板预加载的 token 取消、特效分档与暂停条件、导航触控区与磨砂降级条件；`docs/plans/` 下同步补了本轮的 9 份设计记录。

**版本号**

- 主题自身版本（`package.json` 的 `version`）、启动横幅（`themes/fomalhaut/scripts/events/welcome.js`）与页脚徽章 title 一起升到 `1.0.4`；上游 Butterfly 版本仍走 `scripts/butterfly-version.js`（4.3.1），两者照旧分开。
### v1.0.3 — 归档页卡片改版与时间轴统计（2026-10-09）

这一版把 `/archives/` 从「日期 + 标题」的列表换成卡片墙（新增 3 个文件，站点级实现、不动主题源码），时间线档案页的统计口径拆细，另修一个 pjax 换页后日历热力图永远转圈的老 bug。

**归档页卡片改版**（新增 `scripts/archive-index.js`、`source/css/archive-page.css`、`source/js/inject/archive-page.js`）

- 版面从下到上：「年度分布」柱状图（每根柱标年份与篇数；年份跨度 ≤ 7 年时逐格画满，超过就只画有文章的年份，避免一整排空柱）→ 「共 N 篇 · 起始年–末年 · 某年最多（N 篇）」汇总 → 年份吸顶跳转胶囊（滚动高亮当前年份，点击平滑滚动并按固定导航高度留偏移）→ 年份章节（大号年份 + 条数 + 「收起 / 展开」按钮，折叠状态记在 `localStorage` 的 `ar-collapsed-years`）→ 卡片栅格；
- 卡片：封面 + 分类胶囊 + 标题 + 日期 + 「约 N 分钟」阅读时长，整卡可点（标题与封面仍是独立链接，可新窗口打开、可被爬虫抓）；封面缺失或加载失败退回「标题首字 + 主题色光晕」占位，懒加载占位图直接读 `data-lazy-src` 补真图，不等 LazyLoad 的扫描时机；
- 零额外请求：构建期由 `scripts/archive-index.js` 注册的 `after_render:html` 过滤器，只往归档页（含 `/archives/page/N/`）的 `</head>` 前插一段 `<script type="application/json" id="ar-index">`，内容是全站每篇的标题 / 路径 / 日期 / 分类 / 字数 / 阅读分钟；阅读时长复用 `hexo-wordcount-fomal` 的口径（中文 300 字/分、英文 160 词/分）；
- 降级与守卫：页面里没有 `ar-index` 时卡片照常渲染、只是不显示分类与阅读时长；容器必须是 `#archive` / `#category` / `#tag` 之一、`.article-sort` 恰好 1 个、且至少有一篇文章，全部通过才给容器加 `.ar-ready`（CSS 选择器全部以 `.ar-ready` 开头），任一环节不成立就整块失效、页面原样；容器上打 `data-ar-archive` 保幂等，首屏 / `pjax:complete` / `pageshow(persisted)` 都能安全重入；
- 同一套样式与脚本对 `/categories/*`、`/tags/*` 也生效；`_config.yml` 新增 `archive_generator` 段（`per_page: 12`、按年 / 按月生成、`order_by: -date`），`_config.fomalhaut.yml` 的 `inject.head` 新增两行引入（`?v=20261013b`），回滚删掉这两行即可。

**时间线档案页统计拆细（`source/js/timeline-archive.js`、`source/css/timeline-archive.css`）**

- 头部统计把原来混在一起的「天数」拆成两个口径：**更新天数**（日期卡数）与**记录条数**（正文条目数，新增 `countEntries()` 数 `.timeline-item-content` 里的 `:scope > ol/ul > li`），并新增**历时**（首尾日期差的天数 + 「约 X 年 Y 个月」，按 30.4375 天/月折算）；
- 年份分隔器文案改成「N 条记录 · M 天」；年份胶囊只写条数，底部多一条占比细条，宽度 = 该年条数 ÷ 全站条数；
- 左栏日期轨从 104px 收到 62px、列间距 28px → 18px（1440px 屏卡片宽约 +52px）；窄屏（≤768px）改单列，日期挪到卡片上方一行小字。

**日历热力图 pjax 修复（`source/js/gitcalendar.js`）**

- 文件级的 `var git_init_seq = 0` 改成挂在 `window.__gitInitSeq` 上：pjax 换页时内联脚本先领号、随后加载的外链脚本会把计数器重置回 0，fetch 回来的数据被判成过期直接丢弃，表现为日历一直停在加载态。

**内容**

- `source/life/music/index.md` 歌单换成网易云「［轻音乐纯享］何人都有孤独之时」（105 首），热评区块同步换新。

**版本号解耦（`themes/fomalhaut/scripts/butterfly-version.js`）**

- 启动横幅与 CDN 地址此前都读主题自己的 `package.json`：主题一升版本，jsdelivr / unpkg 上的地址就被拼成 `hexo-theme-butterfly@1.0.3`（上游并没有这个版本），开了 `internal_provider: jsdelivr` 的站点会整片 404。现在把「fork 自哪个上游 Butterfly」（4.3.1）抽成 `scripts/butterfly-version.js`，与主题自身版本（`package.json` 的 `version`，仍是 1.0.3）分开。

### v1.0.2 — 流式渲染与缓存策略（2026-10-05）

这一版集中修三类「用久了才显出来」的问题：AI 助手吐字时掉帧、Service Worker 该失效时不失效、窄屏被撑出横向滚动。回归脚本从 4 个加到 5 个。

**AI 助手流式渲染（`source/js/ai-chat.js`）**

- 分片只累积文本，DOM 提交合并到一帧：`requestAnimationFrame` 提交，配 100ms `setTimeout` 兜底，同一帧里只保留最后一次待提交内容；
- 每帧只重建「尾巴」：新增 `tailCut()`，逐行扫出可定稿的切点（不在代码围栏内、不在有序列表项中间、行内 `**` 与 `[ ]` 成对），已定稿部分一次性 `insertAdjacentHTML` 追加，尾块单独放进 `.ai-tail` 容器（`display: contents`）；
- 滚动改成只写不读：用 passive `scroll` 事件异步维护 `stick` 标记，写位置用 `b.scrollTop = 1e9`（越界会自动夹到最大值，省掉读 `scrollHeight` 触发的强制布局）；手动往上滚不再跟随，滚回底部自动恢复；
- 面板空闲或悬停时预热（`requestIdleCallback` + `pointerenter`），提前建好 DOM 并强制一次样式布局；
- 实测：三条 20 秒突发流从 63.7 / 67.6 fps 提到 89.7 / 89.9 / 90.0 fps，超过 50ms 的卡顿帧 94 / 73 降到 0，强制布局累计 5925 / 7015ms 降到 82 / 106 / 107ms。

**Service Worker 缓存策略（`themes/fomalhaut/source/sw.js`）**

- `CACHE_NAME` 提到 `ICDNCache-v3`，老访客激活时整体丢掉 v2 残片；
- TTL 从一档拆成两档：文本资源（html / js / mjs / css / json / xml / txt / map / webmanifest / manifest / svg）压到 10 分钟，图片、字体、音视频仍按 24 小时。原来全按 24 小时——发版时只改 JS 或 CSS、忘了改 `?v=` 缓存戳的话，URL 与 HTML 都没变，回访者会继续跑旧代码最长一天；
- `getFileType()` 补齐 `cur / avif / bmp / apng / otf / eot / xml / txt / map / webmanifest / manifest / mp3 / m4a / mp4 / webm / pdf / wasm`，原来只列到 `ttf`，`atom.xml`、`search.xml` 与自定义光标都会被当成 `text/plain`；
- 线路探测请求（`?__pr=`）不再写入 CacheStorage，只做「改写 + 回源」。探测每次都用新的随机串，缓存键各不相同，写进去的条目以后永远读不到，而首屏、每次 pjax、每 5 分钟各来一轮，逛得越久堆得越多。

**主题色联动**

- 日历热力图新增 `git_theme_palette()`：直接读 `--theme-color` 实时生成 10 档调色板，换主题色自动重画（`GitCalendarRefresh()` 只在颜色真变了时才清空重绘）；`_config.yml` 里的 `gitcalendar.color` 退化为兜底值。

**指针与滚动**

- 小猫咪光标加两个 `WeakMap` 缓存（控件身份 + 祖先 `cursor:pointer` 链），并给 `MutationObserver` 加过滤：光标自身、`.neko` 的 `data-msg`、`#fps` 的 `title` 等纯输出改动不再触发整轮重算；
- 回形针在窄屏会撑出约 10px 横向溢出，改 `--clip-right: calc(-21px + max(0px, 23px - (100vw - 100%) / 2))`；
- 时间线归档页与年表把 `grid-template-columns` 的固定轨道改成 `minmax(0, 1fr)` 并补 `min-width: 0`，长不可断词不再把页面顶宽。

**细节修正**

- 设置面板的复选框去掉 `translateY(5px)`（套上 flex 居中后会压到文字中线下方）；`.colorRow` 补 `user-select: none` 与 `caret-color: transparent`，点空隙不再落编辑光标；
- 关于页第 5 层「结构化存储」去掉站长的私人数据源，只留评论数据；
- 页脚主题版本号同步，npmmirror 徽章换成源站已去掉阴影的那一版。

**回归脚本**

- 新增 `tools/tests/sw-cache.test.cjs`：纯 VM 跑 Service Worker 源码（caches / fetch / Response 全打桩，不联网、不起服务），断言覆盖域名白名单、回源写缓存、二次请求吃缓存、文本与媒体的 TTL 分流、`?__pr=` 不写缓存；
- `tools/tests/cursor-effects.test.cjs` 配合指针缓存重构扩充。

### v1.0.1 — 打磨与生命周期修复（2026-10-05）

这一版没有新增页面，全部围绕「首屏更快、动画不白跑、滚动不掉帧」：

**首屏关键链**

- 默认正文字体补上游 `preload`（带 `crossorigin`，字体按 CORS 模式取）——浏览器不用再等 `index.css` 解析完才发现字体；
- 夜间默认壁纸与 `source/js/modules/settings.js` 的 `resetBg_()` 对齐到逐字一致的地址，避免同一张图下两份。

**动画与帧率生命周期**

- 雪花 / 星空从「不可见就跳过绘制」升级为「不可见即退出 rAF」，恢复交给 `MutationObserver` / `resize` / `pjax:complete` 的失效回调；
- 帧率监测改成「面板开着才起循环」，采样封装成带 generation 的闭包，切后台自动挂起。

**滚动与指针**

- 修掉主题里 `window.scrollCollect = () => btf.throttle(fn, 200)()` 这种「工厂 + 当场调用」的假节流——原来每次滚动都会新建一个 throttle 再执行，节流形同虚设；
- `btf.throttle` 补 `cancel()`；`pjax.pug` 里手写的两处解绑统一收进清理函数；
- 小猫咪光标改成读写分离：高频指针输入只记最新值，下一帧先读几何再增量写，写入值用 `WeakMap` 缓存（CSSOM 会规范化小数与单位，不能拿序列化后的 style 反复比）；
- 手机端自绘滚动条：滚动 / 布局值在读阶段一次采完，节点创建与样式写入放写阶段。

**样式**

- 评论区重做（`source/css/twikoo.css`）：三张独立白卡浮在压灰一档的面板上，配整块焦点环；
- 侧栏作者卡新增回形针装饰（新增 `source/css/paperclip.css`）：内联 SVG、18° 倾角、针身探出卡片边缘；夜间自动切成冰蓝夜光。

**工程与清理**

- 新增 4 个回归脚本（`tools/tests/`，用 Node 自带的 `node:test`，无额外依赖）：光标效果、帧率生命周期、手机滚动条、滚动监听；
- 新增 `docs/plans/2026-10-05-paperclip.md`，记录回形针的设计参数与回滚方式；
- 删掉 13 个死文件：`leaves.js`、`bibi.js`、`love.js`、`tag-map` 的 proj4 两条、`themes/.../search/local-search.js`、`tw_cn.js`，以及 8 个不再引用的图片资源（`assets/gulp/*`、`loading2.gif`、`r1.webp`、`r2.webp`）；
- 修好控制台字符画的版式与版权行（版权年份改为运行时计算）；
- `error_img` 的兜底图改用主题自带的 `/img/friend_404.gif` 与 `/img/404.jpg`。

### v1.0.0 — 首个正式版（2026-10-04）

主题从 `themes/butterfly` 独立为 `themes/fomalhaut`，站点配置与主题代码彻底分离。详见 [三、相比上一版改了什么](#三相比上一版改了什么)。

---

## 一、这是什么

**hexo-theme-fomalhaut** 是一个跑在 Hexo 上的个人博客主题 / 站点模板。它不是单纯的 `themes/` 目录，而是一整套可运行站点：

- 一套**主题代码**（`themes/fomalhaut/`，Pug + Stylus 渲染）；
- 一份**站点配置**（根目录 `_config.yml` + 根目录 `_config.fomalhaut.yml`）；
- 一批**站点级增强**（根目录 `scripts/` 下的 Hexo 插件、`source/js/` 与 `source/css/` 下的自定义脚本与样式）；
- 若干**示例页面**（网址导航、画廊、八音盒、友人帐、朋友圈、网站统计、时间线归档、天文星图……）与 2 篇示例文章。

它解决的问题是：Hexo 生态里大量的美化方案都靠「直接改主题源码」，一旦主题更新就得重新抄一遍。
本仓库把**主题代码**与**站点改动**放进不同目录，站点侧的东西全部通过「配置注入 + 独立 css/js 文件」实现，升级主题时只需要替换 `themes/fomalhaut/`。

**来源背景**：作者从 2022 年起用 Butterfly 4.3.1 搭建个人博客，三年间持续魔改，把散落在配置与主题里的大量改动逐步抽成独立文件；2026-10 做了一次完整的重构（内部代号「屎山重构」），把 2973 行的单文件 `fomal.js` 拆成模块、把配置里的 26 段内联样式与脚本抽成独立文件，最终整理为 **v1.0.0** 开源。

> 📌 **站点现状**：本仓库同时是「Muyuの小窝」（https://muyudada.dpdns.org/）的运行源码，`_config.yml` 与 `_config.fomalhaut.yml` 里填的是真实站点信息（标题、作者、头像、社交、评论、打赏、友链）。
> 想拿它搭自己的站，按[第五章](#五快速开始约-10-分钟)把这几处换成你自己的即可；图片资源（头像、壁纸、打赏码）都在 `source/assets/` 本地，不依赖任何私人图床。

---

## 二、项目架构

```
用户请求
   │
   ▼
Hexo 6.3.0  ──┬─► 根 _config.yml           站点级配置（标题 / 作者 / 域名 / 部署 / 插件）
              ├─► 根 _config.fomalhaut.yml  主题配置（Hexo 5+ 的 _config.[theme].yml，本站实际生效）
              ├─► 根 scripts/*.js           站点级 Hexo 插件（构建期过滤器）
              │
              ├─► source/                   站点内容
              │     ├─ _posts/             文章（Markdown）
              │     ├─ box|life|site|social|personal/  独立页面
              │     ├─ css/*.css js/*.js    站点级样式与脚本（不进主题）
              │     └─ _data/{link,widget}.yml          友链与侧栏卡片数据
              │
              └─► themes/fomalhaut/         主题本体
                    ├─ _config.yml         主题默认配置（被根 _config.fomalhaut.yml 覆盖）
                    ├─ layout/*.pug        Pug 模板
                    ├─ source/css/*.styl   Stylus 样式
                    ├─ source/js/*.js      主题脚本
                    └─ scripts/           主题级 Hexo 插件（标签、过滤器、助手函数）
                        │
                        ▼
                 hexo generate  →  public/  →  gulp 压缩  →  推到托管平台
```

**三层配置优先级**（Hexo 5+ 行为）：

| 层级 | 文件 | 作用 |
| --- | --- | --- |
| 站点 | 根 `_config.yml` | 站点名、作者、URL、部署、算法插件等 |
| 主题（生效） | 根 `_config.fomalhaut.yml` | **本站真正使用的主题配置**，所有开关都在这里 |
| 主题（默认） | `themes/fomalhaut/_config.yml` | 主题自带的默认值模板，留作参考 / 兜底 |

---

## 三、相比上一版改了什么

上一版（仓库历史里的 3.22 版）是「整套博客直接开源」：主题仍然是 `themes/butterfly/`，配置叫 `_config.butterfly.yml`，站点页面大多是空壳。
v1.0.0 是一次结构性重写，主要变化：

### 1. 主题独立，改名为 fomalhaut

| 项 | 旧版 (3.22) | 新版 (v1.0.0) |
| --- | --- | --- |
| 主题目录 | `themes/butterfly/` | `themes/fomalhaut/` |
| 主题包名 | `hexo-theme-fomalhaut` v4.3.1（沿用 Butterfly 的 package.json） | `hexo-theme-fomalhaut` v1.0.0（独立版本号） |
| 主题配置 | `_config.butterfly.yml` | `_config.fomalhaut.yml` |
| 配置注入 | 少量 `inject` | 完整 `inject.head` / `inject.bottom` 注入体系 + 独立 css/js 文件 |

### 2. 站点与主题彻底分离

- 所有自定义样式集中到 `themes/fomalhaut/source/css/_custom/custom.css`（近 4000 行，文件头带完整索引地图）与 `source/css/*.css`；
- 所有自定义脚本从单文件 `fomal.js`（2973 行）拆成 **105 行主引导 + 10 个模块**（`source/js/modules/`）与 10 个注入脚本（`source/js/inject/`）；
- 配置里的 26 段内联样式与脚本抽成 `source/css/site-inject.css` 与独立 js，配置文件从 2037 行瘦到 1482 行。

### 3. 新增功能

| 功能 | 位置 | 说明 |
| --- | --- | --- |
| AI 助手 | `source/js/ai-chat.js` + `scripts/ai-chat-inject.js` + `api/chat/completions.js` | 右侧悬浮对话面板，前端可直连也可走同源代理隐藏 Key |
| 美化设置面板 | `source/js/modules/settings.js` | 访客可自选字体、主题色、暗色、阅读模式、背景、特效开关，存 localStorage |
| 侧栏日历 / 倒计时 | `source/js/aside-calendar.js` + `source/js/lunar.js` | 带农历、节气与节日提醒 |
| 手机端抽屉 | `source/css/mobile-drawer.css` | 独立样式表，13 个小节：面板、字标、头像、统计胶囊、菜单、遮罩、入场动效 |
| 网站统计页 | `source/site/census/` + `source/js/census.js` | 图表看板，配色由主题色派生 |
| 时间线归档 | `source/site/time/` + `source/js/timeline-archive.js` | 用时间线标签写站史 / 里程碑 |
| 网址导航 | `source/box/nav/` | 圆形头像小卡式导航，纯 CSS 计数器 |
| 天文星图 | `source/box/astronomy/voyager.html` | 独立完整页面，用 iframe 引入，`skip_render` 不参与渲染 |
| PWA + Service Worker | `themes/fomalhaut/source/sw.js` | 离线预缓存 + 请求分流 |
| 多平台部署 | `vercel.json`、`functions/`、`tools/deploy-vercel.js` | Vercel / Cloudflare Pages 两种方式（要用 GitHub Actions 见「十二、部署」） |

### 4. 工程化与性能优化

- **构建链**：`hexo generate` → `gulp`（html 压缩 / css 压缩），一条命令出产物；
- **图片懒加载修复**：`scripts/swiper-lazyload-fix.js` 处理轮播与 pjax 场景下 lazyload 失效；
- **搜索懒加载**：`source/js/inject/search-lazy.js` 只在用户点开搜索时才拉取；
- **pjax 守卫**：`source/js/pjax-guard.js` 修复换页后状态残留；
- **CDN 预连接**：配置里对首屏外部域名做 `preconnect` / `dns-prefetch`；
- **字体**：11 款自建字体改为公共 CDN（jsDelivr 的 `@fontsource/*`），并精简为 **6 款开源可商用字体**（v1.0.6 起扩到 10 款，全部有真实可用的单文件 woff2）；
- **图片外链**：原本指向作者私人对象存储的封面 / 壁纸 / 站点截图，全部改为公共占位图服务；
- **配置瘦身**：`fomal.js` 2973 → 105 行，`custom.css` 删掉 341 行死代码并补上索引地图。

---

## 四、环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | **18 / 20 / 22 LTS**（推荐 22） | 仓库自带的 GitHub Actions 工作流使用 `22.x` |
| npm | 9+ | 随 Node 一起安装 |
| Hexo | **6.3.0** | 已写进 `package.json` 的 `hexo.version`，无需全局安装即可用 `npx hexo` |
| Git | 任意较新版本 | 克隆与部署用 |

除此之外不需要 Python、不需要全局 `hexo-cli`。

---

## 五、快速开始（约 10 分钟）

### 1. 克隆并安装依赖

```bash
git clone https://github.com/MuyuDada/hexo-theme-fomalhaut.git my-blog
cd my-blog
npm install          # 或 npm ci（有 package-lock.json，更快更稳）
```

> 上面这条命令拉的是**本仓库**。想在它基础上做自己的站，clone 完把远程地址换成你自己的仓库：
> `git remote set-url origin https://github.com/你的用户名/你的仓库名.git`

> 不要在这个目录里执行 `hexo init`！那会重置 `_config.yml`，站点配置会丢。

### 2. 本地预览

```bash
npx hexo server      # 打开 http://localhost:4000
```

改 `source/` 下的内容与 CSS 会自动重新渲染；**改 `themes/` 下的 `.pug` 模板需要重启 server**（Hexo 只在启动时读模板）。

### 3. 改成你自己的站点（关键三步）

**第一步：改 `_config.yml`（站点级）**

```yaml
title: 我的小站
subtitle: ''
description: '记录学习与生活'
keywords: 'Hexo,博客'
author: 你的名字
language: zh-CN
url: https://your-domain.com/

deploy:
  - type: git
    repository: https://github.com/yourname/yourname.github.io.git
    branch: main
```

**第二步：改 `_config.fomalhaut.yml`（主题级）**

至少改这几处，站点就完全是你的了：

```yaml
avatar:
  img: /assets/avatar.webp        # 换成你自己的头像（也可用图床外链）

social:                            # 社交图标，格式： 名称: 链接 || 图标类名 || 动画类名
  Github: https://github.com/yourname || icon-github || faa-tada
  邮箱: mailto:you@example.com || icon-youxiang || faa-tada

index_img: /assets/head.jpg        # 首页大图

footer:
  owner:
    enable: true
    since: 2022

menu:                              # 顶部导航（键 = 显示名，值 = 路径 || 图标）
  首页: / || fas fa-home
  归档: /archives/ || fas fa-archive
  关于: /personal/about/ || fas fa-user
```

**第三步：写文章**

```bash
npx hexo new post "我的第一篇文章"   # 生成 source/_posts/YYYY-MM-DD-我的第一篇文章.md
```

详细写法见 [九、怎么开始写文章](#九怎么开始写文章)。

### 4. 构建产物

```bash
npx hexo clean && npx hexo generate && npx gulp
```

产物在 `public/`，`gulp` 负责 HTML / CSS 压缩。

---

## 六、界面预览

### 首页

顶部是全屏大图 + 站点名 + 打字机副标题，右侧固定悬浮按钮列（设置 / AI 助手 / 分享 / 回到顶部）。

![首页](repoPic/screenshot/01-home.jpg)

### 首页文章列表与侧栏

文章卡片、侧栏日历（含农历与节气）、倒计时卡、公告栏、小站资讯、右下角交互按钮。

![首页列表与侧栏](repoPic/screenshot/02-home-list.jpg)

### 文章页

文章标题栏、自动生成的右侧目录、代码块（语言标签 + 一键复制 + 行号）、外挂标签渲染（提示块 / 标签页）。

![文章页](repoPic/screenshot/03-post.jpg)

### 美化设置面板

点右下角齿轮打开。访客可以自己换字体、主题色、背景、特效开关，设置存 `localStorage`，刷新不丢。

![美化设置面板](repoPic/screenshot/04-settings.jpg)

> 想换成自己的截图：把图片放进 `repoPic/screenshot/`，改上面这几行的相对路径即可。

---

## 七、目录结构与文件地图

### 7.1 整体结构

```
├─ _config.yml                 站点级配置（标题/作者/域名/部署/插件）
├─ _config.fomalhaut.yml       主题配置 ★ 大部分开关在这里
├─ package.json                依赖与 npm scripts
├─ gulpfile.js                 构建压缩任务
├─ vercel.json                 Vercel 函数配置（用 Vercel 部署时才需要）
├─ scaffolds/                  新建文章/页面的模板
├─ scripts/                    ★ 站点级 Hexo 插件（构建期生效）
├─ api/        Vercel 云函数（AI 代理）
├─ functions/  Cloudflare Pages 函数（同一份逻辑）
├─ tools/      本地脚本（一键部署 Vercel）+ tools/tests/ 回归脚本
├─ .github/dependabot.yml        依赖自动更新（Dependabot）配置
├─ repoPic/                    README 用图（不参与构建）
├─ source/                     ★ 站点内容
│   ├─ _posts/                 文章
│   ├─ _data/link.yml          友链数据
│   ├─ _data/widget.yml        侧栏自定义卡片
│   ├─ assets/                 站点图片（头像、加载动画、徽章…）
│   ├─ css/*.css               站点级样式（见 7.2）
│   ├─ js/*.js                 站点级脚本（见 7.3）
│   ├─ box/  life/  site/  social/  personal/    各种独立页面
│   └─ categories/ tags/       分类页与标签页
└─ themes/fomalhaut/           ★ 主题本体（升级时整体替换即可）
    ├─ _config.yml             主题默认配置（被根 _config.fomalhaut.yml 覆盖）
    ├─ layout/                 Pug 模板
    ├─ source/css|js|img/      Stylus 样式 / 主题脚本 / 主题图
    ├─ scripts/                tag（外挂标签）/ filters / helpers / events
    └─ languages/              多语言文案
```

### 7.2 `source/css/` —— 站点级样式，各管什么

| 文件 | 负责的功能 | 哪里会用到 |
| --- | --- | --- |
| `about-page.css` | 关于页版式（Hero、线路卡、技术栈、时间线） | 选择器全部以 `.ab2` 开头，只影响 `/personal/about/` |
| `aside-calendar.css` | 侧栏「日历卡 + 倒计时卡」外观 | 只作用 `#aside-calendar` / `#aside-countdown`，配 `js/aside-calendar.js` |
| `archive-page.css` | 归档页卡片改版外观（年度分布柱、年份胶囊、年份章节、卡片栅格） | 选择器全部以 `.ar-ready` 开头，只影响 `/archives/`、`/categories/*`、`/tags/*` |
| `avatar-glow.css` | 侧栏头像呼吸灯（颜色跟随主题色） | 全站侧栏生效 |
| `category-bar.css` | 分类快捷导航条外观（胶囊、横向滚动、两侧渐隐、「更多」分隔） | 选择器全部以 `.category-bar` / `.cb-` 开头，由 `inject.head` 引入，配 `scripts/category-bar.js` + `js/inject/category-bar.js` |
| `census.css` | 网站统计页看板排版 | 只由 `/site/census/` 页面 `<link>` 引入 |
| `coin.css` | 投币按钮样式 | 文章底部「投喂」区 |
| `gitcalendar.css` | GitHub 贡献日历底色与格子 | `#git_container`，配 `js/gitcalendar.js` |
| `kslink.css` | 友人帐「快速申请」按钮 | `/social/link/` |
| `paperclip.css` | 侧栏作者卡的细长回形针装饰（内联 SVG，白天蓝白高光 / 夜间冰蓝夜光） | 由 `inject.head` 引入，只影响电脑端侧栏作者卡 |
| `mobile-drawer.css` | 手机端抽屉菜单改版（面板/字标/头像/菜单/遮罩/入场动效 13 小节） | 窄屏自动生效 |
| `navigation.css` | 顶栏导航改版（44×44px 触控区、磨砂按能力降级、站名光晕不裁切、按钮 hover 对齐） | 由 `_config.fomalhaut.yml` 的 `inject.head` 引入，配 `?v=` 缓存戳 |
| `site-inject.css` | 站点注入样式合集（横幅公告、PC 浅色主题、侧栏加宽、列表分页、面包屑、小站资讯卡、aplayer 音量条、页脚隐藏本站项等） | 由 `_config.fomalhaut.yml` 的 `inject.head` 以 `<link>` 引入 |
| `stats.css` | 文章统计页图表排版 | 只由 `/tags/` 页生效 |
| `tag-graph.css` | 标签关系图卡片外观（玻璃卡、说明行、加载占位） | 只作用 `#tag-graph`，配 `js/tag-graph.js` + `scripts/tag-graph.js` |
| `timeline-archive.css` | 「旧时光」页时间轴外观 | `/site/time/` |
| `twikoo.css` | Twikoo 评论区美化（表单/列表/按钮统一到主题色） | 全站引入；**本站评论已切到 Waline**（`comments.use: Waline`），这份样式只在改回 Twikoo 时生效 |
| `typewriter.css` | 首页副标题打字机观感 | 配 `js/inject/typewriter.js` |

### 7.3 `source/js/` —— 站点级脚本，各管什么

**入口与模块**（由 `source/js/fomal.js` 统一按顺序加载，加载清单在 `_config.fomalhaut.yml` 的 `inject.bottom`）

| 文件 | 负责的功能 |
| --- | --- |
| `fomal.js` | 站点主引导（105 行）。定义全局 `window.__fomal`，控制台执行 `__fomal.check()` 可自检各模块是否加载成功 |
| `modules/reading.js` | 阅读进度条 + FPS 检测（左下角那个 FPS 数字） |
| `modules/nav.js` | 导航栏吸顶、首屏欢迎语、侧栏「欢迎信息」卡片（腾讯位置服务）、分享按钮、「随便逛逛」 |
| `modules/console-art.js` | 控制台字符画与版权署名 |
| `modules/effects.js` | 页面装饰特效：星空 / 表情放大（雪花已拆到 `modules/snow.js`） |
| `modules/snow.js` | 雪花特效：两张预渲染雪片按大小 / 透明度 / 速度分层下落，厚度随视口 14–30px；深色 / 后台 / 手机 / 减少动态都暂停 |
| `modules/fireflies.js` | 萤火虫微光：纯 CSS 呼吸与慢漂，不需要 canvas / rAF / 轮询，桌面 14 只 / ≤600px 8 只，默认关闭、与雪花互斥 |
| `modules/ripple.js` | 点击涟漪：按下位置 1 个爆发节点 + 两圈同心水纹，700ms 后回收、同时最多 6 枚，默认关闭 |
| `modules/appearance-fonts.js` | 字体预览面板（阅读 4 / 个性 3 / 代码 5）：`document.fonts.load` + 12 秒超时 + 最新请求胜，失败不写偏好；旧 family 名由 `APPEARANCE_FONT_ALIASES` 迁移 |
| `modules/appearance-backgrounds.js` | 背景预览面板（12 壁纸 + 1 随机横屏 + 1 随机竖屏 + 8 渐变 + 7 纯色 + 8 在线接口）：打开分类才赋 `src`，切换走 `Image` 预加载 + token 取消 |
| `modules/cursor.js` | 鼠标相关：右键菜单、小猫咪、听话鼠标 |
| `modules/shell.js` | 站点「外壳」行为：快捷键、夜间动画、标题恶搞、搜索框、手机滚动条 |
| `modules/settings.js` | **美化设置面板**（Winbox）：卡片不透明度 / 背景滤镜 / 氛围特效 / 互动挂件 / 布局与部件 / 主题色 / 字体 / 背景（字体与背景两节的面板由 `modules/appearance-*.js` 生成） |
| `modules/footer-time.js` | 页脚「本站已运行 X 天」计时器 + 摸鱼徽章 |
| `data/holidays.js` | 法定休息日判断（纯数据） |
| `data/voyager1.js` | 旅行者 1 号距离模型（纯计算），页脚那行「旅行者 1 号当前距离地球…」 |

**独立功能脚本**（按需由配置引入或在页面里 `<script>`）

| 文件 | 负责的功能 |
| --- | --- |
| `ai-chat.js` | AI 助手前端本体（对话面板、流式输出、Markdown 渲染） |
| `aside-calendar.js` | 侧栏日历卡 + 倒计时卡渲染（含农历、节气、距离下一个节日） |
| `lunar.js` | 农历 / 二十四节气换算（1900–2100） |
| `festival.js` | 节日提醒通知卡片（25 个节日集中成一张表） |
| `celebrate.js` | 全屏礼炮 / 烟花（只在喜庆节日被 `festival.js` 动态插入） |
| `author-status.js` | 侧栏个人信息卡右上角状态胶囊（按时间与节假日切换） |
| `census.js` | 网站统计页图表数据（百度统计 API） |
| `stats.js` | 文章统计页增强 |
| `gitcalendar.js` | GitHub 贡献日历渲染 |
| `timeline-archive.js` | 「旧时光」页时间轴行为层 |
| `notify.js` | 轻量通知组件（替代 Vue + Element-UI 的 `$notify`） |
| `pjax-guard.js` | 修 pjax 选择器不匹配导致的「换页退回整页刷新」与「加载遮罩一直转圈」 |
| `wechat-qr.js` | 社交二维码点击 → 同页灯箱展示（不跳转不下载） |
| `kslink.js` | 友人帐「快速申请」表单填充 |
| `friend-latency.js` | 友人帐每张卡的访问延迟徽标：`fetch(mode:'no-cors')` 探测 + 5 秒 `AbortController` 超时，≤2000ms 绿 / 更慢橙 / 超时红；并发上限 4、每 120ms 放行一个，pjax 换页自动重跑 |
| `tag-graph.js` | 标签关系图渲染：读 `#tag-graph-data` 的 JSON、按主题色派生三档配色、按文章数缩放节点，换主题色自动重绘 |
| `coin.js` | 投币音效与动画 |
| `footer-music.js` | 页脚「猜你想看」补一条「听点音乐」→ `/life/music/` |
| `51la.js` | 51LA 统计与灵雀监控初始化 |
| `jquery.min.js` / `winbox.bundle.min.js` | 第三方库 |

**`source/js/inject/`**（由 `_config.fomalhaut.yml` 的 `inject.head` / `inject.bottom` 以 `<script>` 引入）

| 文件 | 负责的功能 |
| --- | --- |
| `beauty-boot.js` | 美化模块首屏预置（把 localStorage 里的字体/主题色/背景尽早写进 `:root`，避免闪一下默认样式） |
| `typewriter.js` | 首页副标题打字机「丝滑版」（同名 `window.Typed` 接管主题自带 Typed.js） |
| `search-lazy.js` | Algolia 搜索按需加载（点开搜索才拉取） |
| `scroll-gap-fix.js` | 锚点跳转补偿（常驻顶栏 70px） |
| `webinfo-card.js` | 侧栏「小站资讯」卡：KPI 数字滚动、运行天数、站点更新时间 |
| `ping-route.js` + `ping-route-boot.js` | 公告栏里每条部署线路的实时延迟徽标（boot 文件放可调参数 initialDelay / stagger） |
| `about-route-probe.js` | 关于页线路卡右下角的「实时延迟」徽标 |
| `archive-page.js` | 归档页卡片改版行为层：只读 `.article-sort` 重排成统计条 + 年份跳转 + 可折叠年份章节 + 卡片栅格（三层守卫 + 幂等，降级不改排版） |
| `category-bar.js` | 分类快捷导航条行为层：按路径点亮当前项、横向滚轮映射、两侧渐隐提示、当前项居中；pjax 换页自动重跑 |
| `pc-local-link.js` | 版权卡「文章链接」显示当前访问域名（而不是写死主域名） |
| `right-menu-state-boot.js` | 侧栏「右键模式」按钮的状态同步 |
| `ft-ad-extra.js` | 页脚友链补一个「广告位招租」（靠 `a[title="广告位招租"]` 存在才生效） |

### 7.4 `scripts/` —— 站点级 Hexo 插件（构建期跑）

| 文件 | 负责的功能 |
| --- | --- |
| `ai-chat-inject.js` | 往每个页面 `</body>` 前注入 `window.AI_CHAT_CONFIG` 与 `/js/ai-chat.js` |
| `archive-index.js` | 给归档页 `#archive` 内插一段 `ar-index` JSON（全站每篇的标题/路径/日期/分类/字数/阅读分钟），供归档页卡片显示分类与阅读时长 |
| `category-bar.js` | 给首页/归档/分类/标签/统计页的 `#content-inner` 开标签**之前**插入分类快捷导航条（`#category-bar`），分类名按长度排序并做 URL 编码 |
| `llms-txt.js` | 生成 `/llms.txt`（带 UTF-8 BOM）：站点简介 + 11 个关键页面 + 最近 20 篇文章，给 LLM 爬虫看的纯文本索引 |
| `tag-graph.js` | 注册 `tag_graph_data` 模板助手：从文章标签两两共现建图（阈值自适应，边少于 8 条就降到 1），输出节点 + 连线 JSON |
| `gallery-pager.js` | 相册自动分页（生成 `/box/gallery/wallpaper/p2.html` 这类分页） |
| `magnet-local-links.js` | 修 `hexo-magnet-fomal` 首页小冰磁贴跳到外站的问题 |
| `post-copyright-local-link.js` | 修文章版权卡「文章链接」写死主域名的问题 |
| `sticky-post.js` | 正文标记置顶（`sticky: true` → 首页置顶角标） |
| `swiper-lazyload-fix.js` | 修首页轮播在 pjax 往返后懒加载失效 |
| `tag-map-local.js` | 把 `hexo-tag-map` 的 jsDelivr CDN 改成本站自托管 |
| `vercel-api-copy.js` | 构建后把 `api/`、`functions/`、`vercel.json` 拷进 `public/` |

### 7.5 `tools/tests/` —— 回归脚本

用 Node 自带的 `node:test`，不需要额外依赖：

| 文件 | 覆盖的行为 |
| --- | --- |
| `cursor-effects.test.cjs` | 小猫咪光标的读写分离与元素缓存 |
| `fps-lifecycle.test.cjs` | 帧率监测的启动 / 停止与 generation 闭包 |
| `mobile-scrollbar.test.cjs` | 手机端自绘滚动条的读 / 写两阶段 |
| `scroll-listeners.test.cjs` | 滚动节流、`cancel()` 与 pjax 解绑 |
| `sw-cache.test.cjs` | Service Worker 的域名白名单、回源写缓存、二次请求吃缓存、文本与媒体 TTL 分流、`?__pr=` 探测不写缓存 |
| `beauty-switches.test.cjs` | 美化开关（猫咪 / 听话鼠标 / 涟漪 / 萤火虫 / 雪花）关掉后是否真的停下 |
| `theme-color.test.cjs` | 主题色预设、自定义 HEX 校验、旧键迁移与 `--on-theme` 前景色计算 |
| `appearance-fonts.test.cjs` | 字体面板：分组、12 秒超时与「最新请求胜」、失败不写偏好 |
| `appearance-backgrounds.test.cjs` | 背景面板：分类懒赋 `src`、预加载 token 取消、默认背景口径（四个模式各指向一个随机图 API）、站内相对路径 `/assets/wallpaper/*.avif` 不被 URL 校验误杀 |
| `fireflies.test.cjs` | 萤火虫数量分档、负层级与暂停开关 |
| `snow.test.cjs` | 雪花分层下落、dt 上限、厚度上限与暂停条件 |
| `ripple.test.cjs` | 涟漪同时存在上限、节点回收与非主键忽略 |
| `navigation.test.cjs` | 导航触控区尺寸、磨砂降级条件与站名溢出规则 |

跑法：`node --test "tools/tests/*.test.cjs"`（13 个脚本；部分脚本支持用环境变量指向 `bak/` 里的基线做前后对比）。v1.0.5 起 13 个脚本全部为 0 失败（441 个断言）。

### 7.6 `themes/fomalhaut/` —— 主题本体

| 目录 | 说明 |
| --- | --- |
| `layout/` | Pug 模板：`index` / `post` / `page` / `archive` / `category` / `tag` + `includes/` 组件（head、header、footer、aside、widget、third-party…） |
| `source/css/` | Stylus 样式；`_custom/custom.css` 是站点自定义总表（文件头有完整索引） |
| `source/js/` | 主题自带脚本（`main.js` 等） |
| `scripts/tag/` | 外挂标签实现 |
| `scripts/filters/` | 构建期过滤器（图片懒加载、随机封面） |
| `scripts/helpers/` | 模板助手（归档、分类、相关文章、echarts…） |
| `scripts/events/` | 启动事件（版本横幅、CDN 预解析、404、评论初始化） |
| `scripts/butterfly-version.js` | 上游 Butterfly 版本号常量：启动横幅与 CDN 地址共用（与主题自身版本 `package.json` 的 `version` 分开） |
| `languages/` | 多语言文案 |

> 💡 **要不要改主题？** 尽量别改。能用配置解决的走 `_config.fomalhaut.yml`；配置解决不了的，写进 `source/css/*.css` 或 `source/js/`，再用 `inject` 引入——这样升级主题时直接覆盖 `themes/fomalhaut/` 就行。

---

## 八、主要功能怎么配

> 下面所有片段都写在**站点根目录**的 `_config.fomalhaut.yml` 里（除非特别说明）。

### 8.1 导航菜单

```yaml
menu:
  首页: / || fas fa-home
  时间轴:
    归档: /archives/ || fas fa-archive
    标签: /tags/ || fas fa-tags
  清单:
    友人帐: /social/link/ || fas fa-link
    朋友圈: /social/fcircle/ || faa-tada
  关于: /personal/about/ || fas fa-user
```

缩进一层就是二级菜单。图标可以写 `fas fa-xxx`（Font Awesome）或 `faa-tada`、`faa-spin` 这类动画类名。
菜单项指向的页面如果不存在，直接在 `source/` 里建一个同名目录 + `index.md` 即可（见 [9.3 加新页面](#93-加一个新页面)）。

### 8.2 顶部图与封面

```yaml
disable_top_img: false
index_img: /assets/head.jpg        # 首页顶部大图（留空 = 不显示，露出站点背景图）
default_top_img: /assets/head.jpg  # 其他页面默认顶部图
archive_img:                       # 归档页顶部图（留空跟随 default_top_img）
category_img:                      # 分类页顶部图

cover:
  index_enable: true    # 首页文章卡片显示封面
  aside_enable: true    # 侧栏文章卡片显示封面
  archives_enable: true # 归档页显示封面
  default_cover:        # 文章没写 cover 时从这里随机取一张
    - /assets/wallpaper/desktop-1.avif
    - /assets/wallpaper/desktop-2.avif
    - /assets/wallpaper/mobile-1.avif
```

- 单篇文章想指定封面：在文章 Front-matter 写 `cover: 图片链接`。
- `cover.default_cover` 现在填的是**站点自带的 12 张壁纸**（`source/assets/wallpaper/`，6 张横屏 + 6 张竖屏，AVIF 格式），不依赖任何外部图床。换成你自己的图片即可。

### 8.3 主题色与暗色模式

```yaml
theme_color:
  enable: true
  main: '#49b1f5'       # 主题色（留空则用顶部那套默认值）
  paginator:            # 分页器颜色
  button_hover:         # 按钮悬浮色
  text_selection:       # 选中文字底色
  link_color: '#a591e0' # 链接色
  meta_color: '#858585' # 次要文字
  hr_color: '#A4D8FA'   # 分隔线

display_mode: light     # light | dark | auto（跟随系统）
darkmode:
  enable: true
  button: true          # 右下角显示日夜切换按钮
```

站点里绝大部分自定义样式的颜色都由 `var(--theme-color)` 派生（用了 `color-mix`），所以换主题色时整站会跟着变——这也是美化面板「主题色设置」能实时预览的原因。

### 8.4 侧栏卡片

```yaml
aside:
  enable: true
  card_author:            # 个人信息卡
    enable: true
    description: '这是我的小站'
    button:
      enable: true
      text: 关注我
      link: https://github.com/yourname
  card_announcement:      # 公告栏（支持 HTML）
    enable: true
    content: 这里写公告
  card_recent_post:       # 最新文章
    enable: true
    limit: 5
  card_categories:        # 分类
    enable: true
    limit: 8
  card_tags:              # 标签
    enable: true
    limit: 40
  card_archives:          # 归档
    enable: true
    type: monthly
    format: MMMM YYYY
  card_webinfo:           # 小站资讯（字数 / 访客 / 运行天数）
    enable: true
    post_count: true
    last_push_date: true
  card_friend_link:       # 友人帐侧栏卡
    enable: true
  card_newest_comment:    # 最新评论
    enable: false
```

想加**完全自定义**的卡片：写进 `source/_data/widget.yml`，用 `top:` / `bottom:` 分组，`html:` 里写任意 HTML。
侧栏的「日历卡 / 倒计时卡」就是这么做出来的（见 `source/js/aside-calendar.js` 顶部注释）。

### 8.5 评论系统

支持 11 种：`Twikoo` / `Waline` / `Valine` / `Giscus` / `Utterances` / `Gitalk` / `Disqus` / `Disqusjs` / `Livere` / `Remark42` / `Facebook Comments`。

```yaml
comments:
  use:
    - Waline               # ★ 在这里切换用哪个（本站当前用 Waline）
  text: true               # 显示「评论」二字
  lazyload: true           # 滚动到评论区才加载（开了之后评论数会失效）
  count: false             # 文章顶部显示评论数
  card_post_count: false   # 首页卡片显示评论数
```

#### Waline 配置（本站当前用法）

```yaml
waline:
  serverURL: https://comment.muyudada.dpdns.org/   # ← 就这一处必填，指向你自己的 Waline 服务端
  bg:                                              # 评论区背景，留空走主题卡片
  pageview: false                                  # 浏览量统计（需要服务端支持）
  option:
    lang: zh-CN
    login: enable                                  # 允许第三方登录
    requiredMeta: [nick, mail]                     # 昵称与邮箱必填
    emoji:                                         # 三套表情（走 unpkg）
      - https://unpkg.com/@waline/emojis@1.2.0/weibo
      - https://unpkg.com/@waline/emojis@1.2.0/bilibili
      - https://unpkg.com/@waline/emojis@1.2.0/bmoji
```

Waline 服务端自己部署（Vercel / Docker / 自建服务器都行，见 <https://waline.js.org/>），拿到地址填进 `serverURL` 即可。
`option` 会原样透传给 `Waline.init()`，官方文档里的参数都能写。

#### Twikoo 配置（不想自己部署服务端可以选它）

1. **部署 Twikoo 服务端**（三选一）：
   - **Vercel 一键部署**（最省事）：打开 <https://twikoo.js.org/quick-start.html> → 点「Vercel 部署」→ 登录 Vercel → 一路 Next → 部署完把首页那张图里的地址复制下来；
   - **Docker**：`docker run -d -p 8080:8080 -v /data/twikoo:/data -e TWIKOO_THROTTLE=200 ikew0ng/twikoo`；
   - **云函数**：腾讯云 SCF / 阿里云 FC 都有 Twikoo 模板。
2. **在配置里填地址**：

```yaml
twikoo:
  envId: https://你的-twikoo-地址         # ← 就这一处必填
  region:                                # 腾讯云 SCF 部署时才需要填（如 ap-shanghai）
  visitor: false                         # 开启访客统计（需要配合 envId 的服务端）
  option:                                # 透传给 Twikoo 初始化，如 lang、path
```

3. **打开评论区**：把上面的 `comments.use` 改回 `Twikoo`。
4. **（可选）美化**：仓库已带 `source/css/twikoo.css`，由 `_config.fomalhaut.yml` 的 `inject.head` 引入，把表单/列表/按钮统一到主题色。不需要就在 `inject.head` 里删掉那一行。
5. **（可选）首页显示最新评论**：把 `aside.card_newest_comment.enable` 设为 `true`。

> 其他评论系统的参数（`valine` / `giscus` …）在同一个配置文件的 `comments` 段下方，键名与官方文档一致，照填即可。

### 8.6 搜索

```yaml
local_search:            # 方案 A：本地搜索，零后端、零 Key（本站当前用法）
  enable: true
  preload: true
  top_n_per_article: 1
  unescape: false

algolia_search:          # 方案 B：Algolia 云搜索（内容多时更快、支持全文高亮）
  enable: false
  hits:
    per_page: 10
```

本地搜索靠 `hexo-generator-search`（已在 `package.json` 里）生成 `/search.xml`，前端脚本是 `themes/fomalhaut/source/js/search/local-search.js`。
两个开关都关掉时，顶栏不会出现搜索按钮。

用 Algolia 还要在根 `_config.yml` 补上应用信息：

```yaml
algolia:
  appId: YOUR_ALGOLIA_APP_ID         # https://dashboard.algolia.com/account/api-keys
  apiKey: YOUR_ALGOLIA_SEARCH_KEY
  adminApiKey: YOUR_ALGOLIA_ADMIN_KEY
  chunkSize: 5000
  indexName: your_index_name
  fields:
    - content:strip:truncate,0,30000
    - excerpt:strip
    - permalink
    - title
```

改完执行 `npx hexo algolia` 推送索引，再 `npx hexo generate`。仓库里 `source/js/inject/search-lazy.js` 会让 Algolia 的资源延后到点开搜索才加载。
**注意**：不推索引也能正常构建（`hexo-algoliasearch` 只在 `hexo algolia` 命令里读这些键），但搜索会没有结果 —— 本站之前就是踩了这个坑，所以切到了本地搜索。

### 8.7 网站统计

#### ① 不蒜子（前端 PV / UV，零配置）

```yaml
busuanzi:
  site_uv: true     # 站点访客数
  site_pv: true     # 站点访问量
  page_pv: true     # 单页访问量
```

#### ② 各平台统计脚本（填 ID 即生效）

```yaml
baidu_analytics:                     # 百度统计 ID，https://tongji.baidu.com/web/welcome/login
google_analytics:                    # GA4 衡量 ID（G-XXXXXXX）
cnzz_analytics:                      # 友盟 CNZZ 站点 ID
cloudflare_analytics:                # Cloudflare Web Analytics token
microsoft_clarity:                   # Microsoft Clarity ID
```

#### ③ 51LA + 灵雀监控（这个不在 yml 里）

打开 `source/js/51la.js`，把两个 ID 换成你自己的（<https://user.51.la/> 申请）：

```js
LA.init({ id: "YOUR_51LA_ID", ck: "YOUR_51LA_CK", hashMode: true });
new LingQue.Monitor().init({ id: "YOUR_LINGQUE_ID", sendSpaPv: true });
```

不需要就在 `_config.fomalhaut.yml` 的 `inject.head` / `inject.bottom` 里删掉 `sdk.51.la` 与 `/js/51la.js` 那几行。

#### ④ 网站统计页 `/site/census/`（图表看板）

这一页用百度统计的开放 API 拉数据，配置在 `source/js/census.js`：

```js
var start_date = '20200101'                     // 统计开始日期
var access_token = 'YOUR_BAIDU_ACCESS_TOKEN'    // 百度统计 access_token（30 天有效）
var site_id = 'YOUR_BAIDU_SITE_ID'              // 站点 ID
// 刷新 token 的接口见文件第 4 行注释
```

不想用就把 `source/site/census/` 整个目录删掉，并去掉菜单里的「网站统计」。

#### ⑤ GitHub 贡献日历

根 `_config.yml` 里的 `gitcalendar` 段（本站已接上公开数据源，无需自建服务）：

```yaml
gitcalendar:
  enable: true
  enable_page: /site/census/
  user: MuyuDada                     # GitHub 用户名
  apiurl: "https://gitcalendar.example.com"   # 旧方案（自建 akilar 服务），插件只读不用，留着兼容
  jsonurl: "https://github-contributions-api.jogruber.de/v4/MuyuDada?y=last"  # 实际请求的数据源
```

- `jsonurl` 指向的 [github-contributions-api](https://github-contributions-api.jogruber.de/) 返回扁平的 `{ contributions: [{date,count,level}], total }`；
  `source/js/gitcalendar.js` 里的 `git_normalize()` 会把它转成插件要的「53 周 × 7 天」二维数组，所以两种数据格式都能用。
- 换成你自己的用户名，只要把 `user` 和 `jsonurl` 里的 `MuyuDada` 一起替换即可。

### 8.8 美化设置面板（每一项都干什么）

打开方式：右下角**齿轮图标**（`themes/fomalhaut/layout/includes/rightside.pug` 的 `#rightside_config`），面板本体在 `source/js/modules/settings.js`。
所有设置存在浏览器 `localStorage`，不写服务器；面板底部有「恢复默认设置」。

| 分节 | 项目 | 作用 |
| --- | --- | --- |
| **顶部** | 卡片不透明度 | 正文卡片背景的不透明度（0–100%，默认 98%，只动卡片底色） |
| | 背景滤镜 | 对全站背景图做模糊 / 饱和度 / 对比度处理（各一个数字框 + 滑条 + 保存） |
| **一、氛围特效** | 星空特效（夜间模式） | 夜间背景上飘的星空粒子 |
| | 霓虹彩灯（夜间模式） | 夜间标题的霓虹发光动画 |
| | 雪花特效（白天模式） | 白天飘雪 + 底部薄积雪，默认关闭 |
| | 萤火虫微光 | 下方慢慢飘的微光，默认关闭；与雪花互斥，只保留最后开启的一项 |
| | 昼夜切换 | 入夜 / 黎明的过场动画，四档：关闭 / 轻 / 标准 / 华丽 |
| **二、互动挂件** | 猫咪挂件 | 桌面端跟着鼠标走的小猫咪（默认开启；关掉会真的停表） |
| | 听话鼠标 | 关闭后使用系统鼠标指针（默认开启） |
| | 帧率监测 | 左下角 FPS 状态条（默认开启，调试用） |
| | 点击涟漪 | 按下位置的同心水纹，默认关闭、同时最多 6 枚 |
| **三、布局与部件** | 右侧部件 | 右下角按钮列的显示 / 隐藏 |
| | 顶栏常驻 | 滚动时导航栏是否一直吸顶 |
| | 侧栏显隐 | 侧栏显示 / 隐藏 |
| | 侧栏位置 | 侧栏放左边还是右边 |
| **四、主题色设置** | 11 个预设色 | 红 / 橙 / 黄 / 抹茶 / 青绿 / 玉石绿 / 晴空蓝 / 柔靛蓝 / 雾蓝灰 / 紫罗兰 / 樱花粉，点一下全站换色 |
| | 自定义取色圈 | 原生调色板，值以六位 HEX 存本地，首帧校验不合法则回落默认青绿 |
| **五、字体设置** | 阅读字体 4 款 | 霞鹜文楷（默认）/ 霞鹜新晰黑 / 思源宋体 / 系统默认，正文区实时预览 |
| | 个性装饰 3 款 | 站酷快乐体 / 马善政毛笔楷书 / 龙藏体，默认收在折叠块里 |
| | 代码字体 5 款 | JetBrains Mono（默认）/ Fira Code / Source Code Pro / Maple Mono / Hack，代码区实时预览 |
| | 字重 | 8 款上游带真粗体的各注册 400 + 700 两个 `@font-face`；三款装饰体上游只有 400，由 `html { font-synthesis-weight: none }` 禁掉合成粗体（否则中文笔画会被机械加粗糊掉） |
| **六、背景设置** | 壁纸 | 顶部两张是**随机图 API**（横屏 / 竖屏），下面 6 张桌面 + 6 张手机壁纸（`source/assets/wallpaper/`，AVIF，全部本地），打开分类才加载缩略图 |
| | 色彩 | 8 个渐变色 + 7 个纯色，另有自定义纯色取色器 |
| | 自定义 | 粘贴 HTTPS 图片链接；先预览探针再应用，失败保留旧图 |
| | 动态壁纸 API | 收在「高级」折叠块里：每次刷新可能返回不同图片的在线接口 |

**改面板本身**：

- 想改**默认值**（访客没动过面板时用什么）：改 `_config.fomalhaut.yml` 的 `font` / `theme_color` / `background` 段，以及 `source/js/inject/beauty-boot.js`；
- 想加**字体**：三处一起改，少一处面板就会「点了没反应」——① `themes/fomalhaut/source/css/_custom/custom.css` 的「字体引入」一节加 `@font-face`（上游有 700 就补两段，见下）；② `source/js/modules/appearance-fonts.js` 的 `APPEARANCE_TEXT_FONTS` / `APPEARANCE_CODE_FONTS` 加一行（按钮 id = `swf_` / `swfc_` + family 名）；③ `source/js/modules/settings.js` 的 `FONT_LIST` / `CODE_FONT_LIST` 白名单加同一个名字（不在白名单里的值每次刷新都会被写回默认）。字体若只有 400 一个字重，粗体文字会走浏览器合成粗体、中文发糊，此时要么补 700 的 `@font-face`，要么让 `html { font-synthesis-weight: none }` 兜底（字形清晰但不会加粗）；
- 想加**壁纸 / 渐变 / 纯色 / 在线接口**：改 `source/js/modules/appearance-backgrounds.js` 的 `AP_BACKGROUND_CATALOG` 与 `AP_BACKGROUND_APIS`；想加 **主题色预设**：改 `source/js/modules/settings.js` 的 `themeColorPresets`；
- 想**直接关掉面板**：`_config.fomalhaut.yml` 的 `beautify.enable: false`，然后去掉 `inject.bottom` 里 `settings.js` 那一行。

### 8.9 刷新与性能相关开关

```yaml
pjax:
  enable: true        # 站内跳转不整页刷新
instantpage: true     # 鼠标悬停在链接上时预加载
lazyload:
  enable: true
  field: site         # site = 全站；post = 仅文章
  blur: true
pangu: true           # 中英文之间自动加空格
preloader:            # 首屏加载动画
  enable: false
  source: 1           # 1~10，对应 themes/fomalhaut/layout/includes/loading/load_style/
```

### 8.10 AI 助手

#### 它是什么

右侧悬浮的对话面板，能总结当前页面、解释名词。前端本体在 `source/js/ai-chat.js`，由 `scripts/ai-chat-inject.js` 自动注入到每个页面（不改主题源码）。

#### 配置项（`_config.fomalhaut.yml` 的 `ai_chat` 段）

```yaml
ai_chat:
  enable: true                 # 总开关：false 则不注入按钮和面板
  api_base: https://api.deepseek.com
  api_key: ''                  # ⚠️ 直接写 Key 会随页面下发，只建议本地测试
  api_key_file: .ai-chat-key   # 或把 Key 写进这个文件（已在 .gitignore 里）
  model: deepseek-chat         # 换模型只改这一行
  temperature: 0.7
  max_tokens: 8192             # 单次回复上限（含思考模型的 reasoning token）
  max_history: 12              # 每次带给模型的历史轮数
  max_page_chars: 32000        # 页面正文上限（超长文章取开头 60% + 结尾 35%）
  timeout_ms: 10000            # 首字节超时提示
  welcome: 你好，我是这个页面的 AI 助手……
  first_question: 请用中文总结这个页面的内容：先用一句话概括，再列 3-5 条要点。
  system_prompt: |
    你是这个博客的页面助手，语气自然、简洁、像朋友聊天。
```

#### 两种用法

**用法 A：直连服务商（本地 / 内网测试用）**

把 Key 放进 `.ai-chat-key`（站点根目录，一行纯文本）或直接写 `ai_chat.api_key`。
这样 Key 会随页面下发到浏览器，**任何人 F12 都能看到**，别在公网用。

**用法 B：同源代理（公网推荐，仓库已带实现）**

1. 部署平台加环境变量 `DEEPSEEK_API_KEY`（Vercel：Settings → Environment Variables；Cloudflare Pages：Settings → Environment variables）；
2. 构建时 `scripts/ai-chat-inject.js` 会自动把前端的 `api_base` 改成 `/api`、Key 换成占位符 `via-proxy`；
3. 请求打到 `api/chat/completions.js`（Vercel）或 `functions/api/chat/completions.js`（Cloudflare Pages），由它在服务端读环境变量再去请求服务商。

代理函数自带：每 IP 限流、`max_tokens` 上限（`MAX_TOKENS_CAP = 8192`）、CORS 白名单。
白名单默认放行 `muyudada.dpdns.org` 及其全部子域，换域名时的改法：

```bash
# 方式一：直接改两个常量（api/chat/completions.js 与 functions/api/chat/completions.js 都要改）
const DEFAULT_ORIGINS = 'https://muyudada.dpdns.org,https://www.muyudada.dpdns.org'
const DEFAULT_SUFFIXES = 'muyudada.dpdns.org'

# 方式二：不改代码，用环境变量覆盖
AI_PROXY_ORIGINS=https://your-domain.com
AI_PROXY_ALLOW_SUFFIXES=your-domain.com
```

#### 换成别的大模型

`api_base` 改成服务商地址（如 `https://api.openai.com`、`https://api.moonshot.cn`），`model` 改成对应模型名，代理函数里的 `Authorization: Bearer <key>` 是 OpenAI 兼容格式，大多数国内厂商都通用。

#### 关掉它

`ai_chat.enable: false` 即可（面板、按钮、注入脚本都不会再出现）。

### 8.11 友人帐 / 朋友圈 / 画廊等页面

| 页面 | 入口文件 | 数据来源 |
| --- | --- | --- |
| 友人帐（友链） | `source/social/link/index.md` | `source/_data/link.yml` |
| 朋友圈 | `source/social/fcircle/index.md` | [hexo-circle-of-friends](https://github.com/Rock-Candy-Tea/hexo-circle-of-friends) 产出的静态 JSON |
| 画廊 | `source/box/gallery/index.md` + `wallpaper/index.md` | 页面内 Markdown 图片 |
| 网址导航 | `source/box/nav/index.md` | 页面内 HTML + `source/box/nav/icons/` 图标 |
| 关于 | `source/personal/about/index.md` | 页面内 HTML，样式在 `source/css/about-page.css` |
| 旧时光（时间线） | `source/site/time/index.md` | `{% timeline %}` 标签 |
| 八音盒 | `source/life/music/index.md` | Meting API + 网易云歌单 ID |
| 小游戏 / 动画 | `source/life/games/`、`source/box/animation/` | 外链演示 |
| 天文星图 | `source/box/astronomy/voyager.html` | 独立 HTML，`skip_render` 不参与渲染 |

**友人帐怎么加人**：编辑 `source/_data/link.yml`：

```yaml
- class_name: 常来常往🍔
  class_desc: 交换友链请在友人帐页面留言
  link_list:
    - name: 示例站点
      link: https://example.com/
      avatar: https://example.com/avatar.jpg   # 建议 100x100 以内
      descr: 一句话介绍
      siteshot: https://example.com/shot.jpg   # 可选，站点截图；不写则自动用 thum.io 抓取
```

> 某个分组想用小卡片（不带截图）就在分组里写 `mini: true`，见 `link.yml` 的「工具站🔧」分组。
> 页面上的**访问延时徽章**由 `source/js/friend-latency.js` 提供：对每张 `.friend-card` 用 `fetch(no-cors)` 探测，
> 5 秒超时，≤2000ms 绿、更快更好，超时标 `Timeout`；并发上限 4，pjax 换页后自动重跑。

友人帐有三种样式，改 `flink_style: volantis`（可选 `butterfly` / `volantis` / `flexcard`）。
不需要的页面：删掉对应目录，再去 `menu:` 里去掉菜单项。

### 8.12 页脚与页脚徽标

页脚模板在 `themes/fomalhaut/layout/includes/footer.pug`，四块内容：

1. **`格言` + `猜你想看`**（第 1–31 行）：文案与链接都直接写在 pug 里，改文字就改这里；
2. **`推荐友链` 小头像格**（第 32–59 行）：硬编码的展示位，换成你自己的朋友即可（头像建议 100×100 以内）；
   - `source/js/inject/ft-ad-extra.js` 会在末尾再补一个「广告位招租」凑成 4+4 两排；不想要就删掉那个文件与 `inject.bottom` 里的引用；
3. **版权行 / 已运行天数 / 摸鱼徽章**（第 60–85 行）：文字来自 `_config.fomalhaut.yml` 的 `footer.owner` 与 `footer.custom_text`；
4. **徽章列 `p#ghbdages`**（第 86–113 行）：一行小徽章，两种来源——
   - **本地 SVG**：放在 `source/assets/badge/`，用 `/assets/badge/xxx.svg` 引用（仓库自带 `Theme-Fomalhaut-6513df.svg`、`CDN-npmmirror.svg`（去掉原版投影的那一份）、`Fomalhaut-work.svg`、`Fomalhaut-rest.svg`）；
   - **shields.io 动态徽章**：`https://img.shields.io/badge/左侧文字-右侧文字-颜色.svg`，例如
     `https://img.shields.io/badge/Frame-Hexo-blue.svg`、`https://img.shields.io/badge/Hosted-Vercel-brightgreen.svg`；
     文字里的空格写成 `_`，颜色可用十六进制（去掉 `#`）。

增删一行徽章的写法：

```pug
a.github-badge(target='_blank' href='https://hexo.io/' style='margin-inline:5px' title='博客框架为 Hexo')
  img(src='https://img.shields.io/badge/Frame-Hexo-blue.svg' alt='')
```

改完页脚记得 **重启 `hexo server`**（Hexo 只在启动时读 pug 模板）。

### 8.13 归档页卡片（`/archives/`）

归档页默认由主题渲染成「日期 + 标题」列表，仓库另外叠了一层站点级卡片改版：

| 想改什么 | 去哪儿改 |
| --- | --- |
| 每页篇数、年份 / 月份分页 | `_config.yml` 的 `archive_generator`（默认 `per_page: 12`） |
| 卡片外观（封面高度、列数、间距、配色） | `source/css/archive-page.css`（顶部变量 `--ar-w` / `--ar-gap` / `--ar-cover-h`） |
| 版面结构（统计条、年份章节、折叠） | `source/js/inject/archive-page.js` |
| 卡片上的分类与阅读时长 | `scripts/archive-index.js`（构建期写进页面的 `ar-index` JSON） |

两个引入行在 `_config.fomalhaut.yml` 的 `inject.head`（`archive-page.css` / `archive-page.js`，带 `?v=` 缓存戳，改完记得提版本）。
**回滚**：删掉那两行，归档页立刻回到主题原样——样式与脚本都带 `.ar-ready` 守卫，缺一不可；`scripts/archive-index.js` 只影响归档页的 `</head>`，留着也不会对别的页面产生输出。

### 8.14 分类快捷导航条（首页 / 归档 / 分类 / 标签）

一排横向滚动的分类胶囊，插在 `#content-inner` **开标签之前**（在正文卡片之上，占满整行）。

插在这个位置而不是 `main` 里面，是因为 `main.layout` 是 `display: flex` 的**行**容器：导航条塞进去会变成第三个 flex item，被压成内容宽度、还吃到 `.layout > div:first-child` 的卡片内边距。`#body-wrap` 本身是 flex column，把导航条放在 `main` 前面才能自然占满一行；顺带一提 `#body-wrap` 正是 pjax 的替换单元，放外面也不会残留上一次的高亮。

对应地，`source/css/category-bar.css` 的 `.category-bar` **必须显式写 `width: 100%`** —— flex column 里左右 `margin: auto` 会让 flex item 变成 shrink-to-fit，只写 `max-width: 1200px` 的话导航条只有内容那么宽（踩过，实测只有 465px）。

| 想改什么 | 去哪儿改 |
| --- | --- |
| 显示在哪些页面 | `scripts/category-bar.js` 的 `shouldInject(page)`（判 `page.__index` / `page.archive` / `page.category` / `page.tag` / `page.type === 'echarts'`） |
| 胶囊顺序 | 同文件 `buildBar()`，默认按分类名长度再按中文排序 |
| 外观（圆角、间距、渐隐宽度、配色） | `source/css/category-bar.css`（顶部一组 `--cb-*` 变量，全部从 `--theme-color` 派生） |
| 行为（当前项点亮、滚轮横滚、居中） | `source/js/inject/category-bar.js` |

三个文件分别在 `scripts/`、`source/css/`、`source/js/inject/`，引入行在 `inject.head`（`category-bar.css` / `category-bar.js`）。
**注意**：`scripts/` 下的同名 `category-bar.js` 是**构建期**插件，`source/js/inject/category-bar.js` 是**浏览器端**脚本，两者不是同一个东西，改之前先看清楚路径。

### 8.15 标签关系图（`/tags/`）

在「文章统计」页的标签云与分类饼图之间插一张关系图：节点是标签、连线是两个标签同时出现在同一篇文章里的次数。

- 数据：`scripts/tag-graph.js` 注册的 `tag_graph_data` 助手，构建期算好塞进 `#tag-graph-data` 的 JSON；
- 渲染：`source/js/tag-graph.js` 读那段 JSON 用 ECharts 画图（ECharts 走 jsDelivr，缺失时脚本自己动态补一个 `<script>`）；
- 阈值：默认只画「共现 ≥ 2 次」的边，**边少于 8 条自动降到 1** —— 文章少的站否则整张图一条线都没有；
- 配色：按文章数分「高频（≥5）/ 常用（≥2）/ 低频」三档，从 `--theme-color` 派生色相偏移，换主题色会通过 `MutationObserver` 自动重绘；
- 节点上限：`tag_graph_data({maxNodes: 40})`，标签特别多时可以调大。

### 8.16 留言板 / 打赏 / llms.txt

| 页面 | 源文件 | 说明 |
| --- | --- | --- |
| `/comments/` 留言板 | `source/comments/index.md` | 正文是普通 Markdown + 一段作用域 `<style>`，评论区由主题按 `comments.use` 自动渲染 |
| `/sponsor/` 打赏 | `source/sponsor/index.md` | 三张打赏卡（支付宝 / 微信 / 爱发电）+ 打赏名单；二维码在 `source/assets/sponsor/`，名单直接在正文里加 `.sp-item` 即可 |
| `/llms.txt` | `scripts/llms-txt.js` | 构建期 generator，输出站点简介 + 关键页面 + 最近 20 篇文章 |

文章底部的「投喂」按钮由 `_config.fomalhaut.yml` 的 `reward` 段控制：`enable: true` 才出现，`QR_code` 里两条分别是微信与支付宝的图与文案。
`llms.txt` 的**关键页面清单**在 `scripts/llms-txt.js` 的 `keyPages()` 里，加页面时同步加一条；`RECENT_POSTS_COUNT` 控制最近文章条数。
文件开头写入的 `\ufeff` 是 **UTF-8 BOM**，别删：静态托管或 Windows 编辑器对无 BOM 的 `.txt` 会按 ANSI/GBK 解码，中文直接乱码。

---

## 九、怎么开始写文章

### 9.1 新建一篇文章

三种方式任选：

```bash
npx hexo new post "文章标题"        # 按 scaffolds/post.md 生成 source/_posts/YYYY-MM-DD-文章标题.md
npx hexo new draft "草稿标题"       # 生成到 source/_drafts/，加 --publish 才进入正式列表
```

或者直接在 `source/_posts/` 里新建一个 `.md` 文件——文件名建议用 `YYYY-MM-DD-标题.md`（由 `_config.yml` 的 `new_post_name` 决定）。

文章网址由 `permalink: posts/:abbrlink.html` 自动生成一串哈希（`hexo-abbrlink` 插件），所以**改标题不会改变已发布文章的网址**。

### 9.2 Front-matter 全字段说明

写在文件开头 `---` 之间：

```yaml
---
title: 文章标题                 # 必填
date: 2026-10-01 10:00:00      # 必填，发布时间
updated: 2026-10-02 10:00:00   # 可选，更新时间（不写则按文件修改时间）

description: 一句话摘要          # 可选，首页卡片与搜索引擎摘要
keywords: 关键词1,关键词2        # 可选

categories:                     # 分类（可多个）
  - 开始使用
tags:                           # 标签（可多个）
  - Hexo
  - Fomalhaut

cover: /assets/wallpaper/desktop-1.avif   # 卡片封面；不写则从 cover.default_cover 随机取
top_img: /assets/head.jpg       # 文章页顶部大图；不写则跟随 default_top_img
randomcover: false              # true = 每次刷新从 default_cover 随机换一张

sticky: 1                       # 置顶（数值越大越靠前）；也可在正文写 <!-- sticky --> 

toc: true                       # 是否显示右侧目录
toc_number: true                # 目录是否带序号
toc_expand: false               # 目录默认是否展开
toc_style_simple: false         # 简洁目录样式

comments: true                  # 本文是否开启评论
aside: true                     # 本文是否显示侧栏
highlight_shrink: false         # 代码块默认折叠

copyright: true                 # 是否显示版权卡片
copyright_author: 你的名字
copyright_author_href: https://example.com/
copyright_url: https://example.com/posts/xxx.html
copyright_info: 转载请标明出处

mathjax: true                   # 本文启用 MathJax 公式
katex: false                    # 本文启用 KaTeX（二选一）
mermaid: true                   # 本文启用 Mermaid 图表
aplayer: true                   # 本文启用 APlayer 音乐
---
```

> 只写需要的字段即可，其余留空就是默认行为。

### 9.3 加一个新页面

1. 在 `source/` 下建目录（例如 `source/tools/`），里面放 `index.md`：

```markdown
---
title: 工具箱
date: 2026-10-01 10:00:00
comments: false
---

这一页的正文……
```

2. 在 `_config.fomalhaut.yml` 的 `menu:` 里加一项：`工具箱: /tools/ || fas fa-toolbox`。

页面默认套用 `themes/fomalhaut/layout/page.pug`（带侧栏、带顶部图）。**页面里可以直接写 HTML**，例如：

```markdown
<div class="my-card">自定义区块</div>

<style>
.my-card { padding: 16px; border-radius: 10px; background: var(--card-bg); }
</style>
```

想让样式单独成文件：写到 `source/css/xxx.css`，再在 `_config.fomalhaut.yml` 的 `inject.head` 里加一行 `<link rel="stylesheet" href="/css/xxx.css?v=1">`。

### 9.4 图片怎么放

| 方式 | 写法 | 适用 |
| --- | --- | --- |
| 站内相对路径 | `![描述](/assets/pic.jpg)` | 图片放 `source/assets/` |
| 同目录相对路径 | `![描述](./pic.jpg)` | 需要在 `_config.yml` 打开 `post_asset_folder: true`，图片与文章同目录 |
| 外链 / 图床 | `![描述](https://your-cdn.com/pic.jpg)` | 图片多时推荐 |

### 9.5 本地预览与发布

```bash
npx hexo server            # http://localhost:4000，改完自动刷新
npx hexo clean             # 清缓存（改了配置或模板后建议先 clean）
npx hexo generate && npx gulp   # 出产物到 public/
npx hexo deploy            # 按 _config.yml 的 deploy 段推送
```

### 9.6 分类与标签

- 分类与标签**不用提前创建**，Front-matter 里写了就会自动生成 `/categories/xxx/`、`/tags/xxx/`；
- 分类页与标签页的版式由 `_config.fomalhaut.yml` 的 `category_ui` / `tag_ui` 控制（留空为默认，填 `index` 为卡片式）；
- 首页的「小冰分类磁贴」由根 `_config.yml` 的 `magnet` 段控制，`display` 列表里的 `name` 必须与文章分类名一致。

---

## 十、最常改的地方（速查）

| 我想改…… | 去哪改 |
| --- | --- |
| 站点名 / 作者 / 域名 / 部署仓库 | 根 `_config.yml` 的 `title` / `author` / `url` / `deploy` |
| 首页标题下的副标题 | `_config.fomalhaut.yml` 的 `subtitle` |
| 主题色 | `_config.fomalhaut.yml` 的 `theme_color.main`，或让访客用面板自己选 |
| 头像 | `_config.fomalhaut.yml` 的 `avatar.img`（默认 `/assets/avatar.webp`） |
| 首页大图 | `_config.fomalhaut.yml` 的 `index_img`；全站背景改 `inject.head` 里 `#defineBg` 那行的 `--default-bg` |
| 文章默认封面池 | `_config.fomalhaut.yml` 的 `cover.default_cover` |
| 顶部导航 | `_config.fomalhaut.yml` 的 `menu` |
| 页脚文案 / 版权 / 徽章 | `themes/fomalhaut/layout/includes/footer.pug`（改完要重启 server）+ `footer.owner` / `footer.custom_text` |
| 侧栏卡片开关 | `_config.fomalhaut.yml` 的 `aside` 段 |
| 评论区 | `_config.fomalhaut.yml` 的 `comments.use` + 对应系统的段（如 `twikoo.envId`） |
| 统计 ID | `_config.fomalhaut.yml` 的 `baidu_analytics` 等；51LA 在 `source/js/51la.js` |
| AI 助手 | `_config.fomalhaut.yml` 的 `ai_chat` 段（详见 8.10） |
| 字体 | `themes/fomalhaut/source/css/_custom/custom.css` 的「字体引入」一节 + `source/js/modules/appearance-fonts.js` 的 `APPEARANCE_TEXT_FONTS` / `APPEARANCE_CODE_FONTS` + `source/js/modules/settings.js` 的 `FONT_LIST` / `CODE_FONT_LIST`（三处必须一致） |
| 社交图标 | `_config.fomalhaut.yml` 的 `social`（格式：`名称: 链接 || 图标类名 || 动画类名`） |
| 首页轮播 | 根 `_config.yml` 的 `swiper` 段 |
| 首屏加载动画 | `_config.fomalhaut.yml` 的 `preloader`（样式文件在 `themes/fomalhaut/layout/includes/loading/load_style/`） |
| 文章置顶 | 文章 Front-matter 写 `sticky: 1` |
| 页面里的自定义样式 | 写进 `source/css/*.css`，再在 `inject.head` 里 `<link>` 引入 |
| 归档页每页篇数 / 卡片外观 | 根 `_config.yml` 的 `archive_generator` 与 `source/css/archive-page.css`（详见 8.13） |

---

## 十一、外挂标签速查

主题注册的全部标签（实现都在 `themes/fomalhaut/scripts/tag/`）：

| 标签 | 用法 | 说明 |
| --- | --- | --- |
| `note` | `{% note info flat %}文字{% endnote %}` | 提示块。样式：`default/primary/success/info/warning/danger`；形状：`flat/modern/simple/disabled` |
| `tabs` | `{% tabs 组名 %}` + `<!-- tab 标题 -->` | 标签页，支持 `subtabs` / `subsubtabs` 嵌套 |
| `timeline` | `{% timeline 标题 %}` + `<!-- timeline 日期 -->` | 时间线 |
| `btn` | `{% btn 链接, 文字, 图标, 选项 %}` | 按钮。选项：`color outline center block larger` |
| `label` | `{% label 文字 颜色 %}` | 行内小标签 |
| `gallery` | `{% gallery %}` … `{% endgallery %}` | 相册（带灯箱） |
| `galleryGroup` | `{% galleryGroup '名称' '描述' '/链接' 封面图 %}` | 相册分组入口 |
| `mermaid` | `{% mermaid %}graph LR; A-->B;{% endmermaid %}` | Mermaid 图表 |
| `flink` | `{% flink %}` | 读取 `source/_data/link.yml` 渲染友人帐 |
| `hideToggle` | `{% hideToggle 标题 %}内容{% endhideToggle %}` | 折叠块，另有 `hideInline` / `hideBlock` |
| `inlineImg` | `{% inlineImg 图片链接 宽度 %}` | 行内小图 |

> ⚠️ 注意标签名：是 **`btn`** 不是 `button`，也没有 `span`，写错会报 `unknown block tag`。

现成的例子见 `source/_posts/2026-10-02-外挂标签速查.md`。

---

## 十二、部署

### 方案 A：GitHub Pages + GitHub Actions（需自己加工作流）

仓库**不再内置** CI 工作流（v1.0.2 起删掉了：它带的是作者自己的部署目标与对象存储步骤，别人拿来直接用只会一路报红）。要用 CI 就自己加一个：

1. 把仓库推到你自己的 GitHub 账号；
2. 需要参考就从历史里取回旧版工作流：`git show v1.0.1:.github/workflows/autodeploy.yml > .github/workflows/autodeploy.yml`（记得删掉其中「上传至对象存储」那一段，再把 `repository-name` 改成 `你的用户名/你的用户名.github.io`）；
3. 在仓库 `Settings → Secrets and variables → Actions` 里添加它要用的密钥（旧版要 `GH_PAT`）；
4. 推送到 `main` 分支，或在 Actions 页面手动 Run workflow。

工作流做的事：`npm ci` → `hexo clean && hexo generate` → `gulp` → 写构建时间戳 → 推到 Pages 仓库。

### 方案 B：Vercel

```bash
npx vercel            # 首次会引导你关联项目
```

仓库根目录的 `vercel.json` 已声明 AI 代理函数的超时与内存。若要用 AI 助手，在 Vercel 项目的环境变量里加 `DEEPSEEK_API_KEY`。

### 方案 C：Cloudflare Pages

构建命令 `hexo clean && hexo generate && gulp`，输出目录 `public`。
Cloudflare Pages 认根目录的 `functions/` 作为函数目录（Vercel 认 `api/`），仓库里两份都在，构建时 `scripts/vercel-api-copy.js` 会自动把它们拷进产物。

### 方案 D：本地生成 + 手动推送

```bash
npx hexo clean && npx hexo generate && npx gulp
# 把 public/ 推到任意静态托管
```

---

## 十三、常见问题

**Q：执行 `hexo server` 报找不到主题？**
确认 `_config.yml` 里的 `theme:` 值与 `themes/` 下的目录名一致（默认 `fomalhaut`）。

**Q：改了 `themes/` 下的 `.pug` 文件没生效？**
重启 `hexo server`。Hexo 只在启动时读取模板；改样式（`.styl` / `.css`）与文章则不需要重启。

**Q：`_config.fomalhaut.yml` 和 `themes/fomalhaut/_config.yml` 改哪个？**
改**根目录**的 `_config.fomalhaut.yml`。主题目录里那份只是默认值模板，会被根目录那份覆盖。

**Q：首页文章列表没有封面图？**
在文章 Front-matter 写 `cover: 图片链接`，或在 `_config.fomalhaut.yml` 的 `cover.default_cover` 里配置封面池。

**Q：字体 / 图片挂了？**
字体默认走 `cdn.jsdelivr.net` 的 `@fontsource/*`，背景默认走 `t.alcy.cc` 的随机图接口。若所在网络访问不畅：把 `themes/fomalhaut/source/css/_custom/custom.css` 里的 `@font-face` 换成你自己的字体；把 `_config.fomalhaut.yml` 的 `<style id="defineBg">` 与 `source/js/modules/settings.js` 的 `resetBg_()` 一起改回本地 `/assets/wallpaper/*.avif`（站点自带 12 张，还在）。

**Q：想彻底不用某个页面？**
删掉 `source/` 下对应目录，并把 `_config.fomalhaut.yml` 的 `menu:` 与其面板配置一并去掉。

**Q：构建很慢？**
`node_modules` 首次安装最慢；之后增量构建约 2–3 秒，`gulp` 压缩约 16–20 秒。

**Q：美化面板的颜色/字体改了，下次打开又变回默认？**
设置存在浏览器 `localStorage`。换了域名、清了浏览器数据或改了 `storage_key` 就会重置，这属于正常行为。

---

## 十四、授权与致谢

- 本项目基于 [hexo-theme-butterfly](https://github.com/jerryc127/hexo-theme-butterfly)（Apache-2.0，作者 [Jerry](https://butterfly.js.org/)）二次开发，**继续沿用 Apache-2.0 协议**：仓库根目录的 `LICENSE` 覆盖整套站点、配置与文档，主题本体另见 `themes/fomalhaut/LICENSE`（保留上游许可证与版权声明）；
- 部分美化思路参考了 Hexo 社区的公开方案（[akilar](https://akilar.top/)、[anzhiyu](https://blog.anheyu.com/) 等），在此致谢；
- 随机背景来自 [t.alcy.cc](https://t.alcy.cc/)，壁纸来自主题自带的本地 AVIF 素材，字体来自 [jsDelivr](https://www.jsdelivr.com/) 上的 `@fontsource/*` 开源字体包（全部为 SIL OFL 许可）；
- 站点里的示例数据（域名、邮箱、友链、统计 ID）均为占位内容，请替换为你自己的。

---

## ⭐ Star 历史

<p align="center">
  <a href="https://star-history.com/#MuyuDada/hexo-theme-fomalhaut&Timeline">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=MuyuDada/hexo-theme-fomalhaut&type=Timeline&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=MuyuDada/hexo-theme-fomalhaut&type=Timeline" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=MuyuDada/hexo-theme-fomalhaut&type=Timeline" width="100%" />
    </picture>
  </a>
</p>

> 上图来自 [star-history.com](https://star-history.com/#MuyuDada/hexo-theme-fomalhaut&Timeline)，实时更新；顶部那两枚 Stars / Forks 徽章也是实时数据。

感谢每一位点过星星、提过 Issue、发过 PR 的朋友 🍭

如果这个项目帮到了你，欢迎点个 ⭐。

