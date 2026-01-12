// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

async function loadFirebaseConfig() {
  const res = await fetch("/api/firebaseConfig");
  return await res.json();
}

loadFirebaseConfig().then((config) => {
  const app = initializeApp(config);
    // Initialize Firebase
    const auth = getAuth(app);
    const db = getDatabase(app);
    // Expose to window so other scripts can use them
    window.firebaseApp = app;
    window.firebaseAuth = auth;
    window.firebaseDb = db;
});

  


