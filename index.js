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

// Almacenar sesiones de pedidos en construcción (en memoria, temporal)
const pedidosPendientes = {};
const camposOrdenados = ['nombre', 'celular', 'forma', 'tamano', 'color', 'parteAtras', 'collar', 'pago', 'faltaPagar'];

// Categorías válidas para validar datos
const FORMAS_VALIDAS = ['cuadrada', 'rectangular', 'redonda', 'ovalada', 'hexagonal', 'corazón'];
const COLORES_VALIDOS = ['rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco', 'rosa', 'naranja', 'morado', 'plateado', 'dorado'];

const camposNecesarios = {
  nombre: '👤 Nombre de la mascota',
  celular: '📱 Celular/Teléfono',
  forma: '📐 Forma (cuadrada, redonda, etc)',
  tamano: '📏 Tamaño (ej: 3cm)',
  color: '🎨 Color',
  parteAtras: '🔙 Parte de atrás (grabado o diseño)',
  collar: '📿 ¿Incluye collar? (si/no)',
  pago: '💰 Forma de pago (efectivo, transferencia, etc)',
  faltaPagar: '❓ ¿Falta pagar? (si/no)',
};

// Función para parsear datos flexiblemente
function parsearMensaje(texto) {
  const datos = {
    nombre: null,
    celular: null,
    forma: null,
    tamano: null,
    color: null,
    parteAtras: null,
    collar: null,
    pago: null,
    faltaPagar: null,
  };

  // Normalizar texto
  texto = texto.toLowerCase().trim();

  // Intenta parsear por separadores comunes
  const lineas = texto.split(/[:\n,;]/).map(l => l.trim()).filter(l => l);

  // Palabras clave para identificar campos
  const palabrasClaveNombre = ['nombre', 'mascota', 'pet', 'animal'];
  const palabrasClaveCelular = ['celular', 'telefono', 'phone', 'whatsapp', 'wa'];
  const palabrasClaveForma = ['forma', 'shape', 'tipo'];
  const palabrasClaveTamano = ['tamaño', 'size', 'medida', 'largo'];
  const palabrasClaveColor = ['color', 'colour'];
  const palabrasClaveParteAtras = ['atras', 'trasero', 'back', 'parte atras'];
  const palabrasClaveCollar = ['collar', 'cadena', 'chain'];
  const palabrasClavePago = ['pago', 'pagado', 'payment', 'paid'];
  const palabrasClaveFaltaPagar = ['falta', 'debe', 'pendiente', 'adeuda'];

  // Procesando líneas
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // Detectar si es un par clave:valor
    if (linea.includes(':')) {
      const [clave, valor] = linea.split(':').map(p => p.trim());

      if (palabrasClaveNombre.some(p => clave.includes(p))) {
        datos.nombre = valor;
      } else if (palabrasClaveCelular.some(p => clave.includes(p))) {
        datos.celular = valor.replace(/\D/g, ''); // Solo números
      } else if (palabrasClaveForma.some(p => clave.includes(p))) {
        datos.forma = valor;
      } else if (palabrasClaveTamano.some(p => clave.includes(p))) {
        datos.tamano = valor;
      } else if (palabrasClaveColor.some(p => clave.includes(p))) {
        datos.color = valor;
      } else if (palabrasClaveParteAtras.some(p => clave.includes(p))) {
        datos.parteAtras = valor;
      } else if (palabrasClaveCollar.some(p => clave.includes(p))) {
        datos.collar = valor;
      } else if (palabrasClavePago.some(p => clave.includes(p))) {
        datos.pago = valor;
      } else if (palabrasClaveFaltaPagar.some(p => clave.includes(p))) {
        datos.faltaPagar = valor;
      }
    } else {
      // Intentar asignar sin clave (por posición aproximada)
      if (!datos.nombre && linea.length < 20 && !/\d/.test(linea)) {
        datos.nombre = linea;
      } else if (!datos.celular && /\d+/.test(linea) && linea.replace(/\D/g, '').length >= 8) {
        datos.celular = linea.replace(/\D/g, '');
      } else if (!datos.forma) {
        datos.forma = linea;
      } else if (!datos.tamano && (linea.includes('cm') || linea.includes('mm'))) {
        datos.tamano = linea;
      } else if (!datos.color) {
        datos.color = linea;
      }
    }
  }

  return datos;
}

