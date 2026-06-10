"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile({ uid: docSnap.id, ...docSnap.data() });
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Erro ao escutar dados do perfil no Firestore:", error);
            setLoading(false);
          }
        );

        return () => unsubscribeSnapshot();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
