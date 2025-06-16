'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css'; // Importujeme nové štýly

// Typy pre dáta z API
type OrderItem = {
  id: string;
  pocet: number;
  nazov: string;
};

type Order = {
  id: string;
  datum: string;
  stav: string;
  polozky: OrderItem[];
};

export default function MojeObjednavkyPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch('/api/get-my-orders', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (!response.ok) throw new Error('Chyba pri načítaní objednávok.');
          setOrders(await response.json());
        } catch (err: any) { setError(err.message); }
        finally { setIsLoading(false); }
      };
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) return <div className={styles.container}>Načítavam...</div>;
  if (error) return <div className={styles.container}>Chyba: {error}</div>;
  if (!user) return <div className={styles.container}>Pre zobrazenie objednávok sa musíte prihlásiť.</div>;

  return (
    <div className={styles.container}>
      <h1>Moje Objednávky</h1>
      {orders.length > 0 ? (
        orders.map((order) => (
          <div key={order.id} className={styles.orderCard}>
            <div className={styles.cardHeader}>
              <span className={styles.orderDate}>
                Objednávka z {new Date(order.datum).toLocaleDateString('sk-SK')}
              </span>
              <span className={styles.orderStatus}>{order.stav}</span>
            </div>
            <div className={styles.cardBody}>
              <ul className={styles.itemList}>
                {order.polozky.map(item => (
                  <li key={item.id} className={styles.item}>
                    <span className={styles.itemName}>{item.nazov}</span>
                    <span className={styles.itemQuantity}>{item.pocet}x</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))
      ) : (
        <p>Zatiaľ nemáte žiadne objednávky.</p>
      )}
    </div>
  );
}