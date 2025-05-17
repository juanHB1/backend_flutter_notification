// index.js
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();

exports.notificarCambioAceite = onSchedule('every 2 minutes', async (event) => {
  const db = admin.firestore();
  const hoy = new Date();
  const dentroDe7Dias = new Date(hoy);
  dentroDe7Dias.setDate(hoy.getDate() + 7);

  const usuariosSnap = await db.collection('usuarios').get();

  for (const usuarioDoc of usuariosSnap.docs) {
    const dataUsuario = usuarioDoc.data();
    const tokenFCM = dataUsuario.tokenNotificacion;
    if (!tokenFCM) continue;

    const nombre = dataUsuario.nombre || '';
    const apellido = dataUsuario.apellido || '';

    const vehiculosSnap = await db
      .collection('usuarios')
      .doc(usuarioDoc.id)
      .collection('vehiculos')
      .get();

    for (const vehiculoDoc of vehiculosSnap.docs) {
      const v = vehiculoDoc.data();
      const ordenesSnap = await db
        .collection('usuarios')
        .doc(usuarioDoc.id)
        .collection('vehiculos')
        .doc(vehiculoDoc.id)
        .collection('ordenServicio')
        .where('estadoPago', '==', 'Pagado')
        .where('estadoServicio', '==', 'terminado')
        .where('proximoCambioAceite', '<=', admin.firestore.Timestamp.fromDate(dentroDe7Dias))
        .get();

      for (const ordenDoc of ordenesSnap.docs) {
        const od = ordenDoc.data();
        const fechaCambio = od.proximoCambioAceite?.toDate?.();
        if (!fechaCambio) continue;

        await admin.messaging().send({
          token: tokenFCM,
          notification: {
            title: '¡Tu vehículo necesita atención!',
            body: `Hola ${nombre}, el cambio de aceite de tu ${v.marca} ${v.modelo} (placa ${v.placa}) es el ${fechaCambio.toLocaleDateString()}.`
          },
          android: { priority: 'high' }
        });
        console.log(`Notificación enviada a ${nombre} (${v.placa})`);
      }
    }
  }
});
