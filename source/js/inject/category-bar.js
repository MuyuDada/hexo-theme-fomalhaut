/*!
 * category-bar.js（客户端）—— 分类快捷导航条的高亮与横向滚动
 * ---------------------------------------------------------------------------
 * DOM 由 scripts/category-bar.js 在构建期插入（.category-bar > .cb-inner），
 * 本文件只做客户端才有条件做的三件事：
 *   1. 判断「当前页」是首页 / 归档 / 哪个分类 / 哪个标签，给对应胶囊打 [data-active]；
 *      构建期只知道「文章属于哪个分类」（写成 [data-soft-active]），不知道用户从哪儿点进来。
 *   2. 把当前项滚动到可视区中间（分类多的时候默认只露出前几个）。
 *   3. 两侧渐隐提示 + 竖直滚轮映射为横向滚动（鼠标没有横向滚轮也能滚分类）。
 *
 * pjax：主题的 pjaxSelectors 含 #body-wrap，换页时整块 DOM 会被替换，
 *   所以必须监听 pjax:complete 重新初始化（同理 archive-page.js）。
 * 幂等：初始化前给 .category-bar 打 data-cb-ready，重复调用直接返回。
 *
 * 卸载：删掉 _config.fomalhaut.yml inject.head 里的引入行即可。
 * 仓库路径：source/js/inject/category-bar.js
 */

(function () {
  'use strict';

  /** 把当前页面对应的胶囊滚动到可视区中间 */
  function centerActive(wrap, scroll, el) {
    if (!el || !scroll) return;
    var target = el.offsetLeft - (scroll.clientWidth - el.offsetWidth) / 2;
    if (target < 0) target = 0;
    var max = scroll.scrollWidth - scroll.clientWidth;
    if (target > max) target = max;
    // 首次进入直接定位，别让用户看见一段横向动画
    scroll.scrollLeft = target;
    updateHint(wrap, scroll);
  }

  /** 更新两侧渐隐 / 更多分隔线的状态类 */
  function updateHint(wrap, scroll) {
    if (!wrap || !scroll) return;
    var max = scroll.scrollWidth - scroll.clientWidth;
    var scrollable = max > 2;
    wrap.classList.toggle('is-scrollable', scrollable);
    wrap.classList.toggle('is-start', scroll.scrollLeft <= 2);
    wrap.classList.toggle('is-end', scroll.scrollLeft >= max - 2);
  }

  /** 竖直滚轮 → 横向滚动；滚到头就把事件放行，让页面继续上下滚 */
  function bindWheel(wrap, scroll) {
    if (scroll.dataset.cbWheel === '1') return;
    scroll.dataset.cbWheel = '1';
    scroll.addEventListener(
      'wheel',
      function (e) {
        // 触控板横向滑动（deltaX 明显大于 deltaY）交给浏览器原生处理
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        var max = scroll.scrollWidth - scroll.clientWidth;
        if (max <= 2) return;
        var atStart = scroll.scrollLeft <= 0;
        var atEnd = scroll.scrollLeft >= max - 1;
        // 到头了就不拦，页面照常滚
        if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
        e.preventDefault();
        scroll.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
  }

  /**
   * 当前页面是哪个胶囊。
   * 优先用构建期写好的 [data-soft-active]（文章所属分类，从文章页进来时有意义），
   * 其次按路径判断首页 / 归档 / 分类页自身。
   */
  function resolveActive(bar) {
    var path = (location.pathname || '/').replace(/\/index\.html$/, '/');
    if (path.length > 1 && path.charAt(path.length - 1) !== '/') path += '/';

    var pills = bar.querySelectorAll('.cb-pill');
    var active = null;

    // 首页（含 /page/N/）
    if (path === '/' || /^\/page\/\d+\/$/.test(path)) {
      active = bar.querySelector('.cb-icon-pill');
    }
    // 归档页（含 /archives/page/N/）
    else if (/^\/archives\//.test(path)) {
      active = bar.querySelector('[data-cb-name="__archive__"]');
    }
    // 分类总览页
    else if (/^\/categories\/?$/.test(path)) {
      active = bar.querySelector('[data-cb-name="__categories__"]');
    }
    // 标签页：没有对应胶囊，退而用标签所属分类的弱高亮（构建期写好了）
    else {
      // 分类页 /categories/xxx/ 或 /categories/xxx/page/N/：按 href 前缀匹配
      for (var i = 0; i < pills.length; i++) {
        var name = pills[i].getAttribute('data-cb-name') || '';
        if (!name || name.charAt(0) === '_') continue;
        var href = pills[i].getAttribute('href') || '';
        if (href && path.indexOf(href) === 0) {
          active = pills[i];
          break;
        }
      }
      if (!active) active = bar.querySelector('[data-soft-active]');
    }

    if (active) active.setAttribute('data-active', '');
    return active;
  }

  function init() {
    var bar = document.querySelector('.category-bar');
    if (!bar || bar.dataset.cbReady === '1') return;
    bar.dataset.cbReady = '1';

    var wrap = bar.querySelector('.cb-scroll-wrap');
    var scroll = bar.querySelector('.cb-scroll');
    if (!wrap || !scroll) return;

    var active = resolveActive(bar);
    centerActive(wrap, scroll, active);

    scroll.addEventListener('scroll', function () {
      updateHint(wrap, scroll);
    });

    // 窗口尺寸变化后可视宽度变了，渐隐状态要重算
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        updateHint(wrap, scroll);
      }, 150);
    });

    bindWheel(wrap, scroll);
    updateHint(wrap, scroll);
  }

  window.initCategoryBar = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // pjax 换页后 DOM 被整块替换，重新初始化
  document.addEventListener('pjax:complete', init);
})();
