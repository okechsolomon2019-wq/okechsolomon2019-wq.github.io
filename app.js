const USER_KEY = "moses-lounge-user";
const ACCOUNTS_KEY = "moses-lounge-accounts";
const BOOKINGS_KEY = "moses-lounge-bookings";
const CLUB_PACKAGE = {
  price: 500,
  currency: "USD",
  priceLabel: "500 USD",
  items: "4 bags of water, 6 crates of soda, 1 bottle of Jameson, 1 bottle of Jack Daniel's"
};

const accountDialog = document.querySelector("#account-dialog");
const bookingDialog = document.querySelector("#booking-dialog");
const authForm = document.querySelector("#auth-form");
const bookingForm = document.querySelector("#booking-form");
const authMessage = document.querySelector("#auth-message");
const bookingMessage = document.querySelector("#booking-message");
const toast = document.querySelector("#toast");
const nameField = document.querySelector("#name-field");
const authSubmit = document.querySelector("#auth-submit");
const googleSignin = document.querySelector("#google-signin");
const bookingSection = document.querySelector("#my-bookings");
const bookingList = document.querySelector("#booking-list");
const navAccount = document.querySelector(".nav-account");
const bookingUnitRow = document.querySelector("#unit-row");
const bookingUnitLabel = document.querySelector("#unit-label");
const bookingUnit = document.querySelector("#booking-unit");
const durationField = document.querySelector("#duration-field");
const bookingDuration = document.querySelector("#booking-form select[name='duration']");
const bookingPrice = document.querySelector("#booking-price");

let authMode = "signin";
let pendingService = "";
let pendingBooking = false;
let toastTimer;

function readStore(key, fallback) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : JSON.parse(value);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 5000);
}

function showMessage(element, message, isSuccess = false) {
  element.textContent = message;
  element.classList.toggle("success", isSuccess);
}

function getCurrentUser() {
  const email = localStorage.getItem(USER_KEY);
  if (!email) return null;
  const accounts = readStore(ACCOUNTS_KEY, {});
  const user = accounts[email];
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
  return { email, name: user.name };
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    const active = tab.dataset.authTab === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  nameField.hidden = mode !== "signup";
  nameField.querySelector("input").required = mode === "signup";
  authForm.elements.password.autocomplete = mode === "signup" ? "new-password" : "current-password";
  authSubmit.innerHTML = mode === "signup"
    ? 'Create account <span aria-hidden="true">↗</span>'
    : 'Log in <span aria-hidden="true">↗</span>';
  showMessage(authMessage, "");
}

function renderAccount() {
  const user = getCurrentUser();
  navAccount.textContent = user ? "Log out" : "Log in";
  navAccount.dataset.accountAction = user ? "logout" : "signin";
  bookingSection.hidden = !user;
  if (user) renderBookings(user.email);
}

function renderBookings(email) {
  const bookings = readStore(BOOKINGS_KEY, []).filter((booking) => booking.email === email);
  bookingList.replaceChildren();
  if (bookings.length === 0) {
    const empty = document.createElement("p");
    empty.className = "form-note";
    empty.textContent = "You don't have any booking requests yet. Choose a space above to get started.";
    bookingList.append(empty);
    return;
  }
  bookings.slice().reverse().forEach((booking) => {
    const card = document.createElement("article");
    card.className = "booking-item";
    const detail = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = booking.service;
    const description = document.createElement("p");
    const unit = booking.unitNumber ? `Unit ${booking.unitNumber} · ` : "";
    const period = booking.durationLabel ? ` · ${booking.durationLabel}` : "";
    const price = booking.priceLabel ? ` · ${booking.priceLabel}` : "";
    const included = booking.packageItems ? ` · Includes: ${booking.packageItems}` : "";
    description.textContent = `${unit}${booking.date}${period}${price} · ${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}${included}${booking.notes ? ` · ${booking.notes}` : ""}`;
    const status = document.createElement("span");
    status.className = "booking-status";
    status.textContent = "Request sent";
    detail.append(title, description);
    card.append(detail, status);
    bookingList.append(card);
  });
}

