/* ============================================================================
 * modules/nav.js —— 导航栏 / 首屏欢迎语 / 随便逛逛 / 分享按钮
 * ----------------------------------------------------------------------------
 * 本文件由 source/js/fomal.js 拆出（2026-10-03 屎山重构）。
 * 【重要】这里故意不套 IIFE：主题 pug 模板里有大量内联 onclick="xxx()"，
 *        以及别的脚本会直接调全局函数，所以本文件里的声明必须留在全局作用域。
 * ----------------------------------------------------------------------------
 * 包含的模块（括号内为拆分前在 fomal.js 里的行号）：
 *   · 导航栏显示标题（37-66）—— 滚动到正文后，顶栏中间淡入文章标题（原来只有站点名）
 *   · 欢迎信息（70-165）—— 首屏打字机欢迎语，按当前时间/节日换不同问候语；window.onload 触发
 *   · 随便逛逛（504-525）—— 右下角"随便逛逛"按钮，随机跳一篇文章
 *   · 分享按钮（1237-1267）—— 文章页分享：复制链接 / 调起系统分享面板
 * ----------------------------------------------------------------------------
 * 和「顶栏 + 首屏 + 分享」有关的交互都在这。
 * 加载方式：_config.fomalhaut.yml 的 inject.bottom 列表里以 <script defer> 引用。
 * ----------------------------------------------------------------------------
 * 【本文件目录】共 8 个顶层声明（行号可能随后续编辑漂移，找不到就 Ctrl+F 搜函数名）
 *     37  tonav()
 *     55  scrollToTop()
 *     81  getDistance(e1, n1, e2, n2)
 *     98  showWelcomeLoading()
 *    107  showWelcome()
 *    168  randomPost()
 *    191  share_()
 *    215  share()
 * ========================================================================== */

/* ------------------------------ 导航栏显示标题 ------------------------------ */
/* 原 fomal.js 37-66 行，原样搬运，未改逻辑 */
/* 导航栏显示标题 start */

document.addEventListener('pjax:complete', tonav);
document.addEventListener('DOMContentLoaded', tonav);
//响应pjax
function tonav() {
  // Replace only this module's listener; keep other scroll handlers intact.
  var $window = $(window);
  $window.off('scroll.fomalNavTitle');
  var nameContainer = document.getElementById("name-container");
  var menusItems = document.getElementsByClassName("menus_items")[1];
  var pageName = document.getElementById("page-name");
  if (!nameContainer || !menusItems || !pageName) return;

  nameContainer.setAttribute("style", "display:none");
  var position = $window.scrollTop();
  $window.on('scroll.fomalNavTitle', function () {
    var scroll = $window.scrollTop();
    if (scroll > position) {
      nameContainer.setAttribute("style", "");
      menusItems.setAttribute("style", "display:none!important");
    } else {
      menusItems.setAttribute("style", "");
      nameContainer.setAttribute("style", "display:none");
    }
    position = scroll;
  });
  //修复没有弄右键菜单的童鞋无法回顶部的问题
  pageName.innerText = document.title.split(" | Demo")[0];
}

function scrollToTop() {
  document.getElementsByClassName("menus_items")[1].setAttribute("style", "");
  document.getElementById("name-container").setAttribute("style", "display:none");
  btf.scrollToDest(0, 500);
}

/* 导航栏显示标题 end */

