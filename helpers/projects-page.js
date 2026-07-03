import { pageState } from "./state.js";

let projectsPageContent;

projectsPageContent = document.getElementById("project-page-content")

export function updateProjectsPageVisibility() {
    const onProjectsPage = pageState.currentPage === "projects";

    projectsPageContent.classList.toggle("hidden", !onProjectsPage);
}
