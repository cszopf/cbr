import { Link, Outlet, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { path: '/lookup', label: 'Lookup', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { path: '/alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Desktop top nav */}
      <header className="hidden md:block bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-700">CBR</span>
              <span className="text-sm text-gray-500">Columbus REALTORS®</span>
            </Link>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-center h-12">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-blue-700">CBR</span>
            <span className="text-xs text-gray-400">Columbus REALTORS®</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Outlet />
      </main>

      {/* Mobile bottom tab nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors ${
                  active ? 'text-blue-700' : 'text-gray-400'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className={`text-[10px] font-medium ${active ? 'text-blue-700' : 'text-gray-500'}`}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
