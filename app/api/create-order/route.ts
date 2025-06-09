import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

// Definície typov zostávajú na globálnej úrovni
interface Selections { [key: string]: number; }
interface UserData { typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    // Pridáme úplne prvý diagnostický log
    console.log('--- /api/upsert-order function started ---');

    try {
        // --- KROK 0: Lenivá inicializácia všetkého ---
        console.log('Initializing services...');
        
        // Airtable
        if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
            console.error('Airtable environment variables are not set!');
            throw new Error('Airtable environment variables are not set!');
        }
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

        // Firebase Admin
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        
        console.log('Services initialized successfully.');

        // --- 1. Overenie používateľa a ZISTENIE JEHO CENOVEJ KATEGÓRIE ---
        console.log('Verifying user token...');
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { return NextResponse.json({ error: 'Missing authorization' }, { status: 401 }); }
        
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        console.log(`User ${uid} verified.`);

        // ... (zvyšok kódu zostáva rovnaký, len ho sem vkladám pre úplnosť) ...
        console.log(`Fetching user data for UID: ${uid}`);
        const users = await base('Pouzivatelia').select({
            filterByFormula: `{FirebaseUID} = '${uid}'`,
            maxRecords: 1
        }).firstPage();

        const userData: UserData = {
            typCeny: users.length > 0 ? (users[0].fields.TypCeny as UserData['typCeny'] || 'Štandard') : 'Štandard'
        };
        console.log(`User price type: ${userData.typCeny}`);

        const { date, selections }: { date: string, selections: Selections } = await req.json();
        const menuOptions = Object.keys(selections);
        
        console.log('Checking deadlines...');
        const deadlineCheck = checkDeadlines(menuOptions, date);
        if (!deadlineCheck.canModify) { 
            console.warn(`Deadline check failed: ${deadlineCheck.reason}`);
            return NextResponse.json({ error: deadlineCheck.reason }, { status: 403 }); 
        }

        console.log('Calculating total price...');
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
        console.log(`Total price calculated: ${totalPrice}`);

        console.log('Performing UPSERT logic...');
        const existingOrders = await base('Objednavky').select({
            filterByFormula: `AND({FirebaseUID} = '${uid}', {DatumObjednavky} = '${date}')`,
            maxRecords: 1,
        }).firstPage();
        
        const orderData = {
            'FirebaseUID': uid,
            'DatumObjednavky': date,
            'ObjednanePolozky': JSON.stringify(selections, null, 2),
            'CelkovaCena': totalPrice,
            'SposobZadania': 'Web' as 'Web' | 'Manuálne',
        };

        if (existingOrders.length > 0) {
            const orderId = existingOrders[0].id;
            console.log(`Updating existing order: ${orderId}`);
            await base('Objednavky').update(orderId, { ...orderData, 'Stav': 'Zmenená' });
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne upravená. Celková cena: ${totalPrice.toFixed(2)} €` });
        } else {
            console.log('Creating new order.');
            await base('Objednavky').create([{ fields: { ...orderData, 'Stav': 'Nová' } }]);
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne vytvorená. Celková cena: ${totalPrice.toFixed(2)} €` });
        }

    } catch (error: any) {
        // Tento blok by mal teraz zachytiť VŠETKO
        console.error('--- CRITICAL ERROR in /api/upsert-order ---', error);
        return NextResponse.json({ error: 'Nastala neočakávaná chyba na serveri.' }, { status: 500 });
    }
}