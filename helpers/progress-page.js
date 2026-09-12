import { pageState } from "./state.js";
import { coursesArray } from "./projects-page.js";

const progressPageContent = document.getElementById("progress-page-content");
const progressClassSelect = document.getElementById("progress-page-class-select");
const progressProjectSelect = document.getElementById("progress-page-project-select");
const progressDateFilters = document.getElementById("progress-date-filters");
const progressStartDateInput = document.getElementById("progress-page-start-date");
const progressEndDateInput = document.getElementById("progress-page-end-date");
const progressStats = document.getElementById("progress-stats");

progressClassSelect.addEventListener("change", () => {
    updateProgressProjectDropdown();
    updateProgressDateFiltersVisibility();
    updateProgressStats();
});

progressProjectSelect.addEventListener("change", updateProgressStats);
progressStartDateInput.addEventListener("change", updateProgressStats);
progressEndDateInput.addEventListener("change", updateProgressStats);

export function updateProgressPageVisibility() {
    const onProgressPage = pageState.currentPage === "progress";
    progressPageContent.classList.toggle("hidden", !onProgressPage);

    if (onProgressPage) {
        updateProgressClassDropdown();
        updateProgressProjectDropdown();
        updateProgressDateFiltersVisibility();
        updateProgressStats();
    }
}

export function updateProgressClassDropdown() {
    const previouslySelected = progressClassSelect.value;
    progressClassSelect.innerHTML = "";
    progressClassSelect.appendChild(createOption("", "All classes"));

    for (const course of coursesArray) {
        progressClassSelect.appendChild(createOption(course.id, course.name));
    }

    if (coursesArray.some(course => course.id === previouslySelected)) {
        progressClassSelect.value = previouslySelected;
    } else {
        progressClassSelect.selectedIndex = 0;
    }

    updateProgressDateFiltersVisibility();
}

function updateProgressDateFiltersVisibility() {
    const showingAllClasses = !progressClassSelect.value;
    progressDateFilters.classList.toggle("hidden", !showingAllClasses);
    progressStartDateInput.disabled = !showingAllClasses;
    progressEndDateInput.disabled = !showingAllClasses;
}

export function updateProgressProjectDropdown() {
    const previouslySelected = progressProjectSelect.value;
    progressProjectSelect.innerHTML = "";
    progressProjectSelect.appendChild(createOption("", "All projects", false));

    const selectedCourse = coursesArray.find(course => course.id === progressClassSelect.value);
    for (const project of selectedCourse?.projects || []) {
        progressProjectSelect.appendChild(createOption(project.id, project.name));
    }

    if (selectedCourse?.projects.some(project => project.id === previouslySelected)) {
        progressProjectSelect.value = previouslySelected;
    }
}

