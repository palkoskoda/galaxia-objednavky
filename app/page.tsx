'use client'; // Nutné pre použitie hookov ako useState a useContext

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext'; // Správny spôsob, ako získať usera

// Definujeme si typ pre náš "nákupný košík" pre lepšiu prehľadnosť
type Selections = {
  [date: string]: {
    [menuId: string]: number; // menuId je Record ID z Airtable
  };
};

export default function HomePage() {
  // --- OPRAVA CHYBY 'auth' ---
  // Použijeme hook 'useAuth' na získanie prihláseného používateľa
  const { user } = useAuth(); 

  // --- OPRAVA CHYBY 'selectedItemsForDate' ---
  // Vytvoríme stav (state) pre ukladanie vybraných položiek.
  // Ty si túto premennú môžeš pomenovať inak, toto je príklad.
  const [selectionsByDate, setSelectionsByDate] = useState<Selections>({});
  
  // (Tu predpokladám, že máš kód na načítanie menu, ten nechaj, ako je)
  // const [menuData, setMenuData] = useState<any>({});
  // useEffect(() => { /* kód na fetch menu */ }, []);


  // Funkcia na zmenu počtu kusov (príklad)
  const handleQuantityChange = (date: string, menuId: string, newQuantity: number) => {
    setSelectionsByDate(prev => {
      const newSelections = { ...prev };
      if (!newSelections[date]) {
        newSelections[date] = {};
      }
      
      if (newQuantity > 0) {
        newSelections[date][menuId] = newQuantity;
      } else {
        // Ak je počet 0, odstránime položku z objektu
        delete newSelections[date][menuId];
      }
      
      return newSelections;
    });
  };


  // Opravená funkcia na odoslanie objednávky
  const handleOrderSubmit = async (date: string) => {
    // 1. Skontrolujeme, či je používateľ prihlásený
    if (!user) {
      alert("Na odoslanie objednávky musíte byť prihlásený.");
      return;
    }

    // 2. Použijeme náš definovaný stav 'selectionsByDate'
    const items = selectionsByDate[date];

    if (!items || Object.keys(items).length === 0) {
      alert("Váš košík pre tento deň je prázdny.");
      return;
    }

    // Transformujeme objekt na pole, ktoré náš backend očakáva
    const orderItems = Object.entries(items).map(([menuId, pocet]) => ({
      menuId: menuId,
      pocet: pocet,
    }));

    const bodyPayload = { orderItems };

    try {
      // 3. Získame token priamo z objektu 'user' z nášho kontextu
      const idToken = await user.getIdToken();

      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Neznáma chyba na serveri');
      }

      alert('Objednávka bola úspešne odoslaná!');
      // Tu môžeš napríklad vyčistiť košík pre daný deň
      handleQuantityChange(date, Object.keys(items)[0], 0);


    } catch (error: any) {
      alert(`Chyba pri odosielaní objednávky: ${error.message}`);
    }
  };

  // --- Váš JSX kód ---
  // Tu bude tvoj kód, ktorý zobrazuje menu a tlačidlá.
  // Dôležité je, aby tlačidlá volali funkcie ako 'handleQuantityChange' a 'handleOrderSubmit'.
  return (
    <div>
      <h1>Jedálny lístok</h1>
      {/* 
        Príklad, ako by si mohol volať funkciu.
        Toto si prispôsob podľa tvojej štruktúry. 
      */}
      <button onClick={() => handleOrderSubmit('2025-06-16')}>
        Odoslať objednávku na 16.6.
      </button>
    </div>
  );
}