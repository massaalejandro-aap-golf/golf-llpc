FROM node:20

WORKDIR /app

# Instalar dependencias npm primero (cachea esta capa si no cambia package.json)
COPY package*.json ./
RUN npm ci

# Instalar Chromium + todas sus dependencias del sistema
RUN npx playwright install --with-deps chromium

# Copiar fuentes
COPY . .

# Generar el cliente Prisma (output: app/generated/prisma)
RUN npx prisma generate

# Compilar Next.js
RUN npm run build

# Crear carpeta de datos (será sobreescrita por el volumen persistente en Railway)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
