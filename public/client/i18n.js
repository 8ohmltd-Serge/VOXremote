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
    "nav.roomcontrol": "Управление залом",
    "nav.settings": "Настройки",
    "nav.interpreter": "Рабочее место переводчика",
    "nav.mobile.conference": "Зал",
    "nav.mobile.streams": "Камеры",
    "nav.mobile.voting": "Голос",
    "nav.mobile.content": "Файлы",
    "nav.mobile.translation": "Перевод",
    "nav.mobile.chat": "Чат",
    "nav.mobile.operations": "Сервис",
    "nav.mobile.roomcontrol": "Зал",
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
    "nav.roomcontrol": "Room control",
    "nav.settings": "Settings",
    "nav.interpreter": "Interpreter workspace",
    "nav.mobile.conference": "Room",
    "nav.mobile.streams": "Cameras",
    "nav.mobile.voting": "Vote",
    "nav.mobile.content": "Files",
    "nav.mobile.translation": "Interpret",
    "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Service",
    "nav.mobile.roomcontrol": "Room",
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
    "nav.operations": "Service", "nav.roomcontrol": "Saalsteuerung", "nav.settings": "Einstellungen", "nav.interpreter": "Dolmetscher-Arbeitsplatz",
    "nav.mobile.conference": "Saal", "nav.mobile.streams": "Kameras", "nav.mobile.voting": "Wahl",
    "nav.mobile.content": "Dateien", "nav.mobile.translation": "Sprache", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Service", "nav.mobile.roomcontrol": "Saal", "nav.mobile.settings": "Mehr",
    "settings.language.title": "Sprache der Oberfläche",
    "settings.language.note": "Die Sprache wird in diesem Browser gespeichert. Nicht übersetzte Texte bleiben auf Russisch.",
    "service.title": "Serviceanfragen", "service.description": "Getränke, Material, technische oder dringende Hilfe",
    "service.empty": "Keine Serviceanfragen.", "service.accept": "Annehmen", "service.start": "Bearbeiten",
    "service.complete": "Erledigt", "service.close": "Schließen"
  }),
  fr: Object.freeze({
    "nav.conference": "Conférence", "nav.streams": "Caméras et flux", "nav.voting": "Vote",
    "nav.content": "Documents", "nav.translation": "Interprétation", "nav.chat": "Chat",
    "nav.operations": "Service", "nav.roomcontrol": "Commande de salle", "nav.settings": "Paramètres", "nav.interpreter": "Poste d’interprétation",
    "nav.mobile.conference": "Salle", "nav.mobile.streams": "Caméras", "nav.mobile.voting": "Vote",
    "nav.mobile.content": "Fichiers", "nav.mobile.translation": "Langues", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Service", "nav.mobile.roomcontrol": "Salle", "nav.mobile.settings": "Plus",
    "settings.language.title": "Langue de l’interface",
    "settings.language.note": "La langue est enregistrée dans ce navigateur. Les textes non traduits restent en russe.",
    "service.title": "Demandes de service", "service.description": "Boissons, fournitures, aide technique ou urgente",
    "service.empty": "Aucune demande de service.", "service.accept": "Accepter", "service.start": "Traiter",
    "service.complete": "Terminé", "service.close": "Fermer"
  }),
  es: Object.freeze({
    "nav.conference": "Conferencia", "nav.streams": "Cámaras y señales", "nav.voting": "Votación",
    "nav.content": "Materiales", "nav.translation": "Interpretación", "nav.chat": "Chat",
    "nav.operations": "Servicio", "nav.roomcontrol": "Control de sala", "nav.settings": "Ajustes", "nav.interpreter": "Puesto de interpretación",
    "nav.mobile.conference": "Sala", "nav.mobile.streams": "Cámaras", "nav.mobile.voting": "Voto",
    "nav.mobile.content": "Archivos", "nav.mobile.translation": "Idiomas", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Servicio", "nav.mobile.roomcontrol": "Sala", "nav.mobile.settings": "Más",
    "settings.language.title": "Idioma de la interfaz",
    "settings.language.note": "El idioma se guarda en este navegador. Los textos sin traducir permanecen en ruso.",
    "service.title": "Solicitudes de servicio", "service.description": "Bebidas, material, ayuda técnica o urgente",
    "service.empty": "No hay solicitudes de servicio.", "service.accept": "Aceptar", "service.start": "Atender",
    "service.complete": "Completado", "service.close": "Cerrar"
  }),
  it: Object.freeze({
    "nav.conference": "Conferenza", "nav.streams": "Telecamere e flussi", "nav.voting": "Votazione",
    "nav.content": "Materiali", "nav.translation": "Interpretazione", "nav.chat": "Chat",
    "nav.operations": "Servizio", "nav.roomcontrol": "Controllo sala", "nav.settings": "Impostazioni", "nav.interpreter": "Postazione interprete",
    "nav.mobile.conference": "Sala", "nav.mobile.streams": "Camere", "nav.mobile.voting": "Voto",
    "nav.mobile.content": "File", "nav.mobile.translation": "Lingue", "nav.mobile.chat": "Chat",
    "nav.mobile.operations": "Servizio", "nav.mobile.roomcontrol": "Sala", "nav.mobile.settings": "Altro",
    "settings.language.title": "Lingua dell’interfaccia",
    "settings.language.note": "La lingua viene salvata in questo browser. I testi non tradotti restano in russo.",
    "service.title": "Richieste di servizio", "service.description": "Bevande, materiali, assistenza tecnica o urgente",
    "service.empty": "Nessuna richiesta di servizio.", "service.accept": "Accetta", "service.start": "Gestisci",
    "service.complete": "Completato", "service.close": "Chiudi"
  })
});
// The service console uses the same database-owned catalog as the conference
// client. Keep these keys semantic: user-entered room and meeting names are
// never translated.
const serviceCatalogs = Object.freeze({
  ru: {
    "console.language": "Язык интерфейса",
    "console.signout": "Выйти",
    "console.nav.meetings": "Конференции", "console.nav.archive": "Архив конференций",
    "console.nav.accounts": "Участники и права", "console.nav.directory": "Постоянные участники",
    "console.nav.vote": "Голосование", "console.nav.translation": "Перевод",
    "console.nav.transcription": "Стенограмма", "console.nav.video": "Видео",
    "console.nav.audio": "Звук", "console.nav.equipment": "Сторонние пульты", "console.nav.uc": "Внешние встречи",
    "console.nav.graph": "Схема сигналов", "console.nav.displays": "Экраны и табло",
    "console.nav.system": "Система",
    "console.meetings.new": "Новая конференция", "console.meetings.preparation": "Подготовка конференций",
    "console.meetings.processing": "Обработка прошедших",
    "console.meetings.active": "Активная конференция",
    "console.meetings.planned": "Планируемые и подготавливаемые",
    "console.meetings.closed": "Завершённые конференции",
    "console.rooms.title": "Залы и места",
    "console.rooms.description": "Каждый зал содержит одну конфигурацию мест. Камеру и пресет можно назначить без схемы зала.",
    "console.rooms.selected": "Настраиваемый зал", "console.rooms.create": "Создать зал",
    "console.rooms.name": "Название зала",
    "console.rooms.auto_follow": "Наводить камеру при предоставлении слова",
    "console.rooms.place_name": "Название места", "console.rooms.camera": "Камера",
    "console.rooms.preset": "Пресет", "console.rooms.aim": "Навести",
    "console.rooms.remove": "Удалить", "console.rooms.add_place": "Добавить место",
    "console.rooms.save": "Сохранить", "console.rooms.saving": "Сохраняю зал…",
    "console.rooms.saved": "Зал сохранён. Камерные пресеты сохраняются для каждого места отдельно.",
    "console.rooms.name_required": "Укажите название зала, затем сохраните ещё раз"
  },
  en: {
    "console.language": "Interface language", "console.signout": "Sign out",
    "console.nav.meetings": "Conferences", "console.nav.archive": "Conference archive",
    "console.nav.accounts": "Participants and permissions", "console.nav.directory": "Participant directory",
    "console.nav.vote": "Voting", "console.nav.translation": "Interpretation",
    "console.nav.transcription": "Transcript", "console.nav.video": "Video",
    "console.nav.audio": "Audio", "console.nav.equipment": "External conference consoles", "console.nav.uc": "External meetings",
    "console.nav.graph": "Signal routing", "console.nav.displays": "Displays and boards",
    "console.nav.system": "System",
    "console.meetings.new": "New conference", "console.meetings.preparation": "Conference preparation",
    "console.meetings.processing": "Past conferences",
    "console.meetings.active": "Active conference",
    "console.meetings.planned": "Planned and in preparation",
    "console.meetings.closed": "Completed conferences",
    "console.rooms.title": "Rooms and seats",
    "console.rooms.description": "Each room has one seat layout. Assign cameras and presets without a floor plan.",
    "console.rooms.selected": "Room to configure", "console.rooms.create": "Create room",
    "console.rooms.name": "Room name",
    "console.rooms.auto_follow": "Aim camera when the floor is granted",
    "console.rooms.place_name": "Seat name", "console.rooms.camera": "Camera",
    "console.rooms.preset": "Preset", "console.rooms.aim": "Aim",
    "console.rooms.remove": "Remove", "console.rooms.add_place": "Add seat",
    "console.rooms.save": "Save", "console.rooms.saving": "Saving room…",
    "console.rooms.saved": "Room saved. Save camera presets separately for each seat.",
    "console.rooms.name_required": "Enter a room name, then save again"
  },
  de: {
    "console.language": "Sprache der Oberfläche", "console.signout": "Abmelden",
    "console.nav.meetings": "Konferenzen", "console.nav.archive": "Konferenzarchiv",
    "console.nav.accounts": "Teilnehmende und Rechte", "console.nav.directory": "Teilnehmerverzeichnis",
    "console.nav.vote": "Abstimmung", "console.nav.translation": "Dolmetschen",
    "console.nav.transcription": "Transkript", "console.nav.video": "Video",
    "console.nav.audio": "Audio", "console.nav.equipment": "Externe Konferenzpulte", "console.nav.uc": "Externe Meetings",
    "console.nav.graph": "Signalwege", "console.nav.displays": "Anzeigen und Tafeln",
    "console.nav.system": "System",
    "console.meetings.new": "Neue Konferenz", "console.meetings.preparation": "Konferenzen vorbereiten",
    "console.meetings.processing": "Vergangene Konferenzen",
    "console.meetings.active": "Aktive Konferenz",
    "console.meetings.planned": "Geplant und in Vorbereitung",
    "console.meetings.closed": "Abgeschlossene Konferenzen",
    "console.rooms.title": "Räume und Plätze",
    "console.rooms.description": "Jeder Raum hat eine Sitzordnung. Kameras und Presets lassen sich ohne Saalplan zuweisen.",
    "console.rooms.selected": "Raum auswählen", "console.rooms.create": "Raum erstellen",
    "console.rooms.name": "Raumname",
    "console.rooms.auto_follow": "Kamera beim Erteilen des Wortes ausrichten",
    "console.rooms.place_name": "Platzname", "console.rooms.camera": "Kamera",
    "console.rooms.preset": "Preset", "console.rooms.aim": "Ausrichten",
    "console.rooms.remove": "Entfernen", "console.rooms.add_place": "Platz hinzufügen",
    "console.rooms.save": "Speichern", "console.rooms.saving": "Raum wird gespeichert…",
    "console.rooms.saved": "Raum gespeichert. Kamerapresets je Platz separat speichern.",
    "console.rooms.name_required": "Raumnamen eingeben und erneut speichern"
  },
  fr: {
    "console.language": "Langue de l’interface", "console.signout": "Se déconnecter",
    "console.nav.meetings": "Conférences", "console.nav.archive": "Archives des conférences",
    "console.nav.accounts": "Participants et droits", "console.nav.directory": "Répertoire des participants",
    "console.nav.vote": "Vote", "console.nav.translation": "Interprétation",
    "console.nav.transcription": "Transcription", "console.nav.video": "Vidéo",
    "console.nav.audio": "Audio", "console.nav.equipment": "Postes de conférence tiers", "console.nav.uc": "Réunions externes",
    "console.nav.graph": "Routage des signaux", "console.nav.displays": "Écrans et tableaux",
    "console.nav.system": "Système",
    "console.meetings.new": "Nouvelle conférence", "console.meetings.preparation": "Préparer les conférences",
    "console.meetings.processing": "Conférences passées",
    "console.meetings.active": "Conférence active",
    "console.meetings.planned": "Planifiées et en préparation",
    "console.meetings.closed": "Conférences terminées",
    "console.rooms.title": "Salles et places",
    "console.rooms.description": "Chaque salle a une disposition des places. Caméras et préréglages peuvent être affectés sans plan.",
    "console.rooms.selected": "Salle à configurer", "console.rooms.create": "Créer une salle",
    "console.rooms.name": "Nom de la salle",
    "console.rooms.auto_follow": "Orienter la caméra quand la parole est donnée",
    "console.rooms.place_name": "Nom de la place", "console.rooms.camera": "Caméra",
    "console.rooms.preset": "Préréglage", "console.rooms.aim": "Orienter",
    "console.rooms.remove": "Supprimer", "console.rooms.add_place": "Ajouter une place",
    "console.rooms.save": "Enregistrer", "console.rooms.saving": "Enregistrement de la salle…",
    "console.rooms.saved": "Salle enregistrée. Enregistrez les préréglages de chaque place séparément.",
    "console.rooms.name_required": "Saisissez le nom de la salle, puis enregistrez à nouveau"
  },
  es: {
    "console.language": "Idioma de la interfaz", "console.signout": "Cerrar sesión",
    "console.nav.meetings": "Conferencias", "console.nav.archive": "Archivo de conferencias",
    "console.nav.accounts": "Participantes y permisos", "console.nav.directory": "Directorio de participantes",
    "console.nav.vote": "Votación", "console.nav.translation": "Interpretación",
    "console.nav.transcription": "Transcripción", "console.nav.video": "Vídeo",
    "console.nav.audio": "Audio", "console.nav.equipment": "Consolas de conferencia externas", "console.nav.uc": "Reuniones externas",
    "console.nav.graph": "Rutas de señal", "console.nav.displays": "Pantallas y paneles",
    "console.nav.system": "Sistema",
    "console.meetings.new": "Nueva conferencia", "console.meetings.preparation": "Preparación de conferencias",
    "console.meetings.processing": "Conferencias pasadas",
    "console.meetings.active": "Conferencia activa",
    "console.meetings.planned": "Planificadas y en preparación",
    "console.meetings.closed": "Conferencias finalizadas",
    "console.rooms.title": "Salas y asientos",
    "console.rooms.description": "Cada sala tiene una distribución de asientos. Asigne cámaras y posiciones sin plano.",
    "console.rooms.selected": "Sala a configurar", "console.rooms.create": "Crear sala",
    "console.rooms.name": "Nombre de la sala",
    "console.rooms.auto_follow": "Orientar la cámara al conceder la palabra",
    "console.rooms.place_name": "Nombre del asiento", "console.rooms.camera": "Cámara",
    "console.rooms.preset": "Posición", "console.rooms.aim": "Orientar",
    "console.rooms.remove": "Eliminar", "console.rooms.add_place": "Añadir asiento",
    "console.rooms.save": "Guardar", "console.rooms.saving": "Guardando sala…",
    "console.rooms.saved": "Sala guardada. Guarde las posiciones de cámara de cada asiento por separado.",
    "console.rooms.name_required": "Introduzca el nombre de la sala y vuelva a guardar"
  },
  it: {
    "console.language": "Lingua dell’interfaccia", "console.signout": "Esci",
    "console.nav.meetings": "Conferenze", "console.nav.archive": "Archivio conferenze",
    "console.nav.accounts": "Partecipanti e permessi", "console.nav.directory": "Elenco partecipanti",
    "console.nav.vote": "Votazione", "console.nav.translation": "Interpretazione",
    "console.nav.transcription": "Trascrizione", "console.nav.video": "Video",
    "console.nav.audio": "Audio", "console.nav.equipment": "Console per conferenze esterne", "console.nav.uc": "Riunioni esterne",
    "console.nav.graph": "Instradamento segnali", "console.nav.displays": "Schermi e tabelloni",
    "console.nav.system": "Sistema",
    "console.meetings.new": "Nuova conferenza", "console.meetings.preparation": "Preparazione conferenze",
    "console.meetings.processing": "Conferenze passate",
    "console.meetings.active": "Conferenza attiva",
    "console.meetings.planned": "Pianificate e in preparazione",
    "console.meetings.closed": "Conferenze concluse",
    "console.rooms.title": "Sale e posti",
    "console.rooms.description": "Ogni sala ha una disposizione dei posti. Assegna telecamere e preset senza planimetria.",
    "console.rooms.selected": "Sala da configurare", "console.rooms.create": "Crea sala",
    "console.rooms.name": "Nome della sala",
    "console.rooms.auto_follow": "Orientare la telecamera quando viene data la parola",
    "console.rooms.place_name": "Nome del posto", "console.rooms.camera": "Telecamera",
    "console.rooms.preset": "Preset", "console.rooms.aim": "Inquadra",
    "console.rooms.remove": "Rimuovi", "console.rooms.add_place": "Aggiungi posto",
    "console.rooms.save": "Salva", "console.rooms.saving": "Salvataggio sala…",
    "console.rooms.saved": "Sala salvata. Salva i preset della telecamera separatamente per ogni posto.",
    "console.rooms.name_required": "Inserisci il nome della sala e salva di nuovo"
  }
});
export const BUILTIN_INTERFACE_CATALOGS = Object.freeze(Object.fromEntries(
  Object.entries(catalogs).map(([code, messages]) =>
    [code, Object.freeze({ ...messages, ...serviceCatalogs[code] })])));

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
  const selected = BUILTIN_INTERFACE_CATALOGS[code] ?? customCatalogs[code]?.messages;
  if (selected && Object.hasOwn(selected, key)) return selected[key];
  if (Object.hasOwn(runtimeCatalogs.ru ?? {}, key)) return runtimeCatalogs.ru[key];
  return Object.hasOwn(BUILTIN_INTERFACE_CATALOGS.ru, key) ? BUILTIN_INTERFACE_CATALOGS.ru[key] : key;
}

export function participantFormatTime(value, language = "ru", options = { hour: "2-digit", minute: "2-digit" }) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(normalizeParticipantLanguage(language), options).format(date);
}
