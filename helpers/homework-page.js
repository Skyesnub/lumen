import { pageState } from "./state.js";
import { coursesArray } from "./projects-page.js";
import { db } from "./db.js";

const page = document.getElementById("homework-page-content");
const titleInput = document.getElementById("homework-title-input");
const courseSelect = document.getElementById("homework-course-select");
const projectSelect = document.getElementById("homework-project-select");
const estimateInput = document.getElementById("homework-estimate-input");
const dueDateInput = document.getElementById("homework-due-date-input");
const warning = document.getElementById("homework-warning");
const pendingList = document.getElementById("homework-pending-list");
const completedList = document.getElementById("homework-completed-list");
const totalLabel = document.getElementById("homework-total");
const showAllButton = document.getElementById("homework-show-all-button");
const calendar = document.getElementById("homework-calendar");
const calendarRange = document.getElementById("homework-calendar-range");

const currentWeekStart = startOfWeek(new Date());
let visibleWeekStart = new Date(currentWeekStart);

let assignments = [];
let showAllCompleted = false;

courseSelect.addEventListener("change", updateProjectSelect);
showAllButton.addEventListener("click", () => {
    showAllCompleted = !showAllCompleted;
    renderAssignments();
});

document.getElementById("homework-calendar-previous").addEventListener("click", () => shiftCalendarWeek(-1));
document.getElementById("homework-calendar-next").addEventListener("click", () => shiftCalendarWeek(1));
document.getElementById("homework-calendar-today").addEventListener("click", () => {
    visibleWeekStart = new Date(currentWeekStart);
    renderCalendar();
});

document.getElementById("add-homework-button").addEventListener("click", addAssignment);
titleInput.addEventListener("keydown", event => {
    if (event.key === "Enter") addAssignment();
});

export function updateHomeworkPageVisibility() {
    const visible = pageState.currentPage === "homework";
    page.classList.toggle("hidden", !visible);
    if (visible) {
        updateCourseSelect();
        renderAssignments();
    }
}

export async function loadHomeworkFromDatabase() {
    const { data, error } = await db
        .from("homework_assignments")
        .select("*");
    if (error) {
        console.error(error);
        return;
    }
    assignments = data || [];
    renderAssignments();
}

export function clearHomework() {
    assignments = [];
    renderAssignments();
}

function updateCourseSelect() {
    const previous = courseSelect.value;
    courseSelect.replaceChildren();
    courseSelect.append(makeOption("", "Choose a class", true));
    coursesArray.forEach(course => courseSelect.append(makeOption(course.id, course.name)));
    if (coursesArray.some(course => course.id === previous)) courseSelect.value = previous;
    updateProjectSelect();
}

function updateProjectSelect() {
    const previous = projectSelect.value;
    projectSelect.replaceChildren();
    projectSelect.append(makeOption("", "No project"));
    const course = coursesArray.find(item => item.id === courseSelect.value);
    (course?.projects || []).forEach(project => projectSelect.append(makeOption(project.id, project.name)));
    if (course?.projects.some(project => project.id === previous)) projectSelect.value = previous;
}

async function addAssignment() {
    const name = titleInput.value.trim();
    const estimate = Number(estimateInput.value);
    if (!name || !courseSelect.value || !Number.isInteger(estimate) || estimate <= 0) {
        warning.textContent = "Enter an assignment, choose a class, and add an estimate in minutes.";
        warning.classList.remove("hidden");
        return;
    }
    warning.classList.add("hidden");
    const record = {
        title: name,
        course_id: courseSelect.value,
        project_id: projectSelect.value || null,
        estimated_minutes: estimate,
        due_date: dueDateInput.value || null
    };
    const { data, error } = await db.from("homework_assignments").insert(record).select().single();
    if (error) {
        console.error(error);
        warning.textContent = "Could not save this assignment. Please try again.";
        warning.classList.remove("hidden");
        return;
    }
    assignments.push(data);
    titleInput.value = "";
    estimateInput.value = "";
    dueDateInput.value = "";
    renderAssignments();
}

async function setCompleted(assignment, completed) {
    const completedAt = completed ? new Date().toISOString() : null;
    const { error } = await db.from("homework_assignments")
        .update({ completed_at: completedAt }).eq("id", assignment.id);
    if (error) {
        console.error(error);
        renderAssignments();
        return;
    }
    assignment.completed_at = completedAt;
    renderAssignments();
}

async function deleteAssignment(assignment) {
    const { error } = await db.from("homework_assignments").delete().eq("id", assignment.id);
    if (error) {
        console.error(error);
        return;
    }
    assignments = assignments.filter(item => item.id !== assignment.id);
    renderAssignments();
}

