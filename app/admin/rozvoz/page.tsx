"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

// --- Nové typy zodpovedajúce API odpovedi ---
interface DetailedOrder {
    id: string;
    menoPouzivatela: string;
    adresaPouzivatela: string;
    objednanePolozky: Record<string, number>;
    celkovaCena: number;
    stav: string;
}
interface ApiResponse {
    date: string;
    summaryForKitchen: Record<string, number>;
    summaryForDelivery: DetailedOrder[];
}

export default function DeliveryPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [summary, setSummary] = useState<ApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthLoading) {
            return; // Čakáme, kým sa dokončí autentifikácia
        }
        if (!user) {
            router.push('/login'); // Ak používateľ nie je prihlásený, presmerujeme ho
            return;
        }

        const fetchSummary = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/get-daily-summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 403) {
                    throw new Error('Prístup zamietnutý. Táto stránka je len pre administrátorov.');
                }
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Nepodarilo sa načítať dennú súpisku.');
                }
                
                const data: ApiResponse = await response.json();
                setSummary(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, [user, isAuthLoading, router]);

    if (isLoading || isAuthLoading) {
        return <div className="container"><h1>Načítavam dennú súpisku...</h1></div>;
    }

    if (error) {
        return <div className="container"><h1>Chyba</h1><p>{error}</p></div>;
    }

    return (
        <main className="container">
            <h1>Denná Súpiska pre Rozvoz</h1>
            {summary && (
                <>
                    <h2>Dátum: {new Date(summary.date).toLocaleDateString('sk-SK')}</h2>
                    
                    <div className="summary-section">
                        <h3>Súhrn jedál (pre kuchyňu)</h3>
                        <ul>
                            {Object.entries(summary.summaryForKitchen).map(([menu, count]) => (
                                <li key={menu}><strong>{menu}:</strong> {count} ks</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="summary-section">
                        <h3>Detailný zoznam (pre rozvoz)</h3>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Zákazník</th>
                                    <th>Adresa</th>
                                    <th>Objednávka</th>
                                    <th>Cena</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.summaryForDelivery.map(order => (
                                    <tr key={order.id}>
                                        <td>{order.menoPouzivatela}</td>
                                        <td>{order.adresaPouzivatela}</td>
                                        <td>
                                            {/* Formátovanie JSON objednávky do čitateľnej podoby */}
                                            {Object.entries(order.objednanePolozky)
                                                .map(([meal, count]) => `${meal}: ${count}ks`)
                                                .join(', ')}
                                        </td>
                                        <td>{order.celkovaCena?.toFixed(2)} €</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={() => window.print()} className="print-button">Tlačiť súpisku</button>
                </>
            )}
            {!summary && !isLoading && (
                <p>Na dnes neboli nájdené žiadne objednávky.</p>
            )}
        </main>
    );
}