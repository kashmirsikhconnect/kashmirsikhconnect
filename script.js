const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

const ADMIN_EMAIL = "kashmirsikhconnect@gmail.com";
const ADMIN_PASSWORD = "admin@123_123";
const EVENTS_KEY = "kashmirSikhConnectEvents";
const ADMIN_KEY = "kashmirSikhConnectAdmin";
const EVENTS_API_URL = "https://script.google.com/macros/s/AKfycbwBqSIrMF17oXiaOb1UnKzrVT35M4kFsAtlFFSyhToujYMjvTwv5f4JTNYBO4s3SwqY/exec";

const adminModal = document.querySelector("#admin-modal");
const adminLoginView = document.querySelector("#admin-login-view");
const adminDashboardView = document.querySelector("#admin-dashboard-view");
const adminLoginForm = document.querySelector("#admin-login-form");
const adminError = document.querySelector("#admin-error");
const eventForm = document.querySelector("#event-form");
const adminEventList = document.querySelector("#admin-event-list");
const activeEvents = document.querySelector("#active-events");
const completedEvents = document.querySelector("#completed-events");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.matches("a") || event.target.matches("button")) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll(".google-form-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = link.href;
  });
});

function localEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

async function apiRequest(payload) {
  if (!EVENTS_API_URL) return null;

  await fetch(EVENTS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      token: ADMIN_PASSWORD,
      ...payload,
    }),
  });
  return { ok: true };
}

async function loadEvents() {
  if (!EVENTS_API_URL) return localEvents();

  const data = await jsonp(`${EVENTS_API_URL}?callback=`);
  return Array.isArray(data.events) ? data.events : [];
}

function jsonp(urlPrefix) {
  return new Promise((resolve, reject) => {
    const callbackName = `kscEvents${Date.now()}${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const separator = urlPrefix.includes("?") ? "" : "?callback=";
    const timeout = window.setTimeout(() => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Could not load events."));
    }, 10000);

    window[callbackName] = (data) => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      reject(new Error("Could not load events."));
    };

    script.src = `${urlPrefix}${separator}${callbackName}&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}

async function createEvent(eventItem) {
  if (EVENTS_API_URL) {
    await apiRequest({ action: "create", event: eventItem });
    await wait(900);
    return;
  }

  const events = localEvents();
  events.unshift(eventItem);
  saveLocalEvents(events);
}

async function toggleEvent(id) {
  if (EVENTS_API_URL) {
    await apiRequest({ action: "toggle", id });
    await wait(900);
    return;
  }

  const events = localEvents().map((eventItem) =>
    eventItem.id === id ? { ...eventItem, active: !eventItem.active } : eventItem
  );
  saveLocalEvents(events);
}

async function deleteEvent(id) {
  if (EVENTS_API_URL) {
    await apiRequest({ action: "delete", id });
    await wait(900);
    return;
  }

  saveLocalEvents(localEvents().filter((eventItem) => eventItem.id !== id));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(value) {
  if (!value) return "Date to be announced";

  let year;
  let month;
  let day;
  const rawValue = String(value).trim();

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    const googleSheetEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(googleSheetEpoch.getTime() + Number(rawValue) * 24 * 60 * 60 * 1000);
    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  } else if (/^\d{4}-\d{2}-\d{2}T/.test(rawValue)) {
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return "Date to be announced";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } else if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    [year, month, day] = rawValue.slice(0, 10).split("-").map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawValue)) {
    const [first, second, year] = rawValue.split("/").map(Number);
    day = second > 12 ? second : first;
    month = second > 12 ? first : second;
    return formatDateParts(year, month, day);
  } else {
    const dateOnlyMatch = rawValue.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      year = Number(dateOnlyMatch[1]);
      month = Number(dateOnlyMatch[2]);
      day = Number(dateOnlyMatch[3]);
    } else {
      const date = new Date(rawValue);
      if (Number.isNaN(date.getTime())) return "Date to be announced";
      year = date.getUTCFullYear();
      month = date.getUTCMonth() + 1;
      day = date.getUTCDate();
    }
  }

  return formatDateParts(year, month, day);
}

