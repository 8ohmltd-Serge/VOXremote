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

export function serviceRequestStatusLabel(status, language = "ru") {
  return dictionary(language).statuses[status] ?? String(status ?? "");
}

export function serviceRequestCategoryOptions(language = "ru") {
  return Object.entries(dictionary(language).categories).map(([value, label]) => ({ value, label }));
}
