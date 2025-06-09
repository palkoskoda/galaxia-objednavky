"use client";

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function Header() {
    const { user, isLoading } = useAuth();

    // Zistíme, či je prihlásený používateľ admin porovnaním jeho UID
    // s našou novou verejnou premennou prostredia.
    const isAdmin = user && user.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

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
            
            <nav className="main-navigation">
                {/* ---- Hlavné odkazy ---- */}
                <Link href="/">Jedálny lístok</Link>
                {user && <Link href="/moje-objednavky">Moje Objednávky</Link>}
                {isAdmin && <Link href="/admin/rozvoz" className="admin-link">Admin Súpiska</Link>}
            </nav>

            <div className="user-section">
                {/* ---- Používateľská sekcia ---- */}
                {isLoading ? (
                    <div className="loading-placeholder">Načítavam...</div>
                ) : user ? (
                    <>
                        <span className="welcome-message">Vitaj, {user.email?.split('@')[0]}</span>
                        <button onClick={handleLogout} className="logout-button">Odhlásiť sa</button>
                    </>
                ) : (
                    <div className="auth-links">
                        <Link href="/login">Prihlásiť sa</Link>
                        <Link href="/register">Registrácia</Link>
                    </div>
                )}
            </div>
        </header>
    );
}