function changeUserAgent() {
  Object.defineProperty(Navigator.prototype, 'userAgent', {
    value: `${navigator.userAgent} CrOS`,
    configurable: false,
    enumerable: true,
    writable: false
  });
}

function main() {
  const script = document.createElement('script');
  script.textContent = `(${changeUserAgent.toString()})();`;

  document.documentElement.appendChild(script);
}

main();
