// Participant UI foundation. Keys are stable product concepts; server data
// keeps language-neutral codes and is translated only at the view boundary.
const catalogs = Object.freeze({
  ru: Object.freeze({
    "settings.language.title": "Язык интерфейса",
    "settings.language.note": "Перевод интерфейса внедряется по разделам. Пока на двух языках доступен список сервисных запросов.",
    "service.title": "Сервисные запросы",
    "service.description": "Чай, вода, принадлежности, техническая или экстренная помощь",
    "service.empty": "Очередь обращений пуста.",
    "service.accept": "Принять",
    "service.start": "В работу",
    "service.complete": "Выполнено",
    "service.close": "Закрыть"
  }),
  en: Object.freeze({
    "settings.language.title": "Interface language",
    "settings.language.note": "Translation is being introduced section by section. The service-request list is available in both languages.",
    "service.title": "Service requests",
    "service.description": "Refreshments, supplies, technical or urgent assistance",
    "service.empty": "No service requests.",
    "service.accept": "Accept",
    "service.start": "Start",
    "service.complete": "Completed",
    "service.close": "Close"
  })
});

export const PARTICIPANT_LANGUAGES = Object.freeze([
  { code: "ru", label: "Русский" }, { code: "en", label: "English · partial" }
]);

export function normalizeParticipantLanguage(value) {
  const code = String(value ?? "ru").toLowerCase().split("-")[0];
  return Object.hasOwn(catalogs, code) ? code : "ru";
}

let systemInterfaceLanguage = "ru";
export function setSystemInterfaceLanguage(language) {
  systemInterfaceLanguage = normalizeParticipantLanguage(language);
  return systemInterfaceLanguage;
}

export function participantLanguage(userId) {
  // The language belongs to this physical workplace/browser, not the account
  // that happens to be sitting here today. Legacy account choices migrate once.
  try { return normalizeParticipantLanguage(localStorage.getItem("edge-s-interface-language") ??
    (userId ? localStorage.getItem(`edge-s-interface-language:${userId}`) : null) ?? systemInterfaceLanguage); }
  catch { return systemInterfaceLanguage; }
}

export function applyParticipantLanguage(userId) {
  const language = participantLanguage(userId);
  document.documentElement.lang = language;
  return language;
}

export function setParticipantLanguage(userId, language) {
  const normalized = normalizeParticipantLanguage(language);
  localStorage.setItem("edge-s-interface-language", normalized);
  document.documentElement.lang = normalized;
  return normalized;
}

export function participantText(key, language = "ru") {
  return catalogs[normalizeParticipantLanguage(language)][key] ?? catalogs.ru[key] ?? key;
}
