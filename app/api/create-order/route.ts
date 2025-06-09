import { NextResponse, NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin'; // Zmenený import
import Airtable from 'airtable';

// Inicializácia Airtable zostáva rovnaká
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
type Selections = Record<string, Record<string, number>>;

export async function POST(req: NextRequest) {
    try {
        // Zavoláme inicializáciu tu. Funkcia vráti `admin` a my si vezmeme `auth()`.
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();

        // 1. Získanie a overenie autorizačného tokenu
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid authorization token.' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // ... zvyšok kódu zostáva rovnaký ...
        const selections: Selections = await req.json();

        if (!selections || Object.keys(selections).length === 0) {
            return NextResponse.json({ error: 'Order data is empty.' }, { status: 400 });
        }
        
        const recordsToCreate = [];
        for (const date in selections) {
            for (const option in selections[date]) {
                const quantity = selections[date][option];
                recordsToCreate.push({
                    fields: {
                        'FirebaseUID': uid,
                        'Datum': date,
                        'Menu': option,
                        'Pocet': quantity,
                        'Stav': 'Objednané'
                    }
                });
            }
        }

        if (recordsToCreate.length > 0) {
            await base('Objednavky').create(recordsToCreate);
        }

        return NextResponse.json({ success: true, message: 'Order created successfully.' });

    } catch (error: any) {
        console.error('Error creating order:', error);
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Token expired, please log in again.' }, { status: 401 });
        }
        // Pridáme log pre lepšie ladenie
        if (error.message.includes('FIREBASE_SERVICE_ACCOUNT_KEY')) {
             return NextResponse.json({ error: 'Server configuration error: Firebase service account not set.' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}