import { NextResponse } from "next/server";
import { airtable } from "@/lib/airtable";
import { verifyUser } from "@/lib/firebase-admin";

type OrderItem = {
  id: string;
  pocet: number;
  nazov: string;
};

export async function GET(request: Request) {
  try {
    const decodedToken = await verifyUser(request);
    if (!decodedToken) {
      console.log('[get-my-orders] CHYBA: Používateľ nie je overený.');
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { uid } = decodedToken;
    console.log(`[get-my-orders] KROK 1: Používateľ overený. UID: ${uid}`);

    const userRecords = await airtable("Pouzivatelia")
      .select({ filterByFormula: `{Fbuid} = '${uid}'`, maxRecords: 1 })
      .firstPage();

    if (!userRecords || userRecords.length === 0) {
      console.log(`[get-my-orders] CHYBA: Pre UID ${uid} sa nenašiel záznam v tabuľke Pouzivatelia.`);
      return NextResponse.json([], { status: 200 });
    }
    
    const userAirtableRecordId = userRecords[0].id;
    console.log(`[get-my-orders] KROK 2: Nájdený Airtable záznam používateľa: ${userAirtableRecordId}`);

    // === ZMENA: Načítame VŠETKY objednávky a budeme filtrovať v kóde ===
    // Toto je pomalšie, ale oveľa spoľahlivejšie na odhalenie chyby.
    const allOrders = await airtable("Objednavky").select({
        sort: [{ field: "DatumVytvorenia", direction: "desc" }],
    }).all();
    
    console.log(`[get-my-orders] KROK 3: Načítaných celkovo ${allOrders.length} objednávok. Filtrujem...`);

    const userOrders = allOrders.filter(order => {
      const linkedUserIds = order.fields.PouzivatelID as string[] | undefined;
      // Vypíšeme si, čo porovnávame, pre každú jednu objednávku
      // console.log(` - Porovnávam: ${linkedUserIds} vs ${userAirtableRecordId}`); 
      return linkedUserIds && linkedUserIds.includes(userAirtableRecordId);
    });

    console.log(`[get-my-orders] KROK 4: Po filtrovaní nájdených ${userOrders.length} objednávok pre tohto používateľa.`);

    if (userOrders.length === 0) {
        return NextResponse.json([], { status: 200 });
    }

    const myOrders = await Promise.all(
      userOrders.map(async (record) => {
        // ... zvyšok kódu zostáva rovnaký ...
        const itemRecordIds = record.fields.Polozky as string[] | undefined;
        let polozky: OrderItem[] = [];
        if (itemRecordIds && itemRecordIds.length > 0) {
          polozky = await Promise.all(
            itemRecordIds.map(async (itemId) => {
              const itemRecord = await airtable("ObjednanePolozky").find(itemId);
              const denneMenuId = (itemRecord.fields.DenneMenuID as string[] | undefined)?.[0] ?? 'N/A';
              return {
                id: itemRecord.id,
                pocet: (itemRecord.fields.Pocet as number) || 0,
                nazov: `Položka ${denneMenuId}`,
              };
            })
          );
        }
        return {
          id: record.id,
          datum: record.fields.DatumObjednavky,
          stav: record.fields.Stav,
          celkovaCena: record.fields.CelkovaCena,
          polozky: polozky,
        };
      })
    );

    console.log(`[get-my-orders] KROK 5: Úspešne spracovaných ${myOrders.length} objednávok na odoslanie.`);
    return NextResponse.json(myOrders, { status: 200 });

  } catch (error) {
    console.error("[API get-my-orders] NEOČAKÁVANÁ CHYBA:", error);
    return NextResponse.json({ message: "Error fetching orders", error }, { status: 500 });
  }
}