function renderAssignments() {
    if (!pendingList) return;
    pendingList.replaceChildren();
    completedList.replaceChildren();
    const pending = assignments.filter(item => !item.completed_at)
        .sort((a, b) => compareDueDates(a.due_date, b.due_date));
    const completed = assignments.filter(item => item.completed_at)
        .sort((a, b) => compareLatestDueDates(a.due_date, b.due_date));
    renderCalendar();

    if (pending.length) pending.forEach(item => pendingList.append(createAssignmentRow(item, false)));
    else pendingList.append(createEmptyMessage("No homework to do. Add an assignment above."));
    const totalMinutes = pending.reduce((sum, item) => sum + Number(item.estimated_minutes || 0), 0);
    totalLabel.textContent = `Estimated time remaining: ${formatDuration(totalMinutes)}`;

    const visibleCompleted = showAllCompleted ? completed : completed.slice(0, 5);
    if (visibleCompleted.length) visibleCompleted.forEach(item => completedList.append(createAssignmentRow(item, true)));
    else completedList.append(createEmptyMessage("Completed assignments will appear here."));
    showAllButton.textContent = showAllCompleted ? "Show recent" : "Show all";
    showAllButton.classList.toggle("hidden", completed.length <= 5);
}

function shiftCalendarWeek(amount) {
    visibleWeekStart.setDate(visibleWeekStart.getDate() + amount * 7);
    renderCalendar();
}

function renderCalendar() {
    if (!calendar) return;
    calendar.replaceChildren();
    const weekEnd = new Date(visibleWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    calendarRange.textContent = `${formatCalendarDate(visibleWeekStart, { month: "long", day: "numeric" })} – ${formatCalendarDate(weekEnd, { month: "long", day: "numeric", year: "numeric" })}`;
    const todayKey = toDateKey(new Date());

    for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(visibleWeekStart);
        date.setDate(date.getDate() + offset);
        const dateKey = toDateKey(date);
        const day = document.createElement("section");
        day.className = "homework-calendar-day";
        if (dateKey === todayKey) day.classList.add("is-today");
        day.setAttribute("aria-label", `${formatCalendarDate(date, { weekday: "long", month: "long", day: "numeric" })}${dateKey === todayKey ? ", today" : ""}`);

        const label = document.createElement("div");
        label.className = "homework-calendar-day-label";
        const weekday = document.createElement("span");
        weekday.textContent = formatCalendarDate(date, { weekday: "short" });
        const number = document.createElement("strong");
        number.textContent = String(date.getDate());
        label.append(weekday, number);

        const dayAssignments = assignments.filter(item => item.due_date === dateKey);
        const list = document.createElement("div");
        list.className = "homework-calendar-items";
        if (dayAssignments.length) {
            dayAssignments.forEach(item => list.append(createCalendarAssignment(item)));
        } else {
            const empty = document.createElement("span");
            empty.className = "homework-calendar-empty";
            empty.textContent = "—";
            list.append(empty);
        }
        day.append(label, list);
        calendar.append(day);
    }
}

function createCalendarAssignment(item) {
    const course = coursesArray.find(value => value.id === item.course_id);
    const project = course?.projects.find(value => value.id === item.project_id);
    const block = document.createElement("div");
    block.className = `homework-calendar-assignment ${item.completed_at ? "is-complete" : "is-due"}`;
    block.tabIndex = 0;
    block.setAttribute("role", "group");
    const detail = [course?.name || "Class removed", project?.name, `${Number(item.estimated_minutes || 0)} min`, item.completed_at ? "Completed" : "Due"].filter(Boolean).join(" · ");
    block.setAttribute("aria-label", `${item.title}. ${detail}`);
    block.title = `${item.title} · ${detail}`;
    const title = document.createElement("strong");
    title.textContent = item.title;
    const tooltip = document.createElement("span");
    tooltip.className = "homework-calendar-tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.textContent = detail;
    block.append(title, tooltip);
    return block;
}

function startOfWeek(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCalendarDate(date, options) {
    return date.toLocaleDateString(undefined, options);
}

function createAssignmentRow(item, completed) {
    const row = document.createElement("div");
    row.className = "homework-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = completed;
    checkbox.setAttribute("aria-label", `${completed ? "Mark incomplete" : "Complete"}: ${item.title}`);
    checkbox.addEventListener("change", () => setCompleted(item, checkbox.checked));
    const info = document.createElement("div");
    info.className = "homework-info";
    const heading = document.createElement("strong");
    heading.textContent = item.title;
    if (completed) heading.classList.add("homework-done");
    const course = coursesArray.find(value => value.id === item.course_id);
    const project = course?.projects.find(value => value.id === item.project_id);
    const details = document.createElement("span");
    const dueDate = item.due_date ? `Due ${formatDueDate(item.due_date)}` : "No due date";
    details.textContent = [course?.name || "Class removed", project?.name, dueDate].filter(Boolean).join(" · ");
    info.append(heading, details);
    const estimate = document.createElement("span");
    estimate.className = "homework-estimate";
    estimate.textContent = formatDuration(Number(item.estimated_minutes || 0));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "homework-delete-button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${item.title}`);
    remove.addEventListener("click", () => deleteAssignment(item));
    row.append(checkbox, info, estimate, remove);
    return row;
}

function createEmptyMessage(message) {
    const empty = document.createElement("p");
    empty.className = "homework-empty";
    empty.textContent = message;
    return empty;
}

function makeOption(value, text, disabled = false) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.disabled = disabled;
    return option;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours && remainder) return `${hours}h ${remainder}m`;
    if (hours) return `${hours}h`;
    return `${remainder}m`;
}

function compareDueDates(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
}

function compareLatestDueDates(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return b.localeCompare(a);
}

function formatDueDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric"
    });
}
