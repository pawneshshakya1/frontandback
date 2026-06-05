import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAkt12DfMqJFFf6mbNeNNq4bo4FiqnR8Tg",
    authDomain: "battlecore-e9bf1.firebaseapp.com",
    projectId: "battlecore-e9bf1",
    storageBucket: "battlecore-e9bf1.firebasestorage.app",
    messagingSenderId: "720256141382",
    appId: "1:720256141382:android:c5c2114d39450581b36247"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
