const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");

const firebaseConfig = {
  apiKey: "AIzaSyDBqwUKuHOt4ZGOcGV9iBWU7c-EuAj1fEA",
  authDomain: "storage-flutter-5c44b.firebaseapp.com",
  projectId: "storage-flutter-5c44b",
  storageBucket: "storage-flutter-5c44b.firebasestorage.app",
  messagingSenderId: "1008588164950",
  appId: "1:1008588164950:web:4e7e2fc9f5e3fd8a9c10f7",
  measurementId: "G-JZW66L8VQD",
};

const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

module.exports = storage;
