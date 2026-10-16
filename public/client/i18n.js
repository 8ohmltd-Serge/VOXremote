// Participant UI foundation. Keys are stable product concepts; server data
// keeps language-neutral codes and is translated only at the view boundary.
const catalogs = Object.freeze({
  ru: Object.freeze({
    "nav.conference": "Конференция",
    "nav.streams": "Камеры и потоки",
    "nav.voting": "Голосование",
    "nav.content": "Материалы",
    "nav.translation": "Синхроперевод",
    "nav.chat": "Чат",
    "nav.operations": "Сервис",
    "nav.settings": "Настройки",
    "nav.interpreter": "Рабочее место переводчика",
    "nav.mobile.conference": "Зал",
    "nav.mobile.streams": "Камеры",
    "nav.mobile.voting": "Голос",
    "nav.mobile.content": "Файлы",
    "nav.mobile.translation": "Перевод",
    "nav.mobile.chat": "Чат",
    "nav.mobile.operations": "Сервис",
    "nav.mobile.settings": "Ещё",
    "settings.language.title": "Язык интерфейса",
    "settings.language.note": "Язык интерфейса выбирается для этого браузера. Перевод внедряется по разделам; непереведённые строки остаются на русском.",
    "service.title": "Сервисные запросы",
    "service.description": "Чай, вода, принадлежности, техническая или экстренная помощь",
    "service.empty": "Очередь обращений пуста.",
    "service.accept": "Принять",
    "service.start": "В работу",
    "service.complete": "Выполнено",
    "service.close": "Закрыть",
    "login.title": "Вход в служебный интерфейс",
    "login.source": "Источник учётной записи",
    "login.local": "Локальная учётная запись VOX-S",
    "login.user": "Логин", "login.pass": "Пароль", "login.submit": "Войти",
    "login.hint_a": "Первый вход по временному коду и смена пароля — на",
    "login.hint_link": "странице входа в конференцию",
    "login.hint_b": "(способ «Логин»).",
    "login.build": "Единый служебный интерфейс",
    "login.checking": "Проверка…", "login.bad": "Неверный логин или пароль.",
    "login.unavailable": "Учётная запись недоступна. Обратитесь к администратору.",
    "login.role": "Для этого интерфейса требуется служебная роль",
    "login.lock": "Слишком много неудачных попыток входа. Повторите через {s} с.",
    "login.retry": "Можно повторить вход."
  }),
  en: Object.freeze({
    "nav.conference": "Conference",
    "nav.streams": "Cameras and streams",
    "nav.voting": "Voting",
    "nav.content": "Materials",
    "nav.translation": "Interpretation",
    "nav.chat": "Chat",
    "nav.operations": "Service",
    "nav.settings": "Settings",
    "nav.interpreter": "Interpreter workspace",
    "nav.mobile.conference": "Room",
    "nav.mobile.streams": "Cameras",
    "nav.mobile.voting": "Vote",
    "nav.mobile.content": "Files",
    "nav.mobile.translation": "Interpret",
    "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Service",
    "nav.mobile.settings": "More",
    "settings.language.title": "Interface language",
    "settings.language.note": "The interface language is saved in this browser. Translation is being added section by section; untranslated text remains in Russian.",
    "service.title": "Service requests",
    "service.description": "Refreshments, supplies, technical or urgent assistance",
    "service.empty": "No service requests.",
    "service.accept": "Accept",
    "service.start": "Start",
    "service.complete": "Completed",
    "service.close": "Close"
  }),
  de: Object.freeze({
    "nav.conference": "Konferenz", "nav.streams": "Kameras und Streams", "nav.voting": "Abstimmung",
    "nav.content": "Unterlagen", "nav.translation": "Dolmetschen", "nav.chat": "Chat",
    "nav.operations": "Service", "nav.settings": "Einstellungen", "nav.interpreter": "Dolmetscher-Arbeitsplatz",
    "nav.mobile.conference": "Saal", "nav.mobile.streams": "Kameras", "nav.mobile.voting": "Wahl",
    "nav.mobile.content": "Dateien", "nav.mobile.translation": "Sprache", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Service", "nav.mobile.settings": "Mehr",
    "settings.language.title": "Sprache der Oberfläche",
    "settings.language.note": "Die Sprache wird in diesem Browser gespeichert. Nicht übersetzte Texte bleiben auf Russisch.",
    "service.title": "Serviceanfragen", "service.description": "Getränke, Material, technische oder dringende Hilfe",
    "service.empty": "Keine Serviceanfragen.", "service.accept": "Annehmen", "service.start": "Bearbeiten",
    "service.complete": "Erledigt", "service.close": "Schließen"
  }),
  fr: Object.freeze({
    "nav.conference": "Conférence", "nav.streams": "Caméras et flux", "nav.voting": "Vote",
    "nav.content": "Documents", "nav.translation": "Interprétation", "nav.chat": "Chat",
    "nav.operations": "Service", "nav.settings": "Paramètres", "nav.interpreter": "Poste d’interprétation",
    "nav.mobile.conference": "Salle", "nav.mobile.streams": "Caméras", "nav.mobile.voting": "Vote",
    "nav.mobile.content": "Fichiers", "nav.mobile.translation": "Langues", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Service", "nav.mobile.settings": "Plus",
    "settings.language.title": "Langue de l’interface",
    "settings.language.note": "La langue est enregistrée dans ce navigateur. Les textes non traduits restent en russe.",
    "service.title": "Demandes de service", "service.description": "Boissons, fournitures, aide technique ou urgente",
    "service.empty": "Aucune demande de service.", "service.accept": "Accepter", "service.start": "Traiter",
    "service.complete": "Terminé", "service.close": "Fermer"
  }),
  es: Object.freeze({
    "nav.conference": "Conferencia", "nav.streams": "Cámaras y señales", "nav.voting": "Votación",
    "nav.content": "Materiales", "nav.translation": "Interpretación", "nav.chat": "Chat",
    "nav.operations": "Servicio", "nav.settings": "Ajustes", "nav.interpreter": "Puesto de interpretación",
    "nav.mobile.conference": "Sala", "nav.mobile.streams": "Cámaras", "nav.mobile.voting": "Voto",
    "nav.mobile.content": "Archivos", "nav.mobile.translation": "Idiomas", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Servicio", "nav.mobile.settings": "Más",
    "settings.language.title": "Idioma de la interfaz",
    "settings.language.note": "El idioma se guarda en este navegador. Los textos sin traducir permanecen en ruso.",
    "service.title": "Solicitudes de servicio", "service.description": "Bebidas, material, ayuda técnica o urgente",
    "service.empty": "No hay solicitudes de servicio.", "service.accept": "Aceptar", "service.start": "Atender",
    "service.complete": "Completado", "service.close": "Cerrar"
  }),
  it: Object.freeze({
    "nav.conference": "Conferenza", "nav.streams": "Telecamere e flussi", "nav.voting": "Votazione",
    "nav.content": "Materiali", "nav.translation": "Interpretazione", "nav.chat": "Chat",
    "nav.operations": "Servizio", "nav.settings": "Impostazioni", "nav.interpreter": "Postazione interprete",
    "nav.mobile.conference": "Sala", "nav.mobile.streams": "Camere", "nav.mobile.voting": "Voto",
    "nav.mobile.content": "File", "nav.mobile.translation": "Lingue", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Servizio", "nav.mobile.settings": "Altro",
    "settings.language.title": "Lingua dell’interfaccia",
    "settings.language.note": "La lingua viene salvata in questo browser. I testi non tradotti restano in russo.",
    "service.title": "Richieste di servizio", "service.description": "Bevande, materiali, assistenza tecnica o urgente",
    "service.empty": "Nessuna richiesta di servizio.", "service.accept": "Accetta", "service.start": "Gestisci",
    "service.complete": "Completato", "service.close": "Chiudi"
  })
});
export const BUILTIN_INTERFACE_CATALOGS = catalogs;

