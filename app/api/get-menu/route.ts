import { NextResponse } from 'next/server';
import { airtable } from '@/lib/airtable';
import { FieldSet, Record } from 'airtable';

// Pomocná funkcia na bezpečné načítanie prepojeného záznamu
const resolveLinkedRecord = async (recordId: string, tableName: string) => {
  if (!recordId) return null;
  try {
    const record = await airtable(tableName).find(recordId);
    return {
      id: record.id,
      nazov: record.fields.Nazov || 'Názov chýba',
      popis: record.fields.Popis || '',
      alergeny: record.fields.Alergeny || '',
      cena: record.fields.CenaStandard || 0, // Doplň si správny názov poľa pre cenu
    };
  } catch (error) {
    console.error(`Chyba pri načítaní záznamu ${recordId} z tabuľky ${tableName}:`, error);
    return null;
  }
};

export async function GET() {
  try {
    // KROK 1: Načítame záznamy z 'DenneMenu' (napr. na tento týždeň)
    // Pre jednoduchosť teraz načítame všetky, v praxi by si filtroval podľa dátumu
    const dailyMenuRecords = await airtable('DenneMenu').select({
      sort: [{ field: "Datum", direction: "asc" }]
    }).all();

    if (!dailyMenuRecords || dailyMenuRecords.length === 0) {
      return NextResponse.json({});
    }

    // KROK 2: Toto je kľúčová časť. Pre každý deň si donačítame detaily jedál.
    const menuByDate: { [date: string]: any[] } = {};

    for (const record of dailyMenuRecords) {
        const date = record.fields.Datum as string;
        if (!date) continue;

        const mealTypes = ['Menu_A', 'Menu_B', 'Menu_C', 'Menu_D', 'Polievka'];
        const mealsForDay = [];

        for (const type of mealTypes) {
            const linkedRecordId = (record.fields[type] as string[] | undefined)?.[0];
            if (linkedRecordId) {
                const mealDetails = await resolveLinkedRecord(linkedRecordId, 'MenuPolozky');
                if (mealDetails) {
                    mealsForDay.push({ dennemenu_id: record.id, typ: type, ...mealDetails });
                }
            }
        }
        menuByDate[date] = mealsForDay;
    }

    return NextResponse.json(menuByDate);

  } catch (error) {
    console.error("[API get-menu] Chyba:", error);
    return NextResponse.json({ message: "Chyba na serveri pri načítaní menu" }, { status: 500 });
  }
}