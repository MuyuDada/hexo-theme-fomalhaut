/*!
 * 随机图片：文章封面 / 侧栏资料卡背景
 * ---------------------------------------------------------------------------
 * 数据来自栗次元 https://t.alcy.cc （JSON 接口给稳定 pic 路径 + 支持 ?w= 缩图）。
 *
 * 关键设计
 * 1) 直接用 `https://t.alcy.cc/pic/<分类>/<id>?w=640` 这类**稳定 URL**，
 *    不用 `https://t.alcy.cc/moe` 这种分类直出端点 —— 后者每次请求都换图，
 *    同一个 URL 两次返回不同内容，浏览器缓存直接失效。
 * 2) 分类清单走 JSON 接口 `https://t.alcy.cc/json?<分类>=<n>` 批量取（一次 12 条），
 *    结果存 localStorage 一天。之后每次刷新从池里随机分配，命中缓存时几乎零成本。
 * 3) `?w=` 是服务端缩图参数，实测把 1.1 MB 原图压到 30-50 KB（1/25）。
 *
 * 回滚：从 _config.fomalhaut.yml 删掉本文件的 <script> 即可，无其它改动。
 */
(function () {
  'use strict'

  var POOL_KEY = 'muyu_random_pool_v1'
  var POOL_TTL = 24 * 60 * 60 * 1000 // 一天
  var BATCH = 12 // JSON 接口一次取几条

  // 封面用 /moe（萌图，横竖混合但 cropped 观感好），资料卡用 /moe 同池
  var CATEGORIES = ['moe', 'xhl', 'fj', 'pc']

  var state = { pool: {}, seed: 0 }

  function pick (arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function readPool () {
    try {
      var raw = localStorage.getItem(POOL_KEY)
      if (!raw) return null
      var d = JSON.parse(raw)
      if (!d || !d.t || Date.now() - d.t > POOL_TTL) return null
      if (!d.pool || !d.pool.moe || !d.pool.moe.length) return null
      return d.pool
    } catch (e) {
      return null
    }
  }

  function writePool (pool) {
    try {
      localStorage.setItem(POOL_KEY, JSON.stringify({ t: Date.now(), pool: pool }))
    } catch (e) { /* 隐私模式下 localStorage 会抛，忽略 */ }
  }

  function fetchOne (cat) {
    return fetch('https://t.alcy.cc/json?' + cat + '=' + BATCH, { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (j) {
        if (!j || !j.data || !j.data.length) return []
        return j.data.map(function (it) { return it.link }).filter(Boolean)
      })
      .catch(function () { return [] })
  }

  /** 把 https://t.alcy.cc/pic/moe/29.webp 换成带缩图参数的地址 */
  function withWidth (url, w) {
    if (!url) return url
    return url + (url.indexOf('?') === -1 ? '?' : '&') + 'w=' + w
  }

  function applyCovers (pool) {
    // 三个挂文章封面的地方：
    //   .recent-post-cover img.article-cover —— 首页文章卡片（314×200）
    //   .article-sort-item-img img           —— /archives/ 时间线缩略图（96×72）
    //   .prev-cover / .next-cover            —— 文章页上下篇卡（小图）
    var imgs = document.querySelectorAll(
      '.recent-post-cover img.article-cover, .article-sort-item-img img, img.prev-cover, img.next-cover'
    )
    if (!imgs.length) return 0
    var list = pool.moe
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i]
      var url = withWidth(pick(list), 640)
      // 主题的 lazyload 把真地址放在 data-lazy-src 上（src 是 1×1 占位 gif）
      if (img.hasAttribute('data-lazy-src')) {
        img.setAttribute('data-lazy-src', url)
      } else {
        img.setAttribute('src', url)
      }
      img.removeAttribute('data-src')
    }
    // 若 lazyload 实例已存在，通知它重新扫描
    if (window.lazyLoadInstance && typeof window.lazyLoadInstance.update === 'function') {
      try { window.lazyLoadInstance.update() } catch (e) {}
    }
    return imgs.length
  }

  function applyCardInfo (pool) {
    var card = document.querySelector('#aside-content > .card-widget.card-info')
    if (!card) return 0
    var url = withWidth(pick(pool.moe), 600)
    card.style.backgroundImage = 'url("' + url + '")'
    card.style.backgroundSize = 'cover'
    card.style.backgroundPosition = 'center'
    card.style.backgroundRepeat = 'no-repeat'
    return 1
  }

  function run () {
    var pool = readPool()
    if (pool) {
      state.pool = pool
      applyCovers(pool)
      applyCardInfo(pool)
      return
    }
    // 没有可用缓存：并行拉全部分类
    Promise.all(CATEGORIES.map(fetchOne)).then(function (results) {
      var merged = {}
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (results[i] && results[i].length) merged[CATEGORIES[i]] = results[i]
      }
      if (!merged.moe || !merged.moe.length) return // 全挂则保持主题原样
      state.pool = merged
      writePool(merged)
      applyCovers(merged)
      applyCardInfo(merged)
    })
  }

  function boot () {
    run()
    // pjax 换页后重新分配（首页/归档页的封面每次换页都重来）
    document.addEventListener('pjax:complete', run)
    document.addEventListener('pjax:success', run)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
