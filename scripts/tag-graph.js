/* global hexo */

/**
 * tag-graph.js（构建期）—— 给「标签关系图」准备数据
 * ---------------------------------------------------------------------------
 * 对齐 Firefly-yuan 的 src/utils/tag-graph-data.ts + src/components/widget/TagGraph.astro：
 *   节点 = 标签，节点大小 = 引用该标签的文章数；
 *   连线 = 共现（同一篇文章里同时出现），线粗 = 共现次数。
 * 数据在构建期算好，页面零额外请求；前端只负责用 echarts 画出来
 * （/tags/ 文章统计页本来就加载了 echarts，复用同一个实例库，不多加一个依赖）。
 *
 * 注册的 helper：
 *   tag_graph_data({threshold, maxNodes}) → JSON 字符串（可直接塞进 <script type="application/json">）
 *
 * 阈值策略：Firefly 固定用 2（共现 ≥2 次才连线）。本站文章少时阈值 2 会让整张图一条边都没有，
 *   所以这里自适应：先按阈值 1 全量算，如果「共现 ≥2」的边不足 8 条，就用阈值 1，
 *   否则用 2。阈值最终值会写进数据里，前端 tooltip 会如实显示。
 *
 * 卸载：删掉本文件 + themes/fomalhaut/layout/includes/page/echarts.pug 里的关系图小节
 *   + source/js/tag-graph.js + source/css/tag-graph.css。
 */

'use strict';

/** 共现阈值自适应：≥2 次的边够多时才用 2，否则退到 1，免得小站画出一堆孤立点 */
const MIN_EDGES_FOR_STRICT = 8;

/** 最多画多少个标签节点（按引用次数取前 N，太多会糊成一团） */
const DEFAULT_MAX_NODES = 40;

/** tooltip 里最多列几篇相关文章 */
const POSTS_PER_NODE = 5;

function tagNames(post) {
  const out = [];
  const seen = Object.create(null);
  try {
    const tags = post.tags;
    if (tags && typeof tags.each === 'function') {
      tags.each(function (t) {
        const name = String(t.name || '').trim();
        if (name && !seen[name]) {
          seen[name] = 1;
          out.push(name);
        }
      });
    } else if (tags && typeof tags.toArray === 'function') {
      tags.toArray().forEach(function (t) {
        const name = String(t.name || '').trim();
        if (name && !seen[name]) {
          seen[name] = 1;
          out.push(name);
        }
      });
    }
  } catch (e) {
    /* 拿不到标签就当这篇没有标签 */
  }
  return out;
}

function tagPath(name) {
  return '/tags/' + encodeURIComponent(name) + '/';
}

function buildGraph(posts, opts) {
  const maxNodes = opts.maxNodes || DEFAULT_MAX_NODES;

  // name → { name, value, posts: [标题] }
  const nodeMap = new Map();
  // "a\u0000b"（a<b 排序后）→ 共现次数
  const linkMap = new Map();

  posts.each(function (post) {
    const names = tagNames(post);
    if (!names.length) return;
    const title = String(post.title || '');

    names.forEach(function (name) {
      let node = nodeMap.get(name);
      if (!node) {
        node = { name: name, value: 0, posts: [] };
        nodeMap.set(name, node);
      }
      node.value += 1;
      if (node.posts.length < POSTS_PER_NODE) node.posts.push(title);
    });

    // 两两组合累加共现；排序后拼 key，保证 (a,b) 与 (b,a) 落到同一条边
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const pair = names[i] < names[j] ? [names[i], names[j]] : [names[j], names[i]];
        const key = pair[0] + '\u0000' + pair[1];
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      }
    }
  });

  // 阈值自适应
  let strictEdges = 0;
  linkMap.forEach(function (v) { if (v >= 2) strictEdges += 1; });
  const threshold = strictEdges >= MIN_EDGES_FOR_STRICT ? 2 : 1;

  // 先按引用次数取前 maxNodes 个标签，再在它们之间连边
  const ranked = Array.from(nodeMap.values())
    .sort(function (a, b) { return b.value - a.value || a.name.localeCompare(b.name, 'zh'); });
  const kept = new Set(ranked.slice(0, maxNodes).map(function (n) { return n.name; }));

  const links = [];
  linkMap.forEach(function (value, key) {
    if (value < threshold) return;
    const parts = key.split('\u0000');
    if (!kept.has(parts[0]) || !kept.has(parts[1])) return;
    links.push({ source: parts[0], target: parts[1], value: value });
  });

  // 只保留还连在边上的节点，避免出现一堆孤立点把布局撑散
  const connected = new Set();
  links.forEach(function (l) {
    connected.add(l.source);
    connected.add(l.target);
  });

  const nodes = ranked
    .filter(function (n) { return connected.has(n.name); })
    .map(function (n) {
      return {
        name: n.name,
        value: n.value,
        posts: n.posts,
        url: tagPath(n.name),
      };
    });

  return { nodes: nodes, links: links, threshold: threshold, totalTags: nodeMap.size };
}

hexo.extend.helper.register('tag_graph_data', function (opts) {
  const options = opts || {};
  let data;
  try {
    data = buildGraph(hexo.locals.get('posts'), options);
  } catch (e) {
    hexo.log.warn('[tag-graph] 计算标签关系失败，关系图将不显示：' + (e && e.message));
    data = { nodes: [], links: [], threshold: 1, totalTags: 0 };
  }
  // 写进 <script type="application/json">：'</script' 会提前闭合标签
  return JSON.stringify(data).replace(/<\//g, '<\\/');
});
