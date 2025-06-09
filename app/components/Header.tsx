"use client";

import Link from 'next/link';
// TODO: Update the import path below if your AuthContext is located elsewhere
import { useAuth } from '../context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Header() {
    const { user, isLoading } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Presmerovanie nie je nutné, onAuthStateChanged sa postará o aktualizáciu UI
        } catch (error) {
            console.error('Chyba pri odhlasovaní:', error);
        }
    };

    return (
        <header className="app-header">
            <div className="logo">
                <Link href="/">Galaxia Obedy</Link>
            </div>
            <nav className="user-nav">
                {isLoading ? (
                    <div>Načítavam...</div>
                ) : user ? (
                    <>
                        <span>Vitaj, {user.email}</span>
                        <button onClick={handleLogout} className="logout-button">Odhlásiť sa</button>
                    </>
                ) : (
                    <>
                        <Link href="/login">Prihlásiť sa</Link>
                        <Link href="/register">Registrácia</Link>
                    </>
                )}
            </nav>
        </header>
    );
}