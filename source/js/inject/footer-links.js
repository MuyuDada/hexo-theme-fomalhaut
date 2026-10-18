/*!
 * source/js/inject/footer-links.js —— 页脚「友链 · 换一批」
 *
 * 【背景】
 *   themes/fomalhaut/layout/includes/footer.pug 里 footer-friends 一次渲染
 *   source/_data/link.yml 第一组（常来常往）的前 8 位，首屏只有前 4 位带 .is-shown。
 *   点「换一批」在这里轮换，不需要重新请求数据。
 *
 * 【为什么不在 pug 里一次只渲染 4 条】
 *   换一批要的是「换」而不是「重新加载页面」；8 条都在 DOM 里、只切 class，
 *   切换零延迟，也不用给页脚再挂一个 JSON 接口。
 *
 * 【pjax】
 *   页脚在 #body-wrap 内，翻页会被整块替换，所以除首屏外还要在 pjax 各阶段重绑一次。
 *   每次绑之前先看 dataset.ftLinksBound，避免重复绑定导致点一下跳两批。
 */
(function () {
  var PAGE = 4;

  function batch() {
    var box = document.querySelector('#footer-wrap .footer-friends');
    if (!box || box.dataset.ftLinksBound === '1') return;
    box.dataset.ftLinksBound = '1';

    var items = Array.prototype.slice.call(box.querySelectorAll('.footer-friend-item'));
    var btn = box.querySelector('.footer-friends-refresh');
    // 不足两批就没得换，按 4 条固定展示，按钮直接淡出（不给假交互）
    var canSwap = items.length > PAGE;
    if (btn && !canSwap) {
      btn.style.display = 'none';
    }
    if (!canSwap) {
      items.forEach(function (el) {
        el.classList.add('is-shown');
      });
      return;
    }

    var start = 0;
    function render() {
      items.forEach(function (el, i) {
        var visible = (i - start + items.length) % items.length < PAGE;
        el.classList.toggle('is-shown', visible);
      });
    }

    if (btn) {
      btn.addEventListener('click', function () {
        start = (start + PAGE) % items.length;
        render();
        btn.classList.remove('is-spinning');
        // 读一次 offsetWidth 强制回流，让动画在连续点击时也能重新播放
        void btn.offsetWidth;
        btn.classList.add('is-spinning');
        setTimeout(function () {
          btn.classList.remove('is-spinning');
        }, 500);
      });
    }
  }

  batch();
  ['DOMContentLoaded', 'pjax:complete', 'pjax:success', 'pjax:end'].forEach(function (ev) {
    document.addEventListener(ev, batch);
  });
})();
