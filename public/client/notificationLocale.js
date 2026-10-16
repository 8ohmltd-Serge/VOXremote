// Shared, dependency-free notification boundary for the participant app and
// the two login shells. Keep API error codes language-neutral on the server.
(function (root) {
  const exact = {
    "Выберите хотя бы одного избирателя": "Select at least one voter",
    "Повестка сохранена": "Agenda saved",
    "Следующий вопрос повестки активирован": "The next agenda item is active",
    "Рабочее место назначено": "Workplace assigned",
    "Камера была отключена браузером или операционной системой": "The browser or operating system disconnected the camera",
    "Сессия восстановлена после обновления страницы": "Session restored after the page refresh",
    "Сессия восстановлена с новой лицензией": "Session restored with a new licence lease",
    "Открыто голосование": "Voting is open",
    "Камера и микрофон готовы": "Camera and microphone are ready",
    "Не удалось включить звук. Проверьте разрешения браузера.": "Could not enable audio. Check browser permissions.",
    "Раскладка сохранена для вашей учётной записи": "Layout saved for your account",
    "Участник вышел из конференции": "A participant left the conference",
    "Участник отключён": "Participant disconnected",
    "Проверяем доступность и реальный медиапоток…": "Checking availability and the actual media stream…",
    "Камера уже находится в зале": "The camera is already in the room",
    "NDI-источник сохранён в каталоге. Проверьте его перед отправкой в зал.": "NDI source saved to the catalogue. Test it before sending it to the room.",
    "NDI-источник добавлен. VideoCore подключит его после появления первого кадра.": "NDI source added. VideoCore will connect it when the first frame arrives.",
    "Настройки NDI-выхода сохранены и переданы контроллеру.": "NDI output settings saved and sent to the controller.",
    "Трансляция документа завершена": "Document broadcast ended",
    "Показ открыт участникам. PGM не переключён.": "The presentation is open to participants. PGM was not switched.",
    "Демонстрация экрана запущена": "Screen sharing started",
    "Демонстрация экрана остановлена": "Screen sharing stopped",
    "Браузер не поддерживает полноэкранный режим по кнопке; используйте «Установить PWA».": "This browser cannot enter full screen from the button; use Install PWA.",
    "Привязка рабочего места отозвана. При необходимости задайте место устройству заново.": "The workplace binding was revoked. Bind this device again if needed.",
    "Проверка доступа…": "Checking access…",
    "Подключение к быстрой конференции…": "Joining the quick conference…",
    "Проверка технической учётной записи…": "Checking the technical account…",
    "Создание быстрой конференции…": "Creating a quick conference…",
    "Проверка состояния конференции…": "Checking conference status…",
    "Проверка бейджа конференции…": "Checking the conference badge…",
    "Проверка…": "Checking…"
    ,"Файл отправлен": "File uploaded"
    ,"Документ прикреплён к повестке": "Document attached to the agenda"
    ,"Заставка добавлена в библиотеку": "Slate added to the library"
    ,"Устройство переключено": "Device switched"
    ,"Текст сохранён": "Text saved"
    ,"Запрос добавлен в очередь": "Floor request added to the queue"
    ,"Приоритетный микрофон председателя включён": "Chairperson priority microphone enabled"
    ,"Слово предоставлено": "Floor granted"
    ,"Микрофон отключён": "Microphone turned off"
    ,"Слово освобождено": "Floor released"
    ,"Лимит активных микрофонов обновлён": "Active microphone limit updated"
    ,"Режим FIFO обновлён": "FIFO mode updated"
    ,"Режим дискуссии обновлён": "Discussion mode updated"
    ,"Все микрофоны выключены": "All microphones turned off"
    ,"Активная тема изменена": "Active agenda item changed"
    ,"ПИН конференции изменён": "Conference PIN changed"
    ,"Роль участника изменена": "Participant role changed"
    ,"Входящий Mix-minus обновлён": "Incoming mix-minus updated"
    ,"Камера отключена": "Camera turned off"
    ,"Камера опубликована": "Camera published"
    ,"Системная камера добавлена": "System camera added"
    ,"Источник обновлён": "Source updated"
    ,"Источник удалён": "Source deleted"
    ,"Состояние runtime обновлено": "Runtime status updated"
    ,"Камера добавлена в каталог": "Camera added to the catalogue"
    ,"Камера добавлена в заседание": "Camera added to the conference"
    ,"Системная камера удалена": "System camera deleted"
    ,"HLS Media Worker запущен": "HLS Media Worker started"
    ,"Источник направлен в Preview": "Source sent to Preview"
    ,"CUT выполнен": "CUT completed"
    ,"FADE выполнен": "FADE completed"
    ,"Автоматическое управление PGM восстановлено": "Automatic PGM control restored"
    ,"Приём NDI → HLS запущен": "NDI → HLS reception started"
    ,"NDI-выход запущен": "NDI output started"
    ,"NDI job остановлен": "NDI job stopped"
    ,"Режим автодиректора изменён": "Auto Director mode changed"
    ,"Режим PGM оператора применён": "Operator PGM mode applied"
    ,"Заставка выбрана": "Slate selected"
    ,"Заставка удалена": "Slate deleted"
    ,"Действует режим PGM администратора": "Administrator PGM mode is active"
    ,"Голосование создано": "Vote created"
    ,"Документ скопирован из архива в личные материалы": "Document copied from archive to personal materials"
    ,"Голос принят": "Vote accepted"
    ,"Бюллетень принят": "Ballot accepted"
    ,"Следующий тур подготовлен": "Next round prepared"
    ,"Состояние канала перевода изменено": "Interpretation channel state changed"
    ,"Cough обновлён": "Cough state updated"
    ,"Talkback обновлён": "Talkback state updated"
    ,"Презентация создана": "Presentation created"
    ,"Проверка готовности завершена": "Readiness check completed"
    ,"Health-check выполнен": "Health check completed"
    ,"Команда выполнена": "Command completed"
    ,"Статус опубликован": "Status published"
    ,"Вызов отправлен на вывески": "Call sent to signage displays"
    ,"Состав обновлён": "Roster updated"
    ,"Очередь обновлена": "Queue updated"
    ,"Место докладчика назначено": "Presenter workplace assigned"
    ,"AES67 / RTP L24 включён": "AES67 / RTP L24 enabled"
    ,"AES67 / RTP L24 выключен": "AES67 / RTP L24 disabled"
    ,"Запрос передан персоналу": "Request sent to staff"
    ,"Место освобождено": "Seat released"
    ,"Временная сессия активирована": "Temporary session activated"
    ,"Уровень микрофона обновлён": "Microphone level updated"
    ,"Mix-master обновлён": "Mix-master updated"
    ,"Линейный источник заглушён": "Line source muted"
    ,"Уровень линейного источника обновлён": "Line source level updated"
    ,"Запись выступления обновлена": "Speech recording updated"
    ,"Докладчик вызван": "Presenter called"
    ,"Рабочее место подключается": "Workplace is connecting"
    ,"Доклад завершён": "Presentation finished"
    ,"Документ отправлен в PGM": "Document sent to PGM"
    ,"Документ добавлен плиткой в PGM": "Document added as a PGM tile"
    ,"Запрос слова принят; микрофон пока недоступен": "Floor request accepted; microphone is not available yet"
    ,"Маршрут сохранён, но передача кадров заблокирована: установите официальный NDI Runtime и VOX-S NDI Bridge.": "Route saved, but frame transmission is blocked: install the official NDI Runtime and VOX-S NDI Bridge."
    ,"NDI sources не найдены. Discovery остаётся работоспособным без NDI Runtime.": "No NDI sources found. Discovery still works without NDI Runtime."
    ,"Android: меню браузера → «Установить». iPadOS: «Поделиться» → «На экран Домой».": "Android: browser menu → Install. iPadOS: Share → Add to Home Screen."
    ,"Данные с постоянного QR заполнены. Для входа в быструю конференцию введите её общий ПИН.": "Permanent QR details filled in. Enter the shared PIN to join a quick conference."
    ,"Устройство отвязано от рабочего места.": "Device unbound from the workplace."
    ,"Рабочие места докладчиков ещё не зарегистрированы": "No presenter workplaces have been registered yet"
    ,"Привязка доступна администратору или оператору": "Only an administrator or operator may bind a workplace"
    ,"Отвязка доступна администратору или оператору": "Only an administrator or operator may unbind a workplace"
    ,"У выбранного места нет привязанного устройства": "No device is bound to the selected workplace"
    ,"Для первого входа необходимо задать постоянный пароль": "Set a permanent password to complete the first sign-in"
    ,"Для первого входа необходимо сменить пароль": "Change the password to complete the first sign-in"
    ,"Для входа требуется служебная роль: администратор, оператор, секретарь, техник, персонал Service Request или аудитор": "This sign-in requires an administrator, operator, secretary, technician, service staff or auditor role"
    ,"Документ отправлен в показ": "Document sent to presentation"
    ,"Доклад завершён": "Presentation finished"
    ,"Камера и микрофон готовы": "Camera and microphone are ready"
    ,"Ваш голос уже принят": "Your vote has already been accepted"
  };
  const patterns = [
    [/^Лицензия: (.+)$/u, (part) => `Licence: ${part}`],
    [/^Не удалось открыть AV-устройства: (.+)$/u, (part) => `Could not open A/V devices: ${part}`],
    [/^Стенограмма не синхронизирована: (.+)$/u, (part) => `Transcript not synchronized: ${part}`],
    [/^Стенограмма не сохранена: (.+)$/u, (part) => `Transcript not saved: ${part}`],
    [/^Новое личное сообщение от (.+)$/u, (part) => `New private message from ${part}`],
    [/^Одноразовый PIN для (.+): (.+)$/u, (name, pin) => `One-time PIN for ${name}: ${pin}`],
    [/^Найдено ONVIF-устройств: (\d+)\. Первый адрес: (.+)$/u, (count, address) => `ONVIF devices found: ${count}. First address: ${address}`],
    [/^Не удалось загрузить конференции: (.+)$/u, (part) => `Could not load conferences: ${part}`],
    [/^Устройство привязано к месту «(.+)»\. Ожидается вызов докладчика\.$/u, (name) => `Device bound to “${name}”. Waiting for the presenter call.`],
    [/^Рабочее место: (.+)$/u, (part) => `Workplace: ${part}`]
    ,[/^AV-устройства требуют подтверждения: (.+)$/u, (part) => `A/V devices need permission: ${part}`]
    ,[/^Камера отключена: (.+)$/u, (part) => `Camera disconnected: ${part}`]
    ,[/^Восстановление камеры: (.+)$/u, (part) => `Camera recovery: ${part}`]
    ,[/^Источники: (.+)$/u, (part) => `Sources: ${part}`]
    ,[/^Рассадка: (.+)$/u, (part) => `Seating: ${part}`]
    ,[/^Микрофон пока недоступен: (.+)$/u, (part) => `Microphone is not available yet: ${part}`]
    ,[/^Запрос слова принят; микрофон пока недоступен: (.+)$/u, (part) => `Floor request accepted; microphone is not available yet: ${part}`]
    ,[/^Источник сохранён, но быстрая проверка не пройдена: (.+)$/u, (part) => `Source saved, but the quick check failed: ${part}`]
    ,[/^Повторное подключение: (.+)$/u, (part) => `Reconnecting: ${part}`]
    ,[/^Аудиомикшер: (.+)$/u, (part) => `Audio mixer: ${part}`]
    ,[/^Аудиоканал конференции: (.+)$/u, (part) => `Conference audio channel: ${part}`]
    ,[/^Просмотр: (.+)$/u, (part) => `Preview: ${part}`]
    ,[/^Микрофон (.+): (.+)$/u, (name, part) => `Microphone ${name}: ${part}`]
    ,[/^Присутствие: (.+)$/u, (part) => `Presence: ${part}`]
    ,[/^Полноэкранный режим недоступен: (.+)$/u, (part) => `Full-screen mode unavailable: ${part}`]
    ,[/^(.+)-поток добавлен в зал\.$/u, (protocol) => `${protocol} stream added to the room.`]
    ,[/^(.+)-источник сохранён в каталоге\. Выполните полную проверку перед отправкой в зал\.$/u, (protocol) => `${protocol} source saved to the catalogue. Run a full check before sending it to the room.`]
    ,[/^Найдено NDI sources: (\d+)$/u, (count) => `NDI sources found: ${count}`]
    ,[/^Multicast запущен: (.+)$/u, (address) => `Multicast started: ${address}`]
    ,[/^Проверка доступа к конференции «(.+)»…$/u, (title) => `Checking access to “${title}”…`]
    ,[/^Место «(.+)» отвязано от устройства\.$/u, (name) => `Workplace “${name}” unbound from the device.`]
    ,[/^Плановый вход по бейджу недоступен: (.+)\. Для быстрой конференции данные подставлены; нужен её общий ПИН\.$/u,
      (part) => `Badge sign-in to a planned conference is unavailable: ${part}. Details were filled in for a quick conference; its shared PIN is still required.`]
    ,[/^Источник исправен: (.+)$/u, (part) => `Source is healthy: ${part}`]
  ];
  const errorMessages = {
    ru: {
      security_lockout: "Слишком много неудачных попыток входа. Повторите через {seconds} с.",
      presence_inactive: "Сессия в этой вкладке устарела. Обновите страницу, чтобы войти снова.",
      unauthorized: "Не удалось подтвердить учётные данные.",
      internal_error: "Внутренняя ошибка сервера. Повторите действие позже."
    },
    en: {
      security_lockout: "Too many unsuccessful sign-in attempts. Try again in {seconds} s.",
      presence_inactive: "The session in this tab is no longer active. Refresh the page to sign in again.",
      unauthorized: "Could not verify your credentials.",
      internal_error: "Server error. Try again later."
    }
  };

  function language(userId = null) {
    let value = null;
    try {
      value = localStorage.getItem("edge-s-interface-language") ||
        (userId && localStorage.getItem(`edge-s-interface-language:${userId}`));
    } catch { /* Storage may be blocked on an entry device. */ }
    return String(value || root.document?.documentElement.lang || root.navigator?.language || "ru")
      .toLowerCase().startsWith("en") ? "en" : "ru";
  }

  function localize(value, locale = language()) {
    const message = String(value ?? "");
    if (!message) return message;
    if (locale === "ru" && message === "Too many rejected access attempts") {
      return "Слишком много неудачных попыток входа.";
    }
    if (locale !== "en") {
      return /[A-Za-z]/u.test(message) && !/[А-Яа-яЁё]/u.test(message) && !/^(?:AES67|NDI|PGM|WebRTC|Preview|HTTP)\b/u.test(message)
        ? "Не удалось выполнить действие. Попробуйте ещё раз." : message;
    }
    if (exact[message]) return exact[message];
    for (const [pattern, format] of patterns) {
      const match = message.match(pattern);
      if (match) return format(...match.slice(1));
    }
    if (/[А-Яа-яЁё]/u.test(message)) {
      return /^(?:Не |Нет |Ошибка|Невозможно|Недоступно|Заблокировано)/u.test(message)
        ? "Could not complete the action. Try again." : "Action update received.";
    }
    return message;
  }

  function error(code, message, status, locale = language()) {
    const supportedLocale = locale === "en" ? "en" : "ru";
    if (code === "security_lockout") return errorMessages[supportedLocale].security_lockout;
    if (code === "conflict" && message === "Participant presence is no longer active") {
      return errorMessages[supportedLocale].presence_inactive;
    }
    if (code === "internal_error") return errorMessages[supportedLocale].internal_error;
    if (code === "unauthorized" && /^(?:Identity is required|Invalid username or password)$/u.test(message)) {
      return errorMessages[supportedLocale].unauthorized;
    }
    const translated = localize(message, locale);
    if (locale === "en" && translated === "Action update received.") {
      return `Could not complete the action (HTTP ${status}).`;
    }
    if (locale === "ru" && /[A-Za-z]/u.test(translated) && !/[А-Яа-яЁё]/u.test(translated)) {
      return `Не удалось выполнить действие (HTTP ${status}).`;
    }
    if (locale === "en" && /[А-Яа-яЁё]/u.test(translated)) return `Could not complete the action (HTTP ${status}).`;
    return translated;
  }

  function countdown(element, seconds, locale = language()) {
    const supportedLocale = locale === "en" ? "en" : "ru";
    clearInterval(element._lockoutTimer);
    const deadline = Date.now() + Math.max(1, Number(seconds) || 30) * 1000;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      element.textContent = remaining
        ? errorMessages[supportedLocale].security_lockout.replace("{seconds}", String(remaining))
        : supportedLocale === "en" ? "You can try signing in again." : "Можно повторить вход.";
      if (!remaining) clearInterval(element._lockoutTimer);
    };
    update();
    element._lockoutTimer = setInterval(update, 1000);
  }

  root.VoxNoticeLocale = Object.freeze({ language, localize, error, countdown });
})(globalThis);
