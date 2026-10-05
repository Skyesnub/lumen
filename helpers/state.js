export const pageState = {
    currentPage: "timer"
};

export const timerState = {
    running: false,
    paused: false,
    startTime: 0,
    totalTime: 0,
    savedTime: 0,
    totalSeconds: 0,
    totalMinutes: 0,
    totalHours: 0
};

export const studyBackgroundState = {
    running: false,
    animationId: 0,
    glowShapes: []
};

export const pageNames = {
    timer: {
        title: "Study Timer",
        description: "Set up and run your study sessions here."
    },
    projects: {
        title: "Projects",
        description: "Keep track of the projects you are studying for."
    },
    homework: {
        title: "Homework",
        description: "Keep track of assignments and the time you need to finish them."
    },
    progress: {
        title: "Progress Summary",
        description: "Review your study progress and completed sessions."
    },
    settings: {
        title: "Settings",
        description: "Adjust your study timer options."
    }
};
