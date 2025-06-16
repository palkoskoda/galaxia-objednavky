import { NextResponse } from 'next/server';
import { airtable } from '@/lib/airtable';
import { verifyUser } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const decodedToken = await verifyUser(request);
    if (!decodedToken || decodedToken.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const allItemsToday = await airtable('ObjednanePolozky').select({
      filterByFormula: `IS_SAME({DatumObjednavkyLookup}, '${today}', 'day')`,
    }).all();

    if (!allItemsToday || allItemsToday.length === 0) {
      return NextResponse.json({ summary: {}, detailedOrders: [] }, { status: 200 });
    }

    const detailedOrders = (await Promise.all(
        allItemsToday.map(async (item) => {
            // === ZAČIATOK OPRAVY ===
            
            // 1. Bezpečne načítame ID objednávky
            const objednavkaIds = item.fields.ObjednavkaID as string[] | undefined;
            if (!objednavkaIds || objednavkaIds.length === 0) return null; // Ak chýba, túto položku preskočíme
            
            const objednavkaRecord = await airtable('Objednavky').find(objednavkaIds[0]);
            if (!objednavkaRecord) return null; // Ak sa objednávka nenašla, preskočíme

            // 2. Bezpečne načítame ID používateľa
            const pouzivatelIds = objednavkaRecord.fields.PouzivatelID as string[] | undefined;
            if (!pouzivatelIds || pouzivatelIds.length === 0) return null;

            const pouzivatelRecord = await airtable('Pouzivatelia').find(pouzivatelIds[0]);
            if (!pouzivatelRecord) return null;

            // 3. Bezpečne načítame ID jedla
            const denneMenuIds = item.fields.DenneMenuID as string[] | undefined;
            if (!denneMenuIds || denneMenuIds.length === 0) return null;

            const jedloRecord = await airtable('DenneMenu').find(denneMenuIds[0]);
            if (!jedloRecord) return null;

            // === KONIEC OPRAVY ===

            return {
                pouzivatel: (pouzivatelRecord.fields.Meno as string) || 'Neznámy',
                jedlo: (jedloRecord.fields.Name as string) || 'Neznáme',
                pocet: (item.fields.Pocet as number) || 0
            };
        })
    )).filter(Boolean); // Odstránime všetky null hodnoty z poľa
    
    const summary = detailedOrders.reduce((acc: { [key: string]: number }, order) => {
        if (!order) return acc; // Extra poistka
        const key = String(order.jedlo);
        acc[key] = (acc[key] || 0) + order.pocet;
        return acc;
    }, {});
    
    return NextResponse.json({ summary, detailedOrders }, { status: 200 });

  } catch (error) {
    console.error('[API get-daily-summary] Error:', error);
    return NextResponse.json({ message: 'Error fetching daily summary', error }, { status: 500 });
  }
}