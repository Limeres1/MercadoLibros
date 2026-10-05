import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración oficial de Firebase provista por el usuario
export const firebaseConfig = {
  apiKey: "AIzaSyCVthSOVnU3bYOBdGtmyhUmOeB5UedHCXs",
  authDomain: "mercadolibros-d80e3.firebaseapp.com",
  projectId: "mercadolibros-d80e3",
  storageBucket: "mercadolibros-d80e3.firebasestorage.app",
  messagingSenderId: "237173069120",
  appId: "1:237173069120:web:ad4ff2f6fd91f60fe596a5"
};

// Inicialización de Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
