"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext'; // 1. Importujeme useAuth

// Definície typov... (interface Soup, Meal, FormattedDayMenu)
interface Soup { name: string; allergens: string; }
interface Meal { option: string; is_fit: boolean; name:string; details: string | null; weight: string; allergens: string; }
interface FormattedDayMenu { date: string; day_of_week: string; source_file: string; soup: Soup; meals: Meal[]; daily_extra: any; user_choice: string[] | null; }

// 2. Definujeme typ pre náš "košík"
// Štruktúra: { '2025-06-10': { 'A': 2, 'B': 1 }, '2025-06-11': { 'C': 1 } }
type Selections = Record<string, Record<string, number>>;

export default function Home() {
    const { user } = useAuth(); // Získame info o prihlásenom používateľovi
    const [allData, setAllData] = useState<FormattedDayMenu[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selections, setSelections] = useState<Selections>({}); // 3. Stav pre uloženie výberu

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/get-menu');
                if (!response.ok) throw new Error(`Chyba servera: ${response.status}`);
                const data: FormattedDayMenu[] = await response.json();
                setAllData(data);
            } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
        };
        fetchData();
    }, []);
    
    // 4. Funkcia na zmenu počtu kusov jedla
    const handleSelectionChange = (date: string, option: string, delta: number) => {
        setSelections(prev => {
            const newSelections = { ...prev };
            if (!newSelections[date]) {
                newSelections[date] = {};
            }
            const currentQuantity = newSelections[date][option] || 0;
            const newQuantity = currentQuantity + delta;

            if (newQuantity > 0) {
                newSelections[date][option] = newQuantity;
            } else {
                delete newSelections[date][option]; // Odstránime, ak je počet 0
                if (Object.keys(newSelections[date]).length === 0) {
                    delete newSelections[date]; // Odstránime aj deň, ak je prázdny
                }
            }
            return newSelections;
        });
    };
    
    // 5. Funkcia na odoslanie objednávky (zatiaľ len vypíše do konzoly)
    const handleSubmitOrder = () => {
        if (Object.keys(selections).length === 0) {
            alert("Váš košík je prázdny!");
            return;
        }
        console.log("Odosielaná objednávka:", selections);
        // Tu v ďalšom kroku budeme volať API endpoint /api/create-order
        alert("Objednávka odoslaná (zatiaľ len v konzole)!");
        setSelections({}); // Vyprázdnime košík po odoslaní
    };

    // Funkcie na zoskupenie po týždňoch zostávajú rovnaké
    function getWeekIdentifier(d: string | null | undefined): string {
        if (!d) return 'invalid-date';
        const date = new Date(d);
        if (isNaN(date.getTime())) return 'invalid-date';
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    const groupedByWeek = allData.filter(day => day.date).reduce((acc, day) => {
        const weekId = getWeekIdentifier(day.date);
        if (weekId === 'invalid-date') return acc;
        if (!acc[weekId]) acc[weekId] = [];
        acc[weekId].push(day);
        return acc;
    }, {} as Record<string, FormattedDayMenu[]>);

    const sortedWeeks = Object.keys(groupedByWeek).sort().reverse();
    
    if (isLoading) return <div className="container"><h1>Načítavam menu...</h1></div>;
    if (error) return <div className="container"><h1>Chyba pri načítavaní</h1><p>{error}</p></div>;

    return (
        <main className="container">
            {/* Tlačidlo na odoslanie objednávky, viditeľné len ak je user prihlásený a má niečo vybrané */}
            {user && Object.keys(selections).length > 0 && (
                <div className="order-summary">
                    <button onClick={handleSubmitOrder} className="submit-order-button">Odoslať Objednávku</button>
                </div>
            )}

            {sortedWeeks.map(weekId => {
                const weekData = groupedByWeek[weekId];
                const weekStartDate = new Date(weekId);
                const weekEndDate = new Date(weekStartDate); weekEndDate.setDate(weekStartDate.getDate() + 4);

                return (
                    <section key={weekId} className="week-section">
                        <h3>Týždeň: {weekStartDate.toLocaleDateString('sk-SK')} - {weekEndDate.toLocaleDateString('sk-SK')}</h3>
                        {weekData.map(day => (
                            <div key={day.date} className="day-card">
                                <div className="day-header">{day.day_of_week} <small>{new Date(day.date).toLocaleDateString('sk-SK')}</small></div>
                                <div className="soup"><strong>Polievka:</strong> {day.soup.name}</div>
                                {day.meals.map(meal => (
                                    <div key={meal.option} className={`meal-option ${meal.is_fit ? 'fit' : ''}`}>
                                        <span className="option-letter">{meal.option}</span>
                                        <div className="meal-details">
                                            <div className="name">{meal.name}</div>
                                            {meal.details && <div className="details">({meal.details})</div>}
                                        </div>
                                        {/* 6. Ovládacie prvky - ZOBRAZIA SA LEN PRE PRIHLÁSENÝCH */}
                                        {user && (
                                            <div className="quantity-selector">
                                                <button onClick={() => handleSelectionChange(day.date, meal.option, -1)}>-</button>
                                                <span>{selections[day.date]?.[meal.option] || 0}</span>
                                                <button onClick={() => handleSelectionChange(day.date, meal.option, 1)}>+</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </section>
                );
            })}
        </main>
    );
}