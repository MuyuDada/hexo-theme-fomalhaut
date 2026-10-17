---
title: 打赏
date: 2026-10-19 12:10:00
description: 如果这里的内容帮到过你，可以请我喝一杯。所有打赏都会用在服务器和域名上。
top_img: /assets/head.jpg
---

<!--
  打赏 · 页面自定义样式（2026-10-19 新增，对齐 Firefly-yuan 的 /sponsor/ 页）
  样式只写在本文正文里，作用域统一限定在 #article-container 下的 .sp-* 容器内，不影响站内其它页面。
  二维码图片：source/assets/sponsor/wechat.png、alipay.png（与文章底部「投喂」按钮共用同一组图）。
  评论区由主题自动渲染在本页底部（Waline，path 取 location.pathname，即 /sponsor/）。
-->

<style>
  #article-container .sp-usage {
    display: flex;
    gap: 14px;
    padding: 18px 20px;
    margin: 0 0 26px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--theme-color) 7%, var(--global-bg));
    border: 1px solid color-mix(in srgb, var(--theme-color) 20%, transparent);
  }
  #article-container .sp-usage-icon {
    flex: 0 0 auto;
    font-size: 1.35rem;
    line-height: 1.5;
  }
  #article-container .sp-usage-title {
    margin: 0 0 6px;
    font-size: .95rem;
    font-weight: 700;
    color: var(--theme-color);
  }
  #article-container .sp-usage-text {
    margin: 0;
    font-size: .9rem;
    line-height: 1.85;
    color: var(--font-color);
    opacity: .85;
  }

  #article-container .sp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 18px;
    margin: 0 0 10px;
  }
  #article-container .sp-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 20px 20px;
    border-radius: 14px;
    background: var(--card-bg);
    border: 1px solid color-mix(in srgb, var(--theme-color) 16%, transparent);
    transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
  }
  #article-container .sp-card:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--theme-color) 45%, transparent);
    box-shadow: 0 10px 28px -12px color-mix(in srgb, var(--theme-color) 55%, transparent);
  }
  #article-container .sp-card-icon {
    font-size: 1.7rem;
    line-height: 1;
    margin-bottom: 10px;
  }
  #article-container .sp-card-name {
    margin: 0 0 4px;
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--font-color);
  }
  #article-container .sp-card-desc {
    margin: 0 0 16px;
    font-size: .82rem;
    color: var(--font-color);
    opacity: .68;
    text-align: center;
  }
  #article-container .sp-qr {
    width: 200px;
    max-width: 100%;
    aspect-ratio: 1 / 1;
    padding: 8px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 4px 16px -8px rgba(0, 0, 0, .35);
  }
  #article-container .sp-qr img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 6px;
  }
  #article-container .sp-card-link {
    margin-top: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 999px;
    font-size: .85rem;
    font-weight: 600;
    color: #fff;
    background: var(--theme-color);
    text-decoration: none;
    transition: opacity .2s ease, transform .2s ease;
  }
  #article-container .sp-card-link:hover {
    opacity: .86;
    transform: translateY(-1px);
    color: #fff;
  }

  #article-container .sp-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 32px 0 18px;
    font-size: .95rem;
    font-weight: 700;
    color: var(--theme-color);
  }
  #article-container .sp-divider::before,
  #article-container .sp-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-color) 45%, transparent), transparent);
  }

  #article-container .sp-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  #article-container .sp-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--theme-color) 4%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--theme-color) 12%, transparent);
  }
  #article-container .sp-item-avatar {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .95rem;
    font-weight: 700;
    color: #fff;
    background: var(--theme-color);
  }
  #article-container .sp-item-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  #article-container .sp-item-main { flex: 1; min-width: 0; }
  #article-container .sp-item-name {
    font-size: .92rem;
    font-weight: 600;
    color: var(--font-color);
  }
  #article-container .sp-item-date {
    font-size: .78rem;
    color: var(--font-color);
    opacity: .6;
  }
  #article-container .sp-item-amount {
    flex: 0 0 auto;
    font-size: .95rem;
    font-weight: 700;
    color: var(--theme-color);
  }

  #article-container .sp-empty {
    padding: 26px 16px;
    text-align: center;
    font-size: .88rem;
    color: var(--font-color);
    opacity: .6;
    border-radius: 10px;
    border: 1px dashed color-mix(in srgb, var(--theme-color) 28%, transparent);
  }

  @media screen and (max-width: 768px) {
    #article-container .sp-card { padding: 20px 16px 18px; }
    #article-container .sp-qr { width: 170px; }
  }
</style>

<div class="sp-usage">
  <div class="sp-usage-icon">🧾</div>
  <div>
    <p class="sp-usage-title">打赏说明</p>
    <p class="sp-usage-text">
      这个站是我自己出钱出时间在维护的：域名、服务器、图床、还有写文章时踩过的坑。<br>
      如果这里的内容真的帮到过你，可以请我喝一杯，所有打赏都会直接投进这些开销里，用来维持站点继续在线、继续更新。
    </p>
  </div>
</div>

<div class="sp-grid">
  <div class="sp-card">
    <div class="sp-card-icon">💙</div>
    <p class="sp-card-name">支付宝</p>
    <p class="sp-card-desc">打开支付宝扫一扫</p>
    <div class="sp-qr">
      <img src="/assets/sponsor/alipay.png" alt="支付宝收款码" loading="lazy">
    </div>
  </div>

  <div class="sp-card">
    <div class="sp-card-icon">💚</div>
    <p class="sp-card-name">微信</p>
    <p class="sp-card-desc">打开微信扫一扫</p>
    <div class="sp-qr">
      <img src="/assets/sponsor/wechat.png" alt="微信收款码" loading="lazy">
    </div>
  </div>

  <div class="sp-card">
    <div class="sp-card-icon">⚡</div>
    <p class="sp-card-name">爱发电</p>
    <p class="sp-card-desc">想长期支持可以走这里</p>
    <div class="sp-qr" style="display:flex;align-items:center;justify-content:center;font-size:2.6rem;">
      <span aria-hidden="true">🔌</span>
    </div>
    <a class="sp-card-link" href="https://ifdian.net/a/muyudada" target="_blank" rel="noopener noreferrer">
      前往爱发电 <span aria-hidden="true">→</span>
    </a>
  </div>
</div>

<div class="sp-divider">打赏名单</div>

<ul class="sp-list">
  <li class="sp-item">
    <div class="sp-item-avatar">
      <img src="https://muyuimg.cc.cd/file/blog/1788157305659_maomao.gif" alt="牧笨" loading="lazy">
    </div>
    <div class="sp-item-main">
      <div class="sp-item-name">牧笨</div>
      <div class="sp-item-date">2026-10-01</div>
    </div>
    <div class="sp-item-amount">¥100</div>
  </li>
</ul>

<p class="sp-empty" style="margin-top:14px;">
  感谢上面这位朋友的支持 🙏<br>
  如果还有想留名的，打赏之后在下面留言告诉我一声就好，我会加到这里。
</p>
