/* global hexo */

/**
 * llms.txt —— 给大模型/爬虫看的站点说明书（站点级生成器，不改 themes/）
 * ---------------------------------------------------------------------------
 * 对齐 Firefly-yuan 的 src/pages/llms.txt.ts：
 *   https://llmstxt.org/ 提议的约定——在站点根放一个 llms.txt，
 *   用一段纯文本告诉 AI 助手「这个站是什么、有哪些关键页面、最近写了什么」。
 *
 * 为什么用生成器而不是手写 source/llms.txt：
 *   - 关键页面和最近文章要跟着站内实际内容变，手写必然过期；
 *   - Hexo 不会给 source/ 里的 .txt 做变量替换，只能靠 generator 现算。
 *
 * 输出：/llms.txt，纯文本，UTF-8 **带 BOM**。
 *   带 BOM 的理由（跟 Firefly-yuan 一致，别"优化"掉）：
 *   静态托管/CDN 常把 .txt 的 Content-Type 发成 text/plain 不带 charset，
 *   Windows 记事本、部分编辑器会按 ANSI/GBK 解码，中文直接变乱码；
 *   前置 UTF-8 BOM 能强制它们按 UTF-8 读。
 *
 * 内容结构：
 *   # 站点标题
 *   > 一句话描述
 *   正文段落（站点简介）
 *   ## 关键页面   - [名称](绝对地址): 描述
 *   ## 最近文章   - [标题](绝对地址): 发布日期
 *
 * 卸载：删掉本文件即可，不产生其它构建产物依赖。
 */

'use strict';

/** 最近文章条数，与 Firefly-yuan 的 RECENT_POSTS_COUNT 保持一致 */
const RECENT_POSTS_COUNT = 20;

/**
 * 关键页面清单。顺序即输出顺序，改这里就能改 llms.txt 的页面列表。
 *   path   页面绝对路径
 *   label  显示名
 *   desc   一句话说明
 *   source 该页对应的 source 文件（有值时做存在性判断，删了页面就不列出来）；
 *          归档/标签/留言板等由主题或插件生成的页面没有 source，传 null 恒列出。
 */
function keyPages() {
  return [
    { label: '首页', path: '/', desc: '最新文章列表', source: null },
    { label: '文章归档', path: '/archives/', desc: '按年份排列的全部文章', source: null },
    { label: '文章统计', path: '/tags/', desc: '标签热度排行与标签关系图', source: null },
    { label: '友人帐', path: '/social/link/', desc: '友情链接，欢迎互换', source: 'social/link/index.md' },
    { label: '留言板', path: '/comments/', desc: '留言与闲聊', source: 'comments/index.md' },
    { label: '关于', path: '/personal/about/', desc: '关于站长与本站', source: 'personal/about/index.md' },
    { label: '打赏', path: '/sponsor/', desc: '赞助本站', source: 'sponsor/index.md' },
    { label: '网站统计', path: '/site/census/', desc: '访问量与访客地域分布', source: 'site/census/index.md' },
    { label: '八音盒', path: '/life/music/', desc: '常听的歌单', source: 'life/music/index.md' },
    { label: '画廊', path: '/box/gallery/', desc: '照片与壁纸', source: 'box/gallery/index.md' },
    { label: '网址导航', path: '/box/nav/', desc: '常用站点收藏', source: 'box/nav/index.md' }
  ];
}

/** 去掉标题里的换行/多余空格，避免破坏 "- [标题](url)" 的单行结构 */
function cleanTitle(str) {
  return String(str || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\[\]]/g, '')
    .trim();
}

/** Hexo 的 url_for 在生成器里拿不到，这里手拼绝对地址 */
function absoluteUrl(root, path) {
  var base = String(root || '/');
  if (base.charAt(base.length - 1) !== '/') base += '/';
  var p = String(path || '/').replace(/^\/+/, '');
  return base + p;
}

hexo.extend.generator.register('llms_txt', function (locals) {
  var config = this.config;
  var root = config.root || '/';

  // 站点根绝对地址：优先用 config.url，没有就退回相对根
  var siteUrl = String(config.url || '').replace(/\/+$/, '');
  function abs(path) {
    var rel = absoluteUrl(root, path);
    if (!siteUrl) return rel;
    return siteUrl + rel.replace(/^\/+/, '/');
  }

  var title = config.title || 'Blog';
  var desc = config.description || config.subtitle || '';
  var author = config.author || '';

  var lines = [];

  lines.push('# ' + title);
  lines.push('');

  if (desc) {
    lines.push('> ' + String(desc).replace(/[\r\n]+/g, ' ').trim());
    lines.push('');
  }

  // 简介段落：给模型一点上下文，比只有标题和链接有用得多
  var intro = '这是一个使用 Hexo 搭建、基于 Fomalhaut 主题的个人博客';
  if (author) intro += '，作者是 ' + author;
  intro += '。内容以技术笔记与生活记录为主，页面均为静态生成。';
  lines.push(intro);
  lines.push('');

  // ---- 关键页面 ----
  lines.push('## 关键页面');
  lines.push('');
  keyPages().forEach(function (item) {
    // 有 source 的页面先确认源文件还在，删掉页面就别再列出来
    if (item.source && !locals.pages.findOne({ source: item.source })) return;
    var line = '- [' + item.label + '](' + abs(item.path) + ')';
    if (item.desc) line += ': ' + item.desc;
    lines.push(line);
  });
  lines.push('');

  // ---- 最近文章 ----
  var posts = locals.posts
    .filter(function (post) {
      return post.published !== false && post.draft !== true;
    })
    .sort('-date')
    .limit(RECENT_POSTS_COUNT);

  if (posts.length) {
    lines.push('## 最近文章');
    lines.push('');
    posts.forEach(function (post) {
      var t = cleanTitle(post.title) || post.slug || '未命名';
      var date = post.date ? post.date.format('YYYY-MM-DD') : '';
      var line = '- [' + t + '](' + abs('/' + post.path) + ')';
      if (date) line += ': ' + date;
      lines.push(line);
    });
    lines.push('');
  }

  var body = lines.join('\n');

  return {
    path: 'llms.txt',
    data: '\ufeff' + body
  };
});
