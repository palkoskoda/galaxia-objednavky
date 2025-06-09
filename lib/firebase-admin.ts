import admin from 'firebase-admin';

// Dôležité: Tieto premenné prostredia musia byť nastavené vo Verceli.
// Private key musí byť v špeciálnom formáte - často je potrebné nahradiť '\n' za '\\n'
// pri vkladaní do Vercel UI, ale Vercel to už dnes vie spracovať aj priamo.

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const authAdmin = admin.auth();
export { authAdmin };