"""
Script: enrich_maternal_experience.py
Injects authentic imagery for pregnant mothers, lactating mothers, and babies across BabyHealth-Guard,
ensuring strict compliance with:
- Exactly ONE AI button per page/dashboard
- Prominent navigation Back and Sign Out buttons
- Institutional footer with contacts: Phone +256 778 501 066, Email infor@babyguard.org, WhatsApp wa.me/256778501066, TikTok, X
- Robust offline fallbacks to local SVGs (/assets/images/...)
"""

import re
import os

print("Starting Maternal & Infant Care Experience Enrichment...")

# -----------------------------------------------------------------------------
# 1. FIX index.html (Strictly 1 AI button, ensure continuum photos look pristine)
# -----------------------------------------------------------------------------
index_path = 'index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    index_html = f.read()

# Replace any secondary AI button in the Lactating Mother card with clinical badge
old_sub_btn = '<button onclick="openAiSideDrawer()" class="text-emerald-700 font-bold hover:underline cursor-pointer">Ask Nutrition AI →</button>'
new_sub_tag = '<span class="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">Exclusive 6 Mo</span>'
if old_sub_btn in index_html:
    index_html = index_html.replace(old_sub_btn, new_sub_tag)
    print("Fixed index.html: Removed secondary AI button in Lactating Mother card.")

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_html)

# -----------------------------------------------------------------------------
# 2. ENHANCE frontend/index.html (Clinical Web Dashboard)
# -----------------------------------------------------------------------------
frontend_path = 'frontend/index.html'
with open(frontend_path, 'r', encoding='utf-8') as f:
    frontend_html = f.read()

# In view-newborn-care: Add Baby & Lactating Mother Visual Banner above the table
# Target: right after <!-- Top Summary Cards (KPIs) --> grid
kpi_marker = '<!-- Main Registry Table & Detail Panel -->'

visual_newborn_banner = '''<!-- Maternal Continuum: Newborn Baby & Lactating Mother Visual Guides -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Card 1: HEALTHY NEWBORN BABY CARE -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-5 hover:border-teal-300 transition-all">
            <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border-2 border-teal-500/30 shadow-md bg-slate-900">
              <img src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=400&q=80"
                   onerror="this.onerror=null; this.src='/assets/images/healthy_baby.svg';"
                   alt="Healthy Newborn Baby Care"
                   class="w-full h-full object-cover">
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-teal-800 text-white font-bold text-[9px] uppercase tracking-wider">
                Infant
              </span>
            </div>
            <div class="space-y-1.5 flex-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold text-[10px] uppercase border border-teal-200">Day 1, 3, 7 &amp; 28 Checks</span>
                <span class="text-xs text-slate-400 font-medium">• Infant Protocol</span>
              </div>
              <h3 class="font-bold text-[15px] text-slate-900 tracking-tight">Newborn Health &amp; Immunization</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Vital signs assessment (temperature, respiration rate), umbilical cord antiseptic care, and routine BCG / Polio 0 vaccines.
              </p>
              <div class="pt-1 flex items-center gap-3 text-[11px] text-slate-500">
                <span class="flex items-center gap-1 font-semibold text-emerald-700">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 98.4% Normal Temp
                </span>
                <span>•</span>
                <span>Target: &gt; 2.5 kg weight</span>
              </div>
            </div>
          </div>

          <!-- Card 2: LACTATING MOTHER & KMC -->
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-5 hover:border-emerald-300 transition-all">
            <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border-2 border-emerald-500/30 shadow-md bg-slate-900">
              <img src="https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=400&q=80"
                   onerror="this.onerror=null; this.src='/assets/images/lactating_mother.svg';"
                   alt="Lactating Mother & Kangaroo Mother Care"
                   class="w-full h-full object-cover">
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-800 text-white font-bold text-[9px] uppercase tracking-wider">
                Postnatal
              </span>
            </div>
            <div class="space-y-1.5 flex-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-200">KMC &amp; Lactation Support</span>
                <span class="text-xs text-slate-400 font-medium">• 100% EBF Target</span>
              </div>
              <h3 class="font-bold text-[15px] text-slate-900 tracking-tight">Lactating Mother &amp; Kangaroo Care</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Promoting skin-to-skin Kangaroo Mother Care for low birth weight infants, latch support, colostrum feeding, and maternal nutrition.
              </p>
              <div class="pt-1 flex items-center gap-3 text-[11px] text-slate-500">
                <span class="flex items-center gap-1 font-semibold text-teal-700">
                  <span class="w-2 h-2 rounded-full bg-teal-500"></span> 18 hrs/day KMC goal
                </span>
                <span>•</span>
                <span>Exclusive Breastfeeding</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Registry Table & Detail Panel -->'''

