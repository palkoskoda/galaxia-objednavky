import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

export async function GET(req: NextRequest) {
    try {
        // --- KROK 1: Overenie, či je používateľ admin (zostáva rovnaké) ---
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { return NextResponse.json({ error: 'Missing authorization' }, { status: 401 }); }
        
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        if (decodedToken.uid !== process.env.ADMIN_UID) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // --- KROK 2: Načítanie všetkých dnešných objednávok ---
        const today = new Date().toISOString().split('T')[0];
        const orders = await base('Objednavky').select({
            filterByFormula: `{DatumObjednavky} = '${today}'`,
            sort: [{ field: 'DatumVytvorenia', direction: 'asc' }],
        }).all();

        // --- KROK 3: Načítanie všetkých používateľov ---
        const users = await base('Pouzivatelia').select().all();
        // Vytvoríme si mapu pre rýchle vyhľadávanie: { 'recXYZ': { meno: 'Palo', adresa: '...' } }
        const usersMap = new Map<string, { meno: string, adresa: string }>();
        users.forEach(user => {
            usersMap.set(user.id, {
                meno: (user.fields.Meno as string) || 'Neznámy Používateľ',
                adresa: (user.fields.Adresa as string) || 'Adresa nezadaná'
            });
        });

        // --- KROK 4: Spojenie dát (obohatenie objednávok o mená a adresy) ---
        const detailedOrders = orders.map(order => {
            const userId = (order.fields.Pouzivatel as string[])?.[0]; // Získame ID používateľa z prepojenia
            const userInfo = userId ? usersMap.get(userId) : { meno: 'CHYBA V PREPOJENÍ', adresa: '' };
            
            return {
                id: order.id,
                menoPouzivatela: userInfo?.meno,
                adresaPouzivatela: userInfo?.adresa,
                objednanePolozky: JSON.parse(order.fields.ObjednanePolozky as string || '{}'),
                celkovaCena: order.fields.CelkovaCena,
                stav: order.fields.Stav,
            };
        });

        // --- KROK 5: Agregácia súhrnu pre kuchyňu (zostáva podobné) ---
        const aggregatedSummary = detailedOrders.reduce((acc, order) => {
            for (const [menu, count] of Object.entries(order.objednanePolozky)) {
                const key = `Menu ${menu}`;
                if (!acc[key]) {
                    acc[key] = 0;
                }
                acc[key] += count as number;
            }
            return acc;
        }, {} as Record<string, number>);


        return NextResponse.json({
            date: today,
            summaryForKitchen: aggregatedSummary,
            summaryForDelivery: detailedOrders,
        });

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA v /api/get-daily-summary ---', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}