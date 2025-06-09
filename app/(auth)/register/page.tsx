"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // Pridáme stav pre načítavanie
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        // ----- TOTO JE KĽÚČOVÝ RIADOK -----
        e.preventDefault(); 
        // ---------------------------------
        
        setError(null);
        setIsSubmitting(true);

        // Validácia hesla (príklad)
        if (password.length < 6) {
            setError("Heslo musí mať aspoň 6 znakov.");
            setIsSubmitting(false);
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // Po úspešnej registrácii presmerujeme používateľa na hlavnú stránku.
            // Ideálne by sme mali vytvoriť záznam v DB tu, ale to riešime neskôr.
            alert('Registrácia prebehla úspešne! Budete presmerovaný.');
            router.push('/');
        } catch (error: any) {
            // Preložíme Firebase chyby do zrozumiteľnejšej podoby
            if (error.code === 'auth/email-already-in-use') {
                setError('Tento email je už zaregistrovaný.');
            } else {
                setError('Nastala chyba pri registrácii. Skúste to znova.');
            }
            console.error("Chyba pri registrácii:", error);
        } finally {
            setIsSubmitting(false);
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
                    disabled={isSubmitting}
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Heslo (min. 6 znakov)"
                    required
                    disabled={isSubmitting}
                />
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Registrujem...' : 'Registrovať sa'}
                </button>
                {error && <p className="error-message">{error}</p>}
            </form>
            <p>Už máte účet? <Link href="/login">Prihláste sa</Link></p>
        </div>
    );
}