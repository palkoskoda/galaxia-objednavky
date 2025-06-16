/* import { NextResponse, NextRequest } from 'next/server';
import Airtable, { FieldSet } from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

interface OrderFields extends FieldSet {
    Pouzivatel: readonly string[];
    DatumObjednavky: string;
    ObjednanePolozky: string;
    Stav: string;
    DatumVytvorenia: string;
    CelkovaCena?: number; // Pridané ako voliteľné
}

export async function GET(req: NextRequest) {
    console.log('--- /api/get-my-orders started ---');
    try {
        // --- KROK 1: Overenie používateľa ---
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        console.log(`[KROK 1] User verified. UID: ${uid}`);

        // --- KROK 2: Nájdenie Airtable Record ID používateľa ---
        const users = await base('Pouzivatelia').select({
            filterByFormula: `{Fbuid} = "${uid}"`,
            maxRecords: 1,
            fields: [] // Nepotrebujeme žiadne polia, len ID záznamu
        }).firstPage();

        if (users.length === 0) {
            console.warn(`[KROK 2 - ZLYHANIE] Používateľ s Fbuid '${uid}' nebol nájdený v tabuľke 'Pouzivatelia'. Vraciam prázdne pole.`);
            return NextResponse.json([]); // Vrátime prázdne pole
        }
        const userRecordId = users[0].id;
        console.log(`[KROK 2 - ÚSPECH] Nájdené Airtable ID používateľa: ${userRecordId}`);

        // --- KROK 3: Načítanie objednávok pre dané Record ID ---
        console.log(`[KROK 3] Hľadám objednávky pre PouzivatelID = '${userRecordId}'`);
        const records = await base('Objednavky')
            .select({
                filterByFormula: `{PouzivatelID} = '${userRecordId}'`,
                sort: [{ field: 'DatumObjednavky', direction: 'desc' }],
            })
            .all();

        if (records.length === 0) {
            console.log(`[KROK 3 - VÝSLEDOK] Pre používateľa ${userRecordId} neboli nájdené žiadne objednávky. Vraciam prázdne pole.`);
            return NextResponse.json([]);
        }
        console.log(`[KROK 3 - ÚSPECH] Nájdených ${records.length} objednávok.`);

        // --- KROK 4: Formátovanie dát pre frontend ---
        console.log('[KROK 4] Formátujem dáta...');
        const orders = records.map(record => {
            const fields = record.fields as OrderFields;
            return {
                id: record.id,
                datum: fields.DatumObjednavky,
                objednavka: JSON.parse(fields.ObjednanePolozky || '{}'),
                stav: fields.Stav,
                cena: fields.CelkovaCena
            };
        });
        
        console.log('Dáta úspešne naformátované. Odosielam odpoveď.');
        return NextResponse.json(orders);

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA v /api/get-my-orders ---', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} */

    import { NextResponse } from "next/server";
import { airtable, getMinifiedRecords } from "@/lib/airtable";
import { verifyUser } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    // KROK 1: Overenie používateľa
    const decodedToken = await verifyUser(request);
    if (!decodedToken) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { uid } = decodedToken;
    console.log(`[get-my-orders] KROK 1: User verified. UID: ${uid}`);

    // KROK 2: Nájdenie Airtable záznamu používateľa a získanie jeho číselného ID
    const userRecords = await airtable("Pouzivatelia")
      .select({
        filterByFormula: `{FirebaseUID} = '${uid}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (!userRecords || userRecords.length === 0) {
      return NextResponse.json(
        { message: "User not found in Airtable" },
        { status: 404 }
      );
    }
    
    const pouzivatelID = userRecords[0].get("PouzivatelID") as number;
    console.log(`[get-my-orders] KROK 2 - ÚSPECH: Nájdené PouzivatelID: ${pouzivatelID}`);

    if (!pouzivatelID) {
      console.log(`[get-my-orders] KROK 2 - CHYBA: PouzivatelID pre UID ${uid} neexistuje v Airtable.`);
      return NextResponse.json(
        { message: "User record is incomplete" },
        { status: 500 }
      );
    }

    // KROK 3: Hľadanie objednávok podľa číselného PouzivatelID
    console.log(`[get-my-orders] KROK 3: Hľadám objednávky pre PouzivatelID = ${pouzivatelID}`);

    const orderRecords = await airtable("Objednavky")
      .select({
        // TOTO JE KĽÚČOVÁ ZMENA!
        // Filtrujeme podľa stĺpca "PouzivatelID" v tabuľke Objednavky
        // a porovnávame ho s číselnou hodnotou, ktorú sme našli v KROKU 2.
        filterByFormula: `{PouzivatelID} = ${pouzivatelID}`,
        sort: [{ field: "DatumObjednavky", direction: "desc" }],
      })
      .all();
      
    if (!orderRecords || orderRecords.length === 0) {
        console.log(`[get-my-orders] KROK 3 - VÝSLEDOK: Pre PouzivatelID ${pouzivatelID} neboli nájdené žiadne objednávky. Vraciam prázdne pole.`);
        return NextResponse.json([], { status: 200 });
    }

    console.log(`[get-my-orders] KROK 3 - VÝSLEDOK: Nájdených ${orderRecords.length} objednávok.`);

    // Spracovanie a vrátenie dát
    const minifiedRecords = getMinifiedRecords(orderRecords);
    // Tento krok je dôležitý na získanie názvov jedál z prepojenej tabuľky
    const enhancedOrders = await Promise.all(minifiedRecords.map(async (order) => {
        const menuRecordIds = order.fields.DenneMenu as string[];
        if (!menuRecordIds || menuRecordIds.length === 0) {
            return { ...order.fields, NazovJedla: "Neznáme jedlo" };
        }
        const menuRecord = await airtable('DenneMenu').find(menuRecordIds[0]);
        return {
            ...order.fields,
            NazovJedla: menuRecord.fields.NazovLookup || 'Načítava sa...', // Predpokladáme, že máte lookup pole 'NazovLookup' v DenneMenu
        };
    }));

    return NextResponse.json(enhancedOrders, { status: 200 });

  } catch (error) {
    console.error("[API get-my-orders] Error:", error);
    return NextResponse.json(
      { message: "Error fetching orders", error },
      { status: 500 }
    );
  }
}