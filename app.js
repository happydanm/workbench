/* 冯铭谦的工作台 —— 纯前端，数据存本机 localStorage */
(function () {
  'use strict';

  var STORE_TODO = 'fmq.workbench.todos.v2';
  var STORE_NOTE = 'fmq.workbench.note.v2';
  var RING_C = 2 * Math.PI * 52;
  var DEFAULT_TODOS = [
    { text: '整理本周课堂笔记', done: true },
    { text: '完成 WORKBUDDY 作业截图', done: false },
    { text: '交计算机组成原理作业', done: false },
    { text: '晚上跑步 3 公里', done: false }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function greeting(h) {
    if (h < 5) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    if (h < 23) return '晚上好';
    return '夜深了';
  }

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  }

  function tick() {
    var d = new Date();
    $('date').textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEK[d.getDay()];
    $('week').textContent = '第 ' + isoWeek(d) + ' 周';
    $('greet').textContent = greeting(d.getHours());
    $('schedDay').textContent = WEEK[d.getDay()];
  }

  /* ---------- 待办 ---------- */

  var todos = loadTodos();

  function loadTodos() {
    try {
      var raw = localStorage.getItem(STORE_TODO);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) return list;
      }
    } catch (e) { /* 坏数据就当没有 */ }
    return DEFAULT_TODOS.slice();
  }

  function saveTodos() {
    try { localStorage.setItem(STORE_TODO, JSON.stringify(todos)); } catch (e) {}
  }

  function renderTodos() {
    var ul = $('taskList');
    ul.innerHTML = '';

    todos.forEach(function (t, i) {
      var li = document.createElement('li');
      li.className = 'task' + (t.done ? ' done' : '');

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = !!t.done;
      box.id = 'task-' + i;
      box.addEventListener('change', function () {
        todos[i].done = box.checked;
        saveTodos();
        renderTodos();
      });

      var tick = document.createElement('span');
      tick.className = 'tick';
      tick.setAttribute('aria-hidden', 'true');

      var label = document.createElement('label');
      label.htmlFor = 'task-' + i;
      label.textContent = t.text;

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.textContent = '×';
      del.setAttribute('aria-label', '删除 ' + t.text);
      del.addEventListener('click', function () {
        todos.splice(i, 1);
        saveTodos();
        renderTodos();
      });

      li.appendChild(box);
      li.appendChild(tick);
      li.appendChild(label);
      li.appendChild(del);
      ul.appendChild(li);
    });

    var done = todos.filter(function (t) { return t.done; }).length;
    var left = todos.length - done;
    var next = todos.filter(function (t) { return !t.done; })[0];

    $('taskCount').textContent = left;
    $('doneCount').textContent = done;
    $('allCount').textContent = todos.length;
    $('nextTask').textContent = next ? next.text : '今天的事都清完了';
    $('heroMeta').textContent = left === 0
      ? '全部完成 · 去歇一会儿'
      : '还有 ' + left + ' 件事 · 已完成 ' + done + ' 件';

    var ratio = todos.length ? done / todos.length : 0;
    $('ringBar').style.strokeDashoffset = String(RING_C * (1 - ratio));
  }

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('addInput');
    var text = input.value.trim();
    if (!text) return;
    todos.push({ text: text, done: false });
    input.value = '';
    saveTodos();
    renderTodos();
    toast('已加进今天的待办');
  });

  $('clearDone').addEventListener('click', function () {
    var before = todos.length;
    todos = todos.filter(function (t) { return !t.done; });
    saveTodos();
    renderTodos();
    toast(before === todos.length ? '还没有已完成的事' : '已清空完成的事');
  });

  /* ---------- 专注 ---------- */

  var TOTAL = 25 * 60;
  var remain = TOTAL;
  var timerId = null;
  var running = false;

  function paintTimer() {
    $('timerNum').textContent = pad(Math.floor(remain / 60)) + ':' + pad(remain % 60);
  }

  function stopTimer() {
    running = false;
    clearInterval(timerId);
    timerId = null;
    $('startBtn').textContent = '开始';
    $('startBtn').classList.remove('running');
  }

  $('startBtn').addEventListener('click', function () {
    if (running) {
      stopTimer();
      $('startBtn').textContent = '继续';
      return;
    }
    if (remain <= 0) remain = TOTAL;
    running = true;
    $('startBtn').textContent = '暂停';
    $('startBtn').classList.add('running');

    timerId = setInterval(function () {
      remain -= 1;
      paintTimer();
      if (remain <= 0) {
        stopTimer();
        remain = 0;
        $('startBtn').textContent = '再来一个';
        toast('时间到，起来走两步');
        if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
      }
    }, 1000);
  });

  $('resetBtn').addEventListener('click', function () {
    stopTimer();
    remain = TOTAL;
    paintTimer();
    $('startBtn').textContent = '开始';
  });

  /* ---------- 速记 ---------- */

  var noteBox = $('noteBox');
  var noteTimer = null;

  try { noteBox.value = localStorage.getItem(STORE_NOTE) || ''; } catch (e) {}

  noteBox.addEventListener('input', function () {
    $('noteState').textContent = '保存中…';
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      try { localStorage.setItem(STORE_NOTE, noteBox.value); } catch (e) {}
      $('noteState').textContent = '已保存';
    }, 400);
  });

  /* ---------- 底部模块 ---------- */

  Array.prototype.forEach.call(document.querySelectorAll('.dock-item'), function (item) {
    item.addEventListener('click', function () {
      var sheetId = item.getAttribute('data-sheet');
      if (sheetId) { openSheet(sheetId); return; }

      var el = $(item.getAttribute('data-target'));
      if (el) {
        var y = el.getBoundingClientRect().top + window.pageYOffset - 12;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  /* ---------- 抽屉 ---------- */

  var sheets = { ledger: $('sheet-ledger'), links: $('sheet-links') };
  var backdrop = $('backdrop');
  var openId = null;
  var closeTimer = null;

  function openSheet(id) {
    var el = sheets[id];
    if (!el) return;
    clearTimeout(closeTimer);
    if (openId && openId !== id) closeSheet();

    backdrop.hidden = false;
    el.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () {
      backdrop.classList.add('open');
      el.classList.add('open');
    });
    openId = id;
  }

  function closeSheet() {
    if (!openId) return;
    var el = sheets[openId];
    openId = null;
    el.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('no-scroll');
    closeTimer = setTimeout(function () {
      el.hidden = true;
      if (!openId) backdrop.hidden = true;
    }, 250);
  }

  backdrop.addEventListener('click', closeSheet);

  Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
    btn.addEventListener('click', closeSheet);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });

  /* ---------- 记账 ---------- */

  var STORE_LEDGER = 'fmq.ledger.v1';
  var ledgerType = 'out';
  var ledger = loadLedger();

  function loadLedger() {
    try {
      var raw = localStorage.getItem(STORE_LEDGER);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      }
    } catch (e) {}
    return [];
  }

  function saveLedger() {
    try { localStorage.setItem(STORE_LEDGER, JSON.stringify(ledger)); } catch (e) {}
  }

  function cents(value) { return Math.round(value * 100); }

  function yuan(c) { return '¥' + (c / 100).toFixed(2); }

  function isToday(ts) {
    var a = new Date(ts);
    var b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function timeLabel(ts) {
    var d = new Date(ts);
    if (isToday(ts)) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function renderLedger() {
    var out = 0;
    var income = 0;

    ledger.forEach(function (e) {
      if (!isToday(e.t)) return;
      if (e.type === 'in') income += e.cents;
      else out += e.cents;
    });

    $('outSum').textContent = yuan(out);
    $('inSum').textContent = yuan(income);

    var ul = $('ledgerList');
    ul.innerHTML = '';

    var sorted = ledger.slice().sort(function (a, b) { return b.t - a.t; });

    if (!sorted.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = '今天还没记，先记一笔';
      ul.appendChild(empty);
      return;
    }

    sorted.forEach(function (e) {
      var li = document.createElement('li');

      var note = document.createElement('span');
      note.className = 'lg-note';
      note.textContent = e.note || (e.type === 'in' ? '收入' : '支出');

      var time = document.createElement('span');
      time.className = 'lg-time';
      time.textContent = timeLabel(e.t);

      var amt = document.createElement('span');
      amt.className = 'lg-amt' + (e.type === 'in' ? ' in' : '');
      amt.textContent = (e.type === 'in' ? '+' : '-') + (e.cents / 100).toFixed(2);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.textContent = '×';
      del.setAttribute('aria-label', '删除这笔');
      del.addEventListener('click', function () {
        ledger = ledger.filter(function (x) { return x !== e; });
        saveLedger();
        renderLedger();
        toast('已删掉这笔');
      });

      li.appendChild(note);
      li.appendChild(time);
      li.appendChild(amt);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (btn) {
    btn.addEventListener('click', function () {
      ledgerType = btn.getAttribute('data-type');
      Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) {
        b.classList.toggle('is-on', b === btn);
      });
    });
  });

  $('ledgerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var amountInput = $('ledgerAmount');
    var value = parseFloat(amountInput.value);
    if (!isFinite(value) || value <= 0) {
      toast('先写个大于 0 的金额');
      amountInput.focus();
      return;
    }
    var c = cents(value);
    if (c <= 0) { toast('金额太小了'); return; }

    ledger.push({
      t: Date.now(),
      type: ledgerType,
      cents: c,
      note: $('ledgerNote').value.trim()
    });
    amountInput.value = '';
    $('ledgerNote').value = '';
    saveLedger();
    renderLedger();
    toast(ledgerType === 'in' ? '记了一笔收入' : '记了一笔支出');
  });

  /* ---------- 资料 ---------- */

  var STORE_LINKS = 'fmq.links.v1';
  var DEFAULT_LINKS = [
    { name: 'DeepSeek', url: 'https://www.deepseek.com' },
    { name: 'QQ 邮箱', url: 'https://mail.qq.com' }
  ];
  var links = loadLinks();

  function loadLinks() {
    try {
      var raw = localStorage.getItem(STORE_LINKS);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list.length) return list;
      }
    } catch (e) {}
    return DEFAULT_LINKS.slice();
  }

  function saveLinks() {
    try { localStorage.setItem(STORE_LINKS, JSON.stringify(links)); } catch (e) {}
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }

  function renderLinks() {
    var ul = $('linkList');
    ul.innerHTML = '';

    if (!links.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = '还没有资料，加个常用链接吧';
      ul.appendChild(empty);
      return;
    }

    links.forEach(function (item, i) {
      var li = document.createElement('li');

      var a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      var name = document.createElement('span');
      name.className = 'lk-name';
      name.textContent = item.name;

      var host = document.createElement('span');
      host.className = 'lk-host';
      host.textContent = hostOf(item.url);

      a.appendChild(name);
      a.appendChild(host);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.textContent = '×';
      del.setAttribute('aria-label', '删除 ' + item.name);
      del.addEventListener('click', function () {
        links.splice(i, 1);
        saveLinks();
        renderLinks();
        toast('已移除');
      });

      li.appendChild(a);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $('linksForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var nameInput = $('linkName');
    var urlInput = $('linkUrl');
    var name = nameInput.value.trim();
    var url = urlInput.value.trim();

    if (!name) { toast('给它起个名字'); nameInput.focus(); return; }
    if (!url) { toast('还差个链接'); urlInput.focus(); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try { new URL(url); } catch (err) { toast('这个链接看着不太对'); urlInput.focus(); return; }

    links.push({ name: name, url: url });
    nameInput.value = '';
    urlInput.value = '';
    saveLinks();
    renderLinks();
    toast('已收进资料');
  });

  /* ---------- 提示 ---------- */

  var toastEl = $('toast');
  var toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  /* ---------- 启动 ---------- */

  tick();
  setInterval(tick, 15000);
  renderTodos();
  paintTimer();
  renderLedger();
  renderLinks();

  window.workbench = { open: openSheet, close: closeSheet };

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
