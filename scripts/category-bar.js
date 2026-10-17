/* global hexo */

/**
 * category-bar.js —— 文章列表页顶部的「分类快捷导航条」（站点级脚本，不改 themes/）
 * ---------------------------------------------------------------------------
 * 对齐 Firefly-yuan 的 src/components/layout/CategoryBar.astro：
 *   首页 / 归档页 / 分类页 / 标签页顶部横向一条胶囊导航，
 *   最左边是「首页」和「归档（带总篇数）」，中间是可横向滚动的全部分类（各带篇数），
 *   最右边是「更多 →」跳到分类总览页。当前所在分类会高亮。
 *
 * 为什么在构建期插 DOM，而不是纯前端渲染：
 *   - 分类列表和每个分类的篇数是构建期才知道的全站数据，前端拿要么多打一次请求，
 *     要么就得把数据再塞一份进页面 —— 直接渲染成 HTML 更省、也能被爬虫抓到。
 *   - 插在 <main id="content-inner"> 的**开标签之前**（仍是 #body-wrap 的直接子元素）：
 *     ① 这个子树在 #body-wrap 里，会被主题 pjax 整块换掉，换页后不会残留上一个页面的高亮；
 *     ② main 本身是 .layout（display:flex 的**行**容器），把导航条塞进去它会变成第三个
 *        flex item，被压缩成内容宽度、还会吃到 .layout > div:first-child 的卡片内边距，
 *        视觉上就是一个悬在左上角的小胶囊。#body-wrap 是 flex column，放在 main 前面
 *        才能自然占满一整行。
 *     （放 head 或 body 顶层会残留，别改。）
 *
 * 作用页（其余页面不插任何东西）：
 *   首页 /archives/ /archives/page/N/ /categories/xxx/ /tags/xxx/ /tags/ /categories/
 *   文章详情页不插：主题的文章页是另一套版式，顶部已经有面包屑和文章信息。
 *
 * 高亮由 source/js/inject/category-bar.js 在客户端补（构建期只知道路径，
 * 不知道「从哪儿点进来的」，滚动定位和「更多」渐隐也要 JS 算）。
 * 样式在 source/css/category-bar.css，选择器全部带 .cb-ready 守卫。
 *
 * 卸载：删掉本文件 + inject.head 里那两行引入即可。
 */

'use strict';

/** 每个分类最多显示多少个字，太长的分类名会把胶囊撑爆 */
const MAX_NAME = 14;

/**
 * 这些页面才插导航条。
 * 字段来源（hexo 核心 + 生成器实测）：
 *   page.archive  ← hexo-generator-archive
 *   page.category ← hexo-generator-category 的 data.category
 *   page.tag      ← hexo-generator-tag 的 data.tag
 *   page.__index  ← hexo-generator-index 的 data.__index
 *   page.type     ← 页面 front-matter（/tags/ 是 type: echarts）
 * 注意 hexo 核心没有 __category / __tag / __categories 这几个字段，别写错。
 */
function shouldInject(page) {
  if (!page) return false;
  if (page.archive) return true;             // /archives/ 与分页
  if (page.category) return true;            // /categories/xxx/
  if (page.tag) return true;                 // /tags/xxx/
  if (page.type === 'echarts') return true;  // /tags/ 文章统计页
  if (page.__index) return true;             // 首页与分页
  return false;
}

/** 当前页面「属于」哪个分类，用于给对应胶囊打软高亮 */
function currentCategory(page) {
  if (!page || !page.category) return '';
  return String(page.category).trim();
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 分类的站内绝对路径。
 * hexo 的 cat.path 是「categories/开始使用/」这种不带前导斜杠的相对路径，
 * 直接用会变成相对当前页的链接（在 /archives/ 下就跳到 /archives/categories/…）。
 * 逐段 encodeURIComponent：中文分类名不编码虽然多数浏览器能忍，但复制出去的链接会乱。
 */
function categoryUrl(path) {
  const clean = String(path || '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return '/categories/';
  const segs = clean.split('/').map(function (s) {
    try {
      return encodeURIComponent(decodeURIComponent(s));
    } catch (e) {
      return encodeURIComponent(s);
    }
  });
  return '/' + segs.join('/') + '/';
}

function buildBar(cats, totalPosts, page) {
  const cur = currentCategory(page);

  const pills = cats.map(function (c) {
    let name = String(c.name || '');
    if (name.length > MAX_NAME) name = name.slice(0, MAX_NAME) + '…';
    const active = cur && String(c.name).trim() === cur ? ' data-soft-active' : '';
    return (
      '<a class="cb-pill" href="' + escapeHtml(categoryUrl(c.path)) + '" data-cb-name="' +
      escapeHtml(String(c.name)) + '"' + active + '>' +
      '<span class="cb-name">' + escapeHtml(name) + '</span>' +
      '<span class="cb-count">' + c.length + '</span>' +
      '</a>'
    );
  }).join('');

  return (
    '<div class="category-bar" id="category-bar">' +
      '<div class="cb-inner">' +
        '<a class="cb-pill cb-icon-pill" href="/" data-cb-name="" aria-label="首页">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V21h14V9.5"></path></svg>' +
        '</a>' +
        '<a class="cb-pill" href="/archives/" data-cb-name="__archive__">归档' +
          '<span class="cb-count">' + totalPosts + '</span>' +
        '</a>' +
        '<span class="cb-divider" aria-hidden="true"></span>' +
        '<div class="cb-scroll-wrap">' +
          '<span class="cb-fade cb-fade-left" aria-hidden="true"></span>' +
          '<div class="cb-scroll">' + pills + '</div>' +
          '<span class="cb-fade cb-fade-right" aria-hidden="true"></span>' +
        '</div>' +
        '<span class="cb-divider cb-more-divider" aria-hidden="true"></span>' +
        '<a class="cb-pill cb-more" href="/categories/" data-cb-name="__categories__" aria-label="全部分类">' +
          '更多<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="9 6 15 12 9 18"></polyline></svg>' +
        '</a>' +
      '</div>' +
    '</div>'
  );
}

hexo.extend.filter.register('after_render:html', function (html, data) {
  try {
    const page = data && data.page;
    if (!shouldInject(page)) return html;
    if (html.indexOf('id="category-bar"') !== -1) return html;

    // 分类按篇数降序，篇数相同按名字排，保证每次构建顺序一致（不然每次 diff 都在跳）
    const cats = [];
    hexo.locals.get('categories').each(function (cat) {
      if (!cat.length) return;
      cats.push({ name: cat.name, path: cat.path, length: cat.length });
    });
    cats.sort(function (a, b) {
      return b.length - a.length || String(a.name).localeCompare(String(b.name), 'zh');
    });
    if (!cats.length) return html; // 一个分类都没有就别插一条空导航

    const totalPosts = hexo.locals.get('posts').length;
    const bar = buildBar(cats, totalPosts, page);

    // 插在 <main ... id="content-inner" ...> 开标签之前（见文件头注释：main 是 flex 行容器）
    const m = /<main[^>]*\bid=["']content-inner["'][^>]*>/.exec(html);
    if (!m) return html;
    return html.slice(0, m.index) + bar + html.slice(m.index);
  } catch (e) {
    hexo.log.warn('[category-bar] 生成分类导航失败，该页跳过：' + (e && e.message));
    return html;
  }
});
