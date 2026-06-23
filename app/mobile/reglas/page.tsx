import { requireSession } from '@/lib/session'
import NavLink from '@/components/NavLink'

export const dynamic = 'force-dynamic'

export default async function ReglasLocalesPage() {
  await requireSession()

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-green-700 text-white px-6 pt-10 pb-6">
        <p className="text-green-200 text-sm font-medium tracking-wide uppercase">La Lucila Golf Club</p>
        <h1 className="text-xl font-bold mt-1">Reglas locales</h1>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">1. Límites del campo</h2>
            <p>
              Los límites del campo están definidos por estacas blancas y la línea blanca pintada.
              La línea en sí es fuera de límites. El camino de acceso al club es fuera de límites.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">2. Obstáculos de agua</h2>
            <p>
              Los obstáculos de agua están definidos por estacas amarillas o rojas según corresponda.
              Las zanjas de drenaje se juegan como obstáculos de agua laterales (estacas rojas) salvo
              indicación contraria.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">3. Áreas en construcción</h2>
            <p>
              Las áreas en construcción marcadas con estacas azules son tierra en reparación (GUR).
              El jugador debe o puede (según el color de la estaca) tomar alivio sin penalidad.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">4. Caminos y senderos</h2>
            <p>
              Los caminos de cart con material artificial son obstáculos inamovibles. Se puede tomar
              alivio sin penalidad a no más de un palo de largo del punto más cercano de alivio.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">5. Árboles jóvenes tutelados</h2>
            <p>
              Los árboles jóvenes marcados con estaca azul son tierra en reparación. Si la pelota toca
              o queda junto a ellos, o si interfieren con el swing, se toma alivio sin penalidad.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">6. Alivio para pelotas incrustadas</h2>
            <p>
              Cuando una pelota queda incrustada en su propio pitch fuera del rough, el jugador puede
              tomar alivio sin penalidad según la Regla 16.3b.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">7. Práctica en el campo</h2>
            <p>
              No se permite golpear pelotas de práctica en los hoyos durante la ronda. En días de torneo
              queda prohibida la práctica en el campo luego de hacer el hoyo y antes de cerrar la tarjeta.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-green-800 text-base mb-2">8. Comité de competición</h2>
            <p>
              Cualquier situación no contemplada en estas reglas locales será resuelta por el Comité de
              Competición del club, cuya decisión será definitiva e inapelable.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 text-center">
            Club de Golf La Lucila · Vigentes temporada 2026
          </div>
        </div>
      </div>

      <div className="p-4">
        <NavLink
          href="/mobile"
          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl px-5 py-4 font-semibold active:scale-95 transition-transform"
        >
          ← Volver al menú
        </NavLink>
      </div>
    </div>
  )
}