/* ------------------------------ 欢迎信息 ------------------------------ */
/* 原 fomal.js 70-165 行，2026-10-19 重写取数层 */
/* 欢迎信息 start */
// 按访客 IP 粗略定位（侧栏「欢迎信息」卡片）。
// 2026-10-19 换源：原来用腾讯位置服务，需要自己去 lbs.qq.com 申请 Key 填进
// YOUR_TENCENT_MAP_KEY，填之前接口一直返回错误码 → 卡片先卡在「正在加载中...」，
// 10 秒后变成「加载失败」。现在改用 ipwho.is：免费、免 Key、带 CORS、支持中文地名
// （?lang=zh-CN 会把 country / region / city 直接返回成「中国 / 河北省 / 廊坊」）。
// 注意它是 HTTPS 接口，本站也是 HTTPS，不会被混合内容拦掉。
// 不想要这个功能：把 loadIpLocation() 换成 showWelcomeFailed() 即可，
// 或者干脆删掉 card_announcement 里的 #welcome-info（见 card_announcement.pug）。
var ipLoacation = null;
var WELCOME_TIMEOUT = 8000;
function showWelcomeFailed() {
  try {
    var el = document.getElementById('welcome-info');
    if (el && !el.innerHTML.trim()) {
      el.innerHTML = '<b><center>欢迎信息暂时取不到 🥺</center></b>';
    }
  } catch (err) { }
}
function loadIpLocation() {
  if (typeof fetch !== 'function') { showWelcomeFailed(); return; }
  var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, WELCOME_TIMEOUT);
  fetch('https://ipwho.is/?lang=zh-CN', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
    .then(function (res) { return res.json(); })
    .then(function (res) {
      clearTimeout(timer);
      if (res && res.success !== false && res.latitude && res.longitude) {
        ipLoacation = res;
        //数据回来后立刻渲染：接口慢于 window.onload 时，原先这段欢迎信息会一直空着
        showWelcome();
      } else {
        showWelcomeFailed();
      }
    })
    .catch(function () { clearTimeout(timer); showWelcomeFailed(); });
}
loadIpLocation();
function getDistance(e1, n1, e2, n2) {
  const R = 6371
  const { sin, cos, asin, PI, hypot } = Math
  let getPoint = (e, n) => {
    e *= PI / 180
    n *= PI / 180
    return { x: cos(n) * cos(e), y: cos(n) * sin(e), z: sin(n) }
  }

  let a = getPoint(e1, n1)
  let b = getPoint(e2, n2)
  let c = hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  let r = asin(c / 2) * 2 * R
  return Math.round(r);
}

//还没拿到位置数据时先占个位：避免侧栏留一个空的蓝色盒子，也避免控制台报错
function showWelcomeLoading() {
  try {
    let el = document.getElementById("welcome-info");
    if (el && !el.innerHTML.trim()) el.innerHTML = '<b><center>欢迎信息正在加载中...</center></b>';
  } catch (err) {
    // console.log("Pjax无法获取#welcome-info元素🙄🙄🙄")
  }
}

function showWelcome() {

  //数据还没回来（接口慢或被拦截）就先显示加载提示
  if (!ipLoacation || !ipLoacation.latitude || !ipLoacation.longitude) {
    showWelcomeLoading();
    return;
  }

  //站长所在地坐标（河北廊坊，约 116.71, 39.52）。换成你自己的经纬度即可，
  //距离只用于「你目前距站长约 N 公里」这一句，不参与定位。
  var SITE_LAT = 39.5208, SITE_LNG = 116.7147;
  let dist = getDistance(SITE_LNG, SITE_LAT, ipLoacation.longitude, ipLoacation.latitude);
  //ipwho.is + lang=zh-CN 直接给中文地名：中国 / 河北省 / 廊坊。
  //海外访客的 country 会是当地语言的国名，没有省市区，只显示国名。
  let pos = ipLoacation.country === '中国'
    ? [ipLoacation.region, ipLoacation.city].filter(Boolean).join(' ') || ipLoacation.country
    : (ipLoacation.country || '未知地区');
  let ip = ipLoacation.ip;
  //IPv6 动辄 30+ 字符且无空格，在每个冒号后插软换行点（<wbr>），让它能在冒号处断行而不撑破卡片
  let ipHtml = String(ip).replace(/:/g, ":<wbr>");

  //根据本地时间切换问候语
  let timeChange;
  let date = new Date();
  let hour = date.getHours();
  if (hour >= 5 && hour < 11) timeChange = "<span>上午好</span>";
  else if (hour >= 11 && hour < 13) timeChange = "<span>中午好</span>";
  else if (hour >= 13 && hour < 18) timeChange = "<span>下午好</span>";
  else if (hour >= 18 && hour < 24) timeChange = "<span>晚上好</span>";
  else timeChange = "<span>夜深了</span>";
  let clock = String(hour).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");

  //距离措辞：<1 公里说「就在附近」，其余照常报公里数。
  //站长自己打开站点时 IP 定位往往与站点坐标重合（都会算成 0 公里），这样读起来才不别扭。
  let distText = dist < 1
    ? '你就在站长附近'
    : '你目前距站长约 <span style="color:var(--blue-custom)">' + dist + '</span> 公里';

  try {
    //自定义文本和需要放的位置
    document.getElementById("welcome-info").innerHTML =
      `<b><center>🎉 欢迎信息 🎉</center>来自 <span style="color:var(--blue-custom)">${pos}</span> 的访客，${timeChange}，现在是 <span style="color:var(--blue-custom)">${clock}</span>，${distText}，IP地址：<span style="color:var(--blue-custom)">${ipHtml}</span></b>`;
  } catch (err) {
    // console.log("Pjax无法获取#welcome-info元素🙄🙄🙄")
  }
}
//window.onload 直接赋值会顶掉别的脚本挂的 onload，改用 addEventListener
window.addEventListener('load', function () {
  //数据已经回来了就渲染，没回来保持「加载中」，由 loadIpLocation 的回调负责收尾
  if (ipLoacation) showWelcome(); else showWelcomeLoading();
});
// 如果使用了pjax在加上下面这行代码
document.addEventListener('pjax:complete', showWelcome);
//Pjax 换页后新插入的 #welcome-info 是空的，先放加载提示（有数据时会被 showWelcome 覆盖）
document.addEventListener('pjax:complete', showWelcomeLoading);

