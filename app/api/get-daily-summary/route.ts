import { NextResponse, NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin'; // Zmenený import
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

export async function GET(req: NextRequest) {
    try {
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();

        // Overenie, či je používateľ admin
        const authorization = req.headers.get('Authorization');
        // ... zvyšok kódu je rovnaký ...
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (uid !== process.env.ADMIN_UID) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        
        // ... zvyšok kódu je rovnaký ...
        const today = new Date().toISOString().split('T')[0];
        const records = await base('Objednavky')
            .select({
                filterByFormula: `{Datum} = '${today}'`,
                sort: [{ field: 'Vytvorene', direction: 'asc' }],
            })
            .all();

        const summary = records.map(record => ({
            id: record.id,
            firebaseUID: record.fields.FirebaseUID,
            menu: record.fields.Menu,
            count: record.fields.Pocet,
        }));
        
        const aggregatedSummary = summary.reduce((acc, order) => {
            const key = `Menu ${order.menu}`;
            if (!acc[key]) {
                acc[key] = 0;
            }
            acc[key] += order.count as number;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            date: today,
            orders: summary,
            aggregated: aggregatedSummary
        });

    } catch (error: any) {
        console.error('Error fetching daily summary:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
