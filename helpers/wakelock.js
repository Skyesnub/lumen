import { timerState } from "./state.js";

let wakeLock = null;

export async function enableWakeLock() {
    if (!("wakeLock" in navigator)) {
        console.log("Wake Lock API is not supported.");
        return;
    }

    try {
        wakeLock = await navigator.wakeLock.request("screen");
        console.log("Wake lock enabled.");

        wakeLock.addEventListener("release", () => {
            console.log("Wake lock released.");
        });
    } catch (err) {
        console.error("Failed to acquire wake lock:", err);
    }
}

export async function disableWakeLock() {
    if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
    }
}

// Reacquire if the tab becomes visible again
document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && wakeLock !== null && timerState.running) {
        enableWakeLock();
    }
});