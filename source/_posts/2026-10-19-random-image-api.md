---
title: 把文章封面换成随机图片：栗次元 JSON 接口与 ?w= 缩图的踩坑记录
description: >-
  站点一直用栗次元的 /pc 做整页背景，这次把文章封面和侧栏资料卡背景也接上同一套随机图。记录三件事：为什么分类直出端点绝对不能直接用、
  为什么 ?w= 是唯一有效的缩图参数、以及和主题 lazyload 抢 img 属性的正确姿势。
categories:
  - 折腾记录
tags:
  - 随机图
  - API
  - 性能
  - 踩坑
abbrlink: efa3aef5
date: 2026-10-19 09:00:00
---

本站的整页背景一直走 [栗次元](https://t.alcy.cc) 的 `https://t.alcy.cc/pc` 这个随机图端点。看得久了就想：**文章封面和侧栏那张资料卡背景，能不能也用同一套图？** 每一篇封面都不一样，卡片背景每次刷新都换一张，观感会好很多。

听上去只是换个 `src` 的事，实际动手才发现有三级坑：端点的缓存行为、缩图参数的真假、以及主题懒加载对 `<img>` 属性的改写。这篇把整个过程记下来。

## 一、为什么不能用分类直出端点

第一版代码写得很直白——把封面的 `src` 直接指到分类端点：

```js
img.src = 'https://t.alcy.cc/moe'  // ❌ 看起来对，实际上是灾难
```

问题在于：**这个 URL 每次请求都返回不同的图片**。实测连续请求两次：

| 第几次 | Content-Length |
| --- | --- |
| 第 1 次 | 331546 B |
| 第 2 次 | 666330 B |

同一个 URL，两次内容不同，`Cache-Control: max-age=2592000` 形同虚设——浏览器每次都得重新下几百 KB。首页 9 张封面，等于每次刷新多拉几 MB。随机是目的，但**每次刷新都换图**并不是目的，同一个封面在一天内稳定才对。

## 二、改用 JSON 接口拿稳定路径

栗次元另有一个 JSON 接口，返回的是**具体文件的路径**，而具体路径的内容是恒定的：

```
GET https://t.alcy.cc/json?moe=12

{
  "data": [
    { "id": "29.webp", "link": "https://t.alcy.cc/pic/moe/29.webp" },
    ...
  ]
}
```

`/pic/moe/29.webp` 这种路径带着 `Cache-Control: max-age=2592000` 和 `EO-Cache-Status: HIT`，**同一 URL 内容恒定**，浏览器能真正缓存。

于是方案就清晰了：

1. 启动时用 JSON 接口一次取一批（每个分类 12 条），四类合并成一个池子；
2. 池子存进 `localStorage`，TTL 一天；
3. 每次刷新从池里随机挑，命中本地缓存时几乎零网络成本。

## 三、`?w=` 是唯一有效的缩图参数

池子里的原图动辄 1.1 MB，直接当封面太奢侈。于是试了一圈缩图参数，结论很反直觉：

| 参数 | 结果 |
| --- | --- |
| `?w=640` | ✅ 200，1.1 MB 原图 → **30-50 KB** |
| `?width=` / `?size=` / `?s=` / `?q=` | ❌ 全都是在**换图**，不是缩图 |
| `?w=400` | ❌ 返回 0 字节 |
| `?imageMogr2/thumbnail/400x` | ❌ 200，但 Content-Length 与原图完全相同（参数被忽略） |
| `?x-oss-process=…` / `?imageView2/…` | ❌ 同上，参数被无视 |

也就是说：只有 `?w=` 被服务端真正识别，而且**值不能太小**——`?w=400` 直接返回空响应。最后封面固定用 `?w=640`、资料卡固定用 `?w=600`，两张都在观感够用的前提下把体积压到原来的 1/25 左右。

## 四、实现

全部逻辑收在一个文件里：`source/js/inject/random-images.js`，140 行，不碰主题源码。

```js
var POOL_KEY = 'muyu_random_pool_v1'
var POOL_TTL = 24 * 60 * 60 * 1000 // 一天
var BATCH = 12 // JSON 接口一次取几条
var CATEGORIES = ['moe', 'xhl', 'fj', 'pc']
```

覆盖四个位置，靠一条选择器一次抓完：

```js
var imgs = document.querySelectorAll(
  '.recent-post-cover img.article-cover, .article-sort-item-img img, img.prev-cover, img.next-cover'
)
```

| 选择器 | 位置 | 尺寸 |
| --- | --- | --- |
| `.recent-post-cover img.article-cover` | 首页文章卡片 | 314×200 |
| `.article-sort-item-img img` | `/archives/` 时间线缩略图 | 96×72 |
| `img.prev-cover` / `img.next-cover` | 文章页上下篇卡 | 小图 |
| `#aside-content > .card-widget.card-info` | 侧栏资料卡背景 | 330×410 |

拼接参数只在需要时加 `?` 或 `&`：

```js
function withWidth (url, w) {
  if (!url) return url
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'w=' + w
}
```

没有缓存时四个分类并行拉，**任意一个失败都只是少一类**，`moe` 一类都拿不到就整体退出：

```js
Promise.all(CATEGORIES.map(fetchOne)).then(function (results) {
  var merged = {}
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (results[i] && results[i].length) merged[CATEGORIES[i]] = results[i]
  }
  if (!merged.moe || !merged.moe.length) return // 全挂则保持主题原样
  writePool(merged)
  applyCovers(merged)
  applyCardInfo(merged)
})
```

`pjax:complete` 与 `pjax:success` 各挂一次 `run`，保证换页后封面重新分配。

## 五、第一个坑：必须写 `data-lazy-src` 而不是 `src`

这是本次最费时间的坑。

主题有一层懒加载：

```js
// themes/fomalhaut/scripts/filters/post_lazyload.js:13
// 把页面里每个 <img> 换成 1×1 占位 gif，真地址挪到 data-lazy-src
```

所以脚本拿到的 `<img>`，`src` 已经是占位图了，真正生效的是 `data-lazy-src`。**如果直接改 `src`，改完立刻会被懒加载覆盖回去**。正确姿势是改写 `data-lazy-src`，改完再通知实例重新扫描：

```js
if (img.hasAttribute('data-lazy-src')) {
  img.setAttribute('data-lazy-src', url)
} else {
  img.setAttribute('src', url)
}
img.removeAttribute('data-src')   // 顺手清掉另一份残留
...
if (window.lazyLoadInstance && typeof window.lazyLoadInstance.update === 'function') {
  window.lazyLoadInstance.update()
}
```

另外接口全挂时**静默退出**，保持主题原有的 12 张本地 `.avif` 壁纸——宁可用旧的，也不要出现空白封面。

## 六、第二个坑：顺手修掉的一个老 bug

写这个脚本时发现了主题里一个潜伏的雷。`themes/fomalhaut/scripts/helpers/inject_head_js.js` 里 `saveToLocal.get()` 直接对读到的值 `JSON.parse`。而主题之外的地方（包括站点脚本）曾经直接写过裸字符串：

```js
localStorage.setItem("theme", "dark")
```

下一次读取就抛：

```
SyntaxError: Unexpected token 'd', "dark" is not valid JSON
```

坏就坏在**这个异常会中断同一个 `<script>` 内后续代码**——`data-theme`、`hide-aside` 这些挂到 `<html>` 上的属性初始化全部失效，表现就是「主题明明设成了深色，刷新却回白」。改成 `try/catch`，解析不出来就丢弃并清键：

```js
try {
  item = JSON.parse(itemStr)
} catch (e) {
  localStorage.removeItem(key)
  return undefined
}
```

## 七、验证

- 首页 9 张封面、归档 12 张缩略图、文章页上下篇 2 张、资料卡背景，**全部命中随机图**；
- pjax 换页（首页 → 归档 → 标签 → 首页）四态均正确重新分配；
- 1440 / 420 两档宽度、浅色 / 深色主题全部正常；
- `node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**。

## 八、回滚

删掉 `_config.fomalhaut.yml` 的 `inject` 里那一行即可：

```yaml
- <script defer src="/js/inject/random-images.js?v=20261019-randomimg2"></script>
```

删掉后封面回到主题内置的本地壁纸，其余功能不受影响——这也是把逻辑写成独立脚本、而不是改主题模板的原因。

> 改 `source/js/inject/random-images.js` 记得同步提 `?v=` 版本号，否则浏览器吃缓存，改了半天看不到效果。
