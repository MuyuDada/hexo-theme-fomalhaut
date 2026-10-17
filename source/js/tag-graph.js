/*!
 * tag-graph.js —— 「标签关系图」渲染（客户端）
 * ---------------------------------------------------------------------------
 * 数据来源：themes/fomalhaut/layout/includes/page/echarts.pug 里
 *   <script type="application/json" id="tag-graph-data">，内容由 scripts/tag-graph.js
 *   的 tag_graph_data() helper 在构建期算好（节点=标签、边=同篇文章内的共现）。
 * 只出现在 /tags/ 文章统计页；其余页面 init() 直接返回，不做任何事。
 *
 * 对齐 Firefly-yuan 的 TagGraph.astro：
 *   - 节点大小按引用文章数开方缩放（不用原值，否则一个高频标签会把其余标签压成点）
 *   - 节点按引用次数分三档配色（高频 / 常用 / 低频）
 *   - 力导向布局，连线粗细 = 共现次数
 *   - tooltip 显示「N 篇文章」+ 相关文章标题
 *   - 点击节点跳到对应标签页
 *   - 尊重 prefers-reduced-motion（关掉布局动画）
 *
 * echarts 依赖：/tags/ 页本身用 script 标签加载了 echarts；但 pjax 换页进来的首次
 *   访问不一定有（首页没有 echarts）。所以这里做了兜底：window.echarts 不存在时
 *   自己补一个 script，加载完再画。
 *
 * 幂等：容器上打 data-tg-ready，重复 init 直接返回；pjax:complete 后重跑。
 * 卸载：删掉 echarts.pug 里的关系图小节 + 本文件 + source/css/tag-graph.css。
 * 仓库路径：source/js/tag-graph.js
 */

