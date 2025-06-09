"use client";

import { User } from 'firebase/auth'; // Importujeme User pre typovanie, ak je potrebné
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // Po úspešnej registrácii presmerujeme používateľa na hlavnú stránku
            router.push('/');
        } catch (error: any) {
            setError(error.message);
            console.error("Chyba pri registrácii:", error);
        }
    };

    return (
        <div className="container auth-page">
            <h1>Registrácia</h1>
            <form onSubmit={handleRegister}>
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
                    placeholder="Heslo (min. 6 znakov)"
                    required
                />
                <button type="submit">Registrovať sa</button>
                {error && <p className="error-message">{error}</p>}
            </form>
            <p>Už máte účet? <Link href="/login">Prihláste sa</Link></p>
        </div>
    );
}