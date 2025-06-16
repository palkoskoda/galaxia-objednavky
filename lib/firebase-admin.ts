// Zmena 1: Odstránili sme { App } z importu. Už ho nepotrebujeme.
import admin from "firebase-admin";
import { DecodedIdToken } from "firebase-admin/auth";

// Konfigurácia pre Firebase Admin SDK z environment premenných
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
);

// Zmena 2: Tu je kľúčová oprava. Správny typ je 'admin.app.App'.
let firebaseAdminApp: admin.app.App;

// Zvyšok súboru je v poriadku a zostáva rovnaký
if (!admin.apps.length) {
  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  firebaseAdminApp = admin.app();
}

export const adminAuth = firebaseAdminApp.auth();

/**
 * Overí JWT token z hlavičky 'Authorization' prichádzajúcej požiadavky.
 * @param request - Objekt prichádzajúcej požiadavky (Request).
 * @returns Dekódovaný token ak je platný, inak null.
 */
export const verifyUser = async (request: Request): Promise<DecodedIdToken | null> => {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error("Error verifying Firebase ID token:", error);
      return null;
    }
  }

  return null;
};