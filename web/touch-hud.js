/* Look = drag on screen (engine mouse). Left ring is a hint only. Buttons = walk / back / fire / jump / use. */
(function () {
  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  }
  if (!isTouch()) return;

  var keys = { forward: false, back: false, attack: false, jump: false, use: false };
  var LOOK_SCALE = 1.35;
  var WALK_TOP = 280;
  var WALK_SMOOTH_UP = 0.16;
  var WALK_SMOOTH_DOWN = 0.24;

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
    attack: ['Control', 'ControlLeft', 17],
    jump: [' ', 'Space', 32],
    use: ['e', 'KeyE', 69]
  };

  function setImpulse(name, down) {
    if (keys[name] === down) return;
    keys[name] = down;
    if (cbuf((down ? '+' : '-') + name)) return;
    var k = keyMap[name];
    if (k) fireKey(down, k[0], k[1], k[2]);
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
    walkCmd = null;
    Object.keys(keys).forEach(function (k) { setImpulse(k, false); });
  }

  var hud = document.createElement('div');
  hud.id = 'nzpTouchHud';
  hud.innerHTML =
    '<div class="nzp-look" id="nzpLook"></div>' +
    '<div class="nzp-lookhint" id="nzpLookHint" aria-hidden="true"></div>' +
    '<div class="nzp-act nzp-act--fwd" id="nzpFwd" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 8h-4v8H9v-8H5z"/></svg><span>קדימה</span></div>' +
    '<div class="nzp-act nzp-act--back" id="nzpBack" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20l-7-8h4V4h6v8h4z"/></svg><span>אחורה</span></div>' +
    '<div class="nzp-act nzp-act--use" id="nzpUse" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg><span>איסוף</span></div>' +
    '<div class="nzp-act nzp-act--jump" id="nzpJump" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14l5-6 5 6H7z"/></svg><span>קפיצה</span></div>' +
    '<div class="nzp-act nzp-act--fire" id="nzpFire" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg><span>ירי</span></div>';
  document.body.appendChild(hud);
  var canvas0 = canvasEl();
  if (canvas0) {
    canvas0.tabIndex = 0;
    try { canvas0.focus(); } catch (e) {}
  }

  var lookPad = document.getElementById('nzpLook');
  var looking = false;
  var lastX = 0;
  var lastY = 0;
  var smx = 0;
  var smy = 0;

  lookPad.addEventListener('touchstart', function (e) {
    if (!e.changedTouches.length) return;
    e.preventDefault();
    looking = true;
    lastX = e.changedTouches[0].clientX;
    lastY = e.changedTouches[0].clientY;
    smx = 0;
    smy = 0;
    var canvas = canvasEl();
    if (canvas) {
      try { canvas.focus(); } catch (err) {}
    }
  }, { passive: false });
  lookPad.addEventListener('touchmove', function (e) {
    if (!looking || !e.touches.length) return;
    e.preventDefault();
    var t = e.touches[0];
    var dx = (t.clientX - lastX) * LOOK_SCALE;
    var dy = (t.clientY - lastY) * LOOK_SCALE;
    lastX = t.clientX;
    lastY = t.clientY;
    smx = smx * 0.28 + dx * 0.72;
    smy = smy * 0.28 + dy * 0.72;
    if (smx || smy) fteLook(smx, smy);
  }, { passive: false });
  function lookEnd(e) {
    if (e) e.preventDefault();
    looking = false;
    smx = 0;
    smy = 0;
  }
  lookPad.addEventListener('touchend', lookEnd, { passive: false });
  lookPad.addEventListener('touchcancel', lookEnd, { passive: false });

  var walkCmd = null;
  var walkSpeed = 0;
  var lastSentSpeed = -1;

  function walkTick() {
    var target = walkCmd ? WALK_TOP : 0;
    walkSpeed += (target - walkSpeed) * (walkCmd ? WALK_SMOOTH_UP : WALK_SMOOTH_DOWN);
    if (!walkCmd && walkSpeed < 12) {
      walkSpeed = 0;
      setImpulse('forward', false);
      setImpulse('back', false);
      lastSentSpeed = -1;
    } else if (walkCmd) {
      var s = Math.round(Math.max(48, walkSpeed));
      if (Math.abs(s - lastSentSpeed) >= 8) {
        cbuf('cl_forwardspeed ' + s);
        cbuf('cl_backspeed ' + s);
        lastSentSpeed = s;
      }
      setImpulse(walkCmd, true);
      setImpulse(walkCmd === 'forward' ? 'back' : 'forward', false);
    }
    requestAnimationFrame(walkTick);
  }
  requestAnimationFrame(walkTick);

  function holdWalk(id, name) {
    var el = document.getElementById(id);
    function down(e) {
      e.preventDefault();
      e.stopPropagation();
      walkCmd = name;
    }
    function up(e) {
      e.preventDefault();
      e.stopPropagation();
      if (walkCmd === name) walkCmd = null;
    }
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
  }
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
  holdWalk('nzpFwd', 'forward');
  holdWalk('nzpBack', 'back');
  holdBtn('nzpFire', 'attack');
  holdBtn('nzpUse', 'use');
  holdBtn('nzpJump', 'jump');

  window.addEventListener('blur', allKeysUp);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) allKeysUp();
  });
})();
