import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cookie',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // SOCIOs solo pueden usar /mobile y sus sub-rutas (+ login y api)
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    const cookieValue = req.cookies.get('golf_session')?.value
    if (cookieValue) {
      try {
        const user = JSON.parse(Buffer.from(cookieValue, 'base64').toString('utf-8'))
        if (user?.role === 'SOCIO') {
          const isPublic = pathname === '/login' || pathname === '/'
          const isMobile = pathname === '/mobile' || pathname.startsWith('/mobile/')
          const isTarjeta = pathname === '/tarjeta-online' || pathname.startsWith('/tarjeta-online/')
          if (!isPublic && !isMobile && !isTarjeta) {
            return NextResponse.redirect(new URL('/mobile', origin))
          }
        }
      } catch {
        // cookie malformada — dejar pasar, el layout lo manejará
      }
    }
  }

  const res = NextResponse.next()
  if (pathname.startsWith('/api/')) {
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Cookie')
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
