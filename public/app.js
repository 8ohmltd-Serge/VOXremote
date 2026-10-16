const form = document.querySelector("#codeForm");
const state = document.querySelector("#state");
const input = document.querySelector("#code");
const button = document.querySelector("#submit");

// Russian is a valid interface language but is not offered in the picker, like on voxordia.com.
const PICKER = ["en", "de", "fr", "es", "it"];
const KNOWN = [...PICKER, "ru"];
const TEXT = {
  en: { title: "Enter your code", lead: "The personal code from your organiser.", label: "Access code", submit: "Join",
    note: "Audio and video go straight to the conference server.", checking: "Connecting…",
    format: "The code has 10 letters and digits.", notFound: "Code not found or withdrawn.", rate: "Too many attempts. Try again later.",
    down: "Server unavailable. Try again shortly.", generic: "Could not sign in. Try again." },
  de: { title: "Code eingeben", lead: "Ihr persönlicher Code vom Veranstalter.", label: "Zugangscode", submit: "Beitreten",
    note: "Audio und Video laufen direkt zum Konferenzserver.", checking: "Verbindung wird aufgebaut…",
    format: "Der Code hat 10 Buchstaben und Ziffern.", notFound: "Code nicht gefunden oder zurückgezogen.", rate: "Zu viele Versuche. Bitte später erneut.",
    down: "Server nicht erreichbar. Gleich erneut versuchen.", generic: "Anmeldung fehlgeschlagen. Erneut versuchen." },
  fr: { title: "Saisissez votre code", lead: "Le code personnel de l’organisateur.", label: "Code d’accès", submit: "Rejoindre",
    note: "L’audio et la vidéo passent directement par le serveur de conférence.", checking: "Connexion…",
    format: "Le code compte 10 lettres et chiffres.", notFound: "Code introuvable ou révoqué.", rate: "Trop de tentatives. Réessayez plus tard.",
    down: "Serveur indisponible. Réessayez dans un instant.", generic: "Connexion impossible. Réessayez." },
  es: { title: "Introduzca su código", lead: "El código personal que le dio el organizador.", label: "Código de acceso", submit: "Entrar",
    note: "El audio y el vídeo van directos al servidor de la conferencia.", checking: "Conectando…",
    format: "El código tiene 10 letras y cifras.", notFound: "Código no encontrado o revocado.", rate: "Demasiados intentos. Inténtelo más tarde.",
    down: "Servidor no disponible. Inténtelo en un momento.", generic: "No se pudo entrar. Inténtelo de nuevo." },
  it: { title: "Inserisca il codice", lead: "Il codice personale dell’organizzatore.", label: "Codice di accesso", submit: "Entra",
    note: "Audio e video vanno direttamente al server della conferenza.", checking: "Connessione…",
    format: "Il codice ha 10 lettere e cifre.", notFound: "Codice non trovato o revocato.", rate: "Troppi tentativi. Riprovi più tardi.",
    down: "Server non disponibile. Riprovi tra poco.", generic: "Accesso non riuscito. Riprovi." },
  ru: { title: "Введите код", lead: "Персональный код от организатора.", label: "Код доступа", submit: "Войти",
    note: "Звук и видео идут напрямую на сервер конференции.", checking: "Подключаемся…",
    format: "В коде 10 латинских букв и цифр.", notFound: "Код не найден или отозван.", rate: "Слишком много попыток. Повторите позже.",
    down: "Сервер недоступен. Повторите через минуту.", generic: "Не удалось войти. Повторите." }
};

// Language order: explicit link parameter, saved choice, browser languages, time zone, English.
const ZONE_LANG = [[/^Europe\/(Berlin|Vienna|Zurich|Busingen)$/, "de"], [/^Europe\/(Paris|Brussels|Luxembourg|Monaco)$/, "fr"],
  [/^Europe\/(Madrid)$|^Atlantic\/Canary$|^America\/(Mexico_City|Bogota|Lima|Santiago|Buenos_Aires|Caracas|Montevideo)$/, "es"],
  [/^Europe\/(Rome|Vatican|San_Marino)$/, "it"]];
