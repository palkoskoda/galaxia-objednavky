import { NextResponse, NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin'; // Zmenený import
import Airtable, { FieldSet } from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

// ... interface OrderFields ...

export async function GET(req: NextRequest) {
    try {
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();

        // Overenie používateľa
        const authorization = req.headers.get('Authorization');
        // ... zvyšok kódu je rovnaký ...
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        // Načítanie objednávok
        const records = await base('Objednavky')
            .select({
                filterByFormula: `{Fbuid} = '${uid}'`,
                sort: [{ field: 'DatumObjednavky', direction: 'desc' }],
            })
            .all();
        
        // ... zvyšok kódu je rovnaký ...
        const orders = records.map(record => ({
            id: record.id,
            ...record.fields,
        }));

        return NextResponse.json(orders);

    } catch (error: any) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}