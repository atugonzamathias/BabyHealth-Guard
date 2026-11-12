import re
import os

print("Adding Pregnant Mother, Lactating Mother, and Baby pictures across the system...")

# =============================================================================
# 1. UPDATE index.html (Landing Page)
# =============================================================================
index_path = r"C:\Users\Admin\BabyHealth-Guard\index.html"
with open(index_path, "r", encoding="utf-8") as f:
    idx_content = f.read()

# Replace Hero image with Pregnant Mother
old_hero_img = '''<img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80" 
                 onerror="this.onerror=null; this.src='/assets/images/mother_baby_hero.svg';" 
                 alt="Mother and Child" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">'''

new_hero_img = '''<img src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80" 
                 onerror="this.onerror=null; this.src='/assets/images/pregnant_mother.svg';" 
                 alt="Pregnant African Mother" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">'''

if old_hero_img in idx_content:
    idx_content = idx_content.replace(old_hero_img, new_hero_img, 1)
    print("Updated Hero image to Pregnant Mother.")
elif 'pregnant_mother.svg' not in idx_content:
    # Try replacing whatever hero img tag exists
    idx_content = re.sub(
        r'<div class="relative w-full max-w-md rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-900 aspect-\[4/3\] group">\s*<img[^>]+>',
        f'<div class="relative w-full max-w-md rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-900 aspect-[4/3] group">\n            {new_hero_img}',
        idx_content,
        count=1
    )
    print("Replaced hero image via regex.")

# Add 3-stage Maternal Journey Section (Pregnant Mother, Newborn Baby, Lactating Mother)
# Insert right after section id="features"
old_features_section = '''  <!-- ========================================================================= -->
  <!-- 5. STREAMLINED USSD STRIP (*920#)                                         -->
  <!-- ========================================================================= -->'''

three_stages_section = '''  <!-- ========================================================================= -->
  <!-- 4B. COMPLETE MATERNAL & CHILD CONTINUUM (3 AUTHENTIC VISUAL STAGES)        -->
  <!-- ========================================================================= -->
  <section class="py-16 bg-slate-50/80 border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      
      <div class="text-center max-w-2xl mx-auto mb-12">
        <span class="px-3 py-1 rounded-full bg-[#0e7490]/10 text-[#0e7490] text-xs font-bold uppercase tracking-wider mb-2.5 inline-block">
          Complete Continuum of Care
        </span>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Supporting Every Mother &amp; Infant in Uganda
        </h2>
        <p class="text-slate-600 text-xs sm:text-sm">
          From early gestational antenatal checkups to safe delivery and postnatal lactation.
        </p>
      </div>

      <!-- 3 Distinct Photo Cards: Pregnant Mother, Newborn Baby, Lactating Mother -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Card 1: PREGNANT MOTHER -->
        <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all group flex flex-col">
          <div class="relative h-56 bg-slate-900 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&q=80" 
                 onerror="this.onerror=null; this.src='/assets/images/pregnant_mother.svg';" 
                 alt="Pregnant Mother Antenatal Care" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-cyan-700 text-white font-bold text-[10px] uppercase tracking-wider">
              Antenatal Care
            </span>
            <div class="absolute bottom-3 left-3 text-white">
              <span class="text-sm font-bold block">Pregnant Mother</span>
              <span class="text-[11px] text-cyan-200">Weeks 1–40 Gestation • ANC 1–4 Visits</span>
            </div>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
            <p class="text-xs text-slate-600 leading-relaxed">
              Continuous monitoring of maternal blood pressure, fundal growth, daily fetal kick counts, and danger sign triage (bleeding, severe headache) with SMS clinic reminders.
            </p>
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-emerald-700 font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 11 Kicks / 2h Target
              </span>
              <a href="/frontend/index.html" class="text-[#0e7490] font-bold hover:underline">Roster →</a>
            </div>
          </div>
        </div>

        <!-- Card 2: HEALTHY BABY & NEWBORN -->
        <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all group flex flex-col">
          <div class="relative h-56 bg-slate-900 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80" 
                 onerror="this.onerror=null; this.src='/assets/images/healthy_baby.svg';" 
                 alt="Healthy Baby Newborn" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider">
              Neonatal Vitality
            </span>
            <div class="absolute bottom-3 left-3 text-white">
              <span class="text-sm font-bold block">Healthy Newborn Baby</span>
              <span class="text-[11px] text-indigo-200">Day 1 to 28 Days • Growth &amp; UNEPI Vaccines</span>
            </div>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
            <p class="text-xs text-slate-600 leading-relaxed">
              Recording birth weight, APGAR scores, cord care, temperature stability, and automated tracking for BCG, Polio 0, and 6-week pentavalent immunizations.
            </p>
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-indigo-700 font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-indigo-500"></span> 3.4 kg Normal Wt
              </span>
              <a href="/frontend/index.html#newborn-care" class="text-indigo-700 font-bold hover:underline">Baby Checks →</a>
            </div>
          </div>
        </div>

        <!-- Card 3: LACTATING MOTHER -->
        <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all group flex flex-col">
          <div class="relative h-56 bg-slate-900 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80" 
                 onerror="this.onerror=null; this.src='/assets/images/lactating_mother.svg';" 
                 alt="Lactating Mother Breastfeeding" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>
            <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider">
              Postnatal &amp; Nutrition
            </span>
            <div class="absolute bottom-3 left-3 text-white">
              <span class="text-sm font-bold block">Lactating Mother</span>
              <span class="text-[11px] text-emerald-200">Months 0–6 • Exclusive Breastfeeding</span>
            </div>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between space-y-3">
            <p class="text-xs text-slate-600 leading-relaxed">
              Promoting exclusive breastfeeding (EBF), maternal nutrition rich in iron and leafy greens (doodo, nakati), safe hydration, and postnatal infection prevention.
            </p>
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-emerald-700 font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> 100% Exclusive EBF
              </span>
              <button onclick="openAiSideDrawer()" class="text-emerald-700 font-bold hover:underline cursor-pointer">Ask Nutrition AI →</button>
            </div>
          </div>
        </div>

      </div>

    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- 5. STREAMLINED USSD STRIP (*920#)                                         -->
  <!-- ========================================================================= -->'''

