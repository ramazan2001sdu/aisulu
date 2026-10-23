/* =========================================================
   Айсулу, моя любовь ❤️ — логика сайта
   Чистый JavaScript, без библиотек и без сервера.
   ========================================================= */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ---------- Настройки (при желании можно менять) ---------- */
  var MUSIC_SRC = 'music/our-song.mp3';   // файл с вашей песней
  var MIN_GALLERY_SLOTS = 5;              // фото 1–5 показываются всегда (с заглушкой), 6–10 — только если файл есть
  var HINT_MS = 2600;                     // сколько секунд показывать подсказку
  var GRID = 3;                           // пазл 3×3
  var PIECES = GRID * GRID;

  /* ---------- Вспомогательные функции ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id) { return document.getElementById(id); }

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  var els = {
    intro: byId('intro'), openBtn: byId('openBtn'), main: byId('main'),
    musicBtn: byId('musicBtn'), musicLabel: byId('musicLabel'),
    toTop: byId('toTop'), toast: byId('toast'), progressBar: byId('progressBar'),
    ambient: byId('ambient'), heartsLayer: byId('heartsLayer'),
    secretCard: byId('secretCard'), secretBtn: byId('secretBtn'),
    openPuzzleBtn: byId('openPuzzleBtn'), puzzleSection: byId('puzzleSection'),
    stage: byId('puzzleStage'), board: byId('board'), hintLayer: byId('hintLayer'),
    boardMsg: byId('boardMsg'), boardMsgText: byId('boardMsgText'), retryBtn: byId('retryBtn'),
    winOverlay: byId('winOverlay'), winPanel: byId('winPanel'),
    movesCount: byId('movesCount'), restartBtn: byId('restartBtn'), hintBtn: byId('hintBtn'),
    peekBtn: byId('peekBtn'), pickBtn: byId('pickBtn'), photoInput: byId('photoInput'),
    hugBtn: byId('hugBtn'), hugText: byId('hugText'), lastBtn: byId('lastBtn'),
    finale: byId('finale'), backTopBtn: byId('backTopBtn'),
    lightbox: byId('lightbox'), lbClose: byId('lbClose'), lbPrev: byId('lbPrev'), lbNext: byId('lbNext'),
    lbStage: byId('lbStage'), lbImg: byId('lbImg'), lbPh: byId('lbPh'), lbCaption: byId('lbCaption'), lbCount: byId('lbCount')
  };

  /* ---------- Уведомление ---------- */
  var toastTimer = null;
  function showToast(message, ms) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, ms || 5000);
  }

  /* ---------- Плавная прокрутка ---------- */
  function scrollBehavior() { return reduced() ? 'auto' : 'smooth'; }
  function scrollToEl(target) {
    if (!target) return;
    try { target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }); }
    catch (e) { target.scrollIntoView(); }
  }
  function scrollToTop() {
    try { window.scrollTo({ top: 0, behavior: scrollBehavior() }); }
    catch (e) { window.scrollTo(0, 0); }
  }

  /* ---------- Сердечки ---------- */
  function rand(min, max) { return min + Math.random() * (max - min); }

  function burstHearts(count) {
    if (!els.heartsLayer || reduced()) return;
    var room = 70 - els.heartsLayer.childElementCount;
    var n = Math.max(0, Math.min(count || 18, room));
    var glyphs = ['♥', '♥', '❤', '♡'];
    for (var i = 0; i < n; i++) {
      var h = document.createElement('span');
      h.className = 'fly-heart';
      h.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      h.style.left = rand(2, 96).toFixed(1) + 'vw';
      h.style.fontSize = rand(16, 38).toFixed(0) + 'px';
      h.style.setProperty('--dur', rand(3.2, 5.6).toFixed(2) + 's');
      h.style.setProperty('--drift', rand(-70, 70).toFixed(0) + 'px');
      h.style.animationDelay = rand(0, 0.9).toFixed(2) + 's';
      (function (node) {
        var removed = false;
        function remove() { if (removed) return; removed = true; if (node.parentNode) node.parentNode.removeChild(node); }
        node.addEventListener('animationend', remove, { once: true });
        setTimeout(remove, 8000);
      })(h);
      els.heartsLayer.appendChild(h);
    }
  }

  function buildAmbient() {
    if (!els.ambient || reduced()) return;
    var small = window.innerWidth < 600;
    var hearts = small ? 7 : 13;
    var dots = small ? 12 : 22;
    var frag = document.createDocumentFragment();
    var i, s;
    for (i = 0; i < hearts; i++) {
      s = document.createElement('span');
      s.className = 'amb-heart';
      s.textContent = '♥';
      s.style.left = rand(0, 98).toFixed(1) + '%';
      s.style.fontSize = rand(12, 28).toFixed(0) + 'px';
      s.style.animationDuration = rand(16, 30).toFixed(1) + 's';
      s.style.animationDelay = (-rand(0, 28)).toFixed(1) + 's';
      s.style.setProperty('--sway', rand(-50, 50).toFixed(0) + 'px');
      frag.appendChild(s);
    }
    for (i = 0; i < dots; i++) {
      s = document.createElement('span');
      s.className = 'amb-dot';
      var size = rand(3, 7);
      s.style.width = s.style.height = size.toFixed(1) + 'px';
      s.style.left = rand(0, 99).toFixed(1) + '%';
      s.style.top = rand(0, 99).toFixed(1) + '%';
      s.style.animationDuration = rand(4, 9).toFixed(1) + 's';
      s.style.animationDelay = (-rand(0, 9)).toFixed(1) + 's';
      frag.appendChild(s);
    }
    els.ambient.appendChild(frag);
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  function setupReveal() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduced()) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Индикатор прокрутки и кнопка «наверх» ---------- */
  var scrollTicking = false;
  function updateScroll() {
    scrollTicking = false;
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, (window.pageYOffset || doc.scrollTop) / max));
    if (els.progressBar) els.progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (els.toTop) els.toTop.classList.toggle('show', (window.pageYOffset || doc.scrollTop) > 700 && !els.main.hidden);
  }
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScroll);
  }

  /* ---------- Загрузка фотографий и запасные варианты ---------- */
  function watchImage(img, box, callback) {
    var done = false;
    function ok() {
      if (done) return; done = true;
      box.classList.remove('is-missing'); box.classList.add('is-loaded');
      if (callback) callback(true);
    }
    function fail() {
      if (done) return; done = true;
      box.classList.add('is-missing');
      if (callback) callback(false);
    }
    img.addEventListener('load', function () { if (img.naturalWidth > 0) ok(); else fail(); }, { once: true });
    img.addEventListener('error', fail, { once: true });
    if (img.complete) { if (img.naturalWidth > 0) ok(); else fail(); }
  }

  function setupPhotos() {
    $$('.js-photo').forEach(function (box) {
      var img = $('img', box);
      if (!img) return;
      watchImage(img, box, function (ok) {
        if (!ok && box.classList.contains('photo-card')) {
          var slot = Number(box.getAttribute('data-slot')) || 0;
          if (slot > MIN_GALLERY_SLOTS) box.hidden = true;   // лишние пустые карточки скрываем
        }
      });
    });
  }

  /* ---------- Просмотр фотографий на весь экран ---------- */
  var lb = { open: false, items: [], index: 0, lastFocus: null, startX: null, startY: null };

  function collectLightboxItems() {
    return $$('.photo-card').filter(function (c) { return !c.hidden; }).map(function (card) {
      var cap = $('figcaption', card);
      return { card: card, img: $('img', card), caption: cap ? cap.textContent : '' };
    });
  }

  function renderLightbox() {
    var it = lb.items[lb.index];
    if (!it || !els.lbImg) return;
    var missing = it.card.classList.contains('is-missing') || !it.img;
    els.lbCount.textContent = (lb.index + 1) + ' / ' + lb.items.length;
    els.lbCaption.textContent = it.caption.trim();
    if (missing) {
      els.lbImg.hidden = true;
      els.lbPh.hidden = false;
    } else {
      els.lbPh.hidden = true;
      els.lbImg.hidden = false;
      els.lbImg.alt = it.img.alt || '';
      els.lbImg.src = it.img.currentSrc || it.img.src;
    }
    var single = lb.items.length < 2;
    els.lbPrev.hidden = single;
    els.lbNext.hidden = single;
    els.lbStage.classList.remove('swap');
    void els.lbStage.offsetWidth;
    els.lbStage.classList.add('swap');
    // подгружаем соседние фото заранее
    [-1, 1].forEach(function (d) {
      var n = lb.items[(lb.index + d + lb.items.length) % lb.items.length];
      if (n && n.img && !n.card.classList.contains('is-missing')) { var pre = new Image(); pre.src = n.img.currentSrc || n.img.src; }
    });
  }

  function openLightbox(card) {
    if (lb.open || !els.lightbox) return;
    lb.items = collectLightboxItems();
    var idx = 0;
    for (var i = 0; i < lb.items.length; i++) { if (lb.items[i].card === card) { idx = i; break; } }
    lb.index = idx;
    lb.lastFocus = document.activeElement;
    lb.open = true;
    els.lightbox.hidden = false;
    document.body.classList.add('lb-open');
    renderLightbox();
    els.lbClose.focus();
  }

  function closeLightbox() {
    if (!lb.open) return;
    lb.open = false;
    els.lightbox.hidden = true;
    document.body.classList.remove('lb-open');
    els.lbImg.removeAttribute('src');
    if (lb.lastFocus && typeof lb.lastFocus.focus === 'function') lb.lastFocus.focus();
  }

  function stepLightbox(d) {
    if (!lb.open || lb.items.length < 2) return;
    lb.index = (lb.index + d + lb.items.length) % lb.items.length;
    renderLightbox();
  }

  function setupLightbox() {
    if (!els.lightbox) return;
    $$('.photo-card').forEach(function (card) {
      var btn = $('.photo-btn', card);
      if (btn) btn.addEventListener('click', function () { openLightbox(card); });
    });
    els.lbClose.addEventListener('click', closeLightbox);
    els.lbPrev.addEventListener('click', function () { stepLightbox(-1); });
    els.lbNext.addEventListener('click', function () { stepLightbox(1); });
    els.lightbox.addEventListener('click', function (e) {
      if (e.target === els.lightbox) closeLightbox();
    });

    // свайп пальцем
    els.lbStage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      lb.startX = e.clientX; lb.startY = e.clientY;
    });
    els.lbStage.addEventListener('pointerup', function (e) {
      if (lb.startX === null) return;
      var dx = e.clientX - lb.startX, dy = e.clientY - lb.startY;
      lb.startX = lb.startY = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) stepLightbox(dx < 0 ? 1 : -1);
    });
    els.lbStage.addEventListener('pointercancel', function () { lb.startX = lb.startY = null; });

    document.addEventListener('keydown', function (e) {
      if (!lb.open) return;
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeLightbox(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
      else if (e.key === 'Tab') {   // фокус не уходит за пределы окна просмотра
        var f = [els.lbClose, els.lbPrev, els.lbNext].filter(function (b) { return !b.hidden; });
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey) { if (i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } }
        else if (i === f.length - 1 || i === -1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------- Секретное послание ---------- */
  function setupSecret() {
    if (!els.secretBtn || !els.secretCard) return;
    els.secretBtn.addEventListener('click', function () {
      var open = !els.secretCard.classList.contains('open');
      els.secretCard.classList.toggle('open', open);
      els.secretBtn.setAttribute('aria-expanded', String(open));
      els.secretBtn.textContent = open ? 'Закрыть секрет' : 'Открыть секрет';
      if (open) burstHearts(8);
    });
  }

  /* ---------- Музыка ---------- */
  var music = { audio: null, playing: false, busy: false, lastFailAt: 0 };

  function setMusicUI() {
    if (!els.musicBtn) return;
    els.musicBtn.classList.toggle('is-playing', music.playing);
    els.musicBtn.setAttribute('aria-pressed', String(music.playing));
    els.musicLabel.textContent = music.playing ? 'Играет наша музыка ♫ · выключить' : 'Включить нашу музыку ♫';
  }

  function musicFail() {
    var now = Date.now();
    music.playing = false;
    music.busy = false;
    music.audio = null;           // при следующем нажатии попробуем заново
    setMusicUI();
    if (now - music.lastFailAt < 1200) return;
    music.lastFailAt = now;
    showToast('Музыка пока не найдена. Положи файл в music/our-song.mp3 — сайт работает и без неё ♥', 6000);
  }

  function toggleMusic() {
    if (music.busy) return;
    if (music.playing && music.audio) {
      music.audio.pause();
      music.playing = false;
      setMusicUI();
      return;
    }
    music.busy = true;
    if (!music.audio) {
      var a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = 0.75;
      a.addEventListener('error', function () { if (music.audio === a) musicFail(); });
      a.src = MUSIC_SRC;
      music.audio = a;
    }
    var current = music.audio;
    var p;
    try { p = current.play(); } catch (e) { musicFail(); return; }
    if (p && typeof p.then === 'function') {
      p.then(function () {
        if (music.audio !== current) return;
        music.playing = true; music.busy = false; setMusicUI();
      }).catch(function (err) {
        if (music.audio !== current) return;       // ошибку уже обработал обработчик 'error'
        if (err && err.name === 'NotAllowedError') {
          music.playing = false; music.busy = false; setMusicUI();
          showToast('Браузер не дал включить музыку. Нажми на кнопку ещё раз.', 4500);
        } else { musicFail(); }
      });
    } else {
      music.playing = true; music.busy = false; setMusicUI();
    }
  }

  /* ---------- Пазл ---------- */
  var puzzle = {
    state: 'idle',          // idle | loading | error | playing | won
    order: [],              // order[слот] = номер части, которая сейчас в этом слоте
    moves: 0,
    selected: null,
    hintActive: false,
    hintTimer: null,
    winTimers: [],
    objectUrl: null,
    imgUrl: '',
    lastShuffle: '',
    loadToken: 0,
    started: false,
    drag: null
  };
  var slots = [];

  function pieceBgPosition(piece) {
    // при background-size 300% позиция 0% / 50% / 100% точно попадает на 1-ю / 2-ю / 3-ю часть — без ошибок округления
    return (piece % GRID) * (100 / (GRID - 1)) + '% ' + Math.floor(piece / GRID) * (100 / (GRID - 1)) + '%';
  }
  function cssUrl(u) { return 'url("' + String(u).replace(/"/g, '%22') + '")'; }

  function buildBoard() {
    if (!els.board) return;
    for (var i = 0; i < PIECES; i++) {
      var s = document.createElement('div');
      s.className = 'slot';
      s.setAttribute('role', 'button');
      s.setAttribute('tabindex', '0');
      s.dataset.index = String(i);
      els.board.appendChild(s);
      slots.push(s);
    }
    els.board.addEventListener('pointerdown', onPointerDown);
    els.board.addEventListener('keydown', onSlotKeydown);
    els.board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function setPuzzleControls() {
    var playing = puzzle.state === 'playing';
    var drag = !!(puzzle.drag && puzzle.drag.moved);
    els.restartBtn.disabled = !(playing || puzzle.state === 'won');
    els.hintBtn.disabled = !playing || puzzle.hintActive || drag;
    els.hintBtn.textContent = puzzle.hintActive ? 'Смотри внимательно… 💗' : 'Показать подсказку';
    els.hintBtn.hidden = puzzle.state === 'won';
    els.peekBtn.hidden = puzzle.state !== 'won';
    els.pickBtn.disabled = puzzle.state === 'loading';
    slots.forEach(function (s) {
      s.setAttribute('tabindex', playing ? '0' : '-1');
      if (playing) s.removeAttribute('aria-disabled'); else s.setAttribute('aria-disabled', 'true');
    });
  }

  function renderBoard() {
    slots.forEach(function (s, i) {
      var piece = puzzle.order[i];
      if (piece === undefined) return;
      s.style.backgroundPosition = pieceBgPosition(piece);
      s.dataset.piece = String(piece);
      var sel = puzzle.selected === i;
      s.classList.toggle('is-selected', sel);
      s.setAttribute('aria-pressed', String(sel));
      s.setAttribute('aria-label', 'Часть пазла на позиции ' + (i + 1) + ' из ' + PIECES + (sel ? ', выбрана' : ''));
    });
    els.movesCount.textContent = String(puzzle.moves);
  }

  function showBoardMessage(text, withRetry) {
    els.boardMsgText.textContent = text;
    els.retryBtn.hidden = !withRetry;
    els.boardMsg.hidden = false;
  }
  function hideBoardMessage() { els.boardMsg.hidden = true; }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        if (!img.naturalWidth || !img.naturalHeight) { reject(new Error('empty')); return; }
        resolve(img);
      };
      img.onerror = function () { reject(new Error('load')); };
      img.src = src;
    });
  }

  function applyImage(src, img) {
    puzzle.imgUrl = src;
    var ratio = img.naturalWidth / img.naturalHeight;
    els.stage.style.setProperty('--ratio', ratio.toFixed(5));
    var url = cssUrl(src);
    slots.forEach(function (s) { s.style.backgroundImage = url; });
    els.hintLayer.style.backgroundImage = url;
  }

  function fixedPoints(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] === i) n++;
    return n;
  }
  function makeShuffle() {
    var arr, key, tries = 0;
    do {
      arr = [];
      for (var i = 0; i < PIECES; i++) arr.push(i);
      for (var j = PIECES - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = arr[j]; arr[j] = arr[k]; arr[k] = t;
      }
      key = arr.join(',');
      tries++;
    } while ((fixedPoints(arr) > 2 || key === puzzle.lastShuffle) && tries < 500);
    puzzle.lastShuffle = key;
    return arr;
  }

  function clearWinTimers() {
    puzzle.winTimers.forEach(function (t) { clearTimeout(t); });
    puzzle.winTimers = [];
  }

  function resetWinUI() {
    clearWinTimers();
    els.board.classList.remove('won');
    els.winOverlay.classList.remove('show', 'peek');
    els.winOverlay.hidden = true;
    els.winPanel.hidden = true;
    els.hugText.hidden = true;
    els.peekBtn.textContent = 'Посмотреть фото';
  }

  function hideHint() {
    clearTimeout(puzzle.hintTimer);
    puzzle.hintTimer = null;
    puzzle.hintActive = false;
    els.hintLayer.classList.remove('show');
    setPuzzleControls();
  }

  function cancelDrag() {
    var d = puzzle.drag;
    if (!d) return;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    d.slot.classList.remove('dragging');
    d.slot.style.transform = '';
    slots.forEach(function (s) { s.classList.remove('drop-target'); });
    puzzle.drag = null;
  }

  function newGame() {
    cancelDrag();
    hideHint();
    resetWinUI();
    hideBoardMessage();
    puzzle.order = makeShuffle();
    puzzle.moves = 0;
    puzzle.selected = null;
    puzzle.state = 'playing';
    renderBoard();
    setPuzzleControls();
  }

  function loadPuzzleImage(src) {
    var token = ++puzzle.loadToken;
    puzzle.state = 'loading';
    cancelDrag();
    hideHint();
    resetWinUI();
    showBoardMessage('Загружаю нашу фотографию…', false);
    setPuzzleControls();
    loadImage(src).then(function (img) {
      if (token !== puzzle.loadToken) return;
      applyImage(src, img);
      newGame();
    }).catch(function () {
      if (token !== puzzle.loadToken) return;
      puzzle.state = 'error';
      showBoardMessage('Не удалось загрузить фотографию для пазла. Проверь, что файл images/puzzle-photo.jpg лежит в папке images, или выбери фото с устройства — кнопка ниже.', true);
      setPuzzleControls();
    });
  }

  function startPuzzleOnce() {
    if (puzzle.started) return;
    puzzle.started = true;
    loadPuzzleImage(els.puzzleSection.getAttribute('data-src') || 'images/puzzle-photo.jpg');
  }

  /* --- ходы --- */
  function swapSlots(a, b) {
    if (puzzle.state !== 'playing' || a === b) return;
    var t = puzzle.order[a]; puzzle.order[a] = puzzle.order[b]; puzzle.order[b] = t;
    puzzle.moves++;
    puzzle.selected = null;
    renderBoard();
    [a, b].forEach(function (i) {
      var s = slots[i];
      s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
      setTimeout(function () { s.classList.remove('pop'); }, 460);
    });
    if (isSolved()) onWin();
  }

  function isSolved() {
    for (var i = 0; i < PIECES; i++) if (puzzle.order[i] !== i) return false;
    return true;
  }

  function handleSelect(index) {
    if (puzzle.state !== 'playing' || puzzle.hintActive) return;
    if (puzzle.selected === null) { puzzle.selected = index; }
    else if (puzzle.selected === index) { puzzle.selected = null; }
    else { swapSlots(puzzle.selected, index); return; }
    renderBoard();
  }

  function onSlotKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var slot = e.target.closest ? e.target.closest('.slot') : null;
    if (!slot) return;
    e.preventDefault();
    handleSelect(Number(slot.dataset.index));
  }

  /* --- перетаскивание (мышь и касания) --- */
  function slotAt(x, y, exclude) {
    for (var i = 0; i < slots.length; i++) {
      if (i === exclude) continue;
      var r = slots[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return -1;
  }

  function onPointerDown(e) {
    if (puzzle.state !== 'playing' || puzzle.hintActive || puzzle.drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var slot = e.target.closest ? e.target.closest('.slot') : null;
    if (!slot || !els.board.contains(slot)) return;
    var rect = slot.getBoundingClientRect();
    puzzle.drag = {
      slot: slot, index: Number(slot.dataset.index), pointerId: e.pointerId,
      x0: e.clientX, y0: e.clientY, rect: rect, board: els.board.getBoundingClientRect(), moved: false
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    if (e.pointerType === 'mouse') e.preventDefault();
  }

  function onPointerMove(e) {
    var d = puzzle.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 8) return;
      d.moved = true;
      d.slot.classList.add('dragging');
      puzzle.selected = null;
      renderBoard();
      setPuzzleControls();
    }
    // часть нельзя вытащить за пределы игрового поля
    var minX = d.board.left - d.rect.left, maxX = d.board.right - d.rect.right;
    var minY = d.board.top - d.rect.top, maxY = d.board.bottom - d.rect.bottom;
    dx = Math.min(maxX, Math.max(minX, dx));
    dy = Math.min(maxY, Math.max(minY, dy));
    d.slot.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(1.05)';
    var target = slotAt(e.clientX, e.clientY, d.index);
    slots.forEach(function (s, i) { s.classList.toggle('drop-target', i === target); });
  }

  function endDrag() {
    var d = puzzle.drag;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    if (!d) return null;
    d.slot.classList.remove('dragging');
    d.slot.style.transform = '';
    slots.forEach(function (s) { s.classList.remove('drop-target'); });
    puzzle.drag = null;
    return d;
  }

  function onPointerUp(e) {
    var d = puzzle.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    endDrag();
    if (!d.moved) { handleSelect(d.index); return; }       // обычное касание = выбор части
    setPuzzleControls();
    var target = slotAt(e.clientX, e.clientY, d.index);
    if (target >= 0) swapSlots(d.index, target);
  }

  function onPointerCancel(e) {
    var d = puzzle.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    endDrag();
    setPuzzleControls();
  }

  /* --- подсказка --- */
  function showHint() {
    if (puzzle.state !== 'playing' || puzzle.hintActive || puzzle.drag) return;
    puzzle.hintActive = true;
    puzzle.selected = null;
    renderBoard();
    els.hintLayer.classList.add('show');
    setPuzzleControls();
    puzzle.hintTimer = setTimeout(hideHint, HINT_MS);
  }

  /* --- победа --- */
  function onWin() {
    if (puzzle.state === 'won') return;
    puzzle.state = 'won';
    cancelDrag();
    hideHint();
    puzzle.selected = null;
    renderBoard();
    els.board.classList.add('won');
    setPuzzleControls();
    clearWinTimers();
    puzzle.winTimers.push(setTimeout(function () { burstHearts(26); }, 450));
    puzzle.winTimers.push(setTimeout(function () {
      if (puzzle.state !== 'won') return;
      els.winOverlay.hidden = false;
      window.requestAnimationFrame(function () { els.winOverlay.classList.add('show'); });
    }, 900));
    puzzle.winTimers.push(setTimeout(function () {
      if (puzzle.state !== 'won') return;
      els.winPanel.hidden = false;
      burstHearts(14);
    }, 1900));
  }

  function togglePeek() {
    if (puzzle.state !== 'won') return;
    var peeking = els.winOverlay.classList.toggle('peek');
    els.peekBtn.textContent = peeking ? 'Показать сообщение' : 'Посмотреть фото';
  }

  /* --- свои фото для пазла --- */
  function onPhotoChosen() {
    var file = els.photoInput.files && els.photoInput.files[0];
    if (!file) return;
    if (file.type && file.type.indexOf('image/') !== 0) {
      showToast('Выбери файл-фотографию (JPG, PNG или WebP).', 4500);
      els.photoInput.value = '';
      return;
    }
    var url = URL.createObjectURL(file);        // фото обрабатывается только в браузере, никуда не отправляется
    var token = ++puzzle.loadToken;
    var wasState = puzzle.state;
    if (wasState !== 'error') showToast('Загружаю фото…', 2000);
    loadImage(url).then(function (img) {
      if (token !== puzzle.loadToken) { URL.revokeObjectURL(url); return; }
      var old = puzzle.objectUrl;
      puzzle.objectUrl = url;
      applyImage(url, img);
      newGame();
      if (old) URL.revokeObjectURL(old);
      showToast('Готово! Пазл теперь собирается из выбранного фото ♥', 3500);
    }).catch(function () {
      URL.revokeObjectURL(url);
      if (token === puzzle.loadToken) puzzle.loadToken--;   // прежняя игра остаётся актуальной
      showToast('Не удалось открыть это фото. Попробуй другой файл (JPG или PNG).', 5000);
    });
    els.photoInput.value = '';
  }

  function setupPuzzle() {
    if (!els.board || !els.puzzleSection) return;
    buildBoard();
    els.restartBtn.addEventListener('click', function () {
      if (puzzle.state === 'playing' || puzzle.state === 'won') newGame();
    });
    els.hintBtn.addEventListener('click', showHint);
    els.peekBtn.addEventListener('click', togglePeek);
    els.pickBtn.addEventListener('click', function () { els.photoInput.click(); });
    els.photoInput.addEventListener('change', onPhotoChosen);
    els.retryBtn.addEventListener('click', function () {
      var base = els.puzzleSection.getAttribute('data-src') || 'images/puzzle-photo.jpg';
      loadPuzzleImage(base + (base.indexOf('?') === -1 ? '?' : '&') + 'retry=' + Date.now());
    });

    els.hugBtn.addEventListener('click', function () {
      if (puzzle.state !== 'won') return;
      els.hugText.hidden = false;
      burstHearts(30);
    });

    els.lastBtn.addEventListener('click', function () {
      if (puzzle.state !== 'won') return;
      els.lastBtn.setAttribute('aria-expanded', 'true');
      if (els.finale.hidden) {
        els.finale.hidden = false;
        burstHearts(16);
        setTimeout(function () { scrollToEl(els.finale); }, 80);
      } else {
        scrollToEl(els.finale);
      }
    });

    els.openPuzzleBtn.addEventListener('click', function () {
      els.openPuzzleBtn.setAttribute('aria-expanded', 'true');
      var firstTime = els.puzzleSection.hidden;
      els.puzzleSection.hidden = false;
      startPuzzleOnce();
      setTimeout(function () { scrollToEl(els.puzzleSection); }, firstTime ? 80 : 0);
    });
  }

  /* ---------- Открытие сюрприза ---------- */
  var opened = false;
  function openSurprise() {
    if (opened) return;
    opened = true;
    els.openBtn.disabled = true;
    els.main.hidden = false;
    els.musicBtn.hidden = false;
    document.body.classList.remove('is-locked');
    window.scrollTo(0, 0);
    els.intro.classList.add('is-leaving');
    burstHearts(12);
    setTimeout(function () {
      els.intro.hidden = true;
      updateScroll();
    }, reduced() ? 0 : 950);
    updateScroll();
  }

  /* ---------- Общие кнопки ---------- */
  function setupButtons() {
    $$('[data-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        scrollToEl($(btn.getAttribute('data-scroll')));
      });
    });
    if (els.backTopBtn) els.backTopBtn.addEventListener('click', scrollToTop);
    if (els.toTop) els.toTop.addEventListener('click', scrollToTop);
    if (els.musicBtn) els.musicBtn.addEventListener('click', toggleMusic);
    if (els.openBtn) els.openBtn.addEventListener('click', openSurprise);
  }

  /* ---------- Запуск ---------- */
  function init() {
    setupPhotos();
    setupReveal();
    setupLightbox();
    setupSecret();
    setupPuzzle();
    setupButtons();
    buildAmbient();
    setMusicUI();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
