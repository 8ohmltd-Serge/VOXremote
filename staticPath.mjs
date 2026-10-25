import path from "node:path";

export function resolveStaticPath(pathname, portalRoot, clientRoot) {
  const client = pathname === "/client" || pathname.startsWith("/client/");
  const root = path.resolve(client ? clientRoot : portalRoot);
  const relative = client ? pathname === "/client" ? "index.html" : pathname.slice(8) : pathname === "/" ? "index.html" :
    pathname === "/uc-panel" ? "uc-panel/index.html" : pathname.slice(1);
  const file = path.resolve(root, !relative || relative.endsWith("/") ? `${relative}index.html` : relative);
  return file.startsWith(`${root}${path.sep}`) ? file : null;
}
