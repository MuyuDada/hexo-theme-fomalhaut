---
title: 正文 400 档改走 97 片 unicode-range 分片，700 档按实际用字精简到 223 KB
description: >-
  把自托管的单文件字体子集换成上游官方的 97 片 unicode-range 方案，顺带用 CDP 遍历全站 80 个页面收集真实粗体字，
  把 700 档从 970 KB 压到 223 KB。记录 CSS 规范里 @import 的位置陷阱，以及为什么粗体字实测只能用 getPlatformFontsForNode。
categories:
  - 折腾记录
tags:
  - 字体
  - 性能
  - 踩坑
abbrlink: a899049c
date: 2026-10-19 12:00:00
---

正文默认字体是霞鹜文楷·屏幕阅读版（LXGW WenKai Screen）。之前用的是**自托管单文件子集**：`source/assets/fonts/lxgw-screen-subset-400.woff2`，1084208 B，一个请求搞定，但每次都是整整 1 MB——哪怕这一页只用到其中几百个字。

这一版换成上游 `lxgw-wenkai-screen-webfont@1.7.0` 的**官方分片方案**，并把 700 档按站点真实用字重建。过程和结论都记下来。

## 一、400 档：97 片 unicode-range

上游这个包里有 **97 个 `@font-face`**，每块自带 `unicode-range`，浏览器只下载本页真正用到的片。

清单 CSS 自托管在仓库里：

```
source/assets/fonts/lxgw-screen-cdn/lxgwwenkaiscreen.css   # 110791 B，873 行，97 个 @font-face
```

但里面 97 条 `url()` 全部改写成了 jsDelivr 绝对地址——19 MB 的分片不跟仓库走：

```css
/* LXGW WenKai Screen [4] */
@font-face {
  font-family: LXGW;
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/files/lxgwwenkaiscreen-subset-4.woff2') format('woff2');
  unicode-range: U+1f1e9-1f1f5, U+1f1f7-1f1ff, U+1f21a, U+1f232, U+1f234-1f237, …;
}
```

### 改 family 名，省掉一层别名

上游清单里注册的家族名是 `'LXGW WenKai Screen'`，而全站字体链读的都是字面量 `LXGW`——`settings.js` 的 `FONT_LIST`、`--global-font`、美化面板的按钮 id 全是它。

别名层只会增加困惑，所以直接把清单里的 97 处 `font-family` 改成 `LXGW`：

```bash
# 97 个 @font-face，97 处 font-family，97 条 jsDelivr url —— 全部一一对应
```

### 坑 1：必须用 `<link>`，不能写 `@import`

第一版把 `@import` 写进了 `custom.css`。结果 400 档死活加载不出来。

原因：`custom.css` 被 `index.styl` 打包进 `index.css`，而这条 `@import` 落在了**第 338 行**——前面已经有一大堆规则。CSS 规范要求 `@import` 必须排在所有规则之前，**否则整条被浏览器丢弃**。

改由 `_config.fomalhaut.yml:983` 的 `inject.head` 用 `<link>` 引入：

```yaml
- <link rel="stylesheet" href="/assets/fonts/lxgw-screen-cdn/lxgwwenkaiscreen.css?v=20261019-cdnfont1">
```

顺带**去掉字体 preload**：分片方案下预载单个整包没有意义，反而会白下一份浏览器根本用不到的整包。这一行 `<link>` 同时替代了原来的 preload。

三处同步：`custom.css` 的 `@font-face` 换成说明注释、`_config.fomalhaut.yml` 的 preload 换成 `<link>`、`source/box/astronomy/voyager.html:10` 的 `@import` 同样改掉（那是独立页面，不继承主题 CSS）。

## 二、700 档：按站点真实用字重建

分片方案只提供 400（上游 97 块全是 weight 400），粗档还得靠自托管的 **LXGW WenKai Lite Medium**（`usWeightClass=500`）。原来那份是整包 **970548 B**。

既然分片思路是「只带本页要用的」，粗档也可以照做——**关键是先用工具量出全站到底用了哪些粗体字**。

### 怎么量：CDP 遍历全部 80 个页面

思路是用 Chrome DevTools Protocol 打开 `public` 下的页面，按计算样式筛出「家族首项是 LXGW 且 `font-weight >= 600`」的文本节点，把字符收集去重。

得到的数字：

