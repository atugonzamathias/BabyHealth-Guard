"""
Script: implement_dark_light_mode.py
Adds full Dark and Light mode switching across:
1. Landing Page (index.html)
2. Clinical Web Dashboard (frontend/index.html & backend static copy)
3. Mother Mobile Dashboard (mobile/dashboard_preview.html)
4. Mobile Visits Screen (mobile/visits_preview.html)
5. Mobile Danger Signs Screen (mobile/danger_signs_preview.html)
Includes persistence in localStorage, system prefers-color-scheme detection, and complete dark styling.
"""

import os
import re

print("=== IMPLEMENTING UNIVERSAL DARK / LIGHT MODE SWITCHER ===")

# Universal Dark Theme CSS rules ensuring every UI element shifts cleanly to night mode
dark_mode_css = '''
  <style id="bhg-dark-mode-styles">
    /* Universal Dark Mode CSS Overrides */
    html.dark {
      color-scheme: dark;
    }
    html.dark body {
      background-color: #090e17 !important;
      color: #e2e8f0 !important;
    }
    html.dark header {
      background-color: rgba(15, 23, 42, 0.95) !important;
      border-color: #1e293b !important;
    }
    html.dark nav {
      background-color: rgba(15, 23, 42, 0.95) !important;
      border-color: #1e293b !important;
    }
    html.dark aside {
      background-color: #0f172a !important;
      border-color: #1e293b !important;
    }
    html.dark main {
      background-color: #090e17 !important;
    }
    html.dark .bg-white {
      background-color: #0f172a !important;
      color: #e2e8f0 !important;
      border-color: #1e293b !important;
    }
    html.dark .bg-slate-50,
    html.dark .bg-surface,
    html.dark .bg-surface-bright {
      background-color: #0b1120 !important;
      color: #cbd5e1 !important;
      border-color: #1e293b !important;
    }
    html.dark .bg-slate-100,
    html.dark .bg-surface-container-low,
    html.dark .bg-surface-container {
      background-color: #1e293b !important;
      color: #cbd5e1 !important;
      border-color: #334155 !important;
    }
    html.dark .bg-slate-200 {
      background-color: #334155 !important;
    }
    html.dark .text-slate-900,
    html.dark .text-on-surface {
      color: #f8fafc !important;
    }
    html.dark .text-slate-800 {
      color: #f1f5f9 !important;
    }
    html.dark .text-slate-700,
    html.dark .text-on-surface-variant {
      color: #cbd5e1 !important;
    }
    html.dark .text-slate-600 {
      color: #94a3b8 !important;
    }
    html.dark .text-slate-500 {
      color: #64748b !important;
    }
    html.dark .text-slate-400 {
      color: #94a3b8 !important;
    }
    html.dark .border-slate-100,
    html.dark .border-slate-200,
    html.dark .border-outline-variant {
      border-color: #1e293b !important;
    }
    html.dark table thead th {
      background-color: #1e293b !important;
      color: #94a3b8 !important;
    }
    html.dark table tbody tr {
      border-color: #1e293b !important;
    }
    html.dark table tbody tr:hover {
      background-color: #1e293b80 !important;
    }
    html.dark input, 
    html.dark select, 
    html.dark textarea {
      background-color: #1e293b !important;
      color: #f8fafc !important;
      border-color: #334155 !important;
    }
    html.dark .shadow-xs,
    html.dark .shadow-sm,
    html.dark .shadow-md,
    html.dark .shadow-lg,
    html.dark .shadow-xl {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45) !important;
    }
    html.dark .bg-cyan-50,
    html.dark .bg-teal-50,
    html.dark .bg-emerald-50,
    html.dark .bg-amber-50,
    html.dark .bg-red-50,
    html.dark .bg-indigo-50 {
      background-color: #1e293b !important;
    }
    html.dark #aiSideDrawer,
    html.dark #flutterwaveModal > div,
    html.dark #flwReceiptModal,
    html.dark #danger-signs-modal > div {
      background-color: #0f172a !important;
      color: #f8fafc !important;
      border-color: #334155 !important;
    }
  </style>
  <script>
    // Immediate Theme Initialization (prevents flash of unstyled content)
    (function() {
      try {
        var saved = localStorage.getItem('bhg_theme');
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved === 'dark' || (!saved && prefersDark)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    })();

    function toggleTheme() {
      var isDark = document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('bhg_theme', isDark ? 'dark' : 'light');
      } catch (e) {}
      updateThemeIcons(isDark);
      if (typeof toast === 'function') {
        toast(isDark ? '🌙 Dark Mode activated' : '☀️ Light Mode activated');
      }
    }

    function updateThemeIcons(isDark) {
      document.querySelectorAll('.theme-toggle-icon').forEach(function(el) {
        el.textContent = isDark ? 'light_mode' : 'dark_mode';
      });
      document.querySelectorAll('.theme-toggle-btn').forEach(function(el) {
        el.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
      });
    }

    document.addEventListener('DOMContentLoaded', function() {
      var isDark = document.documentElement.classList.contains('dark');
      updateThemeIcons(isDark);
    });
  </script>
'''

