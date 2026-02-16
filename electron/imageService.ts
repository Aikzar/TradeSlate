import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Directory where we store local trade images
function getImagesDir(): string {
    const userDataPath = app.getPath('userData');
    const imagesDir = path.join(userDataPath, 'trade-images');

    // Ensure directory exists
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    return imagesDir;
}

export const ImageService = {
    /**
     * Opens native file picker dialog for images
     * Returns the selected file path(s) or null if cancelled
     */
    openFilePicker: async (): Promise<string[] | null> => {
        const result = await dialog.showOpenDialog({
            title: 'Select Image',
            filters: [
                { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }
            ],
            properties: ['openFile', 'multiSelections']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths;
    },

    /**
     * Copies a local image file to the app's data directory
     * Returns the stored path that can be used to reference the image
     */
    saveLocalImage: async (sourcePath: string): Promise<string> => {
        const imagesDir = getImagesDir();
        const ext = path.extname(sourcePath);
        const fileName = `${randomUUID()}${ext}`;
        const destPath = path.join(imagesDir, fileName);

        // Copy the file
        fs.copyFileSync(sourcePath, destPath);

        // Return the path that the renderer can use
        // We use a special prefix so the frontend knows this is a local file
        return `local://${fileName}`;
    },

    /**
     * Resolves a local:// path to an actual file:// URL for display
     */
    resolveLocalPath: (localPath: string): string => {
        if (!localPath.startsWith('local://')) {
            return localPath; // It's a URL, return as-is
        }

        const fileName = localPath.replace('local://', '');
        const imagesDir = getImagesDir();
        const fullPath = path.join(imagesDir, fileName);

        return `file://${fullPath.replace(/\\/g, '/')}`;
    },

    /**
     * Deletes a local image file
     */
    deleteLocalImage: (localPath: string): boolean => {
        if (!localPath.startsWith('local://')) {
            return false; // Not a local file
        }

        const fileName = localPath.replace('local://', '');
        const imagesDir = getImagesDir();
        const fullPath = path.join(imagesDir, fileName);

        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
            return true;
        } catch (err) {
            console.error('Failed to delete local image:', err);
            return false;
        }
    },

    /**
     * Saves an annotated image (from canvas data URL) to the local storage
     * Returns the new local:// path
     */
    saveAnnotatedImage: async (dataUrl: string): Promise<string> => {
        const imagesDir = getImagesDir();
        const fileName = `${randomUUID()}.png`;
        const destPath = path.join(imagesDir, fileName);

        // Extract base64 data from data URL
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        fs.writeFileSync(destPath, buffer);

        return `local://${fileName}`;
    },

    /**
     * Downloads an image from an external URL and returns it as a data URL
     * This bypasses CORS restrictions since it runs in the main process
     * Returns a data URL that can be used directly in the canvas
     */
    downloadExternalImage: async (url: string): Promise<string> => {
        try {
            console.log('Downloading external image:', url);

            // Use node's native fetch
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Determine MIME type from content-type header
            const contentType = response.headers.get('content-type') || 'image/png';
            let mimeType = 'image/png';
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                mimeType = 'image/jpeg';
            } else if (contentType.includes('gif')) {
                mimeType = 'image/gif';
            } else if (contentType.includes('webp')) {
                mimeType = 'image/webp';
            } else if (contentType.includes('png')) {
                mimeType = 'image/png';
            }

            // Convert to base64 data URL
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;

            console.log('Downloaded image, data URL length:', dataUrl.length);
            return dataUrl;
        } catch (err) {
            console.error('Failed to download external image:', err);
            throw err;
        }
    }
};
