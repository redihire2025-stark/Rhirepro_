// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVa7TXeMWOAkZmUq6FeiGs5IPcB7V5tBg",
  authDomain: "rhirepro.firebaseapp.com",
  projectId: "rhirepro",
  storageBucket: "rhirepro.firebasestorage.app",
  messagingSenderId: "563424197552",
  appId: "1:563424197552:web:e6b218adeab1cf8e73b475",
  measurementId: "G-FR0H35985Q"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, provider);