function localDateString(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function updateBookingOptions() {
  const service = bookingForm.elements.service.value;
  const isRoom = service === "Accommodation room";
  const isShop = service === "Shop rental";
  const hasUnit = isRoom || isShop;

  bookingUnitRow.hidden = !hasUnit;
  bookingUnit.required = hasUnit;
  bookingUnitLabel.textContent = isRoom ? "Choose a room" : "Choose a shop";
  durationField.hidden = !isRoom;
  bookingDuration.required = isRoom;
  if (bookingUnit.dataset.kind !== service) {
    bookingUnit.replaceChildren(new Option("Choose a unit", ""));
    const count = isRoom ? 20 : 15;
    for (let number = 1; number <= count; number += 1) {
      bookingUnit.add(new Option(`${isRoom ? "Room" : "Shop"} ${number}`, String(number)));
    }
    bookingUnit.dataset.kind = service;
  }

  if (isShop) {
    bookingDuration.value = "";
    bookingPrice.textContent = "Shop rent: 250 USD per month.";
  } else if (isRoom) {
    const rates = {
      "half-day": "50,000 SSP for half a day",
      "full-day": "100,000 SSP for a full day",
      "monthly-room": "800 USD per month"
    };
    bookingPrice.textContent = rates[bookingDuration.value] || "Select a room and rental period to see the price.";
  } else if (service === "Lounge & club") {
    bookingPrice.textContent = `Club package: ${CLUB_PACKAGE.priceLabel}. Includes ${CLUB_PACKAGE.items}.`;
  } else {
    bookingPrice.textContent = "";
  }
}

function openBooking(service = "") {
  try {
    if (!getCurrentUser()) {
      pendingService = service;
      pendingBooking = true;
      setAuthMode("signin");
      authForm.reset();
      accountDialog.showModal();
      return;
    }
    bookingForm.reset();
    bookingForm.elements.service.value = service;
    bookingForm.elements.guests.value = "2";
    bookingForm.elements.date.min = localDateString();
    updateBookingOptions();
    showMessage(bookingMessage, "");
    bookingDialog.showModal();
  } catch (error) {
    showToast(`Could not open bookings: ${error.message}`);
  }
}

async function passwordDigest(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: 120000,
    hash: "SHA-256"
  }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  showMessage(authMessage, "");
  const form = new FormData(authForm);
  const email = String(form.get("email")).trim().toLowerCase();
  const password = String(form.get("password"));
  const name = String(form.get("name") || "").trim();

  try {
    if (!crypto.subtle) throw new Error("Secure sign-in is unavailable in this browser. Open the site over HTTPS.");
    const accounts = readStore(ACCOUNTS_KEY, {});
    if (authMode === "signup") {
      if (accounts[email]) {
        showMessage(authMessage, "An account with that email already exists on this device.");
        return;
      }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      accounts[email] = { name, salt: bytesToHex(salt), passwordHash: await passwordDigest(password, salt) };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } else {
      const account = accounts[email];
      if (!account) {
        showMessage(authMessage, "We couldn't find an account with that email on this device. Create an account to get started.");
        return;
      }
      const salt = Uint8Array.from(account.salt.match(/.{2}/g), (byte) => parseInt(byte, 16));
      if (await passwordDigest(password, salt) !== account.passwordHash) {
        showMessage(authMessage, "That password doesn't match. Please try again.");
        return;
      }
    }

    localStorage.setItem(USER_KEY, email);
    renderAccount();
    const shouldOpenBooking = pendingBooking;
    const service = pendingService;
    pendingBooking = false;
    pendingService = "";
    accountDialog.close();
    authForm.reset();
    showToast(authMode === "signup" ? "Your account is ready on this device. Welcome!" : "You're logged in. Welcome back!");
    if (shouldOpenBooking) openBooking(service);
  } catch (error) {
    showMessage(authMessage, `We couldn't save your account: ${error.message}`);
  }
}

