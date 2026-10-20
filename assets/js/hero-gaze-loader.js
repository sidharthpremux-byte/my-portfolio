// Loads the interactive hero gaze effect only when it's worth loading:
// - Skips entirely on touch devices (no hover / no fine pointer), so phones
//   never download the frames.
// - Waits for window 'load' so the frames never compete with the page's own
//   fonts, images and main.js for bandwidth.
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function loadGaze() {
    var s = document.createElement('script');
    s.src = 'assets/js/hero-gaze.js';
    document.body.appendChild(s);
  }

  if (document.readyState === 'complete') loadGaze();
  else window.addEventListener('load', loadGaze);
})();
