/**
 * Formats a Date object or ISO string to a format compatible with <input type="datetime-local">
 * (YYYY-MM-DDTHH:mm) using local time.
 */
export function toLocalStorageString(date: Date | string | undefined | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Parses a string from <input type="datetime-local"> (local time) and returns a UTC ISO string.
 */
export function parseLocalToUTC(localString: string): string {
    if (!localString) return new Date().toISOString();
    const d = new Date(localString);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
}
