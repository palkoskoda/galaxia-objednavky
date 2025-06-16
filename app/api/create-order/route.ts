import { NextResponse } from "next/server";
import { airtable } from "@/lib/airtable";
import { verifyUser } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Frontend teraz posiela aj názov: [{ menuId, pocet, nazov }]
    const { orderItems }: { orderItems: { menuId: string, pocet: number, nazov: string }[] } = body;

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ message: "Order cannot be empty" }, { status: 400 });
    }

    const decodedToken = await verifyUser(request);
    if (!decodedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { uid } = decodedToken;

    // KROK 1: Nájdenie Airtable Record ID používateľa
    const userRecords = await airtable("Pouzivatelia")
      .select({ filterByFormula: `{Fbuid} = '${uid}'`, maxRecords: 1 })
      .firstPage();

    if (!userRecords || userRecords.length === 0) {
      return NextResponse.json({ message: "User not found in Airtable" }, { status: 404 });
    }
    const userAirtableRecordId = userRecords[0].id;

    // KROK 2: Vytvorenie hlavného záznamu v tabuľke 'Objednavky'
    // Zatiaľ ho neprepojujeme s položkami, to urobíme až v KROKU 4
    const orderRecord = await airtable("Objednavky").create({
        DatumObjednavky: new Date().toISOString().split("T")[0],
        PouzivatelID: [userAirtableRecordId],
        Stav: "Prijatá",
    });

    console.log(`[create-order] Vytvorená hlavná objednávka s ID: ${orderRecord.id}`);

    // KROK 3: Vytvorenie jednotlivých záznamov v tabuľke 'ObjednanePolozky'
  const itemsToCreate = orderItems.map(item => ({
      fields: {
        ObjednavkaID: [orderRecord.id],
        // POZOR: Tu stále potrebujeme odkaz na DenneMenu, aby sme vedeli, z ktorého dňa jedlo je.
        // Ak ste toto pole zmazali, vytvorte ho znova a prepojte na DenneMenu.
        // Ak ste ho len premenovali, použite správny názov.
        DenneMenuID: [item.menuId], // Predpokladáme, že menuId je ID z DenneMenu
        Pocet: item.pocet,
        // === TOTO JE KĽÚČOVÁ ZMENA ===
        NazovJedla: item.nazov, 
      }
    }));

    const createdItemRecords = await airtable("ObjednanePolozky").create(itemsToCreate);
    
    // KROK 4: Aktualizácia hlavnej objednávky - prepojíme ju s vytvorenými položkami
    const createdItemRecordIds = createdItemRecords.map(record => record.id);
    await airtable("Objednavky").update(orderRecord.id, {
      Polozky: createdItemRecordIds,
    });

    console.log(`[create-order] Objednávka ${orderRecord.id} bola prepojená s ${createdItemRecordIds.length} položkami.`);
    
    return NextResponse.json({
      message: "Order created successfully",
      orderId: orderRecord.id,
    }, { status: 200 });

  } catch (error) {
    console.error("[API create-order] Error:", error);
    return NextResponse.json({ message: "Error creating order", error }, { status: 500 });
  }
}