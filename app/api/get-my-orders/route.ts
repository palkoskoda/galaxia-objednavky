import { NextResponse, NextRequest } from 'next/server';
import Airtable, { FieldSet } from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);

interface OrderFields extends FieldSet {
    Pouzivatel: readonly string[];
    DatumObjednavky: string;
    ObjednanePolozky: string;
    Stav: string;
    DatumVytvorenia: string;
}

export async function GET(req: NextRequest) {
    try {
        // --- KROK 1: Overenie používateľa ---
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
        }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // --- KROK 2: Nájdenie Airtable Record ID používateľa ---
        const users = await base('Pouzivatelia').select({
            filterByFormula: `{Fbuid} = "${uid}"`,
            maxRecords: 1,
            fields: [] // Nepotrebujeme žiadne polia, len ID záznamu
        }).firstPage();

        if (users.length === 0) {
            // Ak používateľ neexistuje v našej databáze, nemá ani žiadne objednávky
            return NextResponse.json([]); // Vrátime prázdne pole
        }
        const userRecordId = users[0].id;

        // --- KROK 3: Načítanie objednávok pre dané Record ID ---
        // Vytvoríme si pomocné formula pole v Airtable pre ľahšie filtrovanie
        // V tabuľke 'Objednavky' vytvor pole typu Formula s názvom 'PouzivatelID' a formulou: RECORD_ID({Pouzivatel})
        const records = await base('Objednavky')
            .select({
                filterByFormula: `{PouzivatelID} = '${userRecordId}'`,
                sort: [{ field: 'DatumObjednavky', direction: 'desc' }],
            })
            .all();

        // --- KROK 4: Formátovanie dát pre frontend ---
        const orders = records.map(record => {
            const fields = record.fields as OrderFields;
            return {
                id: record.id,
                datum: fields.DatumObjednavky,
                objednavka: JSON.parse(fields.ObjednanePolozky || '{}'),
                stav: fields.Stav,
                cena: fields.CelkovaCena
            };
        });

        return NextResponse.json(orders);

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA v /api/get-my-orders ---', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}