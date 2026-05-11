// Polyfill global pour SimplePeer
if (typeof global === 'undefined') {
  window.global = window;
}
// Polyfill process pour les modules Node.js
if (typeof process === 'undefined') {
  window.process = { 
    env: { NODE_DEBUG: false },
    nextTick: function(fn) { setTimeout(fn, 0); },
    browser: true
  };
}
