import { pageState, studyBackgroundState } from "./state.js";

// Hue (in degrees) for each rainbow color. Feel free to nudge these —
// they're just artistic placement around the color wheel, not exact science.
const RAINBOW_COLORS = {
    red: 0,
    orange: 28,
    yellow: 52,
    green: 135,
    blue: 212,
    indigo: 245,
    violet: 280
};

const COLOR_LABELS = {
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    indigo: "Indigo",
    violet: "Violet"
};

const settingsPageContent = document.getElementById("settings-page-content");
const shapeColorSelect = document.getElementById("shape-color-select");
const themeColorSelect = document.getElementById("theme-color-select");

export const settingsState = {
    shapeColor: "blue",
    themeColor: "indigo"
};

// Consumed by study-page.js when a new glow shape is created.
export let glowColorPalette = [];

function buildShapeShades(hue) {
    return [
        `hsl(${hue}, 78%, 45%)`, // deep
        `hsl(${hue}, 78%, 60%)`, // medium
        `hsl(${hue}, 78%, 75%)`  // light
    ];
}

function applyShapeColor(colorName) {
    settingsState.shapeColor = colorName;

    const hue = RAINBOW_COLORS[colorName];
    const shades = buildShapeShades(hue);

    glowColorPalette.length = 0;
    glowColorPalette.push(...shades);

    // Recolor shapes already on screen so the change is visible right away,
    // rather than waiting for each one to naturally recycle.
    for (const shape of (studyBackgroundState.glowShapes || [])) {
        shape.color = glowColorPalette[Math.floor(Math.random() * glowColorPalette.length)];
    }
}

function applyThemeColor(colorName) {
    settingsState.themeColor = colorName;

    // Every themed color in the app (backgrounds, buttons, the ambient page
    // wash, the study-mode backdrop) is CSS's hsl()/hsla() reading this one
    // custom property, so changing it re-themes the whole app instantly —
    // no manual repainting needed anywhere.
    document.documentElement.style.setProperty("--theme-hue", RAINBOW_COLORS[colorName]);
}

function populateColorSelect(selectEl, selectedValue) {
    selectEl.innerHTML = "";

    for (const colorName of Object.keys(RAINBOW_COLORS)) {
        const option = document.createElement("option");
        option.value = colorName;
        option.textContent = COLOR_LABELS[colorName];
        selectEl.appendChild(option);
    }

    selectEl.value = selectedValue;
}

shapeColorSelect.addEventListener("change", () => {
    applyShapeColor(shapeColorSelect.value);
});

themeColorSelect.addEventListener("change", () => {
    applyThemeColor(themeColorSelect.value);
});

export function updateSettingsPageVisibility() {
    const onSettingsPage = pageState.currentPage === "settings";

    settingsPageContent.classList.toggle("hidden", !onSettingsPage);
}

// Set up the dropdowns and compute the initial palette/theme so both are
// ready before study-page.js needs them.
populateColorSelect(shapeColorSelect, settingsState.shapeColor);
populateColorSelect(themeColorSelect, settingsState.themeColor);
applyShapeColor(settingsState.shapeColor);
applyThemeColor(settingsState.themeColor);