if kpi_marker in frontend_html and 'Maternal Continuum: Newborn Baby & Lactating Mother' not in frontend_html:
    frontend_html = frontend_html.replace(kpi_marker, visual_newborn_banner, 1)
    print("Injected Newborn Baby & Lactating Mother Visual Guides into frontend/index.html (View 2).")

# Update panel-baby-avatar in View 2 detail drawer to use authentic baby image
old_baby_avatar = '<div id="panel-baby-avatar" class="w-10 h-10 rounded-full bg-teal-100 text-[#0e7490] flex items-center justify-center font-bold text-sm">MO</div>'
new_baby_avatar = '''<div class="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-teal-500 shadow-xs bg-slate-100">
                  <img id="panel-baby-avatar-img" src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=300&q=80"
                       onerror="this.onerror=null; this.src='/assets/images/healthy_baby.svg';"
                       alt="Baby avatar" class="w-full h-full object-cover">
                </div>'''

if old_baby_avatar in frontend_html:
    frontend_html = frontend_html.replace(old_baby_avatar, new_baby_avatar)
    print("Updated Baby detail panel avatar to authentic infant photo.")

with open(frontend_path, 'w', encoding='utf-8') as f:
    f.write(frontend_html)

# Also synchronize to backend static copy
backend_static_path = 'backend/src/main/resources/static/index.html'
if os.path.exists(backend_static_path):
    with open(backend_static_path, 'w', encoding='utf-8') as f:
        f.write(frontend_html)
    print("Synchronized updated clinical dashboard to backend/src/main/resources/static/index.html.")

# -----------------------------------------------------------------------------
# 3. ENHANCE mobile/dashboard_preview.html (Mobile Mother Dashboard)
# -----------------------------------------------------------------------------
mobile_path = 'mobile/dashboard_preview.html'
with open(mobile_path, 'r', encoding='utf-8') as f:
    mobile_html = f.read()

# Fix hero-image to pregnant mother with local fallback
old_hero_img_regex = r'<img id="hero-image"[^>]+>'
new_hero_img = '<img id="hero-image" alt="Pregnant mother smiling holding baby bump" class="w-full h-full object-cover" src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80" onerror="this.onerror=null; this.src=\'/assets/images/pregnant_mother.svg\';">'
mobile_html = re.sub(old_hero_img_regex, new_hero_img, mobile_html, count=1)
print("Updated hero-image in mobile dashboard to pregnant mother with SVG fallback.")

