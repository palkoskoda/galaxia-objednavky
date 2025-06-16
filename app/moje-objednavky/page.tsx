'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Typy pre dáta, ktoré očakávame z API
type OrderItem = {
  id: string;
  pocet: number;
  nazov: string;
};

type Order = {
  id: string;
  datum: string;
  stav: string;
  celkovaCena: number;
  polozky: OrderItem[];
};

export default function MojeObjednavkyPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Funkcia sa spustí, len ak je používateľ prihlásený
    if (user) {
      const fetchOrders = async () => {
        try {
          setIsLoading(true);
          const idToken = await user.getIdToken();
          const response = await fetch('/api/get-my-orders', {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
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
    } else {
      // Ak používateľ nie je prihlásený, nenastavujeme loading
      setIsLoading(false);
    }
  }, [user]); // Spustí sa vždy, keď sa zmení stav prihlásenia

  if (isLoading) return <p>Načítavam vaše objednávky...</p>;
  if (error) return <p>Chyba: {error}</p>;
  if (!user) return <p>Pre zobrazenie objednávok sa musíte prihlásiť.</p>;

  return (
    <div>
      <h1>Moje Objednávky</h1>
      {orders.length > 0 ? (
        orders.map((order) => (
          <div key={order.id} style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem' }}>
            <h3>Objednávka z dňa: {new Date(order.datum).toLocaleDateString('sk-SK')}</h3>
            <p>Stav: {order.stav}</p>
            <ul>
              {/* Tu bezpečne mapujeme pole 'polozky', nie 'Object.entries' */}
              {order.polozky.map(item => (
                <li key={item.id}>
                  {item.pocet}x {item.nazov}
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p>Zatiaľ nemáte žiadne objednávky.</p>
      )}
    </div>
  );
}