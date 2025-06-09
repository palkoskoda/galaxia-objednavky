"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface DailyOrder {
    id: string;
    firebaseUID: string;
    menu: string;
    count: number;
}
interface AggregatedSummary {
    [key: string]: number;
}

export default function DeliveryPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [summary, setSummary] = useState<{ date: string; orders: DailyOrder[]; aggregated: AggregatedSummary } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthLoading) return;
        if (!user) {
            router.push('/login');
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
                    throw new Error('Nepodarilo sa načítať dennú súpisku.');
                }
                
                const data = await response.json();
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
                            {Object.entries(summary.aggregated).map(([menu, count]) => (
                                <li key={menu}><strong>{menu}:</strong> {count} ks</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="summary-section">
                        <h3>Detailný zoznam (pre rozvoz)</h3>
                        <p>V budúcnosti tu budú mená a adresy zákazníkov.</p>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Zákazník (UID)</th>
                                    <th>Menu</th>
                                    <th>Počet</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.orders.map(order => (
                                    <tr key={order.id}>
                                        <td>{order.firebaseUID}</td>
                                        <td>{order.menu}</td>
                                        <td>{order.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={() => window.print()} style={{marginTop: '2rem'}}>Tlačiť súpisku</button>
                </>
            )}
        </main>
    );
}