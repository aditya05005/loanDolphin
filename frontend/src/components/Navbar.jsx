// Navbar.jsx
import logo from '../assets/loanDolphin-Shield.png';

export default function Navbar({ theme, onToggleTheme, user, onLogout }) {
  const isDark = theme === "dark";
  const initials = user?.userid?.slice(0, 2).toUpperCase() || "LD";

  return (
    <nav className="flex items-center justify-between bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div className="flex items-center gap-2">
        <img 
          src={logo}
          alt="BankLoan System Logo" 
          className="w-8 h-8 object-contain" 
        />
        <span className="text-slate-900 dark:text-white font-semibold text-lg">LoanDolphin</span>
      </div>

      <div className="flex items-center gap-6">
        <a href="#" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
          Dashboard
        </a>
        <a href="#" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
          Loans
        </a>
        <a href="#" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
          Branches
        </a>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          )}
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-6">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-200">{user?.userid}</span>
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-slate-500 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
