const { onSchedule } = require('firebase-functions/v2/scheduler');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "appfazaprueba@gmail.com",
    pass: "xehv ekfa smbb heau",
  },
});

exports.notificarCambioAceite = onSchedule(
  {
    schedule: 'every 2 minutes',
    timeZone: 'America/Bogota',
  },
  async (event) => {
    const db = admin.firestore();
    const hoy = new Date();
    const dentroDe7Dias = new Date(hoy);
    dentroDe7Dias.setDate(hoy.getDate() + 7);

    const usuariosSnap = await db.collection('usuarios').get();

    for (const usuarioDoc of usuariosSnap.docs) {
      const dataUsuario = usuarioDoc.data();
      const nombre = dataUsuario.nombre || '';
      const apellido = dataUsuario.apellido || '';
      const correo = dataUsuario.email;
      if (!correo) continue;

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

          const mailOptions = {
            from: `"Taller Faza Ingeniería" <${transporter.options.auth.user}>`,
            to: correo,
            subject: "Recordatorio: Tu próximo cambio de aceite está cerca",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4a90e2;">Hola, ${nombre} ${apellido}</h2>
                <p style="font-size: 16px; color: #333;">
                  Te recordamos que el <strong>cambio de aceite</strong> de tu vehículo está próximo a vencer el <strong>${fechaCambio.toLocaleDateString()}</strong>.
                </p>
                <hr style="margin: 20px 0;">
                <p style="font-size: 14px; color: #999;">Este mensaje fue enviado por TuApp.</p>
                <p style="font-size: 14px; color: #999;">Si tienes alguna pregunta, contáctanos a soporte@tuapp.com</p>
                <div style="margin-top: 20px; text-align: center;">
                  <a href="https://tuapp.com" style="background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir a la App</a>
                </div>
              </div>
            `,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log('Correo enviado a:', correo);
          } catch (error) {
            console.error('Error al enviar correo a', correo, error);
          }
        }
      }
    }

    return { success: true, message: 'Correos procesados correctamente' };
  }
);
