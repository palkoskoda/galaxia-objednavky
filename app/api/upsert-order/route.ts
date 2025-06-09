import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

interface Selections { [key: string]: number; }
interface UserData { typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    try {
        // --- 1. Overenie používateľa a ZISTENIE JEHO CENOVEJ KATEGÓRIE ---
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { return NextResponse.json({ error: 'Missing authorization' }, { status: 401 }); }
        
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Stále potrebujeme vedieť typ ceny, preto musíme načítať dáta používateľa.
        const users = await base('Pouzivatelia').select({
            filterByFormula: `{FirebaseUID} = '${uid}'`,
            maxRecords: 1
        }).firstPage();

        // Ak používateľ neexistuje, priradíme mu štandardnú cenu.
        
        const userData = {
            id: users[0].id,
            typCeny: users[0].fields.TypCeny as UserData['typCeny'] || 'Štandard'
        };


        const { date, selections }: { date: string, selections: Selections } = await req.json();
        const menuOptions = Object.keys(selections);
        // ... (logika pre zrušenie objednávky) ...
        const deadlineCheck = checkDeadlines(menuOptions, date);
        if (!deadlineCheck.canModify) { return NextResponse.json({ error: deadlineCheck.reason }, { status: 403 }); }
        
        const hardcodedPrices: { [key: string]: MealPrice } = {
            'A': { cenaStandard: 6.5, cenaDochodca: 5.8 }, 'B': { cenaStandard: 6.5, cenaDochodca: 5.8 }, 'C': { cenaStandard: 6.2, cenaDochodca: 5.5 }, 'D': { cenaStandard: 7.0, cenaDochodca: 6.2 }, 'Polievka': { cenaStandard: 1.5, cenaDochodca: 1.2 },
        };
        let totalPrice = 0;
        for (const option in selections) {
            const priceInfo = hardcodedPrices[option];
            if (priceInfo) {
                const price = userData.typCeny === 'Dôchodca' ? priceInfo.cenaDochodca : priceInfo.cenaStandard;
                totalPrice += price * selections[option];
            }
        }

        // --- 5. UPSERT Logika s FirebaseUID ---
        const existingOrders = await base('Objednavky').select({
            // Hľadáme podľa FirebaseUID a dátumu
            filterByFormula: `AND({FirebaseUID} = '${uid}', {DatumObjednavky} = '${date}')`,
            maxRecords: 1,
        }).firstPage();

    

        const orderData = {
            'Pouzivatel': [userData.id], // Kľúčová oprava: Posielame pole s Record ID
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
        console.error('--- DETAILED ERROR in /api/upsert-order', error);
        return NextResponse.json({ error: 'Nastala neočakávaná chyba na serveri.' }, { status: 500 });
    }

}