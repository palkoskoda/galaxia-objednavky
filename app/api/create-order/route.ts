import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

// ... definície interfacov ...

// --- KONŠTANTA PRE NÁZOV POĽA ---
// Ak sa stĺpec v Airtable volá inak, zmeň to iba tu.
const UID_FIELD_NAME = 'FirebaseUID';

export async function POST(req: NextRequest) {
    try {
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        // ... overenie tokenu ...
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { throw new Error('Chýbajúci token.'); }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        // ...

        console.log(`[KROK 1] Načítavam dáta používateľa s filtrom: {${UID_FIELD_NAME}} = "${uid}"`);
        const users = await base('Pouzivatelia').select({
            // Používame konštantu pre maximálnu robustnosť
            filterByFormula: `{${UID_FIELD_NAME}} = "${uid}"`,
            maxRecords: 1
        }).firstPage();

        // ... zvyšok kódu je rovnaký ...
        const userData = {
            typCeny: users.length > 0 ? (users[0].fields.TypCeny as 'Štandard' | 'Dôchodca' || 'Štandard') : 'Štandard'
        };
        
        // ...
        const { date, selections } = await req.json();
        // ...
        
        const existingOrders = await base('Objednavky').select({
            filterByFormula: `AND({${UID_FIELD_NAME}} = '${uid}', {DatumObjednavky} = '${date}')`,
            maxRecords: 1,
        }).firstPage();

        // ... zvyšok kódu na vytvorenie/update objednávky ...
        const orderData = {
            [UID_FIELD_NAME]: uid,
            // ...
        };
        // ...
        
        // Vrátime úspešnú odpoveď
        return NextResponse.json({ success: true, message: "Operácia úspešná" });

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA ---', error);
        return NextResponse.json({ error: 'Chyba pri komunikácii s databázou.' }, { status: 500 });
    }
}