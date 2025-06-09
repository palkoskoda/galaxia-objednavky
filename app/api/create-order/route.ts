import { NextResponse, NextRequest } from 'next/server';
import Airtable, { Record } from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

// --- Definície typov pre lepšiu prácu s dátami ---
interface Selections { [key: string]: number; }
interface UserData { typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    console.log('--- API s ALTERNATÍVNOU LOGIKOU začalo ---');

    try {
        // --- KROK A: Inicializácia služieb ---
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        console.log('Služby úspešne inicializované.');

        // --- KROK B: Overenie používateľa ---
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { throw new Error('Chýbajúci autorizačný token.'); }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        console.log(`Používateľ ${uid} bol úspešne overený.`);

        // --- KROK C: Získanie dát z požiadavky ---
        const { date, selections }: { date: string, selections: Selections } = await req.json();
        const menuOptions = Object.keys(selections);
        console.log(`Prijaté dáta pre dátum: ${date} s výberom:`, selections);

        // --- KROK D: Zistenie typu ceny používateľa (Alternatívna logika) ---
        console.log('[KROK D.1] Načítavam VŠETKÝCH používateľov z Airtable...');
        const allUsers = await base('Pouzivatelia').select().all();
        console.log(`Načítaných ${allUsers.length} používateľov celkovo.`);

        const userRecord = allUsers.find(record => record.fields.FirebaseUID === uid);
        const userData: UserData = { typCeny: 'Štandard' };
        if (userRecord) {
            userData.typCeny = (userRecord.fields.TypCeny as UserData['typCeny']) || 'Štandard';
            console.log(`Používateľ nájdený. Typ ceny: ${userData.typCeny}.`);
        } else {
            console.warn(`Používateľ s UID ${uid} sa nenašiel. Použije sa štandardná cena.`);
        }

        // --- KROK E: Kontrola uzávierok ---
        console.log('Kontrolujem uzávierky...');
        const deadlineCheck = checkDeadlines(menuOptions, date);
        if (!deadlineCheck.canModify) {
            return NextResponse.json({ error: deadlineCheck.reason }, { status: 403 });
        }
        console.log('Uzávierky sú v poriadku.');

        // --- KROK F: Výpočet celkovej ceny ---
        console.log('Počítam celkovú cenu...');
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
        console.log(`Celková cena vypočítaná: ${totalPrice.toFixed(2)} €.`);

        // --- KROK G: Nájdenie existujúcej objednávky (Alternatívna logika) ---
        console.log(`Hľadám existujúcu objednávku pre používateľa ${uid} na dátum ${date}...`);
        const allOrders = await base('Objednavky').select().all(); // Načíta VŠETKY objednávky
        const existingOrder = allOrders.find(record => 
            record.fields.FirebaseUID === uid && record.fields.DatumObjednavky === date
        );

        // --- KROK H: Vytvorenie alebo úprava záznamu ---
        const orderData = {
            'FirebaseUID': uid,
            'DatumObjednavky': date,
            'ObjednanePolozky': JSON.stringify(selections, null, 2),
            'CelkovaCena': totalPrice,
            'SposobZadania': 'Web' as const
        };

        if (existingOrder) {
            console.log(`Objednávka nájdená (ID: ${existingOrder.id}). Aktualizujem...`);
            await base('Objednavky').update(existingOrder.id, { ...orderData, 'Stav': 'Zmenená' as const });
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne upravená.` });
        } else {
            console.log('Existujúca objednávka nenájdená. Vytváram novú...');
            await base('Objednavky').create([{ fields: { ...orderData, 'Stav': 'Nová' as const } }]);
            return NextResponse.json({ success: true, message: `Objednávka bola úspešne vytvorená.` });
        }

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA (Alternatívna logika) ---', error);
        return NextResponse.json({ error: 'Nastala chyba na serveri. Skontrolujte logy.' }, { status: 500 });
    }
}