'use client';

// === ZAČIATOK OPRAVY: TOTO SÚ CHÝBAJÚCE IMPORTY ===
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
// === KONIEC OPRAVY ===

// --- Typy pre dáta ---
type Meal = {
  id: string; // Record ID z MenuPolozky
  dennemenu_id: string; // Record ID z DenneMenu
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
    [dennemenu_id: string]: number; 
  };
};

export default function HomePage() {
  // --- Stavy komponentu ---
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuByDate>({});
  const [selections, setSelections] = useState<Selections>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Logika na načítanie menu ---
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

  // --- Funkcie na interakciu ---
  const handleQuantityChange = (date: string, dennemenu_id: string, delta: number) => {
    // Oprava chyby 'implicitly has an 'any' type' pridaním typu pre 'prev'
    setSelections((prev: Selections) => {
      const newSelections = { ...prev };
      if (!newSelections[date]) newSelections[date] = {};
      
      const currentQuantity = newSelections[date][dennemenu_id] || 0;
      const newQuantity = Math.max(0, currentQuantity + delta);

      if (newQuantity > 0) {
        newSelections[date][dennemenu_id] = newQuantity;
      } else {
        delete newSelections[date][dennemenu_id];
      }
      return newSelections;
    });
  };

  const handleOrderSubmit = async (date: string) => {
    if (!user) return alert("Musíte byť prihlásený.");
    const items = selections[date];
    if (!items || Object.keys(items).length === 0) return alert("Košík je prázdny.");
    
    const orderItems = Object.entries(items).map(([menuId, pocet]) => ({ menuId, pocet }));

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
      // Vyčistí košík pre daný deň po úspešnom odoslaní
      setSelections(prev => ({ ...prev, [date]: {} }));

    } catch (error: any) {
        alert(`Chyba: ${error.message}`);
    }
  };

  // --- Vykreslenie (JSX) ---
  // TÚTO ČASŤ SI PRISPÔSOB PODĽA SVOJHO DIZAJNU
  if (isLoading) return <div>Načítavam...</div>;
  if (error) return <div>Chyba: {error}</div>;

  return (
    <div>
      <h1>Jedálny lístok</h1>
      {Object.keys(menu).length > 0 ? Object.entries(menu).map(([date, meals]) => (
        <div key={date} className="menu-day-container"> {/* Použi svoje CSS triedy */}
          <h2>{new Date(date).toLocaleDateString('sk-SK')}</h2>
          {meals.map((meal) => (
            <div key={meal.id} className="meal-item"> {/* Použi svoje CSS triedy */}
              <h4>{meal.nazov}</h4>
              <p>{meal.popis}</p>
              
              <div className="quantity-selector"> {/* Použi svoje CSS triedy */}
                <button onClick={() => handleQuantityChange(date, meal.dennemenu_id, -1)}>-</button>
                <span>{selections[date]?.[meal.dennemenu_id] || 0}</span>
                <button onClick={() => handleQuantityChange(date, meal.dennemenu_id, 1)}>+</button>
              </div>
            </div>
          ))}
          <button onClick={() => handleOrderSubmit(date)} className="order-button">
            Odoslať objednávku na tento deň
          </button>
        </div>
      )) : <p>Žiadne menu na zobrazenie.</p>}
    </div>
  );
}