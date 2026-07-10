import {
    drawNormalMainBackground,
    initStudyPage,
    redrawStudyPageBackground,
    updateStudyPageVisibility
} from "./helpers/study-page.js";
import { updateDropdown, 
        updateProjectsPageVisibility
} from "./helpers/projects-page.js";
import { updateProgressPageVisibility } from "./helpers/progress-page.js";
import { updateSettingsPageVisibility } from "./helpers/settings-page.js";
import { pageNames, pageState } from "./helpers/state.js";
import { disableWakeLock } from "./helpers/wakelock.js";
import "./helpers/auth-page.js";

const mainCanvas = document.getElementById("main");
const mainCtx = mainCanvas.getContext("2d");

initStudyPage({
    mainCanvas: mainCanvas,
    mainCtx: mainCtx
});
drawNormalMainBackground();
updateDropdown();
disableWakeLock();

const pageButtons = {
    timer: document.getElementById("timer-page-button"),
    projects: document.getElementById("projects-page-button"),
    progress: document.getElementById("progress-page-button"),
    settings: document.getElementById("settings-page-button")
};

const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");

function updatePageText() {
    pageTitle.textContent = pageNames[pageState.currentPage].title;
    pageDescription.textContent = pageNames[pageState.currentPage].description;
}

function updateSelectedButton() {
    pageButtons.timer.classList.toggle("selected", pageState.currentPage === "timer");
    pageButtons.projects.classList.toggle("selected", pageState.currentPage === "projects");
    pageButtons.progress.classList.toggle("selected", pageState.currentPage === "progress");
    pageButtons.settings.classList.toggle("selected", pageState.currentPage === "settings");

    redrawStudyPageBackground();
    updatePageText();
    updateStudyPageVisibility();
    updateProjectsPageVisibility();
    updateProgressPageVisibility();
    updateSettingsPageVisibility();
}

function goToPage(pageName) {
    pageState.currentPage = pageName;
    updateSelectedButton();
}

pageButtons.timer.onclick = () => goToPage("timer");
pageButtons.projects.onclick = () => goToPage("projects");
pageButtons.progress.onclick = () => goToPage("progress");
pageButtons.settings.onclick = () => goToPage("settings");

updateSelectedButton();