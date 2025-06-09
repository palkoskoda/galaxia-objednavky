"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Nový typ pre objednávku, ktorý zodpovedá API
interface Order {
    id: string;
    datum: string;
    objednavka: Record<string, number>;
    stav: string;
    cena: number;
}

export default function MyOrdersPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Ak ešte prebieha autentifikácia, čakáme
        if (isAuthLoading) {
            return;
        }
        
        // Ak používateľ nie je prihlásený, presmerujeme ho
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchOrders = async () => {
            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/get-my-orders', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Nepodarilo sa načítať objednávky.');
                }

                const data: Order[] = await response.json();
                setOrders(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [user, isAuthLoading, router]);

    if (isLoading || isAuthLoading) {
        return <div className="container"><h1>Načítavam vaše objednávky...</h1></div>;
    }
    
    if (error) {
        return <div className="container"><h1>Chyba</h1><p>{error}</p></div>;
    }

    return (
        <main className="container">
            <h1>Moje Objednávky</h1>
            {orders.length === 0 ? (
                <p>Zatiaľ nemáte žiadne objednávky. <Link href="/">Vytvoriť novú objednávku.</Link></p>
            ) : (
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Dátum</th>
                            <th>Objednávka</th>
                            <th>Cena</th>
                            <th>Stav</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td>{new Date(order.datum).toLocaleDateString('sk-SK')}</td>
                                <td>
                                    {Object.entries(order.objednavka)
                                        .map(([meal, count]) => `${meal}: ${count}ks`)
                                        .join(', ')}
                                </td>
                                <td>{order.cena?.toFixed(2)} €</td>
                                <td>{order.stav}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </main>
    );
}