// Validar y detectar errores en los datos
function validarDatos(datos) {
  const errores = [];

  if (!datos.nombre || datos.nombre.length < 2) {
    errores.push('nombre');
  }
  if (!datos.celular || datos.celular.length < 8) {
    errores.push('celular');
  }
  if (!datos.forma) {
    errores.push('forma');
  }
  if (!datos.tamano) {
    errores.push('tamano');
  }
  if (!datos.color) {
    errores.push('color');
  }
  if (!datos.parteAtras) {
    errores.push('parteAtras');
  }
  if (!datos.collar || (datos.collar.toLowerCase() !== 'si' && datos.collar.toLowerCase() !== 'no')) {
    errores.push('collar');
  }
  if (!datos.pago) {
    errores.push('pago');
  }
  if (!datos.faltaPagar || (datos.faltaPagar.toLowerCase() !== 'si' && datos.faltaPagar.toLowerCase() !== 'no')) {
    errores.push('faltaPagar');
  }

  // Validar si los valores son plausibles
  if (datos.color && !COLORES_VALIDOS.some(c => datos.color.toLowerCase().includes(c))) {
    // Color no reconocido pero aceptable si está escrito
    console.log(`⚠️ Color no estándar: ${datos.color}`);
  }

  return errores;
}

// Endpoint para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  const incomingMessage = req.body.Body?.trim();
  const senderNumber = req.body.From;

  console.log(`📱 Mensaje recibido de ${senderNumber}: ${incomingMessage}`);

  try {
    // Verificar si hay sesión pendiente
    let datosActuales = pedidosPendientes[senderNumber];

    if (datosActuales) {
      // Ya hay una sesión abierta, el usuario está respondiendo a una pregunta
      console.log(`📝 Continuando sesión con ${senderNumber}`);

      // Encontrar cuál es el campo que falta (el primero faltante)
      let campoFaltante = null;
      for (let campo of camposOrdenados) {
        if (!datosActuales[campo]) {
          campoFaltante = campo;
          break;
        }
      }

      // Agregar la respuesta al campo faltante
      if (campoFaltante) {
        datosActuales[campoFaltante] = incomingMessage;
        console.log(`✏️ Completado ${campoFaltante}: ${incomingMessage}`);
      }
    } else {
      // Nuevo pedido, parsear el mensaje
      datosActuales = parsearMensaje(incomingMessage);
    }

    // Validar qué falta
    const errores = validarDatos(datosActuales);

    if (errores.length > 0) {
      // Guardar la sesión
      pedidosPendientes[senderNumber] = datosActuales;

      // Preguntar por el siguiente campo faltante
      const primerError = errores[0];
      const mensaje = `${camposNecesarios[primerError]}\n\n¿Cuál es?`;

      await enviarMensaje(senderNumber, mensaje);
      return res.sendStatus(200);
    }

    // Todos los datos están completos
    // Crear tarjeta en Trello
    const cardData = {
      name: `${datosActuales.nombre} - ${datosActuales.tamano}`,
      desc: `**Datos del pedido:**\n\n` +
            `👤 Nombre: ${datosActuales.nombre}\n` +
            `📱 Celular: ${datosActuales.celular}\n` +
            `📐 Forma: ${datosActuales.forma}\n` +
            `📏 Tamaño: ${datosActuales.tamano}\n` +
            `🎨 Color: ${datosActuales.color}\n` +
            `🔙 Parte de atrás: ${datosActuales.parteAtras}\n` +
            `📿 Collar: ${datosActuales.collar}\n` +
            `💰 Pago: ${datosActuales.pago}\n` +
            `❓ Falta pagar: ${datosActuales.faltaPagar}`,
    };

    const response = await axios.post(
      `https://api.trello.com/1/cards?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
      {
        ...cardData,
        idBoard: TRELLO_BOARD_ID,
      }
    );

    console.log('✅ Tarjeta creada en Trello:', response.data.id);

    // Limpiar sesión
    delete pedidosPendientes[senderNumber];

    // Responder al cliente
    await enviarMensaje(senderNumber,
      `✅ ¡Pedido registrado!\n\n👤 ${datosActuales.nombre}\n📐 ${datosActuales.forma} - ${datosActuales.tamano}\n🎨 ${datosActuales.color}\n\n¡Gracias! 🎉`);

    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando mensaje:', error.message);
    await enviarMensaje(senderNumber, '⚠️ Error. Intenta nuevamente.');
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
