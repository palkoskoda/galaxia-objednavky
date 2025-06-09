import { NextResponse, NextRequest } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin'; // Server-side Firebase
import Airtable from 'airtable';

// Airtable inicializácia
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

// Definujeme typ, ktorý očakávame z frontendu
type Selections = Record<string, Record<string, number>>;

export async function POST(req: NextRequest) {
    try {
        // 1. Získanie a overenie autorizačného tokenu
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization token.' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];

        // Overenie tokenu pomocou Firebase Admin SDK
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid; // ID prihláseného používateľa

        // 2. Spracovanie tela požiadavky
        const selections: Selections = await req.json();

        // 3. Validácia dát (základná)
        if (!selections || Object.keys(selections).length === 0) {
            return NextResponse.json({ error: 'Order data is empty.' }, { status: 400 });
        }

        // 4. Formátovanie dát pre Airtable
        // Vytvoríme jeden záznam pre každý riadok v objednávke (dátum-jedlo-počet)
        const recordsToCreate = [];
        for (const date in selections) {
            for (const option in selections[date]) {
                const quantity = selections[date][option];
                recordsToCreate.push({
                    fields: {
                        // Prepojenie na Používateľa - PREDPOKLADÁME, že v tabuľke Pouzivatelia
                        // máte stĺpec `FirebaseUID` a v tabuľke Objednavky je stĺpec `Pouzivatel`
                        // typu "Link to another record" smerujúci na Pouzivatelia.
                        // Toto je najkomplikovanejšia časť, Airtable potrebuje Record ID.
                        // Pre jednoduchosť zatiaľ uložíme len Firebase UID.
                        // Ideálne by sme si najprv našli Record ID používateľa podľa UID.
                        // Pre teraz použijeme stĺpec, ktorý si nazveme napr. `FirebaseUID`.
                        'FirebaseUID': uid,
                        'Datum': date,
                        'Menu': option,
                        'Pocet': quantity,
                        'Stav': 'Objednané' // Predvolený stav
                    }
                });
            }
        }

        // 5. Zápis do Airtable
        // Airtable API umožňuje vytvoriť naraz až 10 záznamov v jednom volaní.
        // Ak by objednávka bola väčšia, museli by sme to rozdeliť na viac volaní.
        if (recordsToCreate.length > 0) {
            await base('Objednavky').create(recordsToCreate);
        }

        return NextResponse.json({ success: true, message: 'Order created successfully.' });

    } catch (error: any) {
        console.error('Error creating order:', error);
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Token expired, please log in again.' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}