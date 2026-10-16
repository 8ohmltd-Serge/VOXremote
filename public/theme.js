// Same rule as remote.voxordia.com: light by day, dark in the evening, by the visitor's own clock.
(() => {
  const apply = () => {
    const hour = new Date().getHours();
    document.documentElement.dataset.theme = hour >= 7 && hour < 20 ? "light" : "dark";
  };
  apply();
  setInterval(apply, 60000);
})();
