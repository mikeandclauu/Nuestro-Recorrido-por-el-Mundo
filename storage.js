import {
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from "./firebase.js";

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
}

function extensionForMedia(item) {
    if (item.name && item.name.includes(".")) {
        return item.name.split(".").pop().toLowerCase();
    }
    return item.type === "video" ? "mp4" : "jpg";
}

async function compressImageBlob(blob) {
    if (!blob.type.startsWith("image/") || blob.type === "image/gif") {
        return blob;
    }

    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const compressed = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    return compressed || blob;
}

async function mediaItemToBlob(item) {
    if (item.file instanceof Blob) {
        if (item.type === "image") {
            return compressImageBlob(item.file);
        }
        return item.file;
    }

    if (typeof item.data === "string" && item.data.startsWith("data:")) {
        const blob = dataUrlToBlob(item.data);
        if (item.type === "image") {
            return compressImageBlob(blob);
        }
        return blob;
    }

    throw new Error("El archivo no tiene datos válidos para subir.");
}

export async function uploadMediaItem(item, memoryId, index) {
    const blob = await mediaItemToBlob(item);
    const ext = extensionForMedia(item);
    const safeName = `${Date.now()}-${index}.${ext}`;
    const path = `memories/${memoryId}/${safeName}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, {
        contentType: blob.type || (item.type === "video" ? "video/mp4" : "image/jpeg")
    });

    const url = await getDownloadURL(storageRef);
    return { type: item.type, url, name: item.name || safeName };
}

export async function prepareMediaForSave(mediaItems, memoryId) {
    const prepared = [];

    for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (item.url) {
            prepared.push({
                type: item.type,
                url: item.url,
                name: item.name || ""
            });
            continue;
        }

        if (item.url === undefined && !item.data && !(item.file instanceof Blob)) {
            continue;
        }

        prepared.push(await uploadMediaItem(item, memoryId, i));
    }

    return prepared;
}

export async function deleteMemoryMedia(memoryId) {
    try {
        const folderRef = ref(storage, `memories/${memoryId}`);
        const listing = await listAll(folderRef);
        await Promise.all(listing.items.map((itemRef) => deleteObject(itemRef)));
    } catch (error) {
        console.warn("No se pudieron borrar archivos de Storage:", error);
    }
}

export function getMediaSrc(item) {
    return item?.url || item?.data || "";
}
