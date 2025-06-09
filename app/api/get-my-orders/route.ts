import { NextResponse, NextRequest } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin';
import Airtable, { FieldSet } from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

interface OrderFields extends FieldSet {
    FirebaseUID: string;
    Datum: string;
    Menu: string;
    Pocet: number;
    Stav: string;
    Vytvorene: string; // Airtable automaticky pridáva 'Created' pole
}

type OrderWithId = OrderFields & { id: string };

export async function GET(req: NextRequest) {
    try {
        // 1. Overenie používateľa (rovnaký postup ako pri create-order)
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 2. Načítanie objednávok z Airtable
        const records = await base('Objednavky')
            .select({
                // Filtrujeme záznamy, kde sa FirebaseUID zhoduje
                filterByFormula: `{FirebaseUID} = '${uid}'`,
                // Zoradíme od najnovších
                sort: [{ field: 'Datum', direction: 'desc' }],
            })
            .all();
        const orders: OrderWithId[] = records.map(record => ({
            id: record.id,
            ...(record.fields as OrderFields),
        }));

        return NextResponse.json(orders);

    } catch (error: any) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}