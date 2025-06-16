/* import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { checkDeadlines } from '@/utils/deadlines';

interface Selections { [key: string]: number; }
interface UserInfo { id: string; typCeny: 'Štandard' | 'Dôchodca'; }
interface MealPrice { cenaStandard: number; cenaDochodca: number; }

export async function POST(req: NextRequest) {
    try {
        const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
        const admin = initializeFirebaseAdmin();
        const authAdmin = admin.auth();
        
        const authorization = req.headers.get('Authorization');
        if (!authorization?.startsWith('Bearer ')) { throw new Error('Chýbajúci token.'); }
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // --- KROK 1: Nájdenie Airtable Záznamu Používateľa podľa Fbuid ---
        const users = await base('Pouzivatelia').select({
            filterByFormula: `{Fbuid} = "${uid}"`, // Používame nový názov poľa
            maxRecords: 1
        }).firstPage();

        if (users.length === 0) {
            // Dôležité: Ak používateľ neexistuje v našej DB, nemôžeme vytvoriť prepojenú objednávku.
            // V budúcnosti by sme tu mohli vytvoriť záznam používateľa. Teraz vrátime chybu.
            console.error(`Používateľ s Fbuid ${uid} nebol nájdený v tabuľke Pouzivatelia.`);
            return NextResponse.json({ error: 'Váš účet nie je plne aktivovaný v našom systéme. Kontaktujte podporu.' }, { status: 404 });
        }
        
        const userInfo: UserInfo = {
            id: users[0].id, // Toto je kľúčové - získavame Airtable Record ID
            typCeny: (users[0].fields.TypCeny as UserInfo['typCeny']) || 'Štandard'
        };

        const { date, selections }: { date: string, selections: Selections } = await req.json();
        
        // ... (Kontrola uzávierok a výpočet ceny zostáva rovnaký) ...
        // ...

        // --- KROK 2: Hľadanie existujúcej objednávky (pomocou formula poľa v Airtable) ---
        // Vytvor si v Airtable v tabuľke 'Objednavky' pole typu Formula s názvom 'PouzivatelID' 
        // a formulou: RECORD_ID({Pouzivatel})
        const existingOrders = await base('Objednavky').select({
            filterByFormula: `AND({PouzivatelID} = '${userInfo.id}', {DatumObjednavky} = '${date}')`,
            maxRecords: 1,
        }).firstPage();
        
        // --- KROK 3: Príprava dát pre zápis ---
        const orderData = {
            'PouzivatelID': [userInfo.id], // Správny formát: pole s Record ID
            'DatumObjednavky': date,
            'ObjednanePolozky': JSON.stringify(selections, null, 2),
            // ... (CelkovaCena, SposobZadania)
        };

        if (existingOrders.length > 0) {
            await base('Objednavky').update(existingOrders[0].id, { ...orderData, 'Stav': 'Zmenená' });
            return NextResponse.json({ success: true, message: `Objednávka upravená.` });
        } else {
            await base('Objednavky').create([{ fields: { ...orderData, 'Stav': 'Nová' } }]);
            return NextResponse.json({ success: true, message: `Objednávka vytvorená.` });
        }

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA ---', error);
        return NextResponse.json({ error: 'Chyba na serveri.' }, { status: 500 });
    }
} */

   import { NextResponse } from "next/server";
import { airtable, getMinifiedRecords } from "@/lib/airtable";
import { verifyUser } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderItems } = body;

    // KROK 1: Overenie používateľa cez Firebase
    const decodedToken = await verifyUser(request);
    if (!decodedToken) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { uid } = decodedToken;
    console.log(`[create-order] KROK 1: User verified. UID: ${uid}`);

    // KROK 2: Nájdenie Airtable záznamu používateľa a získanie jeho číselného ID
    const userRecords = await airtable("Pouzivatelia")
      .select({
        filterByFormula: `{FirebaseUID} = '${uid}'`,
        maxRecords: 1,
      })
      .firstPage();

    if (!userRecords || userRecords.length === 0) {
      return NextResponse.json(
        { message: "User not found in Airtable" },
        { status: 404 }
      );
    }
    
    // Získame naše nové číselné ID
    const pouzivatelID = userRecords[0].get("PouzivatelID") as number;
    console.log(`[create-order] KROK 2: Nájdené PouzivatelID: ${pouzivatelID}`);

    if (!pouzivatelID) {
        return NextResponse.json(
            { message: "PouzivatelID is missing for this user in Airtable." },
            { status: 500 }
        );
    }
    
    // KROK 3: Vytvorenie záznamov o objednávke v Airtable
    const recordsToCreate = orderItems.map((item: any) => ({
      fields: {
        DatumObjednavky: new Date().toISOString().split("T")[0],
        Pocet: item.quantity,
        // Dôležitá zmena: Ukladáme číselné ID
        PouzivatelID: pouzivatelID, 
        // Prepojíme aj konkrétne menu, ak používame linkované záznamy
        DenneMenu: [item.menuId], // menuId je Airtable Record ID pre položku v DenneMenu
      },
    }));

    const createdRecords = await airtable("Objednavky").create(recordsToCreate);
    console.log(`[create-order] KROK 3: Úspešne vytvorených ${createdRecords.length} záznamov.`);

    return NextResponse.json({
      message: "Order created successfully",
      records: getMinifiedRecords(createdRecords),
    }, { status: 200 });

  } catch (error) {
    console.error("[API create-order] Error:", error);
    return NextResponse.json(
      { message: "Error creating order", error },
      { status: 500 }
    );
  }
} 