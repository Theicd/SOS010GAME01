/* overlay touch HUD for NZ:P WebGL — shown only on coarse pointers */
(function () {
  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  }
  if (!isTouch()) return;

  var keys = { w: false, a: false, s: false, d: false, ctrl: false, space: false, e: false };

  function canvasEl() {
    return (typeof Module !== 'undefined' && Module.canvas) || document.getElementById('canvas');
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

  function setKey(name, down) {
    if (keys[name] === down) return;
    keys[name] = down;
    if (name === 'w') fireKey(down, 'w', 'KeyW', 87);
    if (name === 'a') fireKey(down, 'a', 'KeyA', 65);
    if (name === 's') fireKey(down, 's', 'KeyS', 83);
    if (name === 'd') fireKey(down, 'd', 'KeyD', 68);
    if (name === 'ctrl') {
      fireKey(down, 'Control', 'ControlLeft', 17);
      var canvas = canvasEl();
      if (canvas) {
        canvas.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: down ? 1 : 0
        }));
      }
    }
    if (name === 'space') fireKey(down, ' ', 'Space', 32);
    if (name === 'e') fireKey(down, 'e', 'KeyE', 69);
  }

  function allKeysUp() {
    Object.keys(keys).forEach(function (k) { setKey(k, false); });
  }

  var hud = document.createElement('div');
  hud.id = 'nzpTouchHud';
  hud.innerHTML =
    '<div class="nzp-joy" id="nzpJoy"><div class="nzp-joy__base"><div class="nzp-joy__stick" id="nzpJoyStick"></div></div></div>' +
    '<div class="nzp-look" id="nzpLook"></div>' +
    '<div class="nzp-act nzp-act--fwd" id="nzpFwd" role="button">קדימה</div>' +
    '<div class="nzp-act nzp-act--use" id="nzpUse" role="button">פעולה</div>' +
    '<div class="nzp-act nzp-act--fire" id="nzpFire" role="button">ירי</div>';
  document.body.appendChild(hud);
  var canvas0 = canvasEl();
  if (canvas0) {
    canvas0.tabIndex = 0;
    try { canvas0.focus(); } catch (e) {}
  }

  var stick = document.getElementById('nzpJoyStick');
  var joy = document.getElementById('nzpJoy');
  var look = document.getElementById('nzpLook');
  var max = 46;
  var joyOn = false;
  var lookOn = false;
  var lookX = 0;
  var lookY = 0;

  function applyJoy(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    stick.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    var nx = dx / max;
    var ny = -dy / max;
    setKey('a', nx < -0.35);
    setKey('d', nx > 0.35);
    setKey('w', ny > 0.35);
    setKey('s', ny < -0.35);
  }

  joy.addEventListener('touchstart', function (e) {
    e.preventDefault();
    joyOn = true;
  }, { passive: false });
  joy.addEventListener('touchmove', function (e) {
    if (!joyOn) return;
    e.preventDefault();
    var t = e.touches[0];
    var r = joy.getBoundingClientRect();
    applyJoy(t.clientX - (r.left + r.width / 2), t.clientY - (r.top + r.height / 2));
  }, { passive: false });
  function joyEnd() {
    joyOn = false;
    stick.style.transform = 'translate(0,0)';
    setKey('w', false);
    setKey('a', false);
    setKey('s', false);
    setKey('d', false);
  }
  joy.addEventListener('touchend', joyEnd);
  joy.addEventListener('touchcancel', joyEnd);

  look.addEventListener('touchstart', function (e) {
    e.preventDefault();
    lookOn = true;
    lookX = e.touches[0].clientX;
    lookY = e.touches[0].clientY;
    var canvas = canvasEl();
    if (canvas) {
      try { canvas.focus(); } catch (err) {}
      try { canvas.requestPointerLock && canvas.requestPointerLock(); } catch (err) {}
    }
  }, { passive: false });
  look.addEventListener('touchmove', function (e) {
    if (!lookOn) return;
    e.preventDefault();
    var t = e.touches[0];
    var mx = (t.clientX - lookX) * 1.6;
    var my = (t.clientY - lookY) * 1.6;
    lookX = t.clientX;
    lookY = t.clientY;
    var canvas = canvasEl();
    if (!canvas) return;
    var ev = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: t.clientX,
      clientY: t.clientY
    });
    try {
      Object.defineProperty(ev, 'movementX', { get: function () { return mx; } });
      Object.defineProperty(ev, 'movementY', { get: function () { return my; } });
    } catch (err) {}
    canvas.dispatchEvent(ev);
  }, { passive: false });
  look.addEventListener('touchend', function () { lookOn = false; });
  look.addEventListener('touchcancel', function () { lookOn = false; });

  function holdBtn(id, name) {
    var el = document.getElementById(id);
    function down(e) { e.preventDefault(); setKey(name, true); }
    function up(e) { e.preventDefault(); setKey(name, false); }
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);
  }
  holdBtn('nzpFire', 'ctrl');
  holdBtn('nzpFwd', 'w');
  holdBtn('nzpUse', 'e');

  window.addEventListener('blur', allKeysUp);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) allKeysUp();
  });
})();
