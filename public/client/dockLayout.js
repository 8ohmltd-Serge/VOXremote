// Both mobile navigation and microphone controls occupy normal-flow rows in
// one fixed container. Reserve its actual height, including safe areas and
// wrapped chair status text, so neither controls nor page content overlap.
export function observeBottomControls(root = document) {
  const controls = root.getElementById("bottomControls");
  if (!controls) return;
  const update = () => root.documentElement.style.setProperty("--bottom-controls-height",
    `${Math.ceil(controls.getBoundingClientRect().height)}px`);
  const observer = new ResizeObserver(update);
  observer.observe(controls);
  update();
  return observer;
}
