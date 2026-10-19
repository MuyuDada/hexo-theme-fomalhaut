---
title: 导航胶囊化与滚动后的悬浮玻璃条：一次 CSS 特异性实战
description: >-
  把顶部导航从「透明文字 + 滚动后一条白通栏」改成「胶囊工具栏 + 滚动后内缩的悬浮玻璃条」。本文记录参照 miraii.cn 逐层量出来的做法，
  以及三个绕不过去的坑：translateX(-50%) 的 !important 对撞、二级菜单的静态位置、以及 (0,3,1) 压不住 (0,2,1) 的深色通栏。
categories:
  - 页面改造
tags:
  - CSS
  - 导航
  - 动效
  - 踩坑
abbrlink: 9c922473
date: 2026-10-19 10:00:00
---

站点的导航原来是这套观感：首屏透明文字，滚过阈值后 `navigation.css:136` 把整条导航刷成 `rgba(251,250,247,0.96)` 的不透明象牙白通栏，还带一条 1px 底边框。

问题在于这条横贯 1440px 的实色带**把首屏大图和正文硬切成两段**，而带子里仍旧浮着一串深色胶囊——白条加药丸，观感最割裂的就是这里。

这篇记录两次连着的改造：v1.0.8 的「胶囊化」，和 v1.0.9 的「悬浮玻璃条」。

## 一、先量一下参照物