export const PARTICIPANT_LANGUAGES = Object.freeze([
  { code: "ru", label: "Русский" }, { code: "en", label: "English" },
  { code: "de", label: "Deutsch" }, { code: "fr", label: "Français" },
  { code: "es", label: "Español" }, { code: "it", label: "Italiano" }
]);

let customCatalogs = Object.create(null);
let runtimeCatalogs = Object.create(null);
let enabledLanguages = PARTICIPANT_LANGUAGES.map(({ code }) => code);

export function participantLanguageOptions() {
  const labels = [...PARTICIPANT_LANGUAGES, ...Object.entries(customCatalogs).map(([code, entry]) => ({ code, label: entry.label }))];
  return labels.filter(({ code }) => enabledLanguages.includes(code));
}

export function configureParticipantLanguages(settings = {}) {
  runtimeCatalogs = Object.create(null);
  for (const [code, messages] of Object.entries(settings.catalogs ?? {})) {
    if (!Object.hasOwn(catalogs, code) || !messages || typeof messages !== "object" || Array.isArray(messages)) continue;
    runtimeCatalogs[code] = { ...messages };
  }
  const custom = Object.create(null);
  for (const entry of settings.customInterfaceLanguages ?? []) {
    const code = String(entry.code ?? "").toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(code) || Object.hasOwn(catalogs, code) ||
        !entry.messages || typeof entry.messages !== "object") continue;
    custom[code] = { label: String(entry.label ?? code), direction: entry.direction === "rtl" ? "rtl" : "ltr",
      messages: { ...entry.messages } };
  }
  customCatalogs = custom;
  const supported = new Set([...Object.keys(catalogs), ...Object.keys(custom)]);
  const selected = settings.availableInterfaceLanguages;
  enabledLanguages = Array.isArray(selected) && selected.length
    ? selected.filter((code) => supported.has(code)) : [...Object.keys(catalogs)];
  systemInterfaceLanguage = enabledLanguages.includes(settings.interfaceLanguage) ? settings.interfaceLanguage :
    (enabledLanguages.includes("ru") ? "ru" : enabledLanguages[0] ?? "ru");
  return participantLanguageOptions();
}