# -----------------------------------------------------------------------------
# 1. APPLY TO index.html (Landing Page)
# -----------------------------------------------------------------------------
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Ensure tailwind.config has darkMode: 'class'
if 'tailwind.config' in index_html and 'darkMode' not in index_html:
    index_html = index_html.replace('tailwind.config = {', 'tailwind.config = {\n      darkMode: "class",', 1)

# Inject dark mode styles and script into head
if 'id="bhg-dark-mode-styles"' not in index_html:
    index_html = index_html.replace('</head>', f'{dark_mode_css}\n</head>')

# Add Theme Toggle Button to Landing Page Navbar (right next to Sign In)
theme_btn_landing = '''<button onclick="toggleTheme()" class="theme-toggle-btn p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-xs" title="Toggle Dark/Light Mode">
          <span class="material-symbols-outlined theme-toggle-icon text-[20px]">dark_mode</span>
        </button>'''

nav_target_landing = '<a href="/frontend/index.html" class="px-4 py-2 rounded-full bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-slate-800 transition-colors shadow-sm">'
if nav_target_landing in index_html and 'theme-toggle-btn' not in index_html:
    index_html = index_html.replace(nav_target_landing, f'{theme_btn_landing}\n        {nav_target_landing}')
    print("Injected Theme Toggle Button into index.html Navbar.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

# -----------------------------------------------------------------------------
# 2. APPLY TO frontend/index.html (Clinical Web Dashboard)
# -----------------------------------------------------------------------------
with open('frontend/index.html', 'r', encoding='utf-8') as f:
    frontend_html = f.read()

if 'id="bhg-dark-mode-styles"' not in frontend_html:
    frontend_html = frontend_html.replace('</head>', f'{dark_mode_css}\n</head>')

theme_btn_clinical = '''<!-- Dark / Light Mode Switcher -->
        <button onclick="toggleTheme()" class="theme-toggle-btn p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-2xs" title="Toggle Dark/Light Mode">
          <span class="material-symbols-outlined theme-toggle-icon text-[18px]">dark_mode</span>
        </button>'''

clinical_nav_target = '<div class="h-6 w-px bg-slate-200 hidden md:block"></div>'
if clinical_nav_target in frontend_html and 'theme-toggle-btn' not in frontend_html:
    frontend_html = frontend_html.replace(clinical_nav_target, f'{theme_btn_clinical}\n        {clinical_nav_target}', 1)
    print("Injected Theme Toggle Button into frontend/index.html Header.")

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(frontend_html)

# Synchronize backend static copy
if os.path.exists('backend/src/main/resources/static/index.html'):
    with open('backend/src/main/resources/static/index.html', 'w', encoding='utf-8') as f:
        f.write(frontend_html)
    print("Synchronized to backend/src/main/resources/static/index.html.")

# -----------------------------------------------------------------------------
# 3. APPLY TO mobile/dashboard_preview.html (Mother Mobile Dashboard)
# -----------------------------------------------------------------------------
with open('mobile/dashboard_preview.html', 'r', encoding='utf-8') as f:
    mobile_html = f.read()

if 'id="bhg-dark-mode-styles"' not in mobile_html:
    mobile_html = mobile_html.replace('</head>', f'{dark_mode_css}\n</head>')

theme_btn_mobile = '''<button onclick="toggleTheme()" class="theme-toggle-btn w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer" title="Toggle Dark/Light Mode">
        <span class="material-symbols-outlined theme-toggle-icon text-[18px]">dark_mode</span>
      </button>'''

mobile_nav_target = '<button id="btn-sync" onclick="syncData()"'
if mobile_nav_target in mobile_html and 'theme-toggle-btn' not in mobile_html:
    mobile_html = mobile_html.replace(mobile_nav_target, f'{theme_btn_mobile}\n      {mobile_nav_target}')
    print("Injected Theme Toggle Button into mobile/dashboard_preview.html Header.")

with open('mobile/dashboard_preview.html', 'w', encoding='utf-8') as f:
    f.write(mobile_html)

# -----------------------------------------------------------------------------
# 4. APPLY TO mobile/visits_preview.html & danger_signs_preview.html
# -----------------------------------------------------------------------------
for mpath in ['mobile/visits_preview.html', 'mobile/danger_signs_preview.html']:
    with open(mpath, 'r', encoding='utf-8') as f:
        mhtml = f.read()
    if 'id="bhg-dark-mode-styles"' not in mhtml:
        mhtml = mhtml.replace('</head>', f'{dark_mode_css}\n</head>')
    
    # In visits and danger signs header:
    hdr_target = '<div class="flex items-center gap-space-xs">' if 'gap-space-xs' in mhtml else '<div class="flex items-center gap-2">'
    if hdr_target in mhtml and 'theme-toggle-btn' not in mhtml:
        mhtml = mhtml.replace(hdr_target, f'{hdr_target}\n      {theme_btn_mobile}', 1)
        print(f"Injected Theme Toggle Button into {mpath} Header.")
    with open(mpath, 'w', encoding='utf-8') as f:
        f.write(mhtml)

print("Universal Dark & Light mode integration complete!")

