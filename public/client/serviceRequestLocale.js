// Persisted request codes stay language-neutral. The viewer passes its chosen
// interface language here; Russian is the current product default.
const dictionaries = {
  ru: {
    categories: { tea: "Чай", coffee: "Кофе", water: "Вода", stationery: "Письменные принадлежности",
      technical: "Техническая помощь", connection: "Проблема с подключением", cleaning: "Уборка",
      medical: "Медицинская помощь", security: "Безопасность", other: "Другое" },
    statuses: { new: "Новая", accepted: "Принята", "in-progress": "В работе",
      "needs-clarification": "Требует уточнения", delivered: "Выполнена",
      "not-delivered": "Не выполнена", rejected: "Отклонена", cancelled: "Отменена", closed: "Закрыта" }
  },
  en: {
    categories: { tea: "Tea", coffee: "Coffee", water: "Water", stationery: "Stationery",
      technical: "Technical assistance", connection: "Connection issue", cleaning: "Cleaning",
      medical: "Medical assistance", security: "Security", other: "Other" },
    statuses: { new: "New", accepted: "Accepted", "in-progress": "In progress",
      "needs-clarification": "Needs clarification", delivered: "Completed",
      "not-delivered": "Not completed", rejected: "Rejected", cancelled: "Cancelled", closed: "Closed" }
  }
};

function dictionary(language) {
  return dictionaries[String(language ?? "ru").toLowerCase().split("-")[0]] ?? dictionaries.ru;
}

export function serviceRequestCategoryLabel(item, language = "ru") {
  return dictionary(language).categories[item?.category] ?? String(item?.label ?? item?.category ?? "");
}

// What the participant reads: where their request is, in plain words.
const PROGRESS = {
  ru: { new: "Отправлено, ждём ответа персонала", accepted: "Принято", carrying: "Несут",
    fixing: "Специалист идёт", working: "Выполняется", "needs-clarification": "Персонал уточняет детали",
    delivered: "Выполнено — всё в порядке?", "not-delivered": "Вы сообщили, что не выполнено: персонал вернётся",
    rejected: "Отклонено", cancelled: "Отменено", closed: "Готово" },
  en: { new: "Sent, waiting for the staff", accepted: "Accepted", carrying: "On the way",
    fixing: "A technician is coming", working: "In progress", "needs-clarification": "The staff need a detail",
    delivered: "Done — is everything fine?", "not-delivered": "You reported it is not done: the staff will come back",
    rejected: "Declined", cancelled: "Cancelled", closed: "Done" }
};

export function serviceRequestProgress(request, language = "ru") {
  const texts = PROGRESS[String(language ?? "ru").toLowerCase().split("-")[0]] ?? PROGRESS.ru;
  if (request?.status !== "in-progress") return texts[request?.status] ?? serviceRequestStatusLabel(request?.status, language);
  const categories = (request.items ?? []).map((item) => item.category);
  if (categories.some((category) => ["technical", "connection"].includes(category))) return texts.fixing;
  if (categories.every((category) => ["tea", "coffee", "water", "stationery"].includes(category))) return texts.carrying;
  return texts.working;
}

export function serviceRequestStatusLabel(status, language = "ru") {
  return dictionary(language).statuses[status] ?? String(status ?? "");
}

export function serviceRequestCategoryOptions(language = "ru") {
  return Object.entries(dictionary(language).categories).map(([value, label]) => ({ value, label }));
}
