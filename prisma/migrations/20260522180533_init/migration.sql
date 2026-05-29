-- CreateEnum
CREATE TYPE "PlayerType" AS ENUM ('SOCIO', 'INVITADO', 'SOCIO_TEMPORARIO', 'INVITADO_TEMPORARIO');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('DAMA', 'CABALLERO');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('MEDAL', 'STABLEFORD', 'MATCH_PLAY', 'CHOICE_ECLECTIC', 'RANKING', 'GOLFER', 'FOURBALL_AMERICANO', 'FOURBALL_CLASICO', 'FOURBALL_AGGREGATE', 'LAGUNEADA', 'FOURSOME_CHAPMAN', 'FOURSOME_MIXED', 'FOURSOME', 'SCRAMBLE', 'PELOTERO');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('ACTIVO', 'EN_JUEGO', 'FINALIZADO', 'PROCESADO', 'POSPUESTO', 'SUSPENDIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "HolesCount" AS ENUM ('NINE', 'EIGHTEEN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COMISION', 'SOCIO');

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'Argentina',
    "slopeAzul" INTEGER,
    "ratingAzul" DOUBLE PRECISION,
    "slopeBlanco" INTEGER,
    "ratingBlanco" DOUBLE PRECISION,
    "slopeRojo" INTEGER,
    "ratingRojo" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hole" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "handicapIndex" INTEGER NOT NULL,
    "distanciaAzul" INTEGER,
    "distanciaBlanco" INTEGER,
    "distanciaRojo" INTEGER,

    CONSTRAINT "Hole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "matricula" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "hcpIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "genero" "Gender" NOT NULL,
    "tipo" "PlayerType" NOT NULL DEFAULT 'SOCIO',
    "email" TEXT,
    "dni" TEXT,
    "fechaNac" TIMESTAMP(3),
    "telefono" TEXT,
    "centroCosto" TEXT,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "aagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombrePlanilla" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TournamentType" NOT NULL DEFAULT 'MEDAL',
    "hoyos" "HolesCount" NOT NULL DEFAULT 'EIGHTEEN',
    "ronda" TEXT NOT NULL DEFAULT 'Única',
    "jugadoresPorLinea" INTEGER NOT NULL DEFAULT 4,
    "scoreMaxMedal" BOOLEAN NOT NULL DEFAULT false,
    "aagEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "TournamentStatus" NOT NULL DEFAULT 'ACTIVO',
    "courseId" INTEGER NOT NULL,
    "weatherDesc" TEXT,
    "weatherTempC" INTEGER,
    "weatherVientoKmh" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCategory" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "genero" "Gender" NOT NULL,
    "nombre" TEXT NOT NULL,
    "scratch" BOOLEAN NOT NULL DEFAULT false,
    "hcpDesde" DOUBLE PRECISION,
    "hcpHasta" DOUBLE PRECISION,

    CONSTRAINT "TournamentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeeTimeSlot" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "hora" TIMESTAMP(3) NOT NULL,
    "hoyoSalida" INTEGER NOT NULL DEFAULT 1,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeeTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeeTimeSlotPlayer" (
    "id" SERIAL NOT NULL,
    "teeTimeSlotId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "carro" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeeTimeSlotPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "ronda" INTEGER NOT NULL DEFAULT 1,
    "aagSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "aagSubmittedAt" TIMESTAMP(3),
    "aagResponse" TEXT,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardEntry" (
    "id" SERIAL NOT NULL,
    "scorecardId" INTEGER NOT NULL,
    "holeId" INTEGER NOT NULL,
    "golpes" INTEGER NOT NULL,

    CONSTRAINT "ScorecardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "ida" INTEGER,
    "vuelta" INTEGER,
    "grossTotal" INTEGER,
    "hcpStrokes" INTEGER,
    "neto" INTEGER,
    "stablefordPts" INTEGER,
    "puesto" INTEGER,
    "birdies" INTEGER NOT NULL DEFAULT 0,
    "pares" INTEGER NOT NULL DEFAULT 0,
    "bogeys" INTEGER NOT NULL DEFAULT 0,
    "dobles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SOCIO',
    "playerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hole_courseId_idx" ON "Hole"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Hole_courseId_numero_key" ON "Hole"("courseId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Player_matricula_key" ON "Player"("matricula");

-- CreateIndex
CREATE INDEX "Player_matricula_idx" ON "Player"("matricula");

-- CreateIndex
CREATE INDEX "Player_apellido_nombre_idx" ON "Player"("apellido", "nombre");

-- CreateIndex
CREATE INDEX "Tournament_fecha_idx" ON "Tournament"("fecha");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentCategory_tournamentId_idx" ON "TournamentCategory"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCategory_tournamentId_genero_nombre_key" ON "TournamentCategory"("tournamentId", "genero", "nombre");

-- CreateIndex
CREATE INDEX "TeeTimeSlot_tournamentId_idx" ON "TeeTimeSlot"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeeTimeSlot_tournamentId_hora_hoyoSalida_key" ON "TeeTimeSlot"("tournamentId", "hora", "hoyoSalida");

-- CreateIndex
CREATE INDEX "TeeTimeSlotPlayer_playerId_idx" ON "TeeTimeSlotPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TeeTimeSlotPlayer_teeTimeSlotId_playerId_key" ON "TeeTimeSlotPlayer"("teeTimeSlotId", "playerId");

-- CreateIndex
CREATE INDEX "Scorecard_tournamentId_idx" ON "Scorecard"("tournamentId");

-- CreateIndex
CREATE INDEX "Scorecard_playerId_idx" ON "Scorecard"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Scorecard_tournamentId_playerId_ronda_key" ON "Scorecard"("tournamentId", "playerId", "ronda");

-- CreateIndex
CREATE INDEX "ScorecardEntry_scorecardId_idx" ON "ScorecardEntry"("scorecardId");

-- CreateIndex
CREATE UNIQUE INDEX "ScorecardEntry_scorecardId_holeId_key" ON "ScorecardEntry"("scorecardId", "holeId");

-- CreateIndex
CREATE INDEX "Result_tournamentId_categoryId_idx" ON "Result"("tournamentId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_tournamentId_playerId_key" ON "Result"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- AddForeignKey
ALTER TABLE "Hole" ADD CONSTRAINT "Hole_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCategory" ADD CONSTRAINT "TournamentCategory_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeTimeSlot" ADD CONSTRAINT "TeeTimeSlot_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeTimeSlotPlayer" ADD CONSTRAINT "TeeTimeSlotPlayer_teeTimeSlotId_fkey" FOREIGN KEY ("teeTimeSlotId") REFERENCES "TeeTimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeTimeSlotPlayer" ADD CONSTRAINT "TeeTimeSlotPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scorecard" ADD CONSTRAINT "Scorecard_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardEntry" ADD CONSTRAINT "ScorecardEntry_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardEntry" ADD CONSTRAINT "ScorecardEntry_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "Hole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
