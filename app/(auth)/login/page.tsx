"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Po úspešnom prihlásení presmerujeme používateľa na hlavnú stránku
            router.push('/');
        } catch (error: any) {
            setError(error.message);
            console.error("Chyba pri prihlásení:", error);
        }
    };

    return (
        <div className="container auth-page">
            <h1>Prihlásenie</h1>
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Heslo"
                    required
                />
                <button type="submit">Prihlásiť sa</button>
                {error && <p className="error-message">{error}</p>}
            </form>
            <p>Nemáte účet? <Link href="/register">Zaregistrujte sa</Link></p>
        </div>
    );
}