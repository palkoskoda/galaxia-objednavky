// Súbor: app/page.tsx
"use client";

import { useState, useEffect } from 'react';

// --- Definícia typov pre dáta, ktoré očakávame z nášho API ---
// Toto je dobrá prax, v budúcnosti by sme to mohli presunúť do zdieľaného súboru (napr. types/index.ts)
interface Soup {
    name: string;
    allergens: string;
}

interface Meal {
    option: string;
    is_fit: boolean;
    name: string;
    details: string | null;
    weight: string;
    allergens: string;
}

interface FormattedDayMenu {
    date: string;
    day_of_week: string;
    source_file: string;
    soup: Soup;
    meals: Meal[];
    daily_extra: any; // Zatiaľ nevyužívame
    user_choice: string[] | null;
}
// --- Koniec definície typov ---

export default function Home() {
    // Používame typované `useState` háky
    const [allData, setAllData] = useState<FormattedDayMenu[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/get-menu');
                if (!response.ok) {
                    throw new Error(`Chyba servera: ${response.status}`);
                }
                const data: FormattedDayMenu[] = await response.json();
                setAllData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    function getWeekIdentifier(d: string): string {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    const groupedByWeek = allData.reduce((acc, day) => {
        const weekId = getWeekIdentifier(day.date);
        if (!acc[weekId]) {
            acc[weekId] = [];
        }
        acc[weekId].push(day);
        return acc;
    }, {} as Record<string, FormattedDayMenu[]>);

    const sortedWeeks = Object.keys(groupedByWeek).sort().reverse();

    if (isLoading) {
        return <div className="container"><h1>Načítavam menu...</h1></div>;
    }

    if (error) {
        return <div className="container"><h1>Chyba pri načítavaní</h1><p>{error}</p></div>;
    }

    return (
        <main className="container">
            <header>
                <h1>Jedálny Lístok - Galaxia</h1>
            </header>
            {sortedWeeks.map(weekId => {
                const weekData = groupedByWeek[weekId];
                const weekStartDate = new Date(weekId);
                const weekEndDate = new Date(weekStartDate);
                weekEndDate.setDate(weekStartDate.getDate() + 4);

                return (
                    <section key={weekId} className="week-section">
                        <h3>Týždeň: {weekStartDate.toLocaleDateString('sk-SK')} - {weekEndDate.toLocaleDateString('sk-SK')}</h3>
                        {weekData.map(day => (
                            <div key={day.date} className="day-card">
                                <div className="day-header">
                                    {day.day_of_week} <small>{new Date(day.date).toLocaleDateString('sk-SK')}</small>
                                </div>
                                <div className="soup"><strong>Polievka:</strong> {day.soup.name}</div>
                                {day.meals.map(meal => (
                                    <div key={meal.option} className={`meal-option ${meal.is_fit ? 'fit' : ''}`}>
                                        <span className="option-letter">{meal.option}</span>
                                        <div className="meal-details">
                                            <div className="name">{meal.name}</div>
                                            {meal.details && <div className="details">({meal.details})</div>}
                                        </div>
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