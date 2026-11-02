/** A fixed-content result page; no OAuth code, state or tokens are reflected. */
export function teamsCallbackPage(outcome) {
  const copy = outcome === "connected" ? {
    title: "Teams подключён", detail: "Учётная запись организатора подключена. Теперь встречи можно создавать в его календаре из служебного интерфейса VOX-S."
  } : outcome === "expired" ? {
    title: "Подключение не завершено", detail: "Срок подтверждения истёк или сервер VOX-S отключился. Вернитесь в служебный интерфейс и начните подключение снова."
  } : {
    title: "Teams не ответил", detail: "Microsoft не завершил подключение. Вернитесь в служебный интерфейс VOX-S и повторите попытку."
  };
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#f4f2ef"><title>VOXORDIA · ${copy.title}</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"></head><body><header><img class="logo-light" src="/assets/logo.svg" alt="VOXORDIA" width="170" height="21"><img class="logo-dark" src="/assets/logo-on-dark.svg" alt="" aria-hidden="true" width="170" height="21"></header><main><section class="entry" aria-labelledby="result"><h1 id="result">${copy.title}</h1><p class="lead">${copy.detail}</p><p class="lead">Эту вкладку можно закрыть.</p></section></main><footer>VOXORDIA · Подключение Microsoft Teams</footer></body></html>`;
}
