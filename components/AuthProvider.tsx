"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Profile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileRef = doc(db, "profiles", currentUser.uid);
      const profileSnapshot = await getDoc(profileRef);

      if (!profileSnapshot.exists()) {
        const fallbackProfile = {
          uid: currentUser.uid,
          name: currentUser.displayName || "User",
          email: currentUser.email || "",
          lowercaseEmail: (currentUser.email || "").toLowerCase(),
          createdAt: serverTimestamp(),
        };

        await setDoc(profileRef, fallbackProfile, { merge: true });

        setProfile({
          uid: fallbackProfile.uid,
          name: fallbackProfile.name,
          email: fallbackProfile.email,
          lowercaseEmail: fallbackProfile.lowercaseEmail,
        });
      } else {
        setProfile(profileSnapshot.data() as Profile);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