export function updateProgressStats() {
    progressStats.innerHTML = "";
    const course = coursesArray.find(course => course.id === progressClassSelect.value);

    if (!course) {
        renderAllSessionsProgress();
        return;
    }

    const project = course.projects.find(item => item.id === progressProjectSelect.value);
    const sessions = (project ? project.sessions : course.projects.flatMap(item => item.sessions))
        .filter(session => Number.isFinite(Number(session.duration)) && session.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalTime = sessions.reduce((sum, session) => sum + Number(session.duration), 0);

    progressStats.appendChild(createText("h2", project ? project.name : course.name, "progress-stats-title"));
    addStatLine("Total study sessions:", sessions.length);
    addStatLine("Total time studied:", formatDuration(totalTime));
    if (!project) addStatLine("Number of projects:", course.projects.length);

    if (!sessions.length) {
        progressStats.appendChild(createText("p", "Log a study session to start building your progress graphs.", "progress-chart-empty"));
        return;
    }

    progressStats.appendChild(createSessionChart(sessions));
    progressStats.appendChild(createCumulativeChart(sessions));
}

function renderAllSessionsProgress() {
    const { start, end, isInvalid } = getSelectedDateRange();
    if (isInvalid) {
        progressStats.appendChild(createText("p", "The end date must be on or after the start date.", "progress-stats-placeholder"));
        return;
    }

    const sessions = coursesArray.flatMap(course => course.projects.flatMap(project =>
        project.sessions.map(session => ({ ...session, courseName: course.name, projectName: project.name }))
    )).filter(session => Number.isFinite(Number(session.duration)) && session.date)
        .filter(session => isInDateRange(session.date, start, end))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalTime = sessions.reduce((sum, session) => sum + Number(session.duration), 0);

    progressStats.appendChild(createText("h2", getDateRangeTitle(start, end), "progress-stats-title"));
    addStatLine("Study sessions:", sessions.length);
    addStatLine("Total time studied:", formatDuration(totalTime));

    if (!sessions.length) {
        progressStats.appendChild(createText("p", "No study sessions were recorded in this date range.", "progress-chart-empty"));
        return;
    }

    const list = document.createElement("div");
    list.className = "progress-sessions-list";
    sessions.forEach(session => {
        const item = document.createElement("div");
        item.className = "progress-session-row";
        const details = document.createElement("div");
        details.append(
            createText("strong", session.title || "Study session"),
            createText("span", `${session.courseName} · ${session.projectName} · ${formatLongDate(localDate(session.date))}`)
        );
        item.append(details, createText("strong", formatDurationFriendly(Number(session.duration))));
        list.appendChild(item);
    });
    progressStats.appendChild(list);
}

function getSelectedDateRange() {
    const start = dateInputValue(progressStartDateInput.value);
    const end = dateInputValue(progressEndDateInput.value);
    return { start, end, isInvalid: Boolean(start && end && end < start) };
}

function dateInputValue(value) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function isInDateRange(value, start, end) {
    const date = localDate(value);
    return (!start || date >= start) && (!end || date <= end);
}

function getDateRangeTitle(start, end) {
    if (start && end && start.getTime() === end.getTime()) return `Study sessions on ${formatLongDate(start)}`;
    if (start && end) return `Study sessions from ${formatLongDate(start)} to ${formatLongDate(end)}`;
    if (start) return `Study sessions from ${formatLongDate(start)}`;
    if (end) return `Study sessions through ${formatLongDate(end)}`;
    return "All study sessions";
}

function createSessionChart(sessions) {
    const bestWeek = getBestWeek(sessions);

    const section = createChartSection("Session length", "Time spent in each study session");
    const chartTitle = section.querySelector("h3");
    const chartDescription = section.querySelector("p");
    const controls = document.createElement("div");
    controls.className = "progress-chart-controls";
    const canvas = document.createElement("div");
    canvas.className = "progress-chart-canvas";

    const options = { mean: false, median: false, bestWeek: false, view: "session", includeEmptyDays: false };
    const viewLabel = document.createElement("label");
    viewLabel.className = "chart-range-label";
    viewLabel.textContent = "View";
    const viewSelect = document.createElement("select");
    viewSelect.className = "chart-range-select";
    viewSelect.append(createOption("session", "Per session"), createOption("day", "Per day"));
    viewLabel.appendChild(viewSelect);
    controls.appendChild(viewLabel);

    const emptyDaysInput = document.createElement("input");
    emptyDaysInput.type = "checkbox";
    const emptyDaysLabel = document.createElement("label");
    emptyDaysLabel.className = "chart-toggle hidden";
    emptyDaysLabel.append(emptyDaysInput, document.createTextNode("Include days without study"));
    controls.appendChild(emptyDaysLabel);

    const metrics = document.createElement("div");
    metrics.className = "progress-chart-metrics";
    const render = () => {
        const points = options.view === "day" ? groupSessionsByDay(sessions, options.includeEmptyDays) : sessions;
        const { mean, median } = getDurationStats(points);
        chartTitle.textContent = options.view === "day" ? "Daily study time" : "Session length";
        chartDescription.textContent = options.view === "day" ? "Total study time for each day" : "Time spent in each study session";
        renderSessionBars(canvas, points, mean, median, bestWeek, options);
        metrics.innerHTML = "";
        addMetric(metrics, "Mean", formatDurationFriendly(mean));
        addMetric(metrics, "Median", formatDurationFriendly(median));
        addMetric(metrics, "Most focused week", `${formatWeek(bestWeek.start)} · ${formatDurationFriendly(bestWeek.total)}`);
    };

    viewSelect.addEventListener("change", () => {
        options.view = viewSelect.value;
        emptyDaysLabel.classList.toggle("hidden", options.view !== "day");
        render();
    });
    emptyDaysInput.addEventListener("change", () => {
        options.includeEmptyDays = emptyDaysInput.checked;
        render();
    });
    [
        ["mean", "Show mean"],
        ["median", "Show median"],
        ["bestWeek", "Highlight best week"]
    ].forEach(([key, label]) => {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.addEventListener("change", () => {
            options[key] = input.checked;
            render();
        });
        const optionLabel = document.createElement("label");
        optionLabel.className = "chart-toggle";
        optionLabel.append(input, document.createTextNode(label));
        controls.appendChild(optionLabel);
    });

    section.append(controls, canvas, metrics);
    render();
    return section;
}

function createCumulativeChart(sessions) {
    const section = createChartSection("Study time over time", "Your cumulative study hours");
    const controls = document.createElement("div");
    controls.className = "progress-chart-controls progress-chart-controls-single";
    const label = document.createElement("label");
    label.className = "chart-range-label";
    label.textContent = "End timeline at";
    const select = document.createElement("select");
    select.className = "chart-range-select";
    select.append(createOption("last", "Last study session"), createOption("now", "Today"));
    label.appendChild(select);
    controls.appendChild(label);

    const canvas = document.createElement("div");
    canvas.className = "progress-chart-canvas";
    select.addEventListener("change", () => renderCumulativeLine(canvas, sessions, select.value));
    section.append(controls, canvas);
    renderCumulativeLine(canvas, sessions, select.value);
    return section;
}

function renderSessionBars(container, points, mean, median, bestWeek, options) {
    const width = 700;
    const height = 270;
    const pad = { top: 24, right: 44, bottom: 48, left: 64 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const max = Math.max(...points.map(item => Number(item.duration)), mean, median, 60) * 1.15;
    const y = value => pad.top + plotHeight - (value / max) * plotHeight;
    const step = plotWidth / points.length;
    const barWidth = Math.max(3, Math.min(34, step * 0.68));
    const bestStart = bestWeek.start.getTime();
    const bestEnd = bestStart + 7 * 86400000;
    let bars = "";
    let highlight = "";
    let firstHighlighted = Infinity;
    let lastHighlighted = -Infinity;

    points.forEach((session, index) => {
        const date = localDate(session.date).getTime();
        if (date >= bestStart && date < bestEnd) {
            firstHighlighted = Math.min(firstHighlighted, index);
            lastHighlighted = Math.max(lastHighlighted, index);
        }
        const barHeight = Math.max(1, pad.top + plotHeight - y(Number(session.duration)));
        const x = pad.left + index * step + (step - barWidth) / 2;
        const name = options.view === "day" ? (session.title || "Daily study total") : (session.title || `Study session ${index + 1}`);
        bars += `<rect class="chart-bar" x="${x.toFixed(1)}" y="${y(Number(session.duration)).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" tabindex="0" data-tooltip="${escapeHtml(`${name} · ${formatLongDate(localDate(session.date))} · ${formatDurationFriendly(Number(session.duration))}`)}"/>`;
    });
    if (options.bestWeek && lastHighlighted >= 0) {
        const x = pad.left + firstHighlighted * step;
        const highlightedWidth = (lastHighlighted - firstHighlighted + 1) * step;
        highlight = `<rect class="chart-week-highlight" x="${x.toFixed(1)}" y="${pad.top}" width="${highlightedWidth.toFixed(1)}" height="${plotHeight}" rx="5"/>`;
    }

    const grid = gridLines(pad, plotWidth, plotHeight, max, y, "minutes");
    const lines = [
        options.mean && chartReferenceLine(mean, "mean", "Mean", pad, plotWidth, y),
        options.median && chartReferenceLine(median, "median", "Median", pad, plotWidth, y)
    ].filter(Boolean).join("");
    const labelStep = Math.max(1, Math.ceil(points.length / 6));
    const xLabels = points.map((point, index) => index % labelStep === 0 || index === points.length - 1
        ? `<text class="chart-axis-text" x="${(pad.left + index * step + step / 2).toFixed(1)}" y="${height - 16}" text-anchor="middle">${options.view === "day" ? formatShortDate(localDate(point.date)) : index + 1}</text>` : "").join("");

    const xAxisTitle = options.view === "day" ? "Study days" : "Study sessions";
    container.innerHTML = chartSvg(width, height, `${grid}${highlight}${bars}${lines}<text class="chart-axis-title" x="${pad.left + plotWidth / 2}" y="${height - 2}" text-anchor="middle">${xAxisTitle}</text>${xLabels}`);
    attachChartTooltip(container);
}

function renderCumulativeLine(container, sessions, endMode) {
    const width = 700;
    const height = 270;
    const pad = { top: 24, right: 44, bottom: 48, left: 64 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const start = startOfDay(localDate(sessions[0].date));
    const lastSession = startOfDay(localDate(sessions[sessions.length - 1].date));
    const today = startOfDay(new Date());
    const end = endMode === "now" && today > lastSession ? today : lastSession;
    const span = Math.max(1, end - start);
    const points = [];
    let total = 0;
    sessions.forEach(session => {
        total += Number(session.duration);
        points.push({ date: startOfDay(localDate(session.date)), total });
    });
    const max = Math.max(total, 60) * 1.12;
    const x = date => pad.left + ((date - start) / span) * plotWidth;
    const y = value => pad.top + plotHeight - (value / max) * plotHeight;
    const path = [`M ${x(start).toFixed(1)} ${y(0).toFixed(1)}`];
    points.forEach(point => path.push(`L ${x(point.date).toFixed(1)} ${y(point.total).toFixed(1)}`));
    if (end > lastSession) path.push(`L ${x(end).toFixed(1)} ${y(total).toFixed(1)}`);
    const grid = gridLines(pad, plotWidth, plotHeight, max, y, "hours");
    const ticks = dateTicks(start, end, 4).map(date => `<text class="chart-axis-text" x="${x(date).toFixed(1)}" y="${height - 16}" text-anchor="middle">${formatShortDate(date)}</text>`).join("");
    const area = `${path.join(" ")} L ${x(end).toFixed(1)} ${y(0).toFixed(1)} L ${x(start).toFixed(1)} ${y(0).toFixed(1)} Z`;
    const pointMarkers = points.map(point => `<circle class="chart-point" cx="${x(point.date).toFixed(1)}" cy="${y(point.total).toFixed(1)}" r="5" tabindex="0" data-tooltip="${escapeHtml(`${formatLongDate(point.date)} — ${formatStudyHours(point.total)} studied`)}"/>`).join("");
    const endpointTooltip = `${formatLongDate(end)} — ${formatStudyHours(total)} studied`;
    container.innerHTML = chartSvg(width, height, `${grid}<path class="chart-area" d="${area}"/><path class="chart-line" d="${path.join(" ")}"/>${pointMarkers}<circle class="chart-end-dot" cx="${x(end).toFixed(1)}" cy="${y(total).toFixed(1)}" r="4" tabindex="0" data-tooltip="${escapeHtml(endpointTooltip)}"/><text class="chart-axis-title" x="${pad.left + plotWidth / 2}" y="${height - 2}" text-anchor="middle">Date</text>${ticks}`);
    attachChartTooltip(container);
}

function attachChartTooltip(container) {
    const tooltip = document.createElement("div");
    tooltip.className = "progress-chart-tooltip";
    tooltip.setAttribute("role", "status");
    container.appendChild(tooltip);

    const hide = () => tooltip.classList.remove("visible");
    const show = (target, clientX, clientY) => {
        const message = target?.getAttribute("data-tooltip");
        if (!message) return hide();
        tooltip.textContent = message;
        const rect = container.getBoundingClientRect();
        tooltip.classList.add("visible");
        const halfWidth = tooltip.offsetWidth / 2;
        const x = Math.max(halfWidth + 8, Math.min(clientX - rect.left, rect.width - halfWidth - 8));
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${clientY - rect.top}px`;
        tooltip.classList.toggle("below", clientY - rect.top < 54);
    };

    container.addEventListener("mousemove", event => show(event.target.closest?.("[data-tooltip]"), event.clientX, event.clientY));
    container.addEventListener("mouseleave", hide);
    container.addEventListener("focusin", event => {
        const target = event.target.closest?.("[data-tooltip]");
        if (!target) return;
        const rect = target.getBoundingClientRect();
        show(target, rect.left + rect.width / 2, rect.top);
    });
    container.addEventListener("focusout", hide);
}

function chartSvg(width, height, content) {
    return `<svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Study progress chart"><text class="chart-y-title" x="16" y="${height / 2}" text-anchor="middle" transform="rotate(-90 16 ${height / 2})">Time</text>${content}</svg>`;
}

function gridLines(pad, plotWidth, plotHeight, max, y, unit) {
    return Array.from({ length: 5 }, (_, index) => {
        const value = max * index / 4;
        const yPosition = y(value);
        const label = unit === "hours" ? `${(value / 3600).toFixed(value >= 36000 ? 0 : 1)}h` : formatAxisDuration(value);
        return `<line class="chart-grid" x1="${pad.left}" x2="${pad.left + plotWidth}" y1="${yPosition.toFixed(1)}" y2="${yPosition.toFixed(1)}"/><text class="chart-axis-text" x="${pad.left - 9}" y="${(yPosition + 4).toFixed(1)}" text-anchor="end">${label}</text>`;
    }).join("");
}

function chartReferenceLine(value, type, label, pad, plotWidth, y) {
    const yPosition = y(value).toFixed(1);
    return `<line class="chart-reference chart-reference-${type}" x1="${pad.left}" x2="${pad.left + plotWidth}" y1="${yPosition}" y2="${yPosition}"/><text class="chart-reference-label chart-reference-${type}" x="${pad.left + plotWidth - 3}" y="${Number(yPosition) - 5}" text-anchor="end">${label}</text>`;
}

function getBestWeek(sessions) {
    const weeks = new Map();
    sessions.forEach(session => {
        const start = startOfWeek(localDate(session.date));
        const key = start.getTime();
        weeks.set(key, (weeks.get(key) || 0) + Number(session.duration));
    });
    let best = { start: startOfWeek(localDate(sessions[0].date)), total: 0 };
    weeks.forEach((total, key) => {
        if (total > best.total) best = { start: new Date(Number(key)), total };
    });
    return best;
}

function groupSessionsByDay(sessions, includeEmptyDays = false) {
    const days = new Map();
    sessions.forEach(session => {
        const date = localDate(session.date);
        const key = date.getTime();
        const existing = days.get(key);
        if (existing) {
            existing.duration += Number(session.duration);
        } else {
            days.set(key, { date: date.toISOString(), duration: Number(session.duration), title: "Daily study total" });
        }
    });
    const groupedDays = [...days.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!includeEmptyDays || groupedDays.length < 2) return groupedDays;

    const allDays = [];
    const end = localDate(groupedDays[groupedDays.length - 1].date);
    for (let date = localDate(groupedDays[0].date); date <= end; date.setDate(date.getDate() + 1)) {
        const key = date.getTime();
        allDays.push(days.get(key) || { date: new Date(date).toISOString(), duration: 0, title: "No study recorded" });
    }
    return allDays;
}

function getDurationStats(items) {
    const durations = items.map(item => Number(item.duration));
    const mean = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const middle = Math.floor(sortedDurations.length / 2);
    const median = sortedDurations.length % 2
        ? sortedDurations[middle]
        : (sortedDurations[middle - 1] + sortedDurations[middle]) / 2;
    return { mean, median };
}

function createChartSection(title, description) {
    const section = document.createElement("section");
    section.className = "progress-chart-section";
    const heading = createText("h3", title, "progress-chart-title");
    const intro = createText("p", description, "progress-chart-description");
    section.append(heading, intro);
    return section;
}

function addMetric(container, label, value) {
    const metric = document.createElement("div");
    metric.className = "progress-chart-metric";
    metric.append(createText("span", label), createText("strong", value));
    container.appendChild(metric);
}

function addStatLine(label, value) {
    const line = document.createElement("p");
    line.className = "progress-stat-line";
    line.append(createText("span", label, "progress-stat-label"), document.createTextNode(` ${value}`));
    progressStats.appendChild(line);
}

function createText(tag, value, className = "") {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
}

function createOption(value, text, disabled = false) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.disabled = disabled;
    return option;
}

function localDate(value) {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function startOfWeek(date) {
    const result = startOfDay(date);
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
    return result;
}
function dateTicks(start, end, count) {
    const span = end - start;
    return Array.from({ length: count + 1 }, (_, index) => new Date(start.getTime() + span * index / count));
}
function formatAxisDuration(seconds) { return seconds >= 3600 ? `${(seconds / 3600).toFixed(1)}h` : `${Math.round(seconds / 60)}m`; }
function formatDurationFriendly(seconds) {
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.round((seconds % 3600) / 60);
    if (minutes === 60) {
        hours += 1;
        minutes = 0;
    }
    if (hours) return `${hours}h ${minutes}m`;
    return minutes ? `${minutes}m` : `${Math.round(seconds)}s`;
}
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds / 60) % 60);
    const remainder = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
function formatWeek(start) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}–${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}
function formatShortDate(date) { return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function formatLongDate(date) { return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function formatStudyHours(seconds) {
    const hours = seconds / 3600;
    return `${hours.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${hours === 1 ? "hour" : "hours"}`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }

updateProgressClassDropdown();
updateProgressProjectDropdown();
updateProgressStats();
