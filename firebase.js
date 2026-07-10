import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAfps2qE1a_kRrWnUH1eXMHfUYD7Wtt3HI",
    authDomain: "nuestro-recorrido-67e5e.firebaseapp.com",
    projectId: "nuestro-recorrido-67e5e",
    storageBucket: "nuestro-recorrido-67e5e.firebasestorage.app",
    messagingSenderId: "1029651483721",
    appId: "1:1029651483721:web:b5780fb1eb0bed856e8398"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

export {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    orderBy,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
};
