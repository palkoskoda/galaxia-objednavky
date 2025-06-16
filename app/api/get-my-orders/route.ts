import { NextResponse } from "next/server";
import { airtable } from "@/lib/airtable";
import { verifyUser } from "@/lib/firebase-admin";

// Definujeme si typ pre položku, aby bol kód čistejší a bezpečnejší
type OrderItem = {
  id: string;
  pocet: number;
  nazov: string;
};

export async function GET(request: Request) {
  try {
    const decodedToken = await verifyUser(request);
    if (!decodedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { uid } = decodedToken;

    const userRecords = await airtable("Pouzivatelia")
      .select({ filterByFormula: `{Fbuid} = '${uid}'`, maxRecords: 1 })
      .firstPage();

    if (!userRecords || userRecords.length === 0) return NextResponse.json([], { status: 200 });
    
    const userAirtableRecordId = userRecords[0].id;

    const orderRecords = await airtable("Objednavky").select({
        filterByFormula: `SEARCH('${userAirtableRecordId}', ARRAYJOIN({PouzivatelID}))`,
        sort: [{ field: "DatumVytvorenia", direction: "desc" }],
    }).all();
    
    if (!orderRecords || orderRecords.length === 0) {
        return NextResponse.json([], { status: 200 });
    }

    const myOrders = await Promise.all(
      orderRecords.map(async (record) => {
        const itemRecordIds = record.fields.Polozky as string[] | undefined;
        // Explicitne definujeme typ premennej 'polozky'
        let polozky: OrderItem[] = [];

        if(itemRecordIds && itemRecordIds.length > 0) {
           polozky = await Promise.all(
             itemRecordIds.map(async (itemId) => {
               const itemRecord = await airtable("ObjednanePolozky").find(itemId);
               
               // Bezpečné načítanie ID jedla
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

    return NextResponse.json(myOrders, { status: 200 });

  } catch (error) {
    console.error("[API get-my-orders] Error:", error);
    return NextResponse.json({ message: "Error fetching orders", error }, { status: 500 });
  }
}