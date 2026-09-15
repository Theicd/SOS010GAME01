/* Roblox-style NZ:P HUD: stick = look, buttons = walk / pickup / fire / jump */
(function () {
  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  }
  if (!isTouch()) return;

  var keys = {
    w: false, left: false, right: false, lookup: false, lookdown: false,
    ctrl: false, space: false, e: false
  };

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
    if (name === 'left') fireKey(down, 'ArrowLeft', 'ArrowLeft', 37);
    if (name === 'right') fireKey(down, 'ArrowRight', 'ArrowRight', 39);
    if (name === 'lookup') fireKey(down, 'ArrowUp', 'ArrowUp', 38);
    if (name === 'lookdown') fireKey(down, 'ArrowDown', 'ArrowDown', 40);
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
    lookNx = 0;
    lookNy = 0;
  }

  function sendMouseLook(mx, my) {
    var canvas = canvasEl();
    if (!canvas || (!mx && !my)) return;
    var ev = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 0,
      clientY: 0
    });
    try {
      Object.defineProperty(ev, 'movementX', { get: function () { return mx; } });
      Object.defineProperty(ev, 'movementY', { get: function () { return my; } });
    } catch (err) {}
    canvas.dispatchEvent(ev);
    document.dispatchEvent(ev);
  }

  var hud = document.createElement('div');
  hud.id = 'nzpTouchHud';
  hud.innerHTML =
    '<div class="nzp-joy" id="nzpJoy"><div class="nzp-joy__base"><div class="nzp-joy__stick" id="nzpJoyStick"></div></div></div>' +
    '<div class="nzp-act nzp-act--fwd" id="nzpFwd" role="button">קדימה</div>' +
    '<div class="nzp-act nzp-act--use" id="nzpUse" role="button">איסוף</div>' +
    '<div class="nzp-act nzp-act--jump" id="nzpJump" role="button">קפיצה</div>' +
    '<div class="nzp-act nzp-act--fire" id="nzpFire" role="button">ירי</div>';
  document.body.appendChild(hud);
  var canvas0 = canvasEl();
  if (canvas0) {
    canvas0.tabIndex = 0;
    try { canvas0.focus(); } catch (e) {}
  }

  var stick = document.getElementById('nzpJoyStick');
  var joy = document.getElementById('nzpJoy');
  var max = 46;
  var joyOn = false;
  var lookNx = 0;
  var lookNy = 0;

  function applyLook(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    stick.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    lookNx = dx / max;
    lookNy = dy / max;
    setKey('left', lookNx < -0.28);
    setKey('right', lookNx > 0.28);
    setKey('lookup', lookNy < -0.28);
    setKey('lookdown', lookNy > 0.28);
  }

  joy.addEventListener('touchstart', function (e) {
    e.preventDefault();
    joyOn = true;
    var canvas = canvasEl();
    if (canvas) {
      try { canvas.focus(); } catch (err) {}
    }
  }, { passive: false });
  joy.addEventListener('touchmove', function (e) {
    if (!joyOn) return;
    e.preventDefault();
    var t = e.touches[0];
    var r = joy.getBoundingClientRect();
    applyLook(t.clientX - (r.left + r.width / 2), t.clientY - (r.top + r.height / 2));
  }, { passive: false });
  function joyEnd() {
    joyOn = false;
    stick.style.transform = 'translate(0,0)';
    lookNx = 0;
    lookNy = 0;
    setKey('left', false);
    setKey('right', false);
    setKey('lookup', false);
    setKey('lookdown', false);
  }
  joy.addEventListener('touchend', joyEnd);
  joy.addEventListener('touchcancel', joyEnd);

  function lookTick() {
    if (joyOn && (Math.abs(lookNx) > 0.08 || Math.abs(lookNy) > 0.08)) {
      sendMouseLook(lookNx * 14, lookNy * 14);
    }
    requestAnimationFrame(lookTick);
  }
  requestAnimationFrame(lookTick);

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
  holdBtn('nzpJump', 'space');

  window.addEventListener('blur', allKeysUp);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) allKeysUp();
  });
})();
