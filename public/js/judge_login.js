(function () {
  const form = document.getElementById('pin-form');
  const input = document.getElementById('pin-input');
  const dotsWrap = document.getElementById('pin-dots');
  if (!form || !input || !dotsWrap) return;

  const MAX = 4;
  const dots = Array.prototype.slice.call(dotsWrap.querySelectorAll('.dot'));
  let pin = '';

  function render() {
    input.value = pin;
    dots.forEach(function (d, i) {
      d.classList.toggle('filled', i < pin.length);
    });
  }

  function submit() {
    if (pin.length !== MAX) return;
    form.classList.add('submitting');
    form.submit();
  }

  function press(digit) {
    if (pin.length >= MAX) return;
    pin += digit;
    render();
    if (pin.length === MAX) submit();
  }

  function back() {
    pin = pin.slice(0, -1);
    render();
  }

  function clear() {
    pin = '';
    render();
  }

  document.querySelectorAll('.key').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const digit = btn.getAttribute('data-key');
      if (digit) {
        press(digit);
        return;
      }
      const action = btn.getAttribute('data-action');
      if (action === 'back') back();
      else if (action === 'clear') clear();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (/^[0-9]$/.test(e.key)) {
      press(e.key);
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      back();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      clear();
    }
  });

  render();
})();