/* Stick = walk (FTE +forward etc). Drag on canvas = look. Buttons = fire / pickup / jump. */
(function () {
  function isTouch() {
    return window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  }
  if (!isTouch()) return;

  var keys = { forward: false, back: false, moveleft: false, moveright: false, attack: false, jump: false, use: false };
  var stick = { forward: false, back: false, moveleft: false, moveright: false };
  var held = { forward: false, attack: false, jump: false, use: false };
  var DEAD = 0.28;

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

  function setImpulse(name, down) {
    if (keys[name] === down) return;
    keys[name] = down;
    if (cbuf((down ? '+' : '-') + name)) return;
    var k = keyMap[name];
    if (k) fireKey(down, k[0], k[1], k[2]);
    if (name === 'attack') {
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
  }

  function syncMove() {
    setImpulse('forward', !!(stick.forward || held.forward));
    setImpulse('back', !!stick.back);
    setImpulse('moveleft', !!stick.moveleft);
    setImpulse('moveright', !!stick.moveright);
    setImpulse('attack', !!held.attack);
    setImpulse('jump', !!held.jump);
    setImpulse('use', !!held.use);
  }

  function allKeysUp() {
    stick.forward = stick.back = stick.moveleft = stick.moveright = false;
    held.forward = held.attack = held.jump = held.use = false;
    syncMove();
  }

  var hud = document.createElement('div');
  hud.id = 'nzpTouchHud';
  hud.innerHTML =
    '<div class="nzp-joy" id="nzpJoy"><div class="nzp-joy__base"><div class="nzp-joy__stick" id="nzpJoyStick"></div></div></div>' +
    '<div class="nzp-act nzp-act--fwd" id="nzpFwd" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l7 8h-4v8H9v-8H5z"/></svg><span>קדימה</span></div>' +
    '<div class="nzp-act nzp-act--use" id="nzpUse" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg><span>איסוף</span></div>' +
    '<div class="nzp-act nzp-act--jump" id="nzpJump" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14l5-6 5 6H7z"/></svg><span>קפיצה</span></div>' +
    '<div class="nzp-act nzp-act--fire" id="nzpFire" role="button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg><span>ירי</span></div>';
  document.body.appendChild(hud);
  var canvas0 = canvasEl();
  if (canvas0) {
    canvas0.tabIndex = 0;
    try { canvas0.focus(); } catch (e) {}
  }

  var stickEl = document.getElementById('nzpJoyStick');
  var joy = document.getElementById('nzpJoy');
  var max = 42;
  var joyOn = false;

  function applyStick(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    stickEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    var nx = dx / max;
    var ny = dy / max;
    stick.forward = ny < -DEAD;
    stick.back = ny > DEAD;
    stick.moveleft = nx < -DEAD;
    stick.moveright = nx > DEAD;
    syncMove();
  }

  joy.addEventListener('touchstart', function (e) {
    e.preventDefault();
    e.stopPropagation();
    joyOn = true;
    var canvas = canvasEl();
    if (canvas) {
      try { canvas.focus(); } catch (err) {}
    }
  }, { passive: false });
  joy.addEventListener('touchmove', function (e) {
    if (!joyOn) return;
    e.preventDefault();
    e.stopPropagation();
    var t = e.touches[0];
    var r = joy.getBoundingClientRect();
    applyStick(t.clientX - (r.left + r.width / 2), t.clientY - (r.top + r.height / 2));
  }, { passive: false });
  function joyEnd(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    joyOn = false;
    stickEl.style.transform = 'translate(0,0)';
    stick.forward = stick.back = stick.moveleft = stick.moveright = false;
    syncMove();
  }
  joy.addEventListener('touchend', joyEnd, { passive: false });
  joy.addEventListener('touchcancel', joyEnd, { passive: false });

  function holdBtn(id, name) {
    var el = document.getElementById(id);
    function down(e) {
      e.preventDefault();
      e.stopPropagation();
      held[name] = true;
      syncMove();
    }
    function up(e) {
      e.preventDefault();
      e.stopPropagation();
      held[name] = false;
      syncMove();
    }
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
  }
  holdBtn('nzpFire', 'attack');
  holdBtn('nzpFwd', 'forward');
  holdBtn('nzpUse', 'use');
  holdBtn('nzpJump', 'jump');

  window.addEventListener('blur', allKeysUp);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) allKeysUp();
  });
})();
