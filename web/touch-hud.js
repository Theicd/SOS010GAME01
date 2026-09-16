/* Dual sticks + fire / use(E) / ADS toggle / jump for NZ:P mobile. */
(function () {
  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  }
  if (!isTouch()) return;

  var keys = {
    forward: false,
    back: false,
    moveleft: false,
    moveright: false,
    attack: false,
    jump: false,
    use: false,
    ads: false
  };
  var LOOK_SCALE = 1.55;
  var MOVE_DEAD = 0.22;
  var STICK_R = 56;

  function canvasEl() {
    return (typeof Module !== 'undefined' && Module.canvas) || document.getElementById('canvas');
  }

  function cbuf(cmd) {
    try {
      if (typeof FTEC !== 'undefined' && typeof FTEC.cbufadd === 'function') {
        FTEC.cbufadd(cmd + '\n');
        return true;
      }
    } catch (e) {}
    return false;
  }

  function makeKey(down, key, code, keyCode) {
    var ev = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key: key,
      code: code,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return keyCode; } });
      Object.defineProperty(ev, 'which', { get: function () { return keyCode; } });
    } catch (e) {}
    return ev;
  }

  function fireKey(down, key, code, keyCode) {
    var canvas = canvasEl();
    if (canvas) {
      try { canvas.focus(); } catch (e) {}
    }
    var targets = [window, document, canvas];
    for (var i = 0; i < targets.length; i++) {
      if (targets[i]) targets[i].dispatchEvent(makeKey(down, key, code, keyCode));
    }
  }

  var keyMap = {
    forward: ['w', 'KeyW', 87],
    back: ['s', 'KeyS', 83],
    moveleft: ['a', 'KeyA', 65],
    moveright: ['d', 'KeyD', 68],
    attack: ['Control', 'ControlLeft', 17],
    jump: [' ', 'Space', 32],
    use: ['e', 'KeyE', 69]
  };

  var impulseName = {
    forward: 'forward',
    back: 'back',
    moveleft: 'moveleft',
    moveright: 'moveright',
    attack: 'attack',
    use: 'button7',
    ads: 'button8'
  };

  function setImpulse(name, down) {
    if (keys[name] === down) return;
    keys[name] = down;
    var cmd = impulseName[name];
    if (cmd && cbuf((down ? '+' : '-') + cmd)) return;
    var k = keyMap[name];
    if (k) fireKey(down, k[0], k[1], k[2]);
  }

  function setAds(on) {
    if (keys.ads === on) return;
    keys.ads = on;
    cbuf((on ? '+' : '-') + 'button8');
    var el = document.getElementById('nzpAds');
    if (el) el.classList.toggle('is-on', on);
  }

  function tapJump() {
    if (cbuf('impulse 10')) return;
    fireKey(true, ' ', 'Space', 32);
    setTimeout(function () { fireKey(false, ' ', 'Space', 32); }, 40);
  }

  function fteLook(mx, my) {
    try {
      if (typeof FTEC === 'undefined' || !FTEC.evcb || !FTEC.evcb.mouse) return false;
      var fn = null;
      if (typeof getWasmTableEntry === 'function') fn = getWasmTableEntry(FTEC.evcb.mouse);
      else if (typeof wasmTable !== 'undefined' && wasmTable.get) fn = wasmTable.get(FTEC.evcb.mouse);
      if (!fn) return false;
      fn(0, false, mx, my, 0, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  function allKeysUp() {
    Object.keys(keys).forEach(function (k) {
      if (k === 'ads') setAds(false);
      else if (k !== 'jump') setImpulse(k, false);
    });
    resetStick('move');
    resetStick('look');
  }

  var hud = document.createElement('div');
  hud.id = 'nzpTouchHud';
  hud.innerHTML =
    '<div class="nzp-stick nzp-stick--move" id="nzpMove">' +
      '<div class="nzp-stick__base"></div>' +
      '<div class="nzp-stick__knob" id="nzpMoveKnob"></div>' +
    '</div>' +
    '<div class="nzp-stick nzp-stick--look" id="nzpLookStick">' +
      '<div class="nzp-stick__base"></div>' +
      '<div class="nzp-stick__knob" id="nzpLookKnob"></div>' +
    '</div>' +
    '<button type="button" class="nzp-btn nzp-btn--use" id="nzpUse" aria-label="שימוש">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 3a2.5 2.5 0 0 0-2.45 2H6a2 2 0 0 0-2 2v2.2c0 .7.4 1.3 1 1.6V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8.2c.6-.3 1-.9 1-1.6V7a2 2 0 0 0-2-2h-1.05A2.5 2.5 0 0 0 14.5 3h-5zm0 2h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1z"/></svg>' +
    '</button>' +
    '<button type="button" class="nzp-btn nzp-btn--ads" id="nzpAds" aria-label="כוונת">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
    '</button>' +
    '<button type="button" class="nzp-btn nzp-btn--fire" id="nzpFire" aria-label="ירי">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
    '</button>' +
    '<button type="button" class="nzp-btn nzp-btn--jump" id="nzpJump" aria-label="קפיצה">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14l5-6 5 6H7z"/></svg>' +
    '</button>';
  document.body.appendChild(hud);

  var canvas0 = canvasEl();
  if (canvas0) {
    canvas0.tabIndex = 0;
    try { canvas0.focus(); } catch (e) {}
  }

  var sticks = {
    move: {
      el: document.getElementById('nzpMove'),
      knob: document.getElementById('nzpMoveKnob'),
      id: null,
      ox: 0,
      oy: 0
    },
    look: {
      el: document.getElementById('nzpLookStick'),
      knob: document.getElementById('nzpLookKnob'),
      id: null,
      lx: 0,
      ly: 0
    }
  };

  function resetStick(which) {
    var s = sticks[which];
    s.id = null;
    s.knob.style.transform = 'translate(-50%, -50%)';
    if (which === 'move') {
      setImpulse('forward', false);
      setImpulse('back', false);
      setImpulse('moveleft', false);
      setImpulse('moveright', false);
    }
  }

  function clampStick(dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var max = STICK_R;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
      len = max;
    }
    return { dx: dx, dy: dy, nx: dx / max, ny: dy / max };
  }

  function applyMove(nx, ny) {
    setImpulse('forward', ny < -MOVE_DEAD);
    setImpulse('back', ny > MOVE_DEAD);
    setImpulse('moveleft', nx < -MOVE_DEAD);
    setImpulse('moveright', nx > MOVE_DEAD);
  }

  function bindStick(which) {
    var s = sticks[which];
    s.el.addEventListener('touchstart', function (e) {
      if (s.id !== null) return;
      var t = e.changedTouches[0];
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      s.id = t.identifier;
      var rect = s.el.getBoundingClientRect();
      s.ox = rect.left + rect.width / 2;
      s.oy = rect.top + rect.height / 2;
      if (which === 'look') {
        s.lx = t.clientX;
        s.ly = t.clientY;
      } else {
        var m = clampStick(t.clientX - s.ox, t.clientY - s.oy);
        s.knob.style.transform = 'translate(calc(-50% + ' + m.dx + 'px), calc(-50% + ' + m.dy + 'px))';
        applyMove(m.nx, m.ny);
      }
      var canvas = canvasEl();
      if (canvas) {
        try { canvas.focus(); } catch (err) {}
      }
    }, { passive: false });

    s.el.addEventListener('touchmove', function (e) {
      if (s.id === null) return;
      var t = null;
      for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === s.id) { t = e.touches[i]; break; }
      }
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      if (which === 'look') {
        var dx = (t.clientX - s.lx) * LOOK_SCALE;
        var dy = (t.clientY - s.ly) * LOOK_SCALE;
        s.lx = t.clientX;
        s.ly = t.clientY;
        var vis = clampStick(t.clientX - s.ox, t.clientY - s.oy);
        s.knob.style.transform = 'translate(calc(-50% + ' + vis.dx + 'px), calc(-50% + ' + vis.dy + 'px))';
        if (dx || dy) fteLook(dx, dy);
      } else {
        var m2 = clampStick(t.clientX - s.ox, t.clientY - s.oy);
        s.knob.style.transform = 'translate(calc(-50% + ' + m2.dx + 'px), calc(-50% + ' + m2.dy + 'px))';
        applyMove(m2.nx, m2.ny);
      }
    }, { passive: false });

    function end(e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === s.id) {
          e.preventDefault();
          resetStick(which);
          break;
        }
      }
    }
    s.el.addEventListener('touchend', end, { passive: false });
    s.el.addEventListener('touchcancel', end, { passive: false });
  }

  bindStick('move');
  bindStick('look');

  function holdBtn(id, name) {
    var el = document.getElementById(id);
    function down(e) {
      e.preventDefault();
      e.stopPropagation();
      setImpulse(name, true);
    }
    function up(e) {
      e.preventDefault();
      e.stopPropagation();
      setImpulse(name, false);
    }
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
  }

  holdBtn('nzpFire', 'attack');
  holdBtn('nzpUse', 'use');

  document.getElementById('nzpAds').addEventListener('touchstart', function (e) {
    e.preventDefault();
    e.stopPropagation();
    setAds(!keys.ads);
  }, { passive: false });

  document.getElementById('nzpJump').addEventListener('touchstart', function (e) {
    e.preventDefault();
    e.stopPropagation();
    tapJump();
  }, { passive: false });

  window.addEventListener('blur', allKeysUp);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) allKeysUp();
  });
})();
