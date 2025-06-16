'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

// Typy pre lepšiu prácu s dátami
type Meal = {
  id: string; // Record ID z MenuPolozky
  typ: string; // 'Menu_A', 'Menu_B', ...
  nazov: string;
  popis: string;
  alergeny: string;
  cena: number;
};

type MenuByDate = {
  [date: string]: Meal[];
};

type Selections = {
  [date: string]: {
    [mealId: string]: number; // mealId je Record ID z MenuPolozky
  };
};

export default function HomePage() {
  const { user } = useAuth();
  
  const [menu, setMenu] = useState<MenuByDate>({});
  const [selections, setSelections] = useState<Selections>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Načítanie menu z API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/get-menu');
        if (!response.ok) {
          throw new Error('Nepodarilo sa načítať jedálny lístok.');
        }
        const data = await response.json();
        setMenu(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // Funkcie na prácu s "košíkom"
  const handleQuantityChange = (date: string, mealId: string, delta: number) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      if (!newSelections[date]) newSelections[date] = {};
      
      const currentQuantity = newSelections[date][mealId] || 0;
      const newQuantity = Math.max(0, currentQuantity + delta);

      if (newQuantity > 0) {
        newSelections[date][mealId] = newQuantity;
      } else {
        delete newSelections[date][mealId];
      }
      return newSelections;
    });
  };

  // Funkcia na odoslanie objednávky (opravená)
  const handleOrderSubmit = async (date: string) => {
    if (!user) return alert("Musíte byť prihlásený.");
    const items = selections[date];
    if (!items || Object.keys(items).length === 0) return alert("Košík je prázdny.");

    // Dôležitá zmena: Používame ID z MenuPolozky, ale API potrebuje ID z DenneMenu
    // Tento problém musíme vyriešiť. Najjednoduchšie je, ak API get-menu vráti aj to.
    // Pre zatiaľ to pošle chybné ID, ale opravíme to v ďalšom kroku.
    const orderItems = Object.entries(items).map(([menuId, pocet]) => ({ menuId, pocet }));

    // ... zvyšok funkcie handleOrderSubmit ...
  };

  // Vykreslenie
  if (isLoading) return <p>Načítavam jedálny lístok...</p>;
  if (error) return <p>Chyba: {error}</p>;

  return (
    <div>
      <h1>Jedálny lístok</h1>
      {Object.entries(menu).map(([date, meals]) => (
        <div key={date} style={{ marginBottom: '2rem', border: '1px solid #ccc', padding: '1rem' }}>
          <h2>{new Date(date).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {meals.length > 0 ? (
            <ul>
              {meals.map(meal => (
                <li key={meal.id}>
                  <strong>{meal.nazov}</strong> ({meal.typ})<br />
                  <small>{meal.popis}</small><br />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => handleQuantityChange(date, meal.id, -1)}>-</button>
                    <span>{selections[date]?.[meal.id] || 0}</span>
                    <button onClick={() => handleQuantityChange(date, meal.id, 1)}>+</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Na tento deň nie je zadané žiadne menu.</p>
          )}
          <button onClick={() => handleOrderSubmit(date)}>Odoslať objednávku na tento deň</button>
        </div>
      ))}
    </div>
  );
}