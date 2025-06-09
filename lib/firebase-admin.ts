import admin from 'firebase-admin';

// Funkcia na zabezpečenie, že sa Firebase inicializuje len raz.
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        // Skontrolujeme, či premenná prostredia existuje, aby sme dostali lepšiu chybovú hlášku
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables.');
        }

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized.");
    }
    return admin;
}

// Exportujeme funkciu, nie priamo inicializovanú inštanciu
export { initializeFirebaseAdmin };
