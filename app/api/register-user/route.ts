import { NextResponse } from "next/server";
// Zmena 1: Odstránili sme import 'initializeFirebaseAdmin' a namiesto neho importujeme 'adminAuth'.
import { adminAuth } from "@/lib/firebase-admin";
import { airtable } from "@/lib/airtable";

export async function POST(request: Request) {
  try {
    const { email, password, meno, priezvisko } = await request.json();

    // Vytvorenie používateľa vo Firebase Authentication
    const firebaseUser = await adminAuth.createUser({
      email,
      password,
      displayName: `${meno} ${priezvisko}`,
    });

    // Zmena 2: Pridali sme kontrolu, či sa používateľa podarilo vytvoriť.
    // Týmto vyriešime chyby typu "'firebaseUser' is possibly 'null'".
    if (!firebaseUser) {
        throw new Error("Failed to create user in Firebase.");
    }

    // Vytvorenie záznamu v Airtable v tabuľke 'Pouzivatelia'
    await airtable("Pouzivatelia").create([
      {
        fields: {
          // Použijeme uid z úspešne vytvoreného Firebase používateľa
          FirebaseUID: firebaseUser.uid, 
          Email: email,
          Meno: meno,
          Priezvisko: priezvisko,
        },
      },
    ]);

    return NextResponse.json({ 
        message: "User registered successfully", 
        uid: firebaseUser.uid 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Registration error:", error);
    // Vrátime špecifickú chybovú hlášku pre existujúci email
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json(
            { message: "Tento email je už zaregistrovaný." },
            { status: 409 } // 409 Conflict
        );
    }
    return NextResponse.json(
        { message: "An error occurred during registration.", error: error.message },
        { status: 500 }
    );
  }
}