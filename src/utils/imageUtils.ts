
/**
 * Transforms an image URL for display purposes.
 * Handles specific logic for Bookmap URLs to ensure they render correctly.
 * 
 * @param url The original image URL
 * @returns The transformed URL ready for display
 */
export function getDisplayImageUrl(url: string): string {
    if (!url) return '';

    // Handle Bookmap URLs
    // Convert https://bookmap.com/s/xxxxxx to https://bookmap.com/s/image.php?id=xxxxxx
    if (url.includes('bookmap.com/s/') && !url.includes('image.php')) {
        const parts = url.split('/');
        const id = parts[parts.length - 1]?.split('?')[0];
        if (id && id.length > 5) {
            return `https://bookmap.com/s/image.php?id=${id}`;
        }
    }

    return url;
}
