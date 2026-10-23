/* ============================================================================
 * tools/collect-bold-chars.cjs —— 收集全站「真实粗体」用字
 * ----------------------------------------------------------------------------
 * 用途：700 档（LXGW WenKai Lite Medium）是自托管子集，只包含站点实际用到的
 *       粗体字。新增文章 / 新增粗体文案后，如果出现「个别字看起来跟旁边不一样」
 *       （落到系统字体），就是子集里缺字 —— 用本脚本重跑一遍收集，再 subset。
 *
 * 判定方式：遍历 public 下每个页面，用 getComputedStyle 取每个文本节点父元素的
 *       font-family 与 font-weight，只保留「家族首项是 LXGW 且 weight >= 600」
 *       的字符。代码块（--code-font 打头）天然被排除。
 *
 * 懒渲染 UI 也要覆盖：美化设置面板是点开时才 WinBox 创建的，页面加载时 DOM 里
 *       根本没有这些节点 —— 只扫首屏会漏掉面板里的粗体字（v1.0.15 就是这么漏的）。
 *       所以每页采集前会先执行 PRE_HOOK（默认调用 createWinbox()），再用 --pre 覆盖。
 *
 * 用法：
 *   node tools/collect-bold-chars.cjs                 # 用 public/ 目录，输出到 stdout
 *   node tools/collect-bold-chars.cjs --json out.json # 同时写一份 JSON
 *   node tools/collect-bold-chars.cjs --limit 5       # 只跑前 5 页，调试用
 *   node tools/collect-bold-chars.cjs --no-pre        # 不打开懒渲染面板
 *   node tools/collect-bold-chars.cjs --pre 'openX()' # 自定义采集前脚本
 *
 * 前置：public/ 必须是最新构建（npx hexo clean && npx hexo generate）。
 * 依赖：本机 Chrome / Edge；Node 22+（用内置 WebSocket）。
 * ========================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const argv = process.argv.slice(2);
const argOf = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const limit = Number(argOf('--limit', '0')) || 0;
const jsonOut = argOf('--json', '');
const noPre = argv.includes('--no-pre');
const PRE_HOOK = noPre ? '' : argOf('--pre', `(function(){
  try {
    if (typeof createWinbox === 'function' && !document.getElementById('meihuaBox')) createWinbox();
    return 'ok';
  } catch (e) { return 'err: ' + e.message; }
})()`);

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const chromePath = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!chromePath) {
  console.error('找不到 Chrome / Edge，可执行文件候选：\n  ' + CHROME_CANDIDATES.join('\n  '));
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

function startStaticServer(dir) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(dir, rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function listPages(dir) {
  const out = [];
  (function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) { if (name !== 'node_modules') walk(p); }
      else if (name.endsWith('.html')) out.push(p);
    }
  })(dir);
  return out.sort();
}

// 页面内执行：返回本页「LXGW + weight>=600」的字符
const COLLECT_EXPR = `(() => {
  const set = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const first = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
    if (weight >= 600 && first === 'LXGW') {
      for (const ch of node.nodeValue) set.add(ch);
    }
  }
  return JSON.stringify([...set]);
})()`;

function rpc(ws, method, params = {}, sessionId) {
  const id = rpc._id = (rpc._id || 0) + 1;
  return new Promise((resolve, reject) => {
    const onMessage = ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMessage);
      msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = await startStaticServer(publicDir);
  const origin = 'http://127.0.0.1:' + server.address().port;
  const debugPort = 9333 + (process.pid % 500);
  const profile = path.join(require('node:os').tmpdir(), 'collect-bold-' + process.pid);

  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--mute-audio',
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore' });

  let version;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + debugPort + '/json/version');
      if (res.ok) { version = await res.json(); break; }
    } catch { /* 还没起来 */ }
    await sleep(200);
  }
  if (!version) { chrome.kill(); server.close(); throw new Error('Chrome 调试端口未就绪'); }

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let pages = listPages(publicDir);
  if (limit) pages = pages.slice(0, limit);

  const chars = new Set();
  const perPage = {};
  let done = 0;

  for (const file of pages) {
    const url = origin + '/' + path.relative(publicDir, file).split(path.sep).join('/');
    let sessionId;
    try {
      const { targetId } = await rpc(ws, 'Target.createTarget', { url });
      ({ sessionId } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true }));
      await rpc(ws, 'Runtime.enable', {}, sessionId);

      // 等文档就绪（页面里的 JS 会把 --global-font 写进 :root，必须等它跑完）。
      // 注意：新 target 先停在 about:blank，只判 readyState 会在导航开始前就误判为完成，
      // 必须同时确认 location 已经落在目标页面上。
      const expectPath = path.relative(publicDir, file).split(path.sep).join('/');
      let ready = false;
      for (let i = 0; i < 75; i++) {
        const { result } = await rpc(ws, 'Runtime.evaluate', {
          expression: 'location.pathname + "|" + document.readyState', returnByValue: true,
        }, sessionId);
        const value = String(result.value || '');
        if (value.includes(expectPath) && value.endsWith('|complete')) { ready = true; break; }
        await sleep(200);
      }
      if (!ready) throw new Error('页面加载超时（' + expectPath + '）');

      // 采集前先把懒渲染的面板拉起来（美化设置是 WinBox，点开才有 DOM）
      if (PRE_HOOK) {
        const pre = await rpc(ws, 'Runtime.evaluate', { expression: PRE_HOOK, returnByValue: true }, sessionId);
        if (pre.exceptionDetails) console.error('  ! pre hook 报错: ' + expectPath);
        await sleep(1400);
      }

      const { result, exceptionDetails } = await rpc(ws, 'Runtime.evaluate', { expression: COLLECT_EXPR, returnByValue: true }, sessionId);
      if (exceptionDetails) throw new Error('页面内脚本报错: ' + (exceptionDetails.text || ''));
      const list = JSON.parse(result.value);
      perPage[path.relative(root, file).split(path.sep).join('/')] = list.length;
      list.forEach(ch => chars.add(ch));
    } catch (err) {
      console.error('  ! ' + url + ' -> ' + err.message);
    } finally {
      if (sessionId) await rpc(ws, 'Target.closeTarget', { targetId: sessionId }).catch(() => {});
    }
    done++;
    if (done % 10 === 0) process.stderr.write(`  ... ${done}/${pages.length} 页，累计 ${chars.size} 字\n`);
  }

  try { ws.close(); } catch { /* ignore */ }
  chrome.kill();
  server.close();

  const sorted = [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  const payload = { pages: pages.length, chars: sorted.length, perPage, list: sorted };
  if (jsonOut) {
    fs.writeFileSync(path.resolve(root, jsonOut), JSON.stringify(payload, null, 2), 'utf8');
  }
  console.log(JSON.stringify({ pages: pages.length, chars: sorted.length, sample: sorted.slice(0, 40).join('') }));
  console.log(sorted.join(''));
})().catch(err => { console.error(err); process.exit(1); });
