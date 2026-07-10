import {
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from "./firebase.js";

const MAX_IMAGE_DIMENSION = 1920;
const INLINE_IMAGE_DIMENSION = 800;
const JPEG_QUALITY = 0.85;
const INLINE_JPEG_QUALITY = 0.55;
const MAX_INLINE_DOC_BYTES = 900_000;

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

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function extensionForMedia(item) {
    if (item.name && item.name.includes(".")) {
        return item.name.split(".").pop().toLowerCase();
    }
    return item.type === "video" ? "mp4" : "jpg";
}

async function compressImageBlob(blob, maxDimension, quality) {
    if (!blob.type.startsWith("image/") || blob.type === "image/gif") {
        return blob;
    }

    try {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const compressed = await new Promise((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", quality);
        });

        return compressed || blob;
    } catch {
        return blob;
    }
}

async function mediaItemToBlob(item, inline = false) {
    const maxDim = inline ? INLINE_IMAGE_DIMENSION : MAX_IMAGE_DIMENSION;
    const quality = inline ? INLINE_JPEG_QUALITY : JPEG_QUALITY;

    if (item.file instanceof Blob) {
        if (item.type === "image") {
            return compressImageBlob(item.file, maxDim, quality);
        }
        return item.file;
    }

    if (typeof item.data === "string" && item.data.startsWith("data:")) {
        const blob = dataUrlToBlob(item.data);
        if (item.type === "image") {
            return compressImageBlob(blob, maxDim, quality);
        }
        return blob;
    }

    throw new Error("El archivo no tiene datos válidos para subir.");
}

async function uploadMediaItem(item, memoryId, index) {
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

async function inlineMediaItem(item) {
    const blob = await mediaItemToBlob(item, true);
    const data = await blobToDataUrl(blob);
    return { type: item.type, data, name: item.name || "foto.jpg" };
}

function estimateInlineSize(prepared) {
    return prepared.reduce((total, item) => {
        if (typeof item.data === "string") return total + item.data.length;
        if (typeof item.url === "string") return total + item.url.length;
        return total;
    }, 0);
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

        if (!item.data && !(item.file instanceof Blob)) {
            continue;
        }

        if (item.type === "video") {
            try {
                prepared.push(await uploadMediaItem(item, memoryId, i));
            } catch (error) {
                console.error("Error subiendo vídeo:", error);
                throw new Error(
                    "Los vídeos necesitan Firebase Storage. Actívalo en Firebase Console → Storage → Get started, y publica las reglas de storage.rules."
                );
            }
            continue;
        }

        prepared.push(await inlineMediaItem(item));
    }

    if (estimateInlineSize(prepared) > MAX_INLINE_DOC_BYTES) {
        throw new Error(
            "Las fotos ocupan demasiado. Prueba con menos fotos o fotos más pequeñas (máximo ~3 por momento)."
        );
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

export function formatSaveError(error) {
    const code = error?.code || "";
    const message = error?.message || String(error);

    if (code === "permission-denied" || message.includes("Missing or insufficient permissions")) {
        return "Firestore bloqueó el guardado. Ve a Firebase Console → Firestore → Rules y publica las reglas del archivo firestore.rules.";
    }

    if (code.startsWith("storage/")) {
        return `Firebase Storage: ${message}`;
    }

    return message || "Error desconocido al guardar.";
}
