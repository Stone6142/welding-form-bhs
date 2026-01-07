// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// TODO: Replace with your real Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBkUu-N7nkDkclV5SkDmozK2SmSur0NWNQ",
    authDomain: "welding-form.firebaseapp.com",
    databaseURL: "https://welding-form-default-rtdb.firebaseio.com",
    projectId: "welding-form",
    storageBucket: "welding-form.firebasestorage.app",
    messagingSenderId: "69271735442",
    appId: "1:69271735442:web:e438afe73f604563d22a4b",
    measurementId: "G-JSR34FQ59Y"
  };
  

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
// Expose to window so other scripts can use them
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;

