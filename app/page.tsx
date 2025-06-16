'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import styles from './HomePage.module.css'; // Použijeme štýly, ktoré sme už vytvorili

// --- Typové definície ---
type Meal = {
  id: string; // Unikátne ID z MenuPolozky
  dennemenu_id: string; // Unikátne ID z DenneMenu
  typ: string; 
  nazov: string;
  popis: string;
};

type MenuByDate = {
  [date: string]: Meal[];
};

type Selections = {
  [date: string]: {
    [mealId: string]: { // Kľúč je unikátne ID jedla (z MenuPolozky)
      pocet: number;
      dennemenu_id: string; // Musíme si pamätať aj toto pre API
      nazov: string;
    }
  };
};

export default function HomePage() {
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuByDate>({});
  const [selections, setSelections] = useState<Selections>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch('/api/get-menu');
        if (!response.ok) throw new Error('Chyba pri načítaní menu.');
        setMenu(await response.json());
      } catch (err: any) { setError(err.message); } 
      finally { setIsLoading(false); }
    };
    fetchMenu();
  }, []);

  const handleQuantityChange = (date: string, meal: Meal, delta: number) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      if (!newSelections[date]) newSelections[date] = {};
      
      const currentQuantity = newSelections[date][meal.id]?.pocet || 0;
      const newQuantity = Math.max(0, currentQuantity + delta);

      if (newQuantity > 0) {
        newSelections[date][meal.id] = {
          pocet: newQuantity,
          dennemenu_id: meal.dennemenu_id,
          nazov: meal.nazov,
        };
      } else {
        delete newSelections[date][meal.id];
      }
      return newSelections;
    });
  };

  const handleOrderSubmit = async (date: string) => {
    if (!user) return alert("Musíte byť prihlásený.");
    const items = selections[date];
    if (!items || Object.keys(items).length === 0) return alert("Košík je prázdny.");
    
    const orderItems = Object.values(items).map(item => ({
      menuId: item.dennemenu_id, // Správne ID pre API
      pocet: item.pocet,
      nazov: item.nazov, // Posielame aj názov
    }));

    try {
      // ... (zvyšok fetch logiky, ktorá je už funkčná) ...
    } catch (error: any) { /* ... */ }
  };

  if (isLoading) return <div className={styles.container}>Načítavam...</div>;
  if (error) return <div className={styles.container}>Chyba: {error}</div>;

  return (
    <div className={styles.container}>
      <h1>Jedálny lístok</h1>
      {Object.entries(menu).map(([date, meals]) => (
        <div key={date} className={styles.dayBlock}>
          <h2 className={styles.dayTitle}>{new Date(date).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          
          {meals.map((meal) => (
            <div key={meal.id} className={styles.mealItem}>
              <div className={styles.mealInfo}>
                <span className={styles.mealName}>{meal.nazov}</span>
                <span className={styles.mealDescription}>{meal.popis}</span>
              </div>
              
              <div className={styles.quantitySelector}>
                <button className={styles.quantityButton} onClick={() => handleQuantityChange(date, meal, -1)}>-</button>
                <span className={styles.quantityDisplay}>{selections[date]?.[meal.id]?.pocet || 0}</span>
                <button className={styles.quantityButton} onClick={() => handleQuantityChange(date, meal, 1)}>+</button>
              </div>
            </div>
          ))}
          
          <button onClick={() => handleOrderSubmit(date)} className={styles.submitButton}>
            Odoslať objednávku
          </button>
        </div>
      ))}
    </div>
  );
}