// functions/index.js
// Cloud Function que se ejecuta cada minuto y envía notificaciones
// según el horario configurado por el usuario

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// Se ejecuta cada minuto
exports.sendScheduledNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async () => {
    const now    = new Date();
    const hour   = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // Hora en España (UTC+1 invierno, UTC+2 verano)
    // Ajustamos con offset real
    const spainOffset = getSpainOffset(now);
    const spainTime   = new Date(now.getTime() + spainOffset * 60 * 60 * 1000);
    const sh = spainTime.getUTCHours();
    const sm = spainTime.getUTCMinutes();
    const timeStr  = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`;
    const todayStr = spainTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const dow      = spainTime.getUTCDay(); // 0=Dom, 6=Sáb
    const isWeekend = dow === 0 || dow === 6;

    console.log(`Checking notifications for ${todayStr} ${timeStr} (dow=${dow})`);

    const snapshot = await db.collection("schedules").get();
    const sends = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.fcmToken || !data.times) return;

      // Check weekend
      if (isWeekend && !data.notifyWeekends) return;

      // Check festivo
      const holidays = data.holidays || [];
      if (holidays.includes(todayStr)) return;

      // Check if any configured time matches now
      const match = data.times.some(t => t === timeStr);
      if (!match) return;

      sends.push(
        admin.messaging().send({
          token: data.fcmToken,
          notification: {
            title: "Registro de horas",
            body:  `Recuerda anotar tus horas del ${formatDay(spainTime)}`
          },
          android: {
            notification: {
              channelId: "horas-recordatorio",
              priority:  "high"
            }
          }
        }).catch(err => {
          console.error(`Error sending to ${doc.id}:`, err.message);
          // Token inválido → borrar
          if (err.code === 'messaging/registration-token-not-registered') {
            return db.collection("schedules").doc(doc.id).delete();
          }
        })
      );
    });

    await Promise.all(sends);
    console.log(`Sent ${sends.length} notifications`);
    return null;
  });

function getSpainOffset(date) {
  // DST Europa/Madrid: último domingo de marzo (+2) al último domingo de octubre (+1)
  const year = date.getUTCFullYear();
  const dstStart = lastSunday(year, 2); // marzo = mes 2 (0-indexed)
  const dstEnd   = lastSunday(year, 9); // octubre = mes 9
  if (date >= dstStart && date < dstEnd) return 2;
  return 1;
}

function lastSunday(year, month) {
  const d = new Date(Date.UTC(year, month+1, 1)); // primer día del mes siguiente
  d.setUTCDate(d.getUTCDate() - 1); // último día del mes
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // retroceder al domingo
  d.setUTCHours(1, 0, 0, 0); // 01:00 UTC = 02:00 o 03:00 España
  return d;
}

function formatDay(date) {
  return date.toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'});
}
