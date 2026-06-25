# 🤖 Bot WhatsApp para Pedidos de Chapitas

Bot que recibe pedidos por WhatsApp y los sincroniza automáticamente con Trello.

## 📋 Requisitos

- Node.js v18+ ✅ (ya tienes v24.11.0)
- Cuenta Twilio con número de WhatsApp
- Acceso a la API de Trello
- Hosting gratuito (Render)

## 🚀 Instalación Local

```bash
cd chapitas-bot
npm install
```

## ⚙️ Configuración

### 1. Crear archivo `.env`

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

### 2. Variables necesarias

**Twilio:**
- `TWILIO_ACCOUNT_SID` - De https://console.twilio.com
- `TWILIO_AUTH_TOKEN` - De https://console.twilio.com
- `TWILIO_WHATSAPP_NUMBER` - Tu número de Twilio (ej: +1234567890)

**Trello (ya tienes estos):**
- `TRELLO_KEY` = b01d420931ca797b48876f71e81519a9
- `TRELLO_TOKEN` = 56c2ccb95e5dc3ceeb0f93416edc5d00d3e0efdc7634c86d281d355b4287e40d
- `TRELLO_BOARD_ID` = izIO1uTh
- `TRELLO_LIST_ID` = Opcional (ID de la lista donde crear tarjetas)

## 📱 Cómo funciona

### Formato de mensaje:
```
NOMBRE:CELULAR:FORMA:TAMAÑO:COLOR:PARTE DE ATRÁS:COLLAR:PAGO:FALTA PAGAR
```

### Ejemplo:
```
Miau:1234567890:Cuadrada:3cm:Rojo:Teléfono:Si:Pagado:No
```

### Respuesta:
```
✅ Pedido registrado correctamente!

Detalle:
👤 Miau
📐 Cuadrada - 3cm
🎨 Rojo

Lo revisaremos pronto.
```

## 🧪 Prueba local

```bash
npm start
```

El bot escuchará en `http://localhost:3000`

## 🌐 Desplegar en Render (Gratuito)

### Paso 1: Crear cuenta en Render
- Ve a https://render.com
- Crea una cuenta con GitHub

### Paso 2: Crear nuevo servicio
- Dashboard → New+ → Web Service
- Conecta tu repositorio GitHub
- Nombre: `chapitas-bot`
- Build command: `npm install`
- Start command: `node index.js`

### Paso 3: Variables de entorno
- En Render, ve a Environment
- Agrega todas las variables del `.env`

### Paso 4: Configurar Twilio
- Ve a https://console.twilio.com/phone-numbers/incoming
- En Webhook URL, pon: `https://chapitas-bot.onrender.com/webhook`
- HTTP POST

## 🛠️ Troubleshooting

**"Webhook no recibe mensajes":**
- Verifica que la URL de Twilio esté correcta
- Comprueba que el bot esté corriendo en Render

**"Error en Trello":**
- Revisa que el API Key y Token sean válidos
- Verifica que el Board ID sea correcto

**"Mensaje mal parseado":**
- Revisa que tengas exactamente 9 campos separados por `:`
- Asegúrate de no dejar espacios extras

---

**Made with ❤️ para optimizar tu emprendimiento de chapitas**