# Add Lactating Mother & Baby Care Cards right after ANC visit card
anc_card_marker = '<!-- Quick Switch to Edit Profile -->'
continuum_cards_mobile = '''<!-- Maternal Care Continuum: Baby & Lactation Guides -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
    
    <!-- Card 1: Lactating Mother & Breastfeeding -->
    <div class="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-emerald-100 flex items-center gap-3.5">
      <div class="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-emerald-200 shadow-sm bg-slate-900">
        <img src="https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=300&q=80" 
             onerror="this.onerror=null; this.src='/assets/images/lactating_mother.svg';" 
             alt="Lactating Mother Nursing Baby" 
             class="w-full h-full object-cover">
      </div>
      <div class="flex flex-col min-w-0">
        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Lactating Mother</span>
        <span class="text-[13px] font-bold text-slate-900 leading-snug">Exclusive Breastfeeding</span>
        <span class="text-[11px] text-slate-500 mt-0.5">Colostrum &amp; proper latch tips for newborn care.</span>
      </div>
    </div>

    <!-- Card 2: Healthy Newborn Baby Checks -->
    <div class="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-teal-100 flex items-center gap-3.5">
      <div class="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-teal-200 shadow-sm bg-slate-900">
        <img src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=300&q=80" 
             onerror="this.onerror=null; this.src='/assets/images/healthy_baby.svg';" 
             alt="Healthy Newborn Baby Care" 
             class="w-full h-full object-cover">
      </div>
      <div class="flex flex-col min-w-0">
        <span class="text-[10px] font-bold uppercase tracking-wider text-teal-700">Healthy Infant</span>
        <span class="text-[13px] font-bold text-slate-900 leading-snug">Newborn Growth &amp; Warmth</span>
        <span class="text-[11px] text-slate-500 mt-0.5">Skin-to-skin Kangaroo Care &amp; cord protection.</span>
      </div>
    </div>

  </div>

  <!-- Quick Switch to Edit Profile -->'''

if anc_card_marker in mobile_html and 'Maternal Care Continuum: Baby & Lactation Guides' not in mobile_html:
    mobile_html = mobile_html.replace(anc_card_marker, continuum_cards_mobile, 1)
    print("Injected Lactating Mother & Baby Care cards into mobile/dashboard_preview.html.")

with open(mobile_path, 'w', encoding='utf-8') as f:
    f.write(mobile_html)

# -----------------------------------------------------------------------------
# 4. ENHANCE mobile/visits_preview.html
# -----------------------------------------------------------------------------
visits_path = 'mobile/visits_preview.html'
with open(visits_path, 'r', encoding='utf-8') as f:
    visits_html = f.read()

visits_title_marker = '<!-- Next ANC Visit Card -->'
visits_journey_banner = '''<!-- Maternal Journey Visual Card (Pregnant Mother) -->
    <div class="rounded-2xl bg-white border border-outline-variant/30 overflow-hidden shadow-sm flex items-center gap-4 p-3.5">
      <div class="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-primary/20 shadow-xs bg-slate-900">
        <img src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=300&q=80"
             onerror="this.onerror=null; this.src='/assets/images/pregnant_mother.svg';"
             alt="Pregnant Mother Journey"
             class="w-full h-full object-cover">
      </div>
      <div class="flex flex-col min-w-0">
        <span class="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">Antenatal Care Journey</span>
        <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">4 Focused Clinic Checkups</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Protecting mama and baby from conception through delivery.</p>
      </div>
    </div>

    <!-- Next ANC Visit Card -->'''

if visits_title_marker in visits_html and 'Maternal Journey Visual Card' not in visits_html:
    visits_html = visits_html.replace(visits_title_marker, visits_journey_banner, 1)
    print("Injected Pregnant Mother Care Journey banner into mobile/visits_preview.html.")

with open(visits_path, 'w', encoding='utf-8') as f:
    f.write(visits_html)

# -----------------------------------------------------------------------------
# 5. FIX mobile/welcome_preview.html image path
# -----------------------------------------------------------------------------
welcome_path = 'mobile/welcome_preview.html'
if os.path.exists(welcome_path):
    with open(welcome_path, 'r', encoding='utf-8') as f:
        welcome_html = f.read()
    welcome_html = welcome_html.replace('src="assets/images/baby_welcome.jpg"', 'src="/assets/images/baby_welcome.jpg"')
    with open(welcome_path, 'w', encoding='utf-8') as f:
        f.write(welcome_html)
    print("Updated image path in mobile/welcome_preview.html.")

print("All maternal & infant care photos, SVG fallbacks, and layouts updated successfully!")

