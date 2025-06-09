import { NextResponse, NextRequest } from 'next/server';
import Airtable from 'airtable';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import { UserRecord } from 'firebase-admin/auth';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID as string);
const admin = initializeFirebaseAdmin();
const authAdmin = admin.auth();

export async function POST(req: NextRequest) {
    let firebaseUser: UserRecord | null = null;
    
    try {
        const { email, password, meno, adresa, telefon } = await req.json();

        // Validácia vstupných dát
        if (!email || !password || !meno) {
            return NextResponse.json({ error: 'Email, heslo a meno sú povinné.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Heslo musí mať aspoň 6 znakov.' }, { status: 400 });
        }

        // --- KROK A: Vytvorenie používateľa vo Firebase ---
        console.log(`Vytváram používateľa vo Firebase pre email: ${email}`);
        firebaseUser = await authAdmin.createUser({
            email: email,
            password: password,
            displayName: meno,
        });
        console.log(`Používateľ ${firebaseUser.uid} úspešne vytvorený vo Firebase.`);

        // --- KROK B: Vytvorenie záznamu v Airtable ---
        console.log(`Vytváram záznam v Airtable pre používateľa ${firebaseUser.uid}`);
        await base('Pouzivatelia').create([
            {
                fields: {
                    'Meno': meno,
                    'Email': email,
                    'Fbuid': firebaseUser.uid,
                    'Adresa': adresa || '', // Ak nie je zadaná, uložíme prázdny reťazec
                    'Telefon': telefon || '',
                    'TypCeny': 'Štandard' // Predvolená hodnota pre nových používateľov
                }
            }
        ]);
        console.log('Záznam v Airtable úspešne vytvorený.');

        // Ak všetko prebehlo v poriadku, vrátime úspešnú odpoveď
        return NextResponse.json({ success: true, message: 'Registrácia prebehla úspešne.' });

    } catch (error: any) {
        console.error('--- KRITICKÁ CHYBA pri registrácii ---', error);

        // --- Rollback Mechanizmus ---
        // Ak sa podarilo vytvoriť používateľa vo Firebase, ale zápis do Airtable zlyhal,
        // musíme zmazať vytvoreného používateľa z Firebase, aby sme predišli nekonzistentnému stavu.
        if (firebaseUser) {
            console.warn(`Zápis do Airtable zlyhal. Vymazávam používateľa ${firebaseUser.uid} z Firebase...`);
            await authAdmin.deleteUser(firebaseUser.uid);
            console.log('Používateľ z Firebase úspešne vymazaný.');
        }

        // Preklad Firebase chýb do slovenčiny
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'Tento email je už zaregistrovaný.' }, { status: 409 }); // 409 Conflict
        }
        
        return NextResponse.json({ error: 'Nastala neočakávaná chyba pri registrácii.' }, { status: 500 });
    }
}