# Imagen oficial de Playwright — ya incluye Chromium y todas sus dependencias
FROM mcr.microsoft.com/playwright:v1.60.0-focal

WORKDIR /app

# Instalar dependencias primero (cachea esta capa si no cambia package.json)
COPY package*.json ./
RUN npm ci

# Copiar fuentes y compilar Next.js
COPY . .
RUN npm run build

# Crear carpeta de datos (será sobreescrita por el volumen persistente en Railway)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
