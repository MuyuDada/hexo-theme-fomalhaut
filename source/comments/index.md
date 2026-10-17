---
title: 留言板
date: 2026-10-19 12:00:00
description: 路过就留句话吧，说说你在想什么、想看到什么，或者只是打个招呼。
top_img: /assets/head.jpg
---

<!--
  留言板 · 页面自定义样式（2026-10-19 新增）
  样式只写在本文正文里，作用域统一限定在 #article-container 下的 .gb-* 容器内，不影响站内其它页面。
  配色全部由站点主题色派生（color-mix），换主题色会自动跟随。
  评论系统走主题的 Waline（见 _config.fomalhaut.yml 的 comments / waline 段），
  本页只负责「页头 + 引导语 + 小提示」，评论区由主题自动渲染在页面底部。
-->

<style>
  #article-container .gb-hero {
    position: relative;
    padding: 28px 26px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--theme-color) 8%, var(--global-bg));
    border: 1px solid color-mix(in srgb, var(--theme-color) 22%, transparent);
    overflow: hidden;
  }
  #article-container .gb-hero::before {
    content: "";
    position: absolute;
    inset: -40% -10% auto auto;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--theme-color) 28%, transparent), transparent 68%);
    pointer-events: none;
  }
  #article-container .gb-hero-title {
    margin: 0 0 10px;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--theme-color);
    letter-spacing: .5px;
  }
  #article-container .gb-hero-desc {
    margin: 0;
    font-size: .95rem;
    line-height: 1.9;
    color: var(--font-color);
    opacity: .88;
  }

  #article-container .gb-tips {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin: 22px 0 4px;
  }
  #article-container .gb-tip {
    display: flex;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--theme-color) 5%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--theme-color) 14%, transparent);
    transition: transform .25s ease, border-color .25s ease;
  }
  #article-container .gb-tip:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--theme-color) 40%, transparent);
  }
  #article-container .gb-tip-icon {
    flex: 0 0 auto;
    font-size: 1.3rem;
    line-height: 1.4;
  }
  #article-container .gb-tip-body { min-width: 0; }
  #article-container .gb-tip-title {
    margin: 0 0 4px;
    font-size: .95rem;
    font-weight: 600;
    color: var(--font-color);
  }
  #article-container .gb-tip-text {
    margin: 0;
    font-size: .84rem;
    line-height: 1.75;
    color: var(--font-color);
    opacity: .72;
  }

  #article-container .gb-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 30px 0 10px;
    font-size: .9rem;
    font-weight: 600;
    color: var(--theme-color);
  }
  #article-container .gb-divider::before,
  #article-container .gb-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-color) 45%, transparent), transparent);
  }

  @media screen and (max-width: 768px) {
    #article-container .gb-hero { padding: 22px 18px; }
    #article-container .gb-hero-title { font-size: 1.15rem; }
    #article-container .gb-tips { gap: 10px; }
  }
</style>

<div class="gb-hero">
  <p class="gb-hero-title">✿ 说点什么吧</p>
  <p class="gb-hero-desc">
    这里没有主题，没有规矩，也不用自我介绍。<br>
    想聊技术就聊技术，想吐槽就吐槽，只是路过打个招呼也很好。<br>
    看到有意思的留言我会尽量回，慢一点但都会看。
  </p>
</div>

<div class="gb-tips">
  <div class="gb-tip">
    <div class="gb-tip-icon">💬</div>
    <div class="gb-tip-body">
      <p class="gb-tip-title">随便聊</p>
      <p class="gb-tip-text">文章相关的问题建议直接留在对应文章下面，这样后来的人也能看到答案。</p>
    </div>
  </div>
  <div class="gb-tip">
    <div class="gb-tip-icon">🔗</div>
    <div class="gb-tip-body">
      <p class="gb-tip-title">想换友链</p>
      <p class="gb-tip-text">去 <a href="/social/link/">友人帐</a> 页面按格式填一份就行，比在留言板里贴更方便。</p>
    </div>
  </div>
  <div class="gb-tip">
    <div class="gb-tip-icon">📮</div>
    <div class="gb-tip-body">
      <p class="gb-tip-title">想私下说</p>
      <p class="gb-tip-text">邮件走 <a href="mailto:2756390658@qq.com">2756390658@qq.com</a>，比评论区靠谱。</p>
    </div>
  </div>
</div>

<div class="gb-divider">留言区</div>
