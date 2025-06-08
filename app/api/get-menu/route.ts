// Súbor: app/api/get-menu/route.ts
import { NextResponse } from 'next/server';
import Airtable, { FieldSet, Records } from 'airtable';

// Definujeme si typy pre lepšiu kontrolu a čitateľnosť
interface MenuPolozkaFields extends FieldSet {
    Nazov: string;
    Popis?: string;
    Alergeny?: string;
    Typ?: 'FIT' | 'Mäsové' | 'Bezmäsité';
}

interface DailyMenuFields extends FieldSet {
    Datum: string;
    Polievka?: string;
    Menu_A?: readonly string[];
    Menu_B?: readonly string[];
    Menu_C?: readonly string[];
    Menu_D?: readonly string[];
}

// Inicializujeme spojenie s Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

export async function GET() {
    try {
        // 1. Načítame všetky jedlá a vytvoríme si mapu
        const menuItemsRecords = await base('MenuPolozky').select().all();
        const menuItemsMap = new Map<string, MenuPolozkaFields>();
        menuItemsRecords.forEach(record => {
            menuItemsMap.set(record.id, record.fields as MenuPolozkaFields);
        });

        // 2. Načítame denné menu
        const dailyMenuRecords = await base('DenneMenu').select({
            maxRecords: 30,
            sort: [{ field: 'Datum', direction: 'desc' }]
        }).all();
        
        // 3. Spracujeme dáta do finálneho formátu
        const formattedData = dailyMenuRecords 
            .filter(record => record.fields.Datum) 
            .map(record => {
            const fields = record.fields as DailyMenuFields;
            const day = {
                date: fields.Datum,
                day_of_week: new Date(fields.Datum).toLocaleDateString('sk-SK', { weekday: 'long' }),
                source_file: 'Airtable',
                soup: {
                    name: fields.Polievka ?? 'Nezadaná',
                    allergens: ''
                },
                meals: [] as any[], // Typ pre meals si definujeme na frontende
                daily_extra: null,
                user_choice: null
            };

            ['A', 'B', 'C', 'D'].forEach(option => {
                const menuItemIds = fields[`Menu_${option}` as keyof DailyMenuFields] as readonly string[] | undefined;
                if (menuItemIds && menuItemIds.length > 0 && menuItemsMap.has(menuItemIds[0])) {
                    const mealData = menuItemsMap.get(menuItemIds[0])!;
                    day.meals.push({
                        option: option,
                        is_fit: (mealData.Typ && mealData.Typ === 'FIT') || (mealData.Nazov && mealData.Nazov.toLowerCase().includes('fit')),
                        name: mealData.Nazov,
                        details: mealData.Popis || null,
                        weight: '',
                        allergens: mealData.Alergeny || ''
                    });
                }
            });
            return day;
        });

        // 4. Vrátime dáta
        return NextResponse.json(formattedData);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Chyba pri načítavaní dát z Airtable.' }, { status: 500 });
    }
}