function handleBookingSubmit(event) {
  event.preventDefault();
  showMessage(bookingMessage, "");
  try {
    const user = getCurrentUser();
    if (!user) {
      bookingDialog.close();
      openBooking(bookingForm.elements.service.value);
      return;
    }
    const form = new FormData(bookingForm);
    const service = String(form.get("service"));
    const duration = String(form.get("duration") || "");
    const rentalRates = {
      "half-day": { label: "Half day", priceLabel: "50,000 SSP", price: 50000, currency: "SSP" },
      "full-day": { label: "Full day", priceLabel: "100,000 SSP", price: 100000, currency: "SSP" },
      "monthly-room": { label: "Monthly", priceLabel: "800 USD", price: 800, currency: "USD" },
      "monthly-shop": { label: "Monthly", priceLabel: "250 USD", price: 250, currency: "USD" }
    };
    const rental = rentalRates[service === "Shop rental" ? "monthly-shop" : duration];
    const booking = {
      id: crypto.randomUUID(),
      email: user.email,
      service,
      date: String(form.get("date")),
      guests: Number(form.get("guests")),
      notes: String(form.get("notes") || "").trim(),
      createdAt: new Date().toISOString()
    };
    if (service === "Accommodation room" || service === "Shop rental") {
      booking.unitNumber = String(form.get("unit"));
      booking.durationLabel = rental.label;
      booking.priceLabel = rental.priceLabel;
      booking.price = rental.price;
      booking.currency = rental.currency;
    } else if (service === "Lounge & club") {
      booking.priceLabel = CLUB_PACKAGE.priceLabel;
      booking.price = CLUB_PACKAGE.price;
      booking.currency = CLUB_PACKAGE.currency;
      booking.packageItems = CLUB_PACKAGE.items;
    }
    const bookings = readStore(BOOKINGS_KEY, []);
    bookings.push(booking);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    bookingDialog.close();
    renderBookings(user.email);
    showToast("Booking request saved! Please call Mandel Peter to confirm availability.");
  } catch (error) {
    showMessage(bookingMessage, `We couldn't save your booking: ${error.message}`);
  }
}

document.querySelectorAll("[data-book]").forEach((button) => {
  button.addEventListener("click", () => openBooking());
});
document.querySelectorAll("[data-book-service]").forEach((button) => {
  button.addEventListener("click", () => openBooking(button.dataset.bookService));
});
document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    authForm.reset();
    setAuthMode(tab.dataset.authTab);
  });
});
navAccount.addEventListener("click", () => {
  if (navAccount.dataset.accountAction === "logout") {
    try {
      localStorage.removeItem(USER_KEY);
      renderAccount();
      showToast("You have been logged out.");
    } catch (error) {
      showToast(`Could not log out: ${error.message}`);
    }
    return;
  }
  pendingService = "";
  pendingBooking = false;
  setAuthMode("signin");
  authForm.reset();
  accountDialog.showModal();
});
googleSignin.addEventListener("click", () => {
  showMessage(authMessage, "Google sign-in is not connected yet. Gmail addresses can sign in with the email form; verified Google sign-in needs an OAuth client ID and server-side account verification.");
});
bookingForm.elements.service.addEventListener("change", updateBookingOptions);
bookingDuration.addEventListener("change", updateBookingOptions);
authForm.addEventListener("submit", handleAuthSubmit);
bookingForm.addEventListener("submit", handleBookingSubmit);
accountDialog.addEventListener("close", () => {
  pendingService = "";
  pendingBooking = false;
});
document.querySelector("#year").textContent = String(new Date().getFullYear());

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  siteNav.classList.toggle("is-open", !isOpen);
});
siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

try {
  renderAccount();
} catch (error) {
  showToast(`Your saved data could not be loaded: ${error.message}`);
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Offline app setup failed:", error);
    });
  });
}