//本文件是 defer 加载的，执行时 DOM 已解析，先立刻占位
showWelcomeLoading();
//兜底：无论接口怎么失败，页面停留 12 秒后都不该再挂着「加载中」
setTimeout(function () {
  try {
    let el = document.getElementById("welcome-info");
    if (el && el.innerHTML.indexOf("正在加载中") > -1) showWelcomeFailed();
  } catch (err) { }
}, 12000);

/* 欢迎信息 end */

/* ------------------------------ 随便逛逛 ------------------------------ */
/* 原 fomal.js 504-525 行，原样搬运，未改逻辑 */
/* 随便逛逛 start */
// 随便逛逛
// sitemap 里的 <loc> 是绝对地址（域名由 _config.yml 的 url 决定），
// 直接跳转会导致本地预览 / 镜像域名下跳到生产站，所以统一转成同源相对路径。
function randomPost() {
  fetch('/baidusitemap.xml').then(res => res.text()).then(str => (new window.DOMParser()).parseFromString(str, "text/xml")).then(data => {
    const ls = [...data.querySelectorAll('url loc')].map(el => {
      try {
        const u = new URL(el.textContent.trim(), location.origin);
        return u.pathname + u.search + u.hash;
      } catch (e) { return null }
    }).filter(Boolean);
    if (!ls.length) return;
    // 发现有时会和当前页面重复，加一个判断
    let url = ls[Math.floor(Math.random() * ls.length)];
    for (let i = 0; i < 20 && url === decodeURI(location.pathname); i++) {
      url = ls[Math.floor(Math.random() * ls.length)];
    }
    location.href = url;
  })
}
/* 随便逛逛 end */

/* ------------------------------ 分享按钮 ------------------------------ */
/* 原 fomal.js 1237-1267 行，原样搬运，未改逻辑 */
/* 分享按钮 start */
// 分享本页
function share_() {
  let url = window.location.origin + window.location.pathname
  try {
    // 截取标题
    var title = document.title;
    var subTitle = title.endsWith("| Demo") ? title.substring(0, title.length - 7) : title;
    navigator.clipboard.writeText('Demo的站内分享\n标题：' + subTitle + '\n链接：' + url + '\n欢迎来访！🍭🍭🍭');
    fomalNotify({
          title: "成功复制分享信息🎉",
          message: "您现在可以通过粘贴直接跟小伙伴分享了！",
          position: 'top-left',
          offset: 50,
          showClose: true,
          type: "success",
          duration: 5000
        })
  } catch (err) {
    console.error('复制失败！', err);
  }
  // new ClipboardJS(".share", { text: function () { return '标题：' + document.title + '\n链接：' + url } });
  // btf.snackbarShow("本页链接已复制到剪切板，快去分享吧~")
}

// 防抖
function share() {
  debounce(share_, 300);
}

/* 分享按钮 end */