| 项目 | 数量 |
| --- | --- |
| 遍历页面 | 80 个 |
| 收集到粗体字符 | **1044 个** |
| 补数字 + 大小写字母 + 常用中英标点符号后 | 1089 个 |
| 源字体里命中 | 1064 个 |
| 子集输出（`fontTools.subset`） | **223132 B** |

从 970548 B 到 223132 B，**压缩到 23%**。

### 坑 2：缺的 25 个码位全是 emoji

差集分析结果很干净——缺的 25 个码位**全部是 emoji**：

```
📌 👎 🧩 🌿 🍔 💻 🙏 🔧 🖼 🎨 ✨ 🕸 🛰 📦 🧰 📁 🧑 📃 📇 📮 🚀 🔗 🧪 …
```

文楷本来就不含 emoji 字形，**回落到系统 emoji 字体是正确行为**，不需要为它们去补字体。

对应的注意事项写在 `custom.css` 里：**新增粗体文案出现方块字时，重跑收集再 subset**。

### 坑 3：验证字体覆盖率不能用 `document.fonts.check()`

这条是从上一版继承下来的教训，这次仍然适用。

`document.fonts.check('16px LXGW')` 对这些字**全部返回 true**——它只表示「有一个匹配的 face」，**不代表这个 face 含该字形**。canvas 差分与 `measureText` 同样是假阴性：浏览器会悄悄回落到下一个字体，测量结果照样有值。

唯一可靠的是 CDP 的 `CSS.getPlatformFontsForNode`，它返回的是**真正用来渲染这个节点的平台字体名**。用它复查报障的 14 个字：

```
窝 页 宝 为 风 给 电 脑 状 态 加 载 标 签
```

结果全部真实由 `LXGW WenKai Screen` 渲染；`#site-title` / `.article-title` / `.footer-brand-name` 等粗体节点走 `LXGW WenKai Lite Medium`。全站 19 个页面共 1671 个粗体文本节点，**字体回落 0 处**。

## 三、每页字体成本（禁缓存实测）

用 `performance.getEntriesByType('resource')` 统计，禁缓存实测：

| 页面 | CDN 分片 | 本地 700 档 | 合计 |
| --- | --- | --- | --- |
| 首页 | 24 片 / 1213.6 KB | 135.1 KB | 1348.7 KB |
| 归档 | 18 片 / 895.0 KB | 135.1 KB | 1030.1 KB |
| 留言板 | 17 片 / 831.7 KB | 135.1 KB | 966.9 KB |
| 文章页 | 31 片 / 1472.2 KB | 135.1 KB | 1607.3 KB |

> 说句实话：**分片方案比单文件子集更费字节**。单文件固定 1084208 B，而分片在首页要拉 1213.6 KB。分片的优势不是省流量，而是让「只用少量字的页面」不必下整包；反过来，字多的文章页会比单文件更贵。这里选分片是明确权衡后的结果，回滚路径也留着。

## 四、踩到的老坑补记：CSS 注释里的 `*/`

上一版（v1.0.7）改字体时踩过一次，值得再记一遍：

> 第一次改完，浏览器里 400 那档死活加载不出来（`document.fonts` 只有 `700:loaded`）。查 CSSOM 发现 `@font-face` 里 `src` 整行消失——因为注释正文里写了 `public/**/*.{html,js,json,css}`，其中的 `*/` 提前把 CSS 注释闭合了，把紧随其后的 `src` 一起当垃圾丢掉。

**CSS 注释里不要出现 `*/`**，哪怕是举例的文件 glob。

## 五、验证与回滚

`node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**。其中 `tools/tests/navigation.test.cjs:99` 锁着 `custom.css` 的 SHA256 基线（`af283326fa871d3338be5f9e9cd17f0d1dbc7d2164641cd8960d412771fd81bc`，LF 规范化后），这次改注释时同步更新了它——**这就是为什么 `navigation.css` 的契约测试能一直保持不变**。

回滚路径：

1. 删掉 `inject.head` 里那行 `<link>`；
2. 恢复 `custom.css` 里被注释掉的 `@font-face`（指回 `lxgw-screen-subset-400.woff2`）。

> 换字体/改字体 src 之后记得 `npx hexo clean && npx hexo generate`。`public/css/index.css` 是从 `themes/fomalhaut/source/css/index.styl` 编译来的，**增量构建有时不会重编 styl**，只改源码会看到「改了没生效」的假象。
