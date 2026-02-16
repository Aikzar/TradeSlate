/**
 * Utility functions for handling dialogs with focus restoration.
 * 
 * Uses Electron's native dialog API when available for proper focus handling.
 * Falls back to browser-native dialogs if Electron API is unavailable.
 */

/**
 * Clean up any invisible overlays or focus traps that might be blocking inputs.
 * This runs after every dialog closes to ensure the DOM is in a clean state.
 */
const cleanupDOM = () => {
    // Reset pointer-events on body and all children that might have it disabled
    document.body.style.pointerEvents = '';
    document.body.style.userSelect = '';

    // Find any elements that might be blocking inputs
    const fixedElements = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
    fixedElements.forEach(el => {
        const element = el as HTMLElement;
        const rect = element.getBoundingClientRect();
        // If it covers most of the screen and is invisible, it might be a stuck overlay
        if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) {
            const opacity = parseFloat(getComputedStyle(element).opacity);
            const bgColor = getComputedStyle(element).backgroundColor;
            // If mostly transparent, reset pointer-events
            if (opacity < 0.1 || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
                element.style.pointerEvents = 'none';
            }
        }
    });

    // Blur the active element if it's unusual (not an input/textarea/select)
    const active = document.activeElement as HTMLElement;
    if (active && active.tagName && !['INPUT', 'TEXTAREA', 'SELECT', 'BODY'].includes(active.tagName)) {
        active.blur();
    }

    // Force enable all inputs/textareas/selects in the document
    document.querySelectorAll('input, textarea, select').forEach(el => {
        const element = el as HTMLElement;
        element.style.pointerEvents = 'auto';
    });
};

/**
 * Show a confirm dialog using Electron's native dialog when available.
 * This properly handles window focus after the dialog closes.
 */
export const focusedConfirm = async (message: string, title?: string): Promise<boolean> => {
    try {
        const result = await window.electronAPI.dialog.confirm(message, title);
        cleanupDOM();
        return result;
    } catch (e) {
        // Fallback to browser-native if Electron API unavailable
        console.warn('Electron dialog unavailable, using browser confirm:', e);
        const result = confirm(message);
        cleanupDOM();
        return result;
    }
};

/**
 * Show an alert dialog using Electron's native dialog when available.
 * This properly handles window focus after the dialog closes.
 */
export const focusedAlert = async (message: string, title?: string): Promise<void> => {
    try {
        await window.electronAPI.dialog.alert(message, title);
        cleanupDOM();
    } catch (e) {
        // Fallback to browser-native if Electron API unavailable
        console.warn('Electron dialog unavailable, using browser alert:', e);
        alert(message);
        cleanupDOM();
    }
};