export function normalizeParticipantLanguage(value) {
  const code = String(value ?? "ru").toLowerCase();
  if (Object.hasOwn(catalogs, code) || Object.hasOwn(customCatalogs, code)) return code;
  const base = code.split("-")[0];
  return Object.hasOwn(catalogs, base) || Object.hasOwn(customCatalogs, base) ? base : "ru";
}

let systemInterfaceLanguage = "ru";
export function setSystemInterfaceLanguage(language) {
  const code = normalizeParticipantLanguage(language);
  systemInterfaceLanguage = enabledLanguages.includes(code) ? code : "ru";
  return systemInterfaceLanguage;
}

export function participantLanguage(userId) {
  // The language belongs to this physical workplace/browser, not the account
  // that happens to be sitting here today. Legacy account choices migrate once.
  try {
    const selected = normalizeParticipantLanguage(localStorage.getItem("edge-s-interface-language") ??
      (userId ? localStorage.getItem(`edge-s-interface-language:${userId}`) : null) ?? systemInterfaceLanguage);
    return enabledLanguages.includes(selected) ? selected : systemInterfaceLanguage;
  }
  catch { return systemInterfaceLanguage; }
}

export function applyParticipantLanguage(userId) {
  const language = participantLanguage(userId);
  document.documentElement.lang = language;
  document.documentElement.dir = customCatalogs[language]?.direction ?? "ltr";
  return language;
}

export function setParticipantLanguage(userId, language) {
  const normalized = normalizeParticipantLanguage(language);
  if (!enabledLanguages.includes(normalized)) return participantLanguage(userId);
  try { localStorage.setItem("edge-s-interface-language", normalized); }
  catch { systemInterfaceLanguage = normalized; }
  document.documentElement.lang = normalized;
  document.documentElement.dir = customCatalogs[normalized]?.direction ?? "ltr";
  return normalized;
}

export function participantText(key, language = "ru") {
  const code = normalizeParticipantLanguage(language);
  if (Object.hasOwn(runtimeCatalogs[code] ?? {}, key)) return runtimeCatalogs[code][key];
  const selected = catalogs[code] ?? customCatalogs[code]?.messages;
  if (selected && Object.hasOwn(selected, key)) return selected[key];
  if (Object.hasOwn(runtimeCatalogs.ru ?? {}, key)) return runtimeCatalogs.ru[key];
  return Object.hasOwn(catalogs.ru, key) ? catalogs.ru[key] : key;
}

export function participantFormatTime(value, language = "ru", options = { hour: "2-digit", minute: "2-digit" }) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(normalizeParticipantLanguage(language), options).format(date);
}
