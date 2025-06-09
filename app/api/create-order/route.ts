/* import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

interface Selections { [key: string]: number; }
interface UserData { typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    console.log('--- /api/create-order function started ---');

    try {
        console.log('Initializing services...');
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        console.log('Services initialized successfully.');

        console.log('Verifying user token...');
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        console.log(`User ${uid} verified.`);

        const { date, selections }: { date: string, selections: Selections } = await req.json();
        const menuOptions = Object.keys(selections);
        console.log(`Received data for date: ${date} with selections:`, selections);
        
        // --- LOGIKA ZRUŠENIA OBJEDNÁVKY (teraz je na správnom mieste) ---
        if (menuOptions.length === 0) {
            console.log(`User ${uid} requested to cancel order for date: ${date}`);
            const recordsToDelete = await base('Objednavky').select({
                filterByFormula: `AND({FirebaseUID} = '${uid}', {DatumObjednavky} = '${date}')`
            }).all();
            
            if (recordsToDelete.length > 0) {
                const recordIds = recordsToDelete.map(r => r.id);
                console.log(`Deleting records: ${recordIds.join(', ')}`);
                await base('Objednavky').destroy(recordIds);
            }
            return NextResponse.json({ success: true, message: 'Objednávka na daný deň bola úspešne zrušená.' });
        }

        console.log(`Fetching user data for UID: ${uid}`);
        const users = await base('Pouzivatelia').select({
            filterByFormula: `{FirebaseUID} = '${uid}'`,
            maxRecords: 1
        }).firstPage();

        const userData: UserData = {
            typCeny: users.length > 0 ? (users[0].fields.TypCeny as UserData['typCeny'] || 'Štandard') : 'Štandard'
        };
        console.log(`User price type: ${userData.typCeny}`);

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
            'SposobZadania': 'Web' as const,
            'Stav': 'Nová' as const
        };

        if (existingOrders.length > 0) {
            const orderId = existingOrders[0].id;
            console.log(`Updating existing order: ${orderId}`);
            await base('Objednavky').update(orderId, { ...orderData, 'Stav': 'Zmenená' as const });
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne upravená.` });
        } else {
            console.log('Creating new order.');
            await base('Objednavky').create([{ fields: orderData }]);
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne vytvorená.` });
        }

    } catch (error: any) {
        console.error('--- CRITICAL ERROR in /api/create-order ---', error);
        return NextResponse.json({ error: 'Nastala neočakávaná chyba na serveri.' }, { status: 500 });
    }
} */

import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

export async function POST(req: NextRequest) {
    console.log('--- TEST 2 (INITIALIZATION): Začínam test inicializácie. ---');
    try {
        console.log('Inicializujem Airtable...');
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
        
        console.log('Inicializujem Firebase Admin...');
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        
        console.log('Všetky služby úspešne inicializované!');
        return NextResponse.json({ message: 'Test inicializácie služieb prebehol úspešne.' });

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA POČAS TESTU 2 (INITIALIZATION) ---', error);
        return NextResponse.json({ error: 'Chyba počas inicializácie služieb.' }, { status: 500 });
    }
}