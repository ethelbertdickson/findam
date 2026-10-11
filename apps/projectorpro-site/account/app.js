const API = "/api/v1";
const loginView = document.querySelector("#login-view");
const accountView = document.querySelector("#account-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const googleSignin = document.querySelector("#google-signin");
const googleError = document.querySelector("#google-error");
const accountError = document.querySelector("#account-error");
const checkoutError = document.querySelector("#checkout-error");

const state = {
  accessToken: sessionStorage.getItem("pp_access_token"),
  refreshToken: sessionStorage.getItem("pp_refresh_token"),
};

function setTokens(result) {
  state.accessToken = result.accessToken;
  state.refreshToken = result.refreshToken;
  sessionStorage.setItem("pp_access_token", state.accessToken);
  sessionStorage.setItem("pp_refresh_token", state.refreshToken);
}

function clearTokens() {
  state.accessToken = null;
  state.refreshToken = null;
  sessionStorage.removeItem("pp_access_token");
  sessionStorage.removeItem("pp_refresh_token");
}

async function request(path, options = {}, retry = true) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (response.status === 401 && retry && state.refreshToken) {
    const refresh = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: state.refreshToken }) });
    if (refresh.ok) { setTokens(await refresh.json()); return request(path, options, false); }
    clearTokens();
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); loginError.hidden = true;
  try {
    const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: document.querySelector("#email").value, password: document.querySelector("#password").value }) }, false);
    setTokens(result); await loadAccount();
  } catch (error) { loginError.textContent = error.message; loginError.hidden = false; }
});

async function setupGoogleSignIn() {
  try {
    const config = await request("/auth/google/web/config", {}, false);
    await loadGoogleIdentityScript();
    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.renderButton(googleSignin, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.min(432, Math.max(260, googleSignin.clientWidth || 432)),
    });
  } catch (error) {
    googleError.textContent = "Google sign-in is temporarily unavailable. You can still use email and password.";
    googleError.hidden = false;
  }
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
    script.onload = resolve; script.onerror = () => reject(new Error("Google Identity Services failed to load"));
    document.head.appendChild(script);
  });
}

async function handleGoogleCredential(response) {
  loginError.hidden = true; googleError.hidden = true;
  try {
    const result = await request("/auth/google/web", { method: "POST", body: JSON.stringify({ credential: response.credential }) }, false);
    setTokens(result); await loadAccount();
  } catch (error) { googleError.textContent = error.message; googleError.hidden = false; }
}

document.querySelector("#sign-out").addEventListener("click", async () => {
  try { if (state.refreshToken) await request("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: state.refreshToken }) }, false); } finally { clearTokens(); showLogin(); }
});

async function loadAccount() {
  try {
    const [account, packages] = await Promise.all([request("/projectorpro/account"), request("/projectorpro/credits/packages", { method: "GET" }, false)]);
    renderAccount(account); renderPackages(packages); loginView.hidden = true; accountView.hidden = false; document.body.classList.remove("show-login");
  } catch (error) { clearTokens(); showLogin(); loginError.textContent = error.message; loginError.hidden = false; }
}

function showLogin() { loginView.hidden = false; accountView.hidden = true; document.body.classList.add("show-login"); }
function minutes(seconds) { return `${Math.floor((seconds || 0) / 60)}m ${String((seconds || 0) % 60).padStart(2, "0")}s`; }
function money(kobo) { return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`; }
function date(value) { return value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"; }

function renderAccount(account) {
  const user = account.user; const credits = account.credits;
  document.querySelector("#welcome").textContent = `Welcome, ${user.firstName}`;
  document.querySelector("#account-name").textContent = `${user.firstName} ${user.lastName}`;
  document.querySelector("#account-email").textContent = user.email;
  document.querySelector("#account-currency").textContent = user.currencyCode || "NGN";
  document.querySelector("#account-created").textContent = date(user.createdAt);
  document.querySelector("#trial-remaining").textContent = minutes(credits.trial.remainingSeconds);
  document.querySelector("#purchased-remaining").textContent = minutes(credits.purchased.remainingSeconds);
  document.querySelector("#total-remaining").textContent = minutes(credits.totalSeconds);
  document.querySelector("#trial-detail").textContent = `${minutes(credits.trial.grantedSeconds)} granted · ${minutes(credits.trial.usedSeconds)} used`;
  document.querySelector("#purchased-detail").textContent = `${minutes(credits.purchased.grantedSeconds)} purchased · ${minutes(credits.purchased.usedSeconds)} used`;
  const purchases = document.querySelector("#purchases");
  purchases.innerHTML = account.purchases.length ? account.purchases.map((purchase) => `<div class="purchase"><div><strong>${purchase.packageCode}</strong><small>${date(purchase.createdAt)} · ${purchase.status}</small></div><span>${money(purchase.amountKobo)}</span></div>`).join("") : `<p class="muted">No purchases yet. Your trial is ready to use.</p>`;
}

function renderPackages(packages) {
  document.querySelector("#packages").innerHTML = packages.map((item) => `<article class="package"><div><strong>${item.minutes} minutes</strong><small>${item.code} · ${money(item.amountKobo)}</small></div><button class="primary small" data-package="${item.code}" type="button">Top up</button></article>`).join("");
  document.querySelectorAll("[data-package]").forEach((button) => button.addEventListener("click", () => checkout(button.dataset.package)));
}

async function checkout(packageCode) {
  checkoutError.hidden = true;
  try { const result = await request("/projectorpro/credits/checkout", { method: "POST", body: JSON.stringify({ packageCode }) }); window.location.href = result.authorizationUrl; }
  catch (error) { checkoutError.textContent = error.message; checkoutError.hidden = false; }
}

if (state.accessToken) loadAccount();
else { showLogin(); setupGoogleSignIn(); }
