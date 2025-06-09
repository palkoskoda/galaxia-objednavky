"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Uistite sa, že cesta sedí

// Definícia typu pre hodnotu v kontexte
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
}

// Vytvorenie kontextu s predvolenou hodnotou
const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
});

// Provider komponent, ktorý bude obalovať našu aplikáciu
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // onAuthStateChanged je listener z Firebase, ktorý reaguje na zmeny stavu prihlásenia
        // a automaticky sa postará o session perzistenciu (napr. po refreshi stránky)
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setIsLoading(false);
        });

        // Cleanup funkcia, ktorá sa zavolá pri odpojení komponentu
        return () => unsubscribe();
    }, []);

    const value = {
        user,
        isLoading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Vlastný hook pre jednoduchšie použitie kontextu v komponentoch
export const useAuth = () => {
    return useContext(AuthContext);
};

