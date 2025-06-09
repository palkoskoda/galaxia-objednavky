"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { User } from 'firebase/auth'; // Potrebné pre typovú bezpečnosť objektu 'user'

// Definície typov...
interface Soup { name: string; allergens: string; }
interface Meal { option: string; is_fit: boolean; name:string; details: string | null; weight: string; allergens: string; }
interface FormattedDayMenu { date: string; day_of_week: string; source_file: string; soup: Soup; meals: Meal[]; daily_extra: any; user_choice: string[] | null; }

// Typ pre náš "košík"
type Selections = Record<string, Record<string, number>>;

export default function Home() {
    const { user } = useAuth(); // Získame info o prihlásenom používateľovi
    const [allData, setAllData] = useState<FormattedDayMenu[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Stav na zamedzenie dvojkliku
    const [error, setError] = useState<string | null>(null);
    const [selections, setSelections] = useState<Selections>({}); // Stav pre uloženie výberu

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
    
// ...importy a stavy...

    // Funkcia na zmenu počtu kusov jedla
    const handleSelectionChange = (date: string, option: string, delta: number) => {
        setSelections(prev => {
            const newSelections = JSON.parse(JSON.stringify(prev)); // Hlboká kópia pre istotu
            if (!newSelections[date]) {
                newSelections[date] = {};
            }
            const currentQuantity = newSelections[date][option] || 0;
            const newQuantity = currentQuantity + delta;

            if (newQuantity > 0) {
                newSelections[date][option] = newQuantity;
            } else {
                delete newSelections[date][option];
                if (Object.keys(newSelections[date]).length === 0) {
                    delete newSelections[date];
                }
            }
            return newSelections;
        });
    };
    
    // Funkcia na odoslanie objednávky
    const handleSubmitOrder = async () => {
    if (!user) {
        alert("Prosím, prihláste sa.");
        return;
    }

    // DÔLEŽITÁ KONTROLA: Ak je košík prázdny, nič neposielame.
    if (Object.keys(selections).length === 0) {
        alert("Váš nákupný košík je prázdny.");
        return;
    }

    setIsSubmitting(true);

    let successMessages: string[] = [];
    let errorMessages: string[] = [];

    try {
        const token = await user.getIdToken();
        
        // Iterujeme cez dni v našom lokálnom košíku
        for (const date in selections) {
            const dailySelection = selections[date];
            
            // Log pre ladenie na strane klienta
            console.log(`Odosielam objednávku pre ${date}:`, dailySelection);

            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: date, selections: dailySelection })
            });

            const result = await response.json();

            if (!response.ok) {
                errorMessages.push(`Chyba pre ${new Date(date).toLocaleDateString('sk-SK')}: ${result.error || 'Neznáma chyba'}`);
            } else {
                successMessages.push(result.message);
            }
        }

        if (errorMessages.length > 0) {
            alert("Niektoré objednávky sa nepodarilo spracovať:\n" + errorMessages.join('\n'));
        }
        if (successMessages.length > 0) {
             alert("Objednávka spracovaná:\n" + successMessages.join('\n'));
        }
        
        setSelections({});

    } catch (error: any) {
        console.error("Chyba pri odosielaní objednávky:", error);
        alert(`Chyba: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
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
            {user && Object.keys(selections).length > 0 && (
                <div className="order-summary">
                    <button 
                        onClick={handleSubmitOrder} 
                        className="submit-order-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Odosielam...' : 'Odoslať Objednávku'}
                    </button>
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
                                        {user && (
                                            <div className="quantity-selector">
                                                <button onClick={() => handleSelectionChange(day.date, meal.option, -1)} disabled={!selections[day.date]?.[meal.option]}>-</button>
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