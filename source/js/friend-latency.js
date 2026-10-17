/**
 * friend-latency.js —— 友人帐卡片的「访问延时」徽章
 * ---------------------------------------------------------------------------
 * 对齐 Firefly-yuan 的 src/pages/friends.astro（probeLatency）：
 *   页面加载后，对每张友人帐卡片的目标站点发一次 no-cors 的 HEAD/GET 探测，
 *   用「请求开始 → 结束」的耗时给卡片右上角挂一个绿/橙/红徽章。
 *
 * 为什么用 no-cors：
 *   跨域探测只要拿到「有没有响应」就够了，不需要读内容。no-cors 下响应是不透明的
 *   （status 恒为 0、body 读不到），但 fetch 的 resolve/reject 时序仍然真实反映了
 *   网络往返，用它计时既不需要对方配 CORS，也不会因为对方没开 CORS 就误判成"挂了"。
 *
 * 阈值（与 Firefly-yuan 一致，改这里就行）：
 *   LATENCY_TIMEOUT 5000ms  超时 → 徽章 "Timeout"、红色 .is-bad
 *   LATENCY_GOOD_MS 2000ms  < 2000ms → 绿色 .is-good；≥ 2000ms → 橙色 .is-warn
 *
 * 加载方式：source/social/link/index.md 里 <script src="/js/friend-latency.js" defer>。
 * 只在友人帐页有 .friend-card 时才干活，其它页面加载了也是空转，可以直接全局引。
 * 卸载：删掉本文件 + 友人帐页里的 script 标签 + volantis.styl 里的 .friend-latency 段即可。
 */

(function () {
  'use strict';

  var LATENCY_TIMEOUT = 5000;
  var LATENCY_GOOD_MS = 2000;

  /** 徽章文案：毫秒数 + " MS"；超时用 data-timeout-label（默认 Timeout） */
  function settle(badge, state, text) {
    badge.classList.remove('is-good', 'is-warn', 'is-bad');
    badge.classList.add(state);
    badge.textContent = text;
  }

  function probeLatency(card) {
    var badge = card.querySelector('[data-latency]');
    if (!badge) return;

    var target = card.getAttribute('data-friend-link') || card.getAttribute('href');
    if (!target || target.indexOf('javascript:') === 0) return;

    // 本站自己的卡片没必要探测（会算进页面自身的加载耗时，没有参考意义）
    if (target.indexOf(location.origin) === 0) return;

    var started = performance.now();
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, LATENCY_TIMEOUT);

    fetch(target, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    })
      .then(function () {
        clearTimeout(timer);
        var ms = Math.round(performance.now() - started);
        settle(badge, ms < LATENCY_GOOD_MS ? 'is-good' : 'is-warn', ms + ' MS');
      })
      .catch(function () {
        clearTimeout(timer);
        // 区分「被我们自己 abort（超时）」和「网络层直接失败」：
        // 两者都标红，但文案不同，方便一眼看出是慢还是根本连不上。
        var aborted = controller.signal.aborted;
        settle(badge, 'is-bad', aborted ? badge.getAttribute('data-timeout-label') || 'Timeout' : 'Error');
      });
  }

  function init() {
    var cards = document.querySelectorAll('.friend-card:not([data-latency-done])');
    if (!cards.length) return;

    // 串行探测太慢、全并发又会瞬间打出十几个请求。
    // 用「并发上限 4」的小队列：既快又不至于把浏览器连接池占满。
    var queue = Array.prototype.slice.call(cards);
    var MAX_CONCURRENT = 4;
    var running = 0;

    function next() {
      while (running < MAX_CONCURRENT && queue.length) {
        running++;
        var card = queue.shift();
        // 标记已探测，避免 pjax 换页回来重复打请求
        card.setAttribute('data-latency-done', '1');
        probeLatency(card);
        // 探测本身是异步的，这里用固定间隔放行，避免所有请求在同一帧发出
        setTimeout(function () {
          running--;
          next();
        }, 120);
      }
    }

    // 首屏内容优先：等浏览器空闲再探测，别和图片/字体抢带宽
    if ('requestIdleCallback' in window) {
      requestIdleCallback(next, { timeout: 2000 });
    } else {
      setTimeout(next, 300);
    }
  }

  // 暴露给 pjax：换页后新插入的卡片需要重新探测
  window.initFriendLatency = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // pjax 换页后 #body-wrap 被整体替换，卡片是新的 DOM，必须再跑一次
  document.addEventListener('pjax:complete', init);
})();
