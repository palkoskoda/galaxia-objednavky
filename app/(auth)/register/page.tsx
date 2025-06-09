"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        meno: '',
        email: '',
        password: '',
        adresa: '',
        telefon: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Voláme náš nový backendový endpoint
            const response = await fetch('/api/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Neznáma chyba servera.');
            }

            // Po úspešnej registrácii používateľa automaticky prihlásime
            alert('Registrácia prebehla úspešne! Budete automaticky prihlásený.');
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
            router.push('/'); // a presmerujeme na hlavnú stránku

        } catch (error: any) {
            setError(error.message);
            console.error("Chyba pri registrácii:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container auth-page">
            <h1>Registrácia Nového Účtu</h1>
            <form onSubmit={handleRegister}>
                <input name="meno" type="text" value={formData.meno} onChange={handleChange} placeholder="Meno a Priezvisko" required disabled={isSubmitting} />
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" required disabled={isSubmitting} />
                <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Heslo (min. 6 znakov)" required disabled={isSubmitting} />
                <input name="adresa" type="text" value={formData.adresa} onChange={handleChange} placeholder="Adresa doručenia (Ulica, Číslo, Mesto, PSČ)" disabled={isSubmitting} />
                <input name="telefon" type="tel" value={formData.telefon} onChange={handleChange} placeholder="Telefónne číslo" disabled={isSubmitting} />
                
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Registrujem...' : 'Vytvoriť Účet'}
                </button>
                {error && <p className="error-message">{error}</p>}
            </form>
            <p>Už máte účet? <Link href="/login">Prihláste sa</Link></p>
        </div>
    );
}