const fromZone = () => {
  try { const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""; return ZONE_LANG.find(([re]) => re.test(zone))?.[1]; }
  catch { return undefined; }
};
const fromBrowser = () => (navigator.languages?.length ? navigator.languages : [navigator.language ?? ""])
  .map((value) => String(value).slice(0, 2).toLowerCase()).find((value) => KNOWN.includes(value));
const saved = () => { try { return localStorage.getItem("vx-lang"); } catch { return null; } };

const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
const linkedLang = String(fragment.get("lang") ?? "").slice(0, 2).toLowerCase();
let lang = [linkedLang, saved(), fromBrowser(), fromZone()].find((value) => KNOWN.includes(value)) ?? "en";
let lastError = null;

const nav = document.querySelector("#langs");
for (const code of PICKER) {
  const item = document.createElement("button");
  item.type = "button"; item.textContent = code.toUpperCase(); item.dataset.lang = code; item.lang = code;
  item.addEventListener("click", () => { try { localStorage.setItem("vx-lang", code); } catch { /* private mode */ } setLang(code); });
  nav.append(item);
}

function setLang(code) {
  lang = code;
  const t = TEXT[lang];
  document.documentElement.lang = lang;
  document.querySelector("#title").textContent = t.title;
  document.querySelector("#lead").textContent = t.lead;
  document.querySelector("#label").textContent = t.label;
  document.querySelector("#note").textContent = t.note;
  button.textContent = t.submit;
  nav.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.lang === lang)));
  if (lastError) show(lastError);
}
function show(key, error = true) {
  lastError = error ? key : null;
  state.textContent = TEXT[lang][key] ?? "";
  state.classList.toggle("error", error);
  input.setAttribute("aria-invalid", String(error));
}
setLang(lang);

const deviceId = () => {
  let value = localStorage.getItem("edge-s-device-id");
  if (!value) { value = `web-${crypto.randomUUID()}`; localStorage.setItem("edge-s-device-id", value); }
  return value;
};

const linkedCode = fragment.get("code");
if (linkedCode || linkedLang) history.replaceState(null, "", `${location.pathname}${location.search}`);
if (linkedCode) {
  input.value = linkedCode;
  queueMicrotask(() => form.requestSubmit());
}

// The gateway answers in Russian; the page picks its own wording from the HTTP status.
const errorKey = (status) => status === 429 ? "rate" : status === 401 ? "notFound" : status === 503 || status === 504 ? "down" : "generic";

input.addEventListener("input", () => { if (lastError) show("", false); });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!/^[A-Za-z0-9]{10}$/.test(input.value.replace(/[\s-]/g, ""))) { show("format"); input.focus(); return; }
  button.disabled = true;
  show("checking", false);
  try {
    const response = await fetch("/api/remote/claim", { method: "POST", cache: "no-store",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ code: input.value }) });
    const identity = await response.json().catch(() => ({}));
    if (!response.ok) { const failure = new Error("claim"); failure.key = errorKey(response.status); throw failure; }
    const handoff = {
      serverUrl: location.origin, meetingId: identity.meetingId, userId: identity.participantId,
      displayName: identity.displayName, role: identity.role, permissions: identity.permissions,
      entitlementId: `conference-seat:${identity.participantId}`, deviceId: deviceId(),
      remote: true, authToken: identity.token
    };
    const payload = JSON.stringify(handoff);
    sessionStorage.setItem("edge-conference-handoff-v1", payload);
    localStorage.setItem("edge-conference-handoff-v1", payload);
    location.replace(`/client/?handoff=${Date.now()}`);
  } catch (error) {
    show(error.key ?? "down");
    button.disabled = false;
  }
});
