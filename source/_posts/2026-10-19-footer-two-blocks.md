---
title: 页脚改成两段式：渐变接缝、固定挂件安全带与 flex 折行
description: >-
  把页脚从「一整块深色文字 + 三栏旧结构」改成清爽的两段式：主段白→透明渐变压在背景图上，底栏实底分隔。记录四个实测出来的问题：
  主题遮罩改了无效（特异性）、页面固定挂件压住底栏、flex 让徽章折行、以及友链「换一批」为什么不该走接口。
categories:
  - 页面改造
tags:
  - CSS
  - 布局
  - 踩坑
abbrlink: 3ab5b430
date: 2026-10-19 11:00:00
---

原来的页脚是 tzy 那套：`#ft` 三栏（格言 / 猜你想看 / 推荐友链头像墙），外面裹一整块深色底、白字居中。功能不少，但观感上就是「页面结束以后又接了一大块颜色不一样的东西」。

参照 [miraii.cn](https://miraii.cn/) 的页脚重做成**两段式**：

| 段 | 内容 | 背景 |
| --- | --- | --- |
| `.footer-main` | 左：站名 + 副标题 + 「开启星辰之旅」；右：11 条短链 + 友链「换一批」 | 白→透明纵向渐变 |
| `.footer-bottom` | 左：版权 + 6 枚徽章；右：运行时长 `#workboard` | 纯实底 + 顶部 1px 分隔线 |

样式全部写在 `source/css/footer-blocks.css`，模板改在 `themes/fomalhaut/layout/includes/footer.pug`。旧样式（`custom.css:2996-3155` 的 `#ft` / `.ft-item-*` / `.t-top` / `.ft-links`）一条没删——新 pug 里已经没有这些 class，规则自然失配，随时可回滚。

## 一、渐变为什么是「往上淡出」

本站 `#footer` 自己没有背景，透出来的是 `body` 上那张固定背景图。所以主段的处理是：**底部给纯色、顶部渐隐到透明**，让图片一直延续到页脚上沿，接缝不可见；底栏再压一层同色实底，两段之间就是一条硬分界。

```css
#footer-wrap {
  --ft-main-grad: linear-gradient(
    to top,
    rgb(255 255 255 / 100%) 0%,
    rgb(255 255 255 / 96%) 42%,
    rgb(255 255 255 / 72%) 74%,
    rgb(255 255 255 / 0%) 100%
  );
  --ft-bottom-bg: #fff;
}
```

深色只需在 `[data-theme='dark']` 里把同一组变量换成 `#0d0d0d` 系：

```css
[data-theme='dark'] #footer-wrap {
  --ft-main-solid: #0d0d0d;
  --ft-bottom-bg: #0d0d0d;
}
```

判定方式用 `[data-theme='dark']`，和 `nav-pill.css`、`mobile-drawer.css` 保持一致。

### 坑 1：主题那层黑色遮罩，光靠排后面盖不住

白天页脚一片灰。原因是主题给页脚背景图压了一层黑遮罩：

```css
/* custom.css:658 / :673 —— 特异性 (0,2,0) */
[data-theme="light"] #footer:before { background-color: rgba(0,0,0,.25) !important; }
```

注意它是 `[data-theme="light"] #footer:before`，**特异性 (0,2,0) 高于裸 `#footer::before` 的 (0,2,0)/(0,1,0)**——光靠「我的文件排在后面」不生效，必须写同特异性选择器再加 `!important`：

```css
[data-theme='light'] #footer::before,
[data-theme='dark'] #footer::before,
#footer::before {
  background-color: transparent !important;
  background-image: none !important;
}
```

同一份文件里还顺手改掉主题 `footer.styl` 的 `text-align: center` 和 `custom.css:3153` 的 `padding: 20px`，两段各自接管内边距。

## 二、坑 2：页面上三个固定挂件会压住页脚

这是布局类改动里最容易被忽略的一件事——页面右侧和左下角有三个 `position: fixed` 的常驻挂件，**它们不随文档流动**，滚到页底时必定压在页脚上：

| 挂件 | 位置 | 占用 |
| --- | --- | --- |
| `#rightside` | 右下圆钮列，`z-index:100` | 宽 38px + 贴右 10px → 右侧 48px（1440px 时 x=1392~1430） |
| `#fps` | 左下性能条，`z-index:1000` | 高 30px、贴底 12px、宽约 115px → 底部 42px |
| `.neko` + `#myscoll` | 右下小猫，64×64 | 1440px 实测 x=1352~1416 / y=760~824，正好压住 `#workboard` |

悬停时猫身上的 100×100 报时气泡还会往左上探到 `x≈1284`。

原来的做法只对 `min-width:901px` 生效，窄屏就失效了。改成两个 CSS 变量，统一在四处内边距里留白：

```css
#footer-wrap {
  /* 右 96px（= 猫身左缘 88px + 8 余量）、底 48px（> 42 留 6 余量） */
  --ft-safe-r: 96px;
  --ft-safe-b: 48px;
}

#footer-wrap .footer-main { padding: 56px var(--ft-safe-r) 30px 20px; }
#footer-wrap .footer-bottom { padding: 18px var(--ft-safe-r) var(--ft-safe-b) 20px; }
```

有一个细节：猫只在 `body.clientWidth > 992` 时初始化（`cursor.js:56`），992px 以下不出现，右侧只剩 `#rightside` 的 48px。所以断点里要把安全带收回来，否则小屏右侧会白掉一大条：

```css
@media screen and (max-width: 992px) {
  #footer-wrap { --ft-safe-r: 56px; }
}
```

## 三、坑 3：底栏徽章被挤成两行

1440px 下 6 枚徽章本来应该一行排开，实际被压成 5+1 两行。

原因是 flex 子项的默认 `min-width: auto`——它不允许收缩到内容宽度以下，但**允许容器把它压到「能折行的宽度」**。底栏左侧是「版权行 + 徽章行」的纵向 flex，被右侧 `#workboard` 一挤就折行了。

解法是锁死左侧宽度，把压力转给右侧文本换行：

```css
#footer-wrap .footer-bottom-left {
  flex: 0 0 auto;   /* 不给收缩 */
}
```

视觉上右侧那行运行时长文本换行，比徽章散成两行整齐得多。

## 四、友链「换一批」：8 条都在 DOM 里，只切 class

页脚友链读 `source/_data/link.yml` 第一组（常来常往），最多取 8 位。首屏只有前 4 位带 `.is-shown`：

```pug
each item, i in _ftFriends
  a.footer-friend-item(class=(i < 4 ? 'is-shown' : '') href=item.link target='_blank' rel='noopener')= item.name
```

「换一批」**不走接口**，`source/js/inject/footer-links.js` 只做 class 轮换：

```js
var PAGE = 4;
function render() {
  items.forEach(function (el, i) {
    var visible = (i - start + items.length) % items.length < PAGE;
    el.classList.toggle('is-shown', visible);
  });
}
```

这么做的理由很直接：**要的是「换」而不是「重新加载」**。8 条数据本来就在 DOM 里，切 class 是零延迟的，也不用给页脚再挂一个 JSON 接口。

两个细节：

- 友链不足两批时按钮直接 `display: none`，并把全部条目 `is-shown`——**不给假交互**；
- 页脚在 `#body-wrap` 内，pjax 翻页会被整块替换，所以除首屏外还要在 `pjax:complete` / `pjax:success` / `pjax:end` 各重绑一次，绑之前先看 `dataset.ftLinksBound === '1'`，避免重复绑定导致「点一下跳两批」。

## 五、模板里的硬契约

改结构时有两类东西绝对不能删，模板顶部直接写了注释警告：

- `#workboard` —— `source/js/modules/footer-time.js` 每秒把 `innerHTML` **整段重写**，内容是「本站运行了 X 年 Y 天 + 旅行者 1 号距离」；换个 id 就等于功能静默失效；
- `#ghbdages` —— 六枚 shields.io 徽章，样式在 `custom.css` 的 `.github-badge`；
- `.copyright` / `.framework-info` / `.footer_custom_text` —— 对应 `_config.fomalhaut.yml` 里 `footer.owner` / `footer.copyright` / `footer.custom_text` 三个开关。

另外徽章里有一枚是**手工去掉了 shields.io 模板自带的 1px 深色阴影文字**的（浅底深字会显重影），源站上别换回带 `-fff2cc` 的那一版。

## 六、验证

- 1440 / 1100 / 900 / 420 四档，浅色 / 深色两种主题：渐变接缝不可见、底栏不与 `#rightside` / `#fps` / 小猫重叠；
- pjax 换页后「换一批」仍只跳一批；
- `node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**。

> 改 `source/css/footer-blocks.css` 记得同步提 `_config.fomalhaut.yml` 里的 `?v=` 版本号，否则浏览器吃缓存，改了半天看不出效果。
