import { NextResponse, NextRequest } from 'next/server';
import Airtable, { Record } from 'airtable'; // Importujeme si typ Record
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

interface Selections { [key: string]: number; }
interface UserData { typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    console.log('--- API s ALTERNATÍVNOU LOGIKOU začalo ---');
    try {
        // --- Inicializácia (vieme, že funguje) ---
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { throw new Error('Chýbajúci token.'); }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        console.log(`Používateľ ${uid} overený.`);

        // --- KROK 1: Načítanie VŠETKÝCH používateľov ---
        console.log('[KROK 1] Načítavam VŠETKÝCH používateľov z Airtable...');
        const allUsers = await base('Pouzivatelia').select().all();
        console.log(`Načítaných ${allUsers.length} používateľov celkovo.`);

        // --- KROK 2: Filtrovanie používateľa v JavaScripte ---
        const userRecord = allUsers.find(record => record.fields.FirebaseUID === uid);
        
        const userData: UserData = { typCeny: 'Štandard' }; // Predvolená hodnota
        if (userRecord) {
            console.log(`Používateľ ${uid} nájdený v dátach.`);
            userData.typCeny = (userRecord.fields.TypCeny as UserData['typCeny']) || 'Štandard';
        } else {
            console.warn(`Používateľ s UID ${uid} sa nenašiel v tabuľke Pouzivatelia. Použije sa štandardná cena.`);
        }
        console.log(`Cenový typ používateľa: ${userData.typCeny}.`);

        // --- Zvyšok logiky je rovnaký ---
        const { date, selections }: { date: string, selections: Selections } = await req.json();
        // ... (výpočet ceny, kontrola uzávierok atď.) ...

        // Hľadanie existujúcej objednávky musíme tiež upraviť
        console.log('Načítavam VŠETKY objednávky pre daný deň a hľadám tú správnu...');
        const allOrdersForDay = await base('Objednavky').select({
             filterByFormula: `{DatumObjednavky} = '${date}'` // Aspoň filtrujeme podľa dátumu
        }).all();
        const existingOrder = allOrdersForDay.find(record => record.fields.FirebaseUID === uid);

        // ... (logika na update/create) ...
        const orderData = { 'FirebaseUID': uid, /* ... */ };
        if (existingOrder) {
            // UPDATE
        } else {
            // CREATE
        }

        return NextResponse.json({ success: true, message: "Objednávka spracovaná alternatívnou logikou." });

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA (Alternatívna logika) ---', error);
        return NextResponse.json({ error: 'Chyba na serveri pri alternatívnom spracovaní.' }, { status: 500 });
    }
}