import { db } from "./db.js";
import { loadCoursesFromDatabase, clearCoursesArray } from "./projects-page.js";
import { updateTimerPageClassDropdown, updateTimerPageProjectDropdown } from "./study-page.js";
import { updateProgressClassDropdown, updateProgressProjectDropdown, updateProgressStats } from "./progress-page.js";

const emailInput = document.getElementById("auth-email-input");
const passwordInput = document.getElementById("auth-password-input");
const submitButton = document.getElementById("auth-submit-button");
const toggleModeButton = document.getElementById("auth-toggle-mode-button");
const authError = document.getElementById("auth-error-message");
const authHeading = document.getElementById("auth-heading");
const signOutButton = document.getElementById("sign-out-button");

let mode = "sign-in"; // or "sign-up"

function setMode(newMode) {
    mode = newMode;
    hideMessage();

    if (mode === "sign-in") {
        authHeading.textContent = "Log in";
        submitButton.textContent = "Log in";
        toggleModeButton.textContent = "Need an account? Sign up";
    } else {
        authHeading.textContent = "Sign up";
        submitButton.textContent = "Sign up";
        toggleModeButton.textContent = "Already have an account? Log in";
    }
}

function showError(message) {
    authError.textContent = message;
    authError.classList.remove("hidden", "auth-notice");
    authError.classList.add("auth-error");
}

function showNotice(message) {
    authError.textContent = message;
    authError.classList.remove("hidden", "auth-error");
    authError.classList.add("auth-notice");
}

function hideMessage() {
    authError.classList.add("hidden");
}

toggleModeButton.addEventListener("click", () => {
    setMode(mode === "sign-in" ? "sign-up" : "sign-in");
});

submitButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError("Please enter an email and password.");
        return;
    }

    submitButton.disabled = true;

    const { data, error } = mode === "sign-in"
        ? await db.auth.signInWithPassword({ email, password })
        : await db.auth.signUp({ email, password });

    submitButton.disabled = false;

    if (error) {
        showError(error.message);
        return;
    }

    if (mode === "sign-up" && !data.session) {
        // Email confirmation is turned on for this project — there's no
        // session yet until the user clicks the link in their inbox.
        showNotice("Account created — check your email to confirm, then log in.");
        setMode("sign-in");
    }
});

signOutButton.addEventListener("click", () => {
    db.auth.signOut();
});

// The Projects page refreshes its own dropdowns internally inside
// loadCoursesFromDatabase()/clearCoursesArray(). The Timer and Progress
// pages show the same course/project data in their own separate
// dropdowns, but normally only refresh those when you navigate onto that
// page — so without this, whichever page happens to be showing when you
// log in (usually the Timer page, since it's the default) would display
// empty/stale dropdowns until you clicked away and back.
function refreshCourseDependentDropdowns() {
    updateTimerPageClassDropdown();
    updateTimerPageProjectDropdown();
    updateProgressClassDropdown();
    updateProgressProjectDropdown();
    updateProgressStats();
}

db.auth.onAuthStateChange((event, session) => {
    const loggedIn = !!session;

    document.body.classList.toggle("logged-out", !loggedIn);

    if (loggedIn) {
        emailInput.value = "";
        passwordInput.value = "";
        loadCoursesFromDatabase().then(refreshCourseDependentDropdowns);
    } else {
        // Make sure the next person to use this browser doesn't see
        // whatever the previous person had loaded.
        clearCoursesArray();
        refreshCourseDependentDropdowns();
    }
});