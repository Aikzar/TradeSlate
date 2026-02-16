"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
// Directory where we store local trade images
function getImagesDir() {
    const userDataPath = electron_1.app.getPath('userData');
    const imagesDir = path_1.default.join(userDataPath, 'trade-images');
    // Ensure directory exists
    if (!fs_1.default.existsSync(imagesDir)) {
        fs_1.default.mkdirSync(imagesDir, { recursive: true });
    }
    return imagesDir;
}
exports.ImageService = {
    /**
     * Opens native file picker dialog for images
     * Returns the selected file path(s) or null if cancelled
     */
    openFilePicker: () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield electron_1.dialog.showOpenDialog({
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
    }),
    /**
     * Copies a local image file to the app's data directory
     * Returns the stored path that can be used to reference the image
     */
    saveLocalImage: (sourcePath) => __awaiter(void 0, void 0, void 0, function* () {
        const imagesDir = getImagesDir();
        const ext = path_1.default.extname(sourcePath);
        const fileName = `${(0, crypto_1.randomUUID)()}${ext}`;
        const destPath = path_1.default.join(imagesDir, fileName);
        // Copy the file
        fs_1.default.copyFileSync(sourcePath, destPath);
        // Return the path that the renderer can use
        // We use a special prefix so the frontend knows this is a local file
        return `local://${fileName}`;
    }),
    /**
     * Resolves a local:// path to an actual file:// URL for display
     */
    resolveLocalPath: (localPath) => {
        if (!localPath.startsWith('local://')) {
            return localPath; // It's a URL, return as-is
        }
        const fileName = localPath.replace('local://', '');
        const imagesDir = getImagesDir();
        const fullPath = path_1.default.join(imagesDir, fileName);
        return `file://${fullPath.replace(/\\/g, '/')}`;
    },
    /**
     * Deletes a local image file
     */
    deleteLocalImage: (localPath) => {
        if (!localPath.startsWith('local://')) {
            return false; // Not a local file
        }
        const fileName = localPath.replace('local://', '');
        const imagesDir = getImagesDir();
        const fullPath = path_1.default.join(imagesDir, fileName);
        try {
            if (fs_1.default.existsSync(fullPath)) {
                fs_1.default.unlinkSync(fullPath);
            }
            return true;
        }
        catch (err) {
            console.error('Failed to delete local image:', err);
            return false;
        }
    },
    /**
     * Saves an annotated image (from canvas data URL) to the local storage
     * Returns the new local:// path
     */
    saveAnnotatedImage: (dataUrl) => __awaiter(void 0, void 0, void 0, function* () {
        const imagesDir = getImagesDir();
        const fileName = `${(0, crypto_1.randomUUID)()}.png`;
        const destPath = path_1.default.join(imagesDir, fileName);
        // Extract base64 data from data URL
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        fs_1.default.writeFileSync(destPath, buffer);
        return `local://${fileName}`;
    }),
    /**
     * Downloads an image from an external URL and returns it as a data URL
     * This bypasses CORS restrictions since it runs in the main process
     * Returns a data URL that can be used directly in the canvas
     */
    downloadExternalImage: (url) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log('Downloading external image:', url);
            // Use node's native fetch
            const response = yield fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = yield response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Determine MIME type from content-type header
            const contentType = response.headers.get('content-type') || 'image/png';
            let mimeType = 'image/png';
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                mimeType = 'image/jpeg';
            }
            else if (contentType.includes('gif')) {
                mimeType = 'image/gif';
            }
            else if (contentType.includes('webp')) {
                mimeType = 'image/webp';
            }
            else if (contentType.includes('png')) {
                mimeType = 'image/png';
            }
            // Convert to base64 data URL
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            console.log('Downloaded image, data URL length:', dataUrl.length);
            return dataUrl;
        }
        catch (err) {
            console.error('Failed to download external image:', err);
            throw err;
        }
    })
};
