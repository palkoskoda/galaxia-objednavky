import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

// Inicializácia Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

// Typy pre lepšiu prácu s dátami
interface Selections { [key: string]: number; }
interface UserData { id: string; typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    try {
        // --- 1. Overenie používateľa a načítanie jeho dát ---
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const users = await base('Pouzivatelia').select({
            filterByFormula: `{FirebaseUID} = '${uid}'`,
            maxRecords: 1
        }).firstPage();

        if (users.length === 0) {
            return NextResponse.json({ error: 'Používateľ nebol nájdený v databáze.' }, { status: 404 });
        }
        const userData: UserData = {
            id: users[0].id,
            typCeny: users[0].fields.TypCeny as UserData['typCeny'] || 'Štandard'
        };
        
        // --- 2. Spracovanie a validácia požiadavky ---
        const { date, selections }: { date: string, selections: Selections } = await req.json();
        const menuOptions = Object.keys(selections);

        if (!date || !selections || menuOptions.length === 0) {
            // Ak posiela prázdny výber, berieme to ako zrušenie/vymazanie objednávky
            await base('Objednavky').select({
                filterByFormula: `AND({PouzivatelID} = '${userData.id}', {DatumObjednavky} = '${date}')`,
            }).eachPage((records, fetchNextPage) => {
                const recordIds = records.map(r => r.id);
                if (recordIds.length > 0) base('Objednavky').destroy(recordIds);
                fetchNextPage();
            });
            return NextResponse.json({ success: true, message: 'Objednávka na daný deň bola zrušená.' });
        }
        
        // --- 3. Kontrola uzávierok ---
        const deadlineCheck = checkDeadlines(menuOptions, date);
        if (!deadlineCheck.canModify) {
            return NextResponse.json({ error: deadlineCheck.reason }, { status: 403 }); // 403 Forbidden
        }

        // --- 4. Načítanie cien a výpočet celkovej sumy ---
        const menuItems = await base('MenuPolozky').select().all();
        const prices: Record<string, MealPrice> = {};
        // Tu by sme mali ceny načítať efektívnejšie, ale pre MVP to stačí
        // V `DenneMenu` máme prepojenie na `MenuPolozky` pre každý deň a menu (A,B,C,D).
        // Pre jednoduchosť predpokladáme, že ceny sú fixné a máme ich v `MenuPolozky`.
        // V reáli by sme tu mali komplexnejšiu logiku na zistenie, aké jedlo je pod písmenom 'A' na daný deň.
        // Zatiaľ to zjednodušíme a predpokladáme, že jedlá majú fixné ceny.
        // TOTO JE MIESTO NA BUDÚCE VYLEPŠENIE - dynamické ceny podľa denného menu.
        // Preteraz, toto je len ilustračné:
        const hardcodedPrices: { [key: string]: MealPrice } = {
            'A': { cenaStandard: 6.5, cenaDochodca: 5.8 },
            'B': { cenaStandard: 6.5, cenaDochodca: 5.8 },
            'C': { cenaStandard: 6.2, cenaDochodca: 5.5 },
            'D': { cenaStandard: 7.0, cenaDochodca: 6.2 },
            'Polievka': { cenaStandard: 1.5, cenaDochodca: 1.2 },
        };

        let totalPrice = 0;
        for (const option in selections) {
            const priceInfo = hardcodedPrices[option];
            if (priceInfo) {
                const price = userData.typCeny === 'Dôchodca' ? priceInfo.cenaDochodca : priceInfo.cenaStandard;
                totalPrice += price * selections[option];
            }
        }

        // --- 5. UPSERT Logika ---
        const existingOrders = await base('Objednavky').select({
            filterByFormula: `AND({PouzivatelID} = '${userData.id}', {DatumObjednavky} = '${date}')`,
            maxRecords: 1,
        }).firstPage();
        
        const orderData = {
            'Pouzivatel': [userData.id],
            'DatumObjednavky': date,
            'ObjednanePolozky': JSON.stringify(selections, null, 2),
            'CelkovaCena': totalPrice,
            'SposobZadania': 'Web' as 'Web' | 'Manuálne',
        };

        if (existingOrders.length > 0) {
            // UPDATE
            const orderId = existingOrders[0].id;
            await base('Objednavky').update(orderId, {
                ...orderData,
                'Stav': 'Zmenená'
            });
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne upravená. Celková cena: ${totalPrice.toFixed(2)} €` });
        } else {
            // CREATE
            await base('Objednavky').create([{ fields: {
                ...orderData,
                'Stav': 'Nová'
            }}]);
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne vytvorená. Celková cena: ${totalPrice.toFixed(2)} €` });
        }

    } catch (error: any) {
        console.error('--- DETAILED ERROR in /api/upsert-order ---', error);
        return NextResponse.json({ error: 'Nastala neočakávaná chyba na serveri.' }, { status: 500 });
    }
}