(function () {
  'use strict';

  var ECHARTS_SRC = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';

  /** 主题色相：从 --theme-color 里解析，拿不到就用 fomalhaut 默认的青绿 */
  function themeHue() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-color')
      .trim();
    // 支持 #rgb / #rrggbb / rgb() / hsl()
    var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var r = parseInt(h.slice(0, 2), 16) / 255;
      var g = parseInt(h.slice(2, 4), 16) / 255;
      var b = parseInt(h.slice(4, 6), 16) / 255;
      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);
      var d = max - min;
      if (d === 0) return 250;
      var hue;
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue *= 60;
      return hue < 0 ? hue + 360 : hue;
    }
    var rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(raw);
    if (rgb) {
      var rr = +rgb[1] / 255;
      var gg = +rgb[2] / 255;
      var bb = +rgb[3] / 255;
      var mx = Math.max(rr, gg, bb);
      var mn = Math.min(rr, gg, bb);
      var dd = mx - mn;
      if (dd === 0) return 250;
      var hh;
      if (mx === rr) hh = ((gg - bb) / dd) % 6;
      else if (mx === gg) hh = (bb - rr) / dd + 2;
      else hh = (rr - gg) / dd + 4;
      hh *= 60;
      return hh < 0 ? hh + 360 : hh;
    }
    return 250;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  /** 按引用次数分档配色：高频（≥5）/ 常用（≥2）/ 低频（其余） */
  function palette() {
    var hue = themeHue();
    var dark = isDark();
    return {
      high: 'hsl(' + hue.toFixed(0) + ', ' + (dark ? 62 : 58) + '%, ' + (dark ? 66 : 50) + '%)',
      mid: 'hsl(' + ((hue + 38) % 360).toFixed(0) + ', ' + (dark ? 48 : 46) + '%, ' + (dark ? 62 : 46) + '%)',
      low: 'hsl(' + ((hue + 76) % 360).toFixed(0) + ', ' + (dark ? 38 : 36) + '%, ' + (dark ? 58 : 42) + '%)',
    };
  }

  function bucketOf(value) {
    if (value >= 5) return 'high';
    if (value >= 2) return 'mid';
    return 'low';
  }

  /** 解析页面里那份 JSON；解析失败返回 null（整块不画，页面照常） */
  function readData() {
    var el = document.getElementById('tag-graph-data');
    if (!el) return null;
    try {
      var raw = el.textContent || el.innerHTML || '';
      var data = JSON.parse(raw);
      if (!data || !data.nodes || !data.nodes.length || !data.links || !data.links.length) {
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function draw(echarts, data) {
    var chartEl = document.getElementById('tag-graph-chart');
    if (!chartEl) return;
    var colors = palette();

    // 引用次数 → 节点大小：开方缩放，避免高频标签把其余标签压成点
    var maxValue = 1;
    data.nodes.forEach(function (n) { if (n.value > maxValue) maxValue = n.value; });
    var minSize = 18;
    var maxSize = 62;

    var nodes = data.nodes.map(function (n) {
      var ratio = Math.sqrt(n.value / maxValue);
      return {
        id: n.name,
        name: n.name,
        value: n.value,
        symbolSize: Math.round(minSize + (maxSize - minSize) * ratio),
        itemStyle: { color: colors[bucketOf(n.value)] },
        // tooltip 与点击跳转都靠这两个自定义字段
        posts: n.posts || [],
        url: n.url || '',
        label: { show: n.value >= 2 || data.nodes.length <= 12 },
      };
    });

    var links = data.links.map(function (l) {
      return { source: l.source, target: l.target, value: l.value };
    });

    var reduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: isDark() ? 'rgba(30,30,30,.94)' : 'rgba(255,255,255,.96)',
        borderColor: isDark() ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
        textStyle: { color: isDark() ? '#eaeaea' : '#333', fontSize: 12 },
        formatter: function (p) {
          if (p.dataType === 'edge') {
            return (
              '<b>' + p.data.source + '</b> ↔ <b>' + p.data.target + '</b><br/>' +
              '共现 ' + p.data.value + ' 次'
            );
          }
          var d = p.data;
          var html = '<b>' + d.name + '</b><br/>' + d.value + ' 篇文章';
          if (d.posts && d.posts.length) {
            html += '<div style="margin-top:6px;max-width:260px">';
            d.posts.forEach(function (t) {
              html +=
                '<div style="opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
                '· ' + String(t).replace(/[<>&]/g, '') + '</div>';
            });
            html += '</div>';
          }
          if (d.url) html += '<div style="margin-top:6px;opacity:.55">点击查看该标签</div>';
          return html;
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          force: {
            repulsion: 260,
            edgeLength: [60, 160],
            gravity: 0.08,
            friction: 0.16,
            layoutAnimation: !reduced,
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            color: isDark() ? '#cfcfcf' : '#555',
            formatter: '{b}',
          },
          lineStyle: {
            color: isDark() ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.14)',
            curveness: 0.14,
            opacity: 0.9,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 3, opacity: 1 },
            label: { fontSize: 13, fontWeight: 'bold' },
          },
          edgeSymbol: ['none', 'none'],
          data: nodes,
          links: links,
        },
      ],
    };

    var chart = echarts.init(chartEl, null, { renderer: 'canvas' });
    chart.setOption(option);
    chart.on('click', function (p) {
      if (p.dataType === 'node' && p.data && p.data.url) {
        location.href = p.data.url;
      }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { chart.resize(); }, 150);
    });

    // 深浅色切换后重画配色
    var observer = new MutationObserver(function () {
      if (chartEl.dataset.tgTheme === (isDark() ? 'dark' : 'light')) return;
      chartEl.dataset.tgTheme = isDark() ? 'dark' : 'light';
      var c = palette();
      chart.setOption({
        series: [
          {
            data: data.nodes.map(function (n) {
              var ratio = Math.sqrt(n.value / maxValue);
              return {
                id: n.name,
                name: n.name,
                value: n.value,
                symbolSize: Math.round(minSize + (maxSize - minSize) * ratio),
                itemStyle: { color: c[bucketOf(n.value)] },
                posts: n.posts || [],
                url: n.url || '',
                label: { show: n.value >= 2 || data.nodes.length <= 12 },
              };
            }),
          },
        ],
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    chartEl.dataset.tgReady = '1';
  }

  /** echarts 不在就先补一个 script 再画 */
  function withEcharts(fn) {
    if (window.echarts) {
      fn(window.echarts);
      return;
    }
    var s = document.createElement('script');
    s.src = ECHARTS_SRC;
    s.onload = function () {
      if (window.echarts) fn(window.echarts);
    };
    s.onerror = function () {
      var meta = document.getElementById('tag-graph-meta');
      if (meta) meta.textContent = '图表库加载失败，标签关系图暂时无法显示。';
    };
    document.head.appendChild(s);
  }

  function init() {
    var wrap = document.getElementById('tag-graph');
    if (!wrap) return;
    var chartEl = document.getElementById('tag-graph-chart');
    if (!chartEl || chartEl.dataset.tgReady === '1') return;

    var data = readData();
    var meta = document.getElementById('tag-graph-meta');
    if (!data) {
      // 没有任何共现（或只有一篇文章）时整块隐藏，别留个空框
      wrap.style.display = 'none';
      return;
    }

    if (meta) {
      meta.textContent =
        '共 ' + data.nodes.length + ' 个标签、' + data.links.length +
        ' 条共现连线（同一篇文章内同时出现的标签才连线，共现 ≥ ' +
        data.threshold + ' 次）· 可拖拽 / 滚轮缩放';
    }

    withEcharts(function (echarts) { draw(echarts, data); });
  }

  window.initTagGraph = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 主题 pjax 会整块换 #body-wrap，换页后重跑
  document.addEventListener('pjax:complete', init);
})();
