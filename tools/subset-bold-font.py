#!/usr/bin/env python3
"""tools/subset-bold-font.py —— 用收集到的粗体用字重建 700 档子集

前置：
  1. npx hexo clean && npx hexo generate            # public 必须是最新构建
  2. node tools/collect-bold-chars.cjs --json .bold-chars.json
  3. 源字体 LXGW WenKai Lite Medium（usWeightClass=500）放在 tmpfont/ 下
     https://github.com/lxgw/LxgwWenKai-Lite/releases

用法：
  python tools/subset-bold-font.py
  python tools/subset-bold-font.py --dry-run       # 只报数字，不写文件

做三件事：
  - 新收集到的粗体字 ∪ 旧子集的全部码位（保证不回退）∪ ASCII / 常用标点安全集
  - 用 fontTools 从源字体切 woff2
  - 打印体积与码位差集（缺的码位多半是 emoji，文楷本来就没有）
"""
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_FONT = os.path.join(ROOT, 'tmpfont', 'LXGWWenKaiLite-Medium.ttf')
OUT_FONT = os.path.join(ROOT, 'source', 'assets', 'fonts', 'lxgw-wenkai-subset-700.woff2')
COLLECTED = os.path.join(ROOT, '.bold-chars.json')

# 与正文一致的基础安全集：数字、大小写字母、常用中英标点。
# 粗体常出现在短标签 / 数字里，这些即使本次没收集到也不该缺。
SAFETY = (
    ''.join(chr(c) for c in range(0x20, 0x7F))
    + '，。、；：？！“”‘’（）《》〈〉【】「」『』—…·～￥％＃＠＆＊＋－／＝'
    + '×÷≈≠≤≥→←↑↓↔√∞°′″℃'
)

# 运行时才生成的文案：收集脚本扫到的是「采集那一刻」的 DOM，
# 相对时间这类文案会随时间变化（1 分钟内是「刚刚」，之后变成「N 分钟前」），
# 不能指望某次采集正好命中。这里把它们固定进安全集。
DYNAMIC = '刚刚秒钟分时天昨今日年月前后来回'

dry = '--dry-run' in sys.argv

if not os.path.exists(SRC_FONT):
    sys.exit(f'缺源字体：{SRC_FONT}\n从 https://github.com/lxgw/LxgwWenKai-Lite/releases 下载 LXGWWenKaiLite-Medium.ttf 放到 tmpfont/')
if not os.path.exists(COLLECTED):
    sys.exit(f'缺收集结果：{COLLECTED}\n先跑 node tools/collect-bold-chars.cjs --json .bold-chars.json')

collected = {ord(ch) for ch in json.load(open(COLLECTED, encoding='utf-8'))['list']}
old_cmap = set(TTFont(OUT_FONT).getBestCmap()) if os.path.exists(OUT_FONT) else set()
old_size = os.path.getsize(OUT_FONT) if os.path.exists(OUT_FONT) else 0

# 统一用码位（int）做集合运算：cmap 的键是 int，收集结果与安全集是字符
wanted = collected | old_cmap | {ord(ch) for ch in SAFETY + DYNAMIC}
src = TTFont(SRC_FONT)
src_cmap = set(src.getBestCmap())
usable = sorted(wanted & src_cmap)
missing = sorted(wanted - src_cmap)

print(f'收集到的粗体字      : {len(collected)}')
print(f'旧子集码位          : {len(old_cmap)}')
print(f'合并后需求          : {len(wanted)}')
print(f'源字体命中          : {len(usable)}')
print(f'源字体没有          : {len(missing)}  {"".join(chr(c) for c in missing)[:60]}')

if dry:
    print('（dry-run，不写文件）')
    sys.exit(0)

options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']          # 保留 ccmp / vert 等，与旧文件一致
options.name_IDs = ['*']
options.name_legacy = True
options.notdef_outline = True
options.recalc_bounds = True
options.drop_tables = []                 # 不额外丢表：旧子集里 GPOS/GSUB/vmtx 都在

font = subset.load_font(SRC_FONT, options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=usable)
subsetter.subset(font)
subset.save_font(font, OUT_FONT, options)

new_size = os.path.getsize(OUT_FONT)
new_cmap = set(TTFont(OUT_FONT).getBestCmap())
print(f'\n输出                : {os.path.relpath(OUT_FONT, ROOT)}')
print(f'体积                : {old_size} B -> {new_size} B ({new_size / max(old_size, 1) * 100:.1f}%)')
print(f'码位                : {len(old_cmap)} -> {len(new_cmap)}')
print(f'本次新增码位        : {len(new_cmap - old_cmap)}  {"".join(sorted(chr(c) for c in new_cmap - old_cmap))[:80]}')
print(f'仍缺（收集到但字体没有）: {len(collected - new_cmap)}')