参照 [miraii.cn](https://miraii.cn/) 的顶部导航，用 CDP 逐层量过它的计算样式，结论是三条：

1. **nav 自身背景完全透明**，computed `backgroundColor` 是 `rgba(0,0,0,0)`；
2. 真正可见的白底挂在 `div.header-inner::before` 上——`content:""` / `position:absolute` / `inset:6px 0` / `border-radius:16px` / `background:rgba(253,253,253,0.88)`。也就是说白底**不是通栏，而是一枚内缩 6px、四角 16px 的悬浮条**；
3. 滚动后它连胶囊底都不要了：`.menu-shell` 的 `background` 与 `border-color` 双双变 `rgba(0,0,0,0)`，只剩纯文字趴在白条上。

第三条才是「沉浸」的本质。前两条只是外观，第三条是观感。

## 二、胶囊化（v1.0.8）

新开一个文件 `source/css/nav-pill.css` 做外观层，**没有直接改 `source/css/navigation.css`**。

理由是后者有一整套契约测试：`tools/tests/navigation.test.cjs` 逐条断言它的选择器、属性、`!important` 写法，还锁了 5 个文件的 SHA256 基线。改它一个 `padding` 就要同步改十几处断言。新文件加载顺序排在 `navigation.css` 之后，靠覆盖取胜，测试契约零改动。

构成：

| 部分 | 做法 |
| --- | --- |
| 站名胶囊 | 高 40px、`border-radius: 9999px`、`rgba(15,23,42,.52)` 底 + 1px 白描边 |
| 中间菜单药丸 | 高 44px 的半透明药丸，一级项 15px / 36px 高，图标染 `var(--theme-color)` |
| 右侧三件套 | 搜索 / 美化 / 夜间模式改成 44×44 圆钮 |
| 二级菜单 | 横向白药丸，`top: calc(100% + 8px)` 悬停展开 |

### 坑 1：纵向居中盖不住

`custom.css` 和 `navigation.css` 都用了 `transform: translateX(-50%) !important` 做水平居中。普通声明压不住 `!important`，必须自己写一条同样带 `!important` 的，**并把纵向的 `-50%` 一并写进去**，否则药丸会挂在导航条下沿：

```css
#nav .menus_items {
  top: 50% !important;
  transform: translate(-50%, -50%) !important;
}
```

### 坑 2：二级菜单跑到药丸上方

`.menus_item` 一旦变成 flex 容器，**绝对定位子元素的静态位置就改由 flex 的对齐规则决定**，不再跟父级下沿对齐。实测二级菜单 `top` 只有 24px，正好压住一级菜单。解法是显式钉住：

```css
#nav .menus_items .menus_item .menus_item_child {
  top: calc(100% + 8px);
  margin-top: 0;
}
```

### 坑 3：主题那条 3px 下划线穿过胶囊

主题在 `.site-page:not(.child)::after` 上画了一条主题色下划线，悬停时从 0 撑到 100%。胶囊自己已经有悬停底衬，再叠一条直线会横穿圆角、顶出胶囊边界。

但**不能直接写 `display: none`**——`custom.css` 里 `#nav *::after` 还会给它刷背景色，得一并复位：

```css
#nav .menus_items .menus_item > a.site-page::after {
  display: none !important;
  width: 0 !important;
  background-color: transparent !important;
}
```

## 三、悬浮玻璃条（v1.0.9）

把白底从「通栏」改成 miraii 那种内缩悬浮条：

```css
#nav::before {
  content: "";
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 24px;    /* = #nav 的 padding */
  right: 24px;
  z-index: -1;
  border-radius: 16px;
  background: rgba(253, 253, 253, 0.9);
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08);
  pointer-events: none;
}
```

同时把 `#nav` 自身的背景、边框、阴影全部清空，否则 `::before` 下面还压着一层白。

### 为什么 `::before` 必须写 `position: absolute`

`#nav` 是 flex 容器。`::before` 若留在文档流里，**它会变成第一个 flex item**，把后面的站名、菜单、按钮全部挤位。`absolute` 既脱离 flex 布局，又能在创建了 stacking context 的 `#nav`（`fixed` + `z-index:91`）内部用 `-1` 层落在内容之下。

另外毛玻璃只让白条自己承担：

```css
@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  #nav::before {
    background: rgba(253, 253, 253, 0.82);
    backdrop-filter: blur(12px) saturate(1.5);
  }
}
```

母体不再重复模糊——**两层 `backdrop-filter` 会二次采样，结果是变糊**。

### 坑 4：深色下一个 `!important` 压不住的 (0,3,1)

清除通栏这条很好写：

```css
#page-header.nav-fixed #nav {
  background: transparent !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}
```

浅色下它管用，因为 `navigation.css:136` 的 `rgba(251,250,247,.96) !important` 特异性同档，靠加载顺序取胜。但**深色那条压不住**：

```css
/* navigation.css:178-182 —— 特异性 (0,3,1) */
[data-theme="dark"] #page-header.nav-fixed #nav { … }
```

多了个属性选择器，特异性 (0,3,1) 比我们的 (0,2,1) 高一档，`!important` 也没用。实测后果：**≥1200px 深色下滚动后 `#nav` 还是被刷成整条 `rgba(37,39,42,0.92)` 实心通栏**，白玻璃条虽然在里面，外面却多包了一层深色板——这就是深色下「不沉浸」的元凶。

解法是把特异性抬到同档，靠加载顺序取胜：

```css
[data-theme="light"] #page-header.nav-fixed #nav,
[data-theme="dark"] #page-header.nav-fixed #nav {
  background: transparent !important;
  border-bottom: 0 !important;
  box-shadow: none !important;
}
```

## 四、切换过渡（v1.0.10）

前两版做完还有个尾巴：首屏 `#nav` 处于 `position:absolute; opacity:0` 的入场态，滚过阈值后主题在**约 1 帧内**给 `#page-header` 挂上 `.nav-fixed`。实测 26 帧里从第一帧起 `bg alpha` 就是 0.82，没有任何渐变过程——观感上是「啪」地糊上来一整条。

miraii 的曲线是：`opacity .18s` + `transform .24s cubic-bezier(.2,0,0,1)`，`transform` 从 `translateY(-6px)` 走到 `translateY(0)`，切状态后 300ms 内 opacity 0→1 走完。

### 坑 5：transition 写在两处，后写的那条赢

滚动态那条规则特异性更高，**光在基态写 `transition` 不管用**。`opacity` / `transform` 必须在滚动态那条里也列一遍：

```css
#nav::before {
  transition: opacity 0.18s ease, transform 0.24s cubic-bezier(0.2, 0, 0, 1), …;
}

#page-header.nav-fixed #nav::before,
#page-header.nav-visible #nav::before,
#page-header.not-top-img #nav::before {
  transition: opacity 0.18s ease, transform 0.24s cubic-bezier(0.2, 0, 0, 1), …;
}
```

### 坑 6：`content` 必须两种状态都存在

白底不再「有无」，改成常驻元素 + `opacity` 开关：

```css
#nav::before {           /* 无条件持有盒子 */
  content: "";
  opacity: 0;
  transform: translateY(-6px);
}
#page-header.nav-fixed #nav::before {
  content: "";           /* 两种状态都写 content，否则 content:none 时没有盒子可插值 */
  opacity: 1;
  transform: translateY(0);
}
```

### 坑 7：`custom.css` 把 nav 的 transition 钉成了 none

`themes/fomalhaut/source/css/_custom/custom.css:1978` 写着 `transition: none !important`，所以位移那一段本来也没过渡。同特异性 + `!important` 覆盖掉，**并且只声明 `transform`**——主题靠 `#nav` 的 `opacity` 做首屏入场动画，别把它一起拖慢：

```css
#nav {
  transition: transform 0.28s cubic-bezier(0.2, 0, 0, 1) !important;
}
```

## 五、顺带：把猫绳降到导航之下

滚动条挂绳由 `cursor.js:201` 以内联 style 写成 `position:fixed; top:0; z-index:9999`，再每帧用 JS 改高度，所以只能靠 `!important` 压。

它从 `y=0` 起画、宽 6px、`right:55.6px`（实测 x=1378..1384），`z-index:9999` 高于 `#nav` 的 91，滚动后那条悬浮玻璃条（右缘 1416）**会被一根深色竖线劈开**，正好切在三个圆钮和右圆角之间。

解法是让绳子从导航条下沿「钻出来」：

```css
#myscoll { z-index: 88 !important; }
```

不用动 JS，也不用给 fixed 元素算偏移。

## 六、验证

- 1440 / 1100 / 900 / 420 四档宽度，浅色 / 深色两种主题，首屏与滚动后两种状态，全部正常；
- 滚动切换的 26 帧里 `opacity` 与 `transform` 均在插值，不再有单帧糊满；
- `node --test "tools/tests/*.test.cjs"` → **441 pass / 0 fail**，`navigation.css` 的契约断言与 SHA256 基线一个都没动。

> 这一整套能成立的前提是**外观与骨架分离**：`nav-pill.css` 只碰颜色、圆角、间距、过渡，`position` / `display` 等决定「菜单什么时候出现」的属性仍然由主题和 `navigation.css` 负责（唯一例外是把 `.menus_items` 从 `inline` 改成 `flex`）。改外观时别忘了同步提 CSS 的 `?v=`。