function formatDateParts(year, month, day) {
  if (!year || !month || !day) return "Date to be announced";
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function driveImageUrl(value) {
  const url = String(value || "").trim();
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const idMatch = url.match(/[?&]id=([^&]+)/);
  const id = fileMatch ? fileMatch[1] : idMatch ? idMatch[1] : "";

  if (!id) return url;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
}

function eventPoster(eventItem) {
  return driveImageUrl(eventItem.posterUrl || eventItem.poster || "");
}

function renderEventCard(eventItem, completed = false) {
  if (completed) {
    return `
      <article class="completed-event-name">
        <span>${escapeHtml(formatDate(eventItem.date))}</span>
        <h3>${escapeHtml(eventItem.title)}</h3>
      </article>
    `;
  }

  const posterSource = eventPoster(eventItem);
  const poster = posterSource
    ? `<img src="${escapeHtml(posterSource)}" alt="${escapeHtml(eventItem.title)} poster" onerror="this.closest('.event-poster').innerHTML='<span>Poster could not be loaded</span>'">`
    : "<span>Poster coming soon</span>";
  const link = eventItem.link
    ? `<a class="button button-primary" href="${escapeHtml(eventItem.link)}">Register</a>`
    : "";

  return `
    <article class="event-card${completed ? " completed" : ""}">
      <div class="event-poster">${poster}</div>
      <div class="event-body">
        <span class="event-date">${escapeHtml(formatDate(eventItem.date))}</span>
        <h3>${escapeHtml(eventItem.title)}</h3>
        <p>${escapeHtml(eventItem.details)}</p>
        ${link}
      </div>
    </article>
  `;
}

async function renderEvents() {
  if (!activeEvents || !completedEvents) return;

  try {
    const events = (await loadEvents()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const active = events.filter((eventItem) => eventItem.active);
    const completed = events.filter((eventItem) => !eventItem.active);

    activeEvents.innerHTML = active.length
      ? active.map((eventItem) => renderEventCard(eventItem)).join("")
      : '<p class="empty-state">No active events yet.</p>';

    completedEvents.innerHTML = completed.length
      ? completed.map((eventItem) => renderEventCard(eventItem, true)).join("")
      : '<p class="empty-state">Completed events will appear here.</p>';
  } catch {
    activeEvents.innerHTML = '<p class="empty-state">Events could not be loaded right now.</p>';
    completedEvents.innerHTML = '<p class="empty-state">Please refresh again later.</p>';
  }
}

async function renderAdminList() {
  if (!adminEventList) return;

  try {
    const events = await loadEvents();
    adminEventList.innerHTML = events.length
      ? events.map((eventItem) => `
          <div class="admin-event-item">
            <div>
              <strong>${escapeHtml(eventItem.title)}</strong>
              <p>${eventItem.active ? "Active" : "Completed"} - ${escapeHtml(formatDate(eventItem.date))}</p>
            </div>
            <div class="event-actions">
              <button class="small-action" type="button" data-toggle-event="${escapeHtml(eventItem.id)}">
                Mark ${eventItem.active ? "completed" : "active"}
              </button>
              <button class="small-action danger" type="button" data-delete-event="${escapeHtml(eventItem.id)}">Delete</button>
            </div>
          </div>
        `).join("")
      : '<p class="empty-state">No events posted yet.</p>';
  } catch {
    adminEventList.innerHTML = '<p class="empty-state">Events could not be loaded. Check Apps Script deployment access and redeploy it as a new version.</p>';
  }
}

async function showAdminState() {
  const isLoggedIn = localStorage.getItem(ADMIN_KEY) === "true";
  if (adminLoginView) adminLoginView.hidden = isLoggedIn;
  if (adminDashboardView) adminDashboardView.hidden = !isLoggedIn;
  if (isLoggedIn) {
    try {
      await renderAdminList();
    } catch {
      if (adminEventList) {
        adminEventList.innerHTML = '<p class="empty-state">Events could not be loaded right now.</p>';
      }
    }
  }
}

function openAdminModal() {
  if (!adminModal) return;
  adminModal.classList.add("is-open");
  adminModal.setAttribute("aria-hidden", "false");
  showAdminState();
}

function closeAdminModal() {
  if (!adminModal) return;
  adminModal.classList.remove("is-open");
  adminModal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-admin-open]").forEach((button) => {
  button.addEventListener("click", openAdminModal);
});

document.querySelectorAll("[data-admin-close]").forEach((button) => {
  button.addEventListener("click", closeAdminModal);
});

if (adminModal) {
  adminModal.addEventListener("click", (event) => {
    if (event.target === adminModal) closeAdminModal();
  });
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.querySelector("#admin-email").value.trim().toLowerCase();
    const password = document.querySelector("#admin-password").value;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_KEY, "true");
      adminLoginForm.reset();
      if (adminError) adminError.textContent = "";
      showAdminState();
      return;
    }

    if (adminError) adminError.textContent = "Invalid admin email or password.";
  });
}

const logoutButton = document.querySelector("#admin-logout");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_KEY);
    showAdminState();
  });
}

if (eventForm) {
  eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = eventForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Posting...";
    const randomId = window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await createEvent({
      id: randomId,
      title: document.querySelector("#event-title").value.trim(),
      date: document.querySelector("#event-date").value,
      details: document.querySelector("#event-details").value.trim(),
      poster: "",
      posterUrl: document.querySelector("#event-poster-url").value.trim(),
      link: document.querySelector("#event-link").value.trim(),
      active: document.querySelector("#event-active").checked,
      createdAt: new Date().toISOString(),
    });

    eventForm.reset();
    document.querySelector("#event-active").checked = true;
    await renderEvents();
    await renderAdminList();
    submitButton.textContent = originalText;
    submitButton.disabled = false;
    alert("Event posted successfully.");
  });
}

if (adminEventList) {
  adminEventList.addEventListener("click", async (event) => {
    const toggleId = event.target.dataset.toggleEvent;
    const deleteId = event.target.dataset.deleteEvent;
    if (!toggleId && !deleteId) return;

    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = toggleId ? "Updating..." : "Deleting...";

    if (toggleId) await toggleEvent(toggleId);
    if (deleteId) await deleteEvent(deleteId);

    button.textContent = toggleId ? "Done" : "Deleted";
    await renderEvents();
    await renderAdminList();

    setTimeout(() => {
      button.disabled = false;
      button.textContent = originalText;
    }, 800);
  });
}

renderEvents();
showAdminState();
