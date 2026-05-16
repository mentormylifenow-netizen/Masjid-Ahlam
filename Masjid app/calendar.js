/**
 * Prayer streak calendar — grid, persistence, Islamic holidays (Aladhan API).
 */
(function initMasjidCalendarModule() {
  const CALENDAR_PRAYER_STORAGE_KEY = "masjid_ahlam_prayers";
  const calendarView = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  };
  let holidayFetchId = 0;

  function getCalendarPrayerLog() {
    try {
      const raw = localStorage.getItem(CALENDAR_PRAYER_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveCalendarPrayerLog(log) {
    try {
      localStorage.setItem(CALENDAR_PRAYER_STORAGE_KEY, JSON.stringify(log));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function calendarDateKey(year, monthIndex, day) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return year + "-" + month + "-" + date;
  }

  function normalizePrayerStatus(value) {
    const n = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!Number.isFinite(n)) return 0;
    return Math.min(5, Math.max(0, n));
  }

  function getCalendarMonthLabel(year, monthIndex) {
    return new Date(year, monthIndex, 1).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function isSameCalendarDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function buildCalendarDateAriaLabel(year, monthIndex, day, status) {
    const date = new Date(year, monthIndex, day);
    const monthName = date.toLocaleString(undefined, { month: "long" });
    return monthName + " " + day + ", " + status + " of 5 prayers logged";
  }

  function gregorianApiDateToKey(gregorianDate) {
    if (!gregorianDate || typeof gregorianDate !== "string") return "";
    const parts = gregorianDate.split("-");
    if (parts.length !== 3) return "";
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    return year + "-" + month + "-" + day;
  }

  function formatHolidayListDate(year, monthIndex, day) {
    const date = new Date(year, monthIndex, day);
    return date.toLocaleString(undefined, {
      day: "numeric",
      month: "long",
    });
  }

  function formatHolidayName(name) {
    if (name === "Arafa") return "Day of Arafah";
    if (name === "Eid-ul-Adha") return "Eid al-Adha";
    if (name === "Eid-ul-Fitr" || name === "Eid al-Fitr") return "Eid al-Fitr";
    return name;
  }

  function clearHijriSubtitle() {
    const hijriEl = document.getElementById("hijri-subtitle");
    if (hijriEl) {
      hijriEl.textContent = "";
    }
  }

  function buildHijriSubtitle(days) {
    if (!days.length) {
      return "";
    }

    const firstHijri = days[0] && days[0].hijri;
    const lastHijri = days[days.length - 1] && days[days.length - 1].hijri;
    if (!firstHijri || !lastHijri) {
      return "";
    }

    const firstMonth =
      firstHijri.month && firstHijri.month.en ? String(firstHijri.month.en).trim() : "";
    const lastMonth =
      lastHijri.month && lastHijri.month.en ? String(lastHijri.month.en).trim() : "";
    const firstYear = firstHijri.year ? String(firstHijri.year).trim() : "";
    const lastYear = lastHijri.year ? String(lastHijri.year).trim() : "";

    if (!firstMonth || !firstYear) {
      return "";
    }

    let monthLabel = firstMonth;
    if (lastMonth && lastMonth !== firstMonth) {
      monthLabel = firstMonth + " / " + lastMonth;
    }

    let yearLabel = firstYear;
    if (lastYear && lastYear !== firstYear) {
      yearLabel = firstYear + " / " + lastYear;
    }

    return monthLabel + " " + yearLabel + " AH";
  }

  function updateHijriSubtitle(days) {
    const hijriEl = document.getElementById("hijri-subtitle");
    if (!hijriEl) {
      return;
    }
    hijriEl.textContent = buildHijriSubtitle(days);
  }

  function clearHolidayUi() {
    const grid = document.getElementById("calendar-grid");
    if (grid) {
      grid.querySelectorAll(".calendar-date[data-holiday]").forEach(function (cell) {
        cell.removeAttribute("data-holiday");
      });
    }

    const list = document.getElementById("calendar-holidays");
    if (list) {
      list.replaceChildren();
    }

    clearHijriSubtitle();
  }

  function applyHolidayUi(entries, year, monthIndex) {
    const grid = document.getElementById("calendar-grid");
    const list = document.getElementById("calendar-holidays");
    if (!grid || !list) return;

    const fragment = document.createDocumentFragment();

    entries.forEach(function (entry) {
      const cell = grid.querySelector('.calendar-date[data-date="' + entry.dateKey + '"]');
      if (cell) {
        cell.setAttribute("data-holiday", "true");
      }

      const item = document.createElement("p");
      item.className = "holiday-list__item";
      item.textContent =
        formatHolidayListDate(year, monthIndex, entry.day) +
        " - " +
        entry.names.map(formatHolidayName).join(", ");
      fragment.appendChild(item);
    });

    list.replaceChildren(fragment);
  }

  async function fetchIslamicHolidays(month, year) {
    const fetchId = ++holidayFetchId;
    const monthIndex = month - 1;

    clearHolidayUi();

    try {
      const response = await fetch(
        "https://api.aladhan.com/v1/gToHCalendar/" + month + "/" + year
      );
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      if (fetchId !== holidayFetchId) {
        return;
      }

      const days = payload && payload.data;
      if (!Array.isArray(days)) {
        return;
      }

      updateHijriSubtitle(days);

      const majorHolidays = [
        "Ramadan",
        "Eid",
        "Arafah",
        "Ashura",
        "New Year",
        "Isra",
        "Mawlid",
        "Qadr",
        "Shabaan",
      ];

      function isMajorHoliday(holidayName) {
        const normalized = String(holidayName).toLowerCase();
        return majorHolidays.some(function (keyword) {
          return normalized.includes(keyword.toLowerCase());
        });
      }

      const holidayEntries = [];

      days.forEach(function (day) {
        const hijri = day && day.hijri;
        const gregorian = day && day.gregorian;
        const holidays = hijri && Array.isArray(hijri.holidays) ? hijri.holidays : [];
        const majorOnly = holidays.filter(isMajorHoliday);

        if (!majorOnly.length || !gregorian) {
          return;
        }

        const dateKey = gregorianApiDateToKey(gregorian.date);
        if (!dateKey) {
          return;
        }

        const dayNum = parseInt(gregorian.day, 10);
        if (!Number.isFinite(dayNum)) {
          return;
        }

        holidayEntries.push({
          dateKey: dateKey,
          day: dayNum,
          names: majorOnly,
        });
      });

      holidayEntries.sort(function (a, b) {
        return a.day - b.day;
      });

      applyHolidayUi(holidayEntries, year, monthIndex);
    } catch {
      if (fetchId === holidayFetchId) {
        clearHolidayUi();
      }
    }
  }

  function shiftCalendarMonth(delta) {
    calendarView.month += delta;
    if (calendarView.month < 0) {
      calendarView.month = 11;
      calendarView.year -= 1;
    } else if (calendarView.month > 11) {
      calendarView.month = 0;
      calendarView.year += 1;
    }
    renderCalendar();
  }

  function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const titleEl = document.getElementById("calendar-month-title");
    if (!grid) return;

    const year = calendarView.year;
    const monthIndex = calendarView.month;
    const daysInMonth = getDaysInMonth(year, monthIndex);
    const prayerLog = getCalendarPrayerLog();
    const today = new Date();

    if (titleEl) {
      titleEl.textContent = getCalendarMonthLabel(year, monthIndex);
    }

    clearHijriSubtitle();

    grid.replaceChildren();
    grid.setAttribute("aria-label", getCalendarMonthLabel(year, monthIndex) + " prayer tracker");

    const firstWeekday = new Date(year, monthIndex, 1);
    const leadingEmpty = firstWeekday.getDay();

    for (let i = 0; i < leadingEmpty; i += 1) {
      const spacer = document.createElement("div");
      spacer.className = "calendar-date calendar-date--empty";
      spacer.setAttribute("aria-hidden", "true");
      grid.appendChild(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = calendarDateKey(year, monthIndex, day);
      const status = normalizePrayerStatus(prayerLog[dateKey]);
      const cellDate = new Date(year, monthIndex, day);

      const cell = document.createElement("div");
      cell.className = "calendar-date";
      cell.setAttribute("data-status", String(status));
      cell.setAttribute("data-date", dateKey);
      cell.textContent = String(day);
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", buildCalendarDateAriaLabel(year, monthIndex, day, status));

      if (isSameCalendarDay(cellDate, today)) {
        cell.classList.add("calendar-date--today");
      }

      cell.addEventListener("click", function onCalendarDateClick() {
        const current = normalizePrayerStatus(cell.getAttribute("data-status"));
        const next = current >= 5 ? 0 : current + 1;
        cell.setAttribute("data-status", String(next));
        prayerLog[dateKey] = next;
        saveCalendarPrayerLog(prayerLog);
        cell.setAttribute("aria-label", buildCalendarDateAriaLabel(year, monthIndex, day, next));
      });

      grid.appendChild(cell);
    }

    void fetchIslamicHolidays(monthIndex + 1, year);
  }

  function initCalendar() {
    const prevBtn = document.getElementById("calendar-prev");
    const nextBtn = document.getElementById("calendar-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        shiftCalendarMonth(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        shiftCalendarMonth(1);
      });
    }

    renderCalendar();
  }

  window.MasjidCalendar = {
    init: initCalendar,
    render: renderCalendar,
    incrementTodayPrayerCheckIn: function incrementTodayPrayerCheckIn() {
      const now = new Date();
      const dateKey = calendarDateKey(now.getFullYear(), now.getMonth(), now.getDate());
      const prayerLog = getCalendarPrayerLog();
      const current = normalizePrayerStatus(prayerLog[dateKey]);
      if (current >= 5) return;

      const next = current + 1;
      prayerLog[dateKey] = next;
      saveCalendarPrayerLog(prayerLog);

      const grid = document.getElementById("calendar-grid");
      if (!grid) return;

      const cell = grid.querySelector('.calendar-date[data-date="' + dateKey + '"]');
      if (!cell) {
        if (
          now.getFullYear() !== calendarView.year ||
          now.getMonth() !== calendarView.month
        ) {
          calendarView.year = now.getFullYear();
          calendarView.month = now.getMonth();
          renderCalendar();
        }
        return;
      }

      cell.setAttribute("data-status", String(next));
      const dayNum = parseInt(cell.textContent, 10);
      if (Number.isFinite(dayNum)) {
        cell.setAttribute(
          "aria-label",
          buildCalendarDateAriaLabel(now.getFullYear(), now.getMonth(), dayNum, next)
        );
      }
    },
  };
})();
