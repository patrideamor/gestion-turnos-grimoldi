const admin = require('firebase-admin');

// Inicialización de Firebase mediante Variables de Entorno
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

const defaultData = {
  config: {
    adminPin: "2782",
    schedules: {
      "1": ["08:00", "09:00", "18:00", "19:00", "20:00"],
      "2": ["15:00", "16:00", "17:00", "18:00"],
      "3": ["08:00", "09:00", "10:00", "18:00", "19:00"],
      "4": ["14:00", "15:00", "16:00", "17:00", "18:00"],
      "5": ["14:00", "15:00", "16:00", "17:00"],
      "6": [],
      "0": []
    }
  },
  patients: {},
  appointments: {}
};

async function readDB() {
  try {
    const snapshot = await db.ref('/').once('value');
    const data = snapshot.val();
    if (!data) {
      await db.ref('/').set(defaultData);
      return defaultData;
    }
    return data;
  } catch (err) {
    console.error("Error leyendo Firebase:", err);
    return defaultData;
  }
}

async function writeDB(data) {
  try {
    await db.ref('/').set(data);
    return true;
  } catch (err) {
    console.error("Error escribiendo en Firebase:", err);
    return false;
  }
}

module.exports = { readDB, writeDB };