if old_features_section in idx_content and '4B. COMPLETE MATERNAL' not in idx_content:
    idx_content = idx_content.replace(old_features_section, three_stages_section, 1)
    print("Added 3-stage Maternal Continuum section to index.html.")

with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx_content)
print("Updated index.html successfully with Pregnant Mother, Baby, and Lactating Mother imagery.")

# =============================================================================
# 2. UPDATE frontend/index.html (Clinical Web Dashboard)
# =============================================================================
fe_path = r"C:\Users\Admin\BabyHealth-Guard\frontend\index.html"
with open(fe_path, "r", encoding="utf-8") as f:
    fe_content = f.read()

# In Maternal Health & Pregnancy Care Tracker (#view-maternal-care), add a visual banner with Pregnant Mother
old_maternal_intro = '''        <!-- Top Registry Context Bar & Global Quick Actions -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <h1 class="font-headline-xl text-headline-xl text-slate-900 tracking-tight">Maternal Health &amp; Pregnancy Care Tracker</h1>
            <p class="text-xs text-slate-500">Antenatal care registry, vital signs monitoring, and longitudinal patient inspections.</p>
          </div>'''

new_maternal_intro = '''        <!-- Top Registry Context Bar & Visual Card -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-cyan-500/30 shadow-md">
              <img src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=400&q=80" 
                   onerror="this.onerror=null; this.src='/assets/images/pregnant_mother.svg';" 
                   alt="Pregnant Mother Registry" 
                   class="w-full h-full object-cover">
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-cyan-100 text-[#0e7490] font-bold text-[10px] uppercase">Antenatal Care</span>
                <span class="text-xs text-slate-400">• Bwera Health Centre III</span>
              </div>
              <h1 class="font-bold text-lg text-slate-900 tracking-tight">Pregnant Mothers &amp; Antenatal Registry</h1>
              <p class="text-xs text-slate-500">Longitudinal gestation tracking, blood pressure triage, and fetal kicks monitoring.</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5">'''

if old_maternal_intro in fe_content and 'Pregnant Mothers &amp; Antenatal Registry' not in fe_content:
    fe_content = fe_content.replace(old_maternal_intro, new_maternal_intro, 1)
    print("Added Pregnant Mother visual banner to frontend/index.html.")

# In Baby Checks (#view-newborn-care), add Newborn Baby and Lactating Mother visual card
old_baby_intro = '''        <!-- View Title & Top Summary Bar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <h1 class="text-[24px] font-extrabold text-slate-900 tracking-tight">Baby Checks &amp; Newborn Growth Tracker</h1>
            <p class="text-xs text-slate-500">Postnatal home visits, temperature checks, APGAR scores, and early complication triage.</p>
          </div>'''

new_baby_intro = '''        <!-- View Title & Visual Showcase Card with Baby & Lactating Mother -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-18 h-18 rounded-2xl overflow-hidden shrink-0 border-2 border-indigo-500/30 shadow-sm">
              <img src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=400&q=80" 
                   onerror="this.onerror=null; this.src='/assets/images/healthy_baby.svg';" 
                   alt="Healthy Newborn Baby" 
                   class="w-full h-full object-cover">
            </div>
            <div>
              <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase">Newborn Health</span>
              <h3 class="font-bold text-sm text-slate-900 mt-1">Neonatal Growth &amp; Vitals</h3>
              <p class="text-xs text-slate-500">Birth weight, APGAR scores, and UNEPI vaccines.</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-4">
            <div class="w-18 h-18 rounded-2xl overflow-hidden shrink-0 border-2 border-emerald-500/30 shadow-sm">
              <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80" 
                   onerror="this.onerror=null; this.src='/assets/images/lactating_mother.svg';" 
                   alt="Lactating Mother Nursing" 
                   class="w-full h-full object-cover">
            </div>
            <div>
              <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Lactating Mother</span>
              <h3 class="font-bold text-sm text-slate-900 mt-1">Exclusive Breastfeeding &amp; Nutrition</h3>
              <p class="text-xs text-slate-500">Maternal hydration, iron pills &amp; kangaroo mother care.</p>
            </div>
          </div>
        </div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <h1 class="text-[22px] font-extrabold text-slate-900 tracking-tight">Baby Checks &amp; Newborn Growth Tracker</h1>
            <p class="text-xs text-slate-500">Postnatal home visits, temperature checks, APGAR scores, and early complication triage.</p>
          </div>'''

if old_baby_intro in fe_content and 'Newborn Health' not in fe_content:
    fe_content = fe_content.replace(old_baby_intro, new_baby_intro, 1)
    print("Added Baby & Lactating Mother visual cards to frontend/index.html.")

with open(fe_path, "w", encoding="utf-8") as f:
    f.write(fe_content)

# Sync to backend static
be_static = r"C:\Users\Admin\BabyHealth-Guard\backend\src\main\resources\static\index.html"
with open(be_static, "w", encoding="utf-8") as f:
    f.write(fe_content)
print("Synchronized to backend static.")

# =============================================================================
# 3. UPDATE mobile/dashboard_preview.html (Mother Dashboard)
# =============================================================================
dash_path = r"C:\Users\Admin\BabyHealth-Guard\mobile\dashboard_preview.html"
with open(dash_path, "r", encoding="utf-8") as f:
    dash_content = f.read()

# Replace pregnant avatar with authentic pregnant mother photo
old_avatar = 'src="https://lh3.googleusercontent.com/aida/ALJJyrB02uNzgSUFmyA16NdXCEdl86RHOVW_SV4uhcvcQVIo7BNtuvhGPopPUo0PpIzaDWxVmK3GOU_6UJ2Gt-HJXfp0Vn2pcetClnxxoNwiA4tRwlLoPWINdj5PQEJuc-R7CAS70KJxBYggnyirlfbSEPRl02scU-DsOyO8Muaz97pajK7fgWNuVlbvNOi2kZJMf_3mt6Z3U_MtH7VeZLSDAUMeJ21fSr4OpfU9mZwwfjv-Hw"'
new_avatar = 'src="https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=300&q=80" onerror="this.onerror=null; this.src=\'/assets/images/pregnant_mother.svg\';"'

if old_avatar in dash_content:
    dash_content = dash_content.replace(old_avatar, new_avatar, 1)
    print("Updated avatar in mobile/dashboard_preview.html to authentic pregnant mother.")

# Add visual Lactating Mother & Baby cards into the mobile dashboard feed
old_kick_card = '''  <!-- Active Baby Kicks Quick Logger Card -->'''
new_kick_card = '''  <!-- Lactation & Newborn Care Advisory Card -->
  <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-3.5">
    <div class="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-emerald-200 shadow-xs">
      <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80" 
           onerror="this.onerror=null; this.src='/assets/images/lactating_mother.svg';" 
           alt="Lactating Mother" 
           class="w-full h-full object-cover">
    </div>
    <div class="flex-1 min-w-0">
      <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">Lactating Mother Care</span>
      <h4 class="font-bold text-xs text-slate-800 leading-tight">Exclusive Breastfeeding &amp; Diet</h4>
      <p class="text-[11px] text-slate-500 mt-0.5 truncate">Doodo greens, hydration &amp; iron pills daily.</p>
    </div>
  </div>

  <!-- Active Baby Kicks Quick Logger Card -->'''

if old_kick_card in dash_content and 'Lactating Mother Care' not in dash_content:
    dash_content = dash_content.replace(old_kick_card, new_kick_card, 1)
    print("Added Lactating Mother Care card to mobile/dashboard_preview.html.")

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash_content)
print("Updated mobile/dashboard_preview.html successfully.")

print("All maternal images (Pregnant Mother, Baby, and Lactating Mother) integrated cleanly!")

