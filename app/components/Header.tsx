"use client";

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Header() {
    const { user, isLoading } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut(auth);
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
                        <Link href="/moje-objednavky">Moje Objednávky</Link>
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