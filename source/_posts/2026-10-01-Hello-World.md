---
title: 这个小窝是怎么搭起来的
categories:
  - 折腾记录
tags:
  - Hexo
  - Fomalhaut
  - 建站
cover: /assets/wallpaper/desktop-4.avif
description: 从 2022 年的第一篇文章，到现在这套 Hexo + Fomalhaut 的站点，中间换了三次框架、重写了两次主题。
comments: true
abbrlink: 8b9651a9
date: 2026-10-01 10:00:00
updated: 2026-10-19 12:00:00
---

## 为什么还在写博客

社交平台上的东西是"发出去"的，博客里的东西是"留下来"的。
我一直觉得，把自己折腾过的东西摊开写一遍，比收藏一百个链接更有用——写的过程会把那些一知半解的地方逼出来。

所以这个站从 2022 年一直开到现在，中间换过三次框架，主题也重写了两次。

## 现在跑的是什么

| 位置 | 用的东西 |
| --- | --- |
| 站点框架 | Hexo 6.3.0 |
| 主题 | hexo-theme-fomalhaut v1.0.5（基于 Butterfly 4.3.1 二次开发） |
| 托管 | Cloudflare + Vercel |
| 评论 | Waline（自建，`comment.muyudada.dpdns.org`） |
| 搜索 | hexo-generator-search 生成 `/search.xml`，前端本地检索 |
| 统计 | 不蒜子 + 51LA |

主题本身是从 Butterfly 改出来的，但改到后来结构已经和上游差得比较远：
模板从 EJS 换成了 Pug，样式层重排过，侧栏、归档页、友人帐都各自加了独立的小挂件。

{% note info flat %}
根目录的 `scripts/`、`source/js/`、`source/css/` 是**站点级**的增强代码，和 `themes/fomalhaut/` 里的主题代码是分开的。
升级主题时只要不动 `themes/` 目录，自己写的样式和脚本都不会丢。
{% endnote %}

## 这个站上有哪些自己写的东西

- **分类快捷导航条** —— 首页、归档、分类、标签页顶部那条可以横向滚动的胶囊，带总篇数统计
- **标签关系图** —— 在 `/tags/` 页，用 ECharts 力导向图画出标签之间的共现关系
- **归档页重排** —— 把 Hexo 原生的时间线重构成"概览统计 + 年份吸顶跳转 + 可折叠年份 + 两列卡片"
- **友人帐延迟徽章** —— 每位朋友的卡片右上角实时显示访问延时，绿/橙/红三档
- **贡献日历** —— 在 `/site/census/`，数据来自 GitHub 公开的 contributions API

这些挂件的共同点是：都不需要额外部署服务，纯前端跑完。

## 接下来

想写的东西还堆着不少：Hexo 的渲染管线、Pug 模板里那些踩过的坑、还有几个一直没写完的小工具。

如果你也在折腾自己的站点，欢迎去[留言板](/comments/)随便说点什么，或者到[友人帐](/social/link/)交换个链接。

更多外挂标签（时间线、标签页、画廊、按钮、折叠、Mermaid 等）的用法，见另一篇《外挂标签速查》。
