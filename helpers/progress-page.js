import { pageState } from "./state.js";
import { coursesArray } from "./projects-page.js";

const progressPageContent = document.getElementById("progress-page-content");

const progressClassSelect = document.getElementById("progress-page-class-select");
const progressProjectSelect = document.getElementById("progress-page-project-select");
const progressStats = document.getElementById("progress-stats");

progressClassSelect.addEventListener("change", () => {
    updateProgressProjectDropdown();
    updateProgressStats();
});

progressProjectSelect.addEventListener("change", () => {
    updateProgressStats();
});

export function updateProgressPageVisibility() {
    const onProgressPage = pageState.currentPage === "progress";

    progressPageContent.classList.toggle("hidden", !onProgressPage);

    if (onProgressPage) {
        updateProgressClassDropdown();
        updateProgressProjectDropdown();
        updateProgressStats();
    }
}

export function updateProgressClassDropdown() {
    const previouslySelected = progressClassSelect.value;

    progressClassSelect.innerHTML = ""; // Remove old options

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a class";
    placeholder.disabled = true;
    progressClassSelect.appendChild(placeholder);

    for (const course of coursesArray) {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent = course.name;
        progressClassSelect.appendChild(option);
    }

    if (coursesArray.some(course => course.id === previouslySelected)) {
        progressClassSelect.value = previouslySelected;
    } else {
        placeholder.selected = true;
    }
}

export function updateProgressProjectDropdown() {
    progressProjectSelect.innerHTML = ""; // Remove old options

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a project";
    placeholder.selected = true;
    placeholder.disabled = true;
    progressProjectSelect.appendChild(placeholder);

    const selectedCourse = coursesArray.find(course => course.id === progressClassSelect.value);
    if (selectedCourse) {
        for (const project of selectedCourse.projects) {
            const option = document.createElement("option");
            option.value = project.id;
            option.textContent = project.name;
            progressProjectSelect.appendChild(option);
        }
    }
}

export function updateProgressStats() {
    progressStats.innerHTML = ""; // Clear old stats

    const course = coursesArray.find(course => course.id === progressClassSelect.value);

    if (!course) {
        const placeholder = document.createElement("p");
        placeholder.id = "progress-stats-placeholder";
        placeholder.textContent = "Select a class or project to see its stats.";
        progressStats.appendChild(placeholder);
        return;
    }

    const project = course.projects.find(project => project.id === progressProjectSelect.value);

    const title = document.createElement("h2");
    title.classList.add("progress-stats-title");
    progressStats.appendChild(title);

    if (project) {
        title.textContent = project.name;

        addStatLine("Total study sessions:", project.sessions.length);
        addStatLine("Total time studied:", formatDuration(project.totalStudyTime));
        return;
    }

    title.textContent = course.name;

    const totalSessions = course.projects.reduce((sum, project) => sum + project.sessions.length, 0);

    addStatLine("Total study sessions:", totalSessions);
    addStatLine("Total time studied:", formatDuration(course.totalStudyTime));
    addStatLine("Number of projects:", course.projects.length);
}

function addStatLine(label, value) {
    const line = document.createElement("p");
    line.classList.add("progress-stat-line");

    const labelSpan = document.createElement("span");
    labelSpan.classList.add("progress-stat-label");
    labelSpan.textContent = label;

    line.appendChild(labelSpan);
    line.append(" " + value);

    progressStats.appendChild(line);
}

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Populate placeholders on initial load
updateProgressClassDropdown();
updateProgressProjectDropdown();
updateProgressStats();