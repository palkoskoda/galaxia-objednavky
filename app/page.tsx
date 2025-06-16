'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
// import '@/globals.css'; // Importujeme naše štýly (global CSS should be imported in _app.tsx or layout.tsx)

// --- Typové definície pre dáta ---
type Meal = {
  id: string; // Record ID z tabuľky MenuPolozky
  dennemenu_id: string; // Record ID z tabuľky DenneMenu (toto je dôležité!)
  typ: string; 
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
    [mealId: string]: number; // Kľúč je teraz 'mealId', unikátne ID z MenuPolozky
  };
};


export default function HomePage() {
  // --- Stavy komponentu (premenné pre 'menu', 'selections', atď.) ---
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuByDate>({});
  const [selections, setSelections] = useState<Selections>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Logika na načítanie menu po otvorení stránky ---
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/get-menu');
        if (!response.ok) throw new Error('Nepodarilo sa načítať jedálny lístok.');
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

  // --- Funkcie na prácu s "košíkom" a odoslanie ---
  const handleQuantityChange = (date: string, mealId: string, delta: number) => {
    setSelections((prev: Selections) => {
      const newSelections = { ...prev };
      if (!newSelections[date]) newSelections[date] = {};
      
      // Pracujeme s unikátnym mealId
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

  const handleOrderSubmit = async (date: string) => {
    if (!user) return alert("Musíte byť prihlásený.");

    
  // Pripravíme dáta pre API (kľúč z 'selections' je naše 'menuId')
  const orderItems = Object.entries(selections[date] || {}).map(([mealId, pocet]) => {
    // Nájdeme celé jedlo v našom načítanom menu, aby sme získali jeho názov
    const mealInfo = menu[date].find(m => m.id === mealId);
    return {
      // Posielame ID z DenneMenu, nie z MenuPolozky, lebo tak to očakáva API
      menuId: mealInfo?.dennemenu_id || '', 
      pocet,
      nazov: mealInfo?.nazov || 'Názov neznámy',
    };
  });

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderItems }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Neznáma chyba');
      
      alert('Objednávka úspešne odoslaná!');
      setSelections(prev => ({ ...prev, [date]: {} })); // Vyčistí košík

    } catch (error: any) {
        alert(`Chyba: ${error.message}`);
    }
  };

  // --- Vykreslenie stránky (HTML a dizajn) ---
  if (isLoading) return <div className="container">Načítavam...</div>;
  if (error) return <div className="container">Chyba: {error}</div>;

  return (
    <div className="container">
      <h1>Jedálny lístok</h1>
      {Object.keys(menu).length > 0 ? Object.entries(menu).map(([date, meals]) => (
        <div key={date} className="dayBlock">
          <h2 className="dayTitle">{new Date(date).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          
          {meals.map((meal) => (
            <div key={meal.id} className="mealItem">
  {/* ... informácie o jedle ... */}
  
  <div className="quantitySelector">
    {/* === ZMENA JE TU: Používame meal.id namiesto meal.dennemenu_id === */}
    <button className="quantityButton" onClick={() => handleQuantityChange(date, meal.id, -1)}>-</button>
    <span className="quantityDisplay">{selections[date]?.[meal.id] || 0}</span>
    <button className="quantityButton" onClick={() => handleQuantityChange(date, meal.id, 1)}>+</button>
  </div>
</div>
          ))}
          
          <button onClick={() => handleOrderSubmit(date)} className="submitButton">
            Odoslať objednávku na tento deň
          </button>
        </div>
      )) : <p>Žiadne menu na zobrazenie.</p>}
    </div>
  );
}