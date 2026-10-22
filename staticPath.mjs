import path from "node:path";

export function resolveStaticPath(pathname, portalRoot, clientRoot) {
  const client = pathname.startsWith("/client/");
  const root = path.resolve(client ? clientRoot : portalRoot);
  const relative = client ? pathname.slice(8) : pathname === "/" ? "index.html" :
    pathname === "/uc-panel" ? "uc-panel/index.html" : pathname.slice(1);
  const file = path.resolve(root, relative.endsWith("/") ? `${relative}index.html` : relative);
  return file.startsWith(`${root}${path.sep}`) ? file : null;
}
