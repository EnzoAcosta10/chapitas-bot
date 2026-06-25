require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const axios = require('axios');

const app = express();
app.use(express.urlencoded({ extended: false }));

// Variables de entorno
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Endpoint para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  const incomingMessage = req.body.Body?.trim();
  const senderNumber = req.body.From;

  console.log(`📱 Mensaje recibido de ${senderNumber}: ${incomingMessage}`);

  try {
    // Parsear mensaje en formato: NOMBRE:CELULAR:FORMA:TAMAÑO:COLOR:PARTE DE ATRÁS:COLLAR:PAGO:FALTA PAGAR
    const campos = incomingMessage.split(':').map(c => c.trim());

    if (campos.length !== 9) {
      await enviarMensaje(senderNumber,
        '❌ Formato incorrecto.\n\nUsa:\nNOMBRE:CELULAR:FORMA:TAMAÑO:COLOR:PARTE DE ATRÁS:COLLAR:PAGO:FALTA PAGAR\n\nEjemplo:\nMiau:1234567890:Cuadrada:3cm:Rojo:Teléfono:Si:Pagado:No');
      return res.sendStatus(200);
    }

    const [nombre, celular, forma, tamano, color, parteAtras, collar, pago, faltaPagar] = campos;

    // Validar que no estén vacíos
    if (!nombre || !celular) {
      await enviarMensaje(senderNumber, '❌ El nombre y celular son obligatorios.');
      return res.sendStatus(200);
    }

    // Crear tarjeta en Trello
    const cardData = {
      name: `${nombre} - ${tamano}`,
      desc: `**Datos del pedido:**\n\n` +
            `👤 Nombre: ${nombre}\n` +
            `📱 Celular: ${celular}\n` +
            `📐 Forma: ${forma}\n` +
            `📏 Tamaño: ${tamano}\n` +
            `🎨 Color: ${color}\n` +
            `🔙 Parte de atrás: ${parteAtras}\n` +
            `📿 Collar: ${collar}\n` +
            `💰 Pago: ${pago}\n` +
            `❓ Falta pagar: ${faltaPagar}`,
      idList: process.env.TRELLO_LIST_ID, // ID de la lista (opcional, sin esto va al final)
    };

    const response = await axios.post(
      `https://api.trello.com/1/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
      {
        ...cardData,
        idBoard: TRELLO_BOARD_ID,
      }
    );

    console.log('✅ Tarjeta creada en Trello:', response.data.id);

    // Responder al cliente
    await enviarMensaje(senderNumber,
      `✅ Pedido registrado correctamente!\n\nDetalle:\n👤 ${nombre}\n📐 ${forma} - ${tamano}\n🎨 ${color}\n\nLo revisaremos pronto.`);

    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando mensaje:', error.message);
    await enviarMensaje(senderNumber, '⚠️ Hubo un error procesando tu pedido. Intenta nuevamente.');
    res.sendStatus(500);
  }
});

// Función para enviar mensajes de WhatsApp
async function enviarMensaje(to, body) {
  try {
    await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: to,
      body: body,
    });
    console.log(`📤 Mensaje enviado a ${to}`);
  } catch (error) {
    console.error('Error enviando mensaje:', error.message);
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: '✅ Bot funcionando', version: '1.0' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot escuchando en puerto ${PORT}`);
});
