// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBjFajlGJDf-LsyRrVzfqFAg14izklt5ck",
    authDomain: "gao-document-classification.firebaseapp.com",
    projectId: "gao-document-classification",
    storageBucket: "gao-document-classification.appspot.com",
    messagingSenderId: "419494880993",
    appId: "1:419494880993:web:1adc6a8361742f516179a0",
    measurementId: "G-ESN889JRSR"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };