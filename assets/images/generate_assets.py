import os

assets_dir = r"C:\Users\Admin\BabyHealth-Guard\assets\images"
os.makedirs(assets_dir, exist_ok=True)

# 1. Mother & Newborn Hero SVG
hero_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#08232c"/>
      <stop offset="50%" stop-color="#0e7490"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8d5524"/>
      <stop offset="100%" stop-color="#5c3818"/>
    </linearGradient>
    <linearGradient id="wrapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="600" rx="36" fill="url(#bgGrad)"/>
  
  <!-- Subtle circular waves -->
  <circle cx="400" cy="340" r="280" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
  <circle cx="400" cy="340" r="200" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-dasharray="6 8"/>
  <circle cx="400" cy="340" r="120" fill="none" stroke="rgba(20,184,166,0.3)" stroke-width="3"/>

  <!-- Mother Stylized Silhouette & Warm Aura -->
  <ellipse cx="400" cy="520" rx="220" ry="160" fill="url(#wrapGrad)" opacity="0.9"/>
  
  <!-- Mother Torso & Head -->
  <circle cx="400" cy="220" r="70" fill="url(#skinGrad)"/>
  <!-- Hair Bun / Headwrap -->
  <ellipse cx="400" cy="170" rx="65" ry="45" fill="#1e1b4b"/>
  <ellipse cx="370" cy="160" rx="25" ry="20" fill="#d97706"/>
  <ellipse cx="430" cy="160" rx="25" ry="20" fill="#059669"/>
  <!-- Gentle smiling expression -->
  <path d="M 385 240 Q 400 252 415 240" stroke="#3e2723" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="380" cy="225" r="4" fill="#3e2723"/>
  <circle cx="420" cy="225" r="4" fill="#3e2723"/>
  
  <!-- Baby in Arms -->
  <ellipse cx="430" cy="370" rx="60" ry="45" fill="url(#skinGrad)" transform="rotate(-15 430 370)"/>
  <circle cx="460" cy="345" r="32" fill="url(#skinGrad)"/>
  <!-- Baby Swaddle Wrap -->
  <ellipse cx="415" cy="385" rx="75" ry="55" fill="#fef08a" opacity="0.9"/>
  <!-- Baby cute closed eyes -->
  <path d="M 452 346 Q 460 352 468 346" stroke="#3e2723" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  
  <!-- Protective Loving Arms -->
  <path d="M 330 320 Q 340 420 440 430" stroke="url(#skinGrad)" stroke-width="32" fill="none" stroke-linecap="round"/>
  <path d="M 470 300 Q 490 380 430 420" stroke="url(#skinGrad)" stroke-width="26" fill="none" stroke-linecap="round"/>

  <!-- Heartbeat ECG line -->
  <path d="M 80 470 L 220 470 L 240 430 L 260 510 L 280 450 L 300 470 L 720 470" fill="none" stroke="#10b981" stroke-width="3.5" opacity="0.7"/>

  <!-- Floating Glass Card 1: Maternal Vitals -->
  <g transform="translate(45, 60)" filter="url(#glow)">
    <rect width="245" height="95" rx="20" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
    <circle cx="36" cy="38" r="18" fill="#10b981"/>
    <path d="M 29 38 L 34 43 L 44 33" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="66" y="34" font-family="sans-serif" font-size="11" font-weight="bold" fill="#a7f3d0" letter-spacing="1">MATERNAL STATUS</text>
    <text x="66" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">BP 118/76 mmHg</text>
    <text x="66" y="73" font-family="sans-serif" font-size="11" fill="#6ee7b7">● Normal &amp; Healthy</text>
  </g>

  <!-- Floating Glass Card 2: Baby Kicks -->
  <g transform="translate(510, 60)" filter="url(#glow)">
    <rect width="245" height="95" rx="20" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
    <circle cx="36" cy="38" r="18" fill="#06b6d4"/>
    <text x="36" y="44" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">👶</text>
    <text x="66" y="34" font-family="sans-serif" font-size="11" font-weight="bold" fill="#a5f3fc" letter-spacing="1">FETAL ACTIVITY</text>
    <text x="66" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">11 Kicks / 2 Hours</text>
    <text x="66" y="73" font-family="sans-serif" font-size="11" fill="#67e8f9">● Active Movement Recorded</text>
  </g>

  <!-- Floating Glass Card 3: ANC Scheduled -->
  <g transform="translate(510, 440)" filter="url(#glow)">
    <rect width="245" height="95" rx="20" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
    <circle cx="36" cy="38" r="18" fill="#f59e0b"/>
    <text x="36" y="44" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">🏥</text>
    <text x="66" y="34" font-family="sans-serif" font-size="11" font-weight="bold" fill="#fde68a" letter-spacing="1">NEXT APPOINTMENT</text>
    <text x="66" y="55" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffffff">ANC Visit 3 • 28 Weeks</text>
    <text x="66" y="73" font-family="sans-serif" font-size="11" fill="#fcd34d">SMS Reminder Scheduled</text>
  </g>

  <!-- Floating Badge: 10 Ugandan Languages -->
  <g transform="translate(45, 440)" filter="url(#glow)">
    <rect width="245" height="95" rx="20" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
    <circle cx="36" cy="38" r="18" fill="#8b5cf6"/>
    <text x="36" y="44" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">🗣️</text>
    <text x="66" y="34" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ddd6fe" letter-spacing="1">VOICE &amp; CHATBOT</text>
    <text x="66" y="55" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffffff">10 Ugandan Languages</text>
    <text x="66" y="73" font-family="sans-serif" font-size="11" fill="#c4b5fd">Audio Spoken Advice Included</text>
  </g>
</svg>'''

with open(os.path.join(assets_dir, 'mother_baby_hero.svg'), 'w', encoding='utf-8') as f:
    f.write(hero_svg)

# 2. Antenatal Care Visual Card
anc_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <linearGradient id="ancBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="24" fill="url(#ancBg)"/>
  <circle cx="500" cy="100" r="150" fill="rgba(255,255,255,0.05)"/>
  <!-- Ultrasound monitor mockup -->
  <rect x="60" y="80" width="260" height="180" rx="16" fill="#08232c" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 80 170 Q 130 110 180 170 T 280 170" fill="none" stroke="#22d3ee" stroke-width="3"/>
  <circle cx="180" cy="160" r="30" fill="none" stroke="#a5f3fc" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="80" y="110" font-family="sans-serif" font-size="12" fill="#7dd3fc" font-weight="bold">ULTRASOUND SCAN • 28 WEEKS</text>
  <text x="80" y="240" font-family="sans-serif" font-size="11" fill="#38bdf8">Fetal Heart Rate: 142 bpm (Normal)</text>
  
  <!-- Midwife Notes & Stats Card -->
  <rect x="300" y="140" width="240" height="180" rx="16" fill="rgba(255,255,255,0.95)" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.2))"/>
  <text x="320" y="175" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">CLINIC EXAMINATION</text>
  <text x="320" y="205" font-family="sans-serif" font-size="11" fill="#475569">Fundal Height: 28 cm</text>
  <text x="320" y="230" font-family="sans-serif" font-size="11" fill="#475569">Blood Pressure: 118/76 mmHg</text>
  <text x="320" y="255" font-family="sans-serif" font-size="11" fill="#475569">Hemoglobin: 12.1 g/dL</text>
  <rect x="320" y="275" width="110" height="24" rx="6" fill="#ecfdf5"/>
  <text x="330" y="291" font-family="sans-serif" font-size="10" font-weight="bold" fill="#059669">ANC Visit 2 Passed</text>
</svg>'''

with open(os.path.join(assets_dir, 'anc_clinic.svg'), 'w', encoding='utf-8') as f:
    f.write(anc_svg)

# 3. Community Outreach & VHT SVG
vht_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <linearGradient id="vhtBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="24" fill="url(#vhtBg)"/>
  <!-- Village scenery silhouette -->
  <path d="M 0 350 Q 150 300 300 330 T 600 320 L 600 400 L 0 400 Z" fill="#022c22"/>
  <circle cx="480" cy="90" r="50" fill="#fef08a" opacity="0.3"/>
  <!-- VHT Worker Tablet Card -->
  <rect x="70" y="70" width="220" height="240" rx="20" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
  <rect x="85" y="90" width="190" height="180" rx="10" fill="#0f172a"/>
  <text x="100" y="115" font-family="sans-serif" font-size="11" font-weight="bold" fill="#6ee7b7">OFFLINE MOBILE APP</text>
  <text x="100" y="135" font-family="sans-serif" font-size="10" fill="#94a3b8">Bwera Sub-county Outreach</text>
  <rect x="100" y="150" width="160" height="28" rx="6" fill="#1e293b"/>
  <text x="110" y="168" font-family="sans-serif" font-size="10" fill="#e2e8f0">42 Mothers Screened</text>
  <rect x="100" y="185" width="160" height="28" rx="6" fill="#1e293b"/>
  <text x="110" y="203" font-family="sans-serif" font-size="10" fill="#e2e8f0">0 Danger Signs Flagged</text>
  <rect x="100" y="220" width="160" height="28" rx="6" fill="#10b981"/>
  <text x="120" y="238" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff">Sync When In Range</text>

  <!-- 2G USSD Phone beside it -->
  <rect x="330" y="90" width="180" height="220" rx="24" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
  <rect x="345" y="105" width="150" height="90" rx="8" fill="#1e293b"/>
  <text x="355" y="125" font-family="monospace" font-size="9" fill="#34d399">*920# BABYHEALTH</text>
  <text x="355" y="142" font-family="monospace" font-size="8" fill="#cbd5e1">1. Register Mother</text>
  <text x="355" y="157" font-family="monospace" font-size="8" fill="#cbd5e1">2. Today's Checkin</text>
  <text x="355" y="172" font-family="monospace" font-size="8" fill="#cbd5e1">3. Next ANC Date</text>
  <text x="355" y="187" font-family="monospace" font-size="8" fill="#ef4444">4. Danger Signs</text>
  <!-- Buttons -->
  <circle cx="370" cy="220" r="8" fill="#334155"/>
  <circle cx="420" cy="220" r="8" fill="#334155"/>
  <circle cx="470" cy="220" r="8" fill="#334155"/>
  <circle cx="370" cy="245" r="8" fill="#334155"/>
  <circle cx="420" cy="245" r="8" fill="#334155"/>
  <circle cx="470" cy="245" r="8" fill="#334155"/>
</svg>'''

with open(os.path.join(assets_dir, 'vht_community.svg'), 'w', encoding='utf-8') as f:
    f.write(vht_svg)

# 4. Safe Newborn Care SVG
newborn_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  <defs>
    <linearGradient id="nbBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="24" fill="url(#nbBg)"/>
  <circle cx="100" cy="80" r="120" fill="rgba(255,255,255,0.06)"/>
  
  <!-- Newborn Bassinet -->
  <rect x="70" y="100" width="250" height="200" rx="28" fill="#f8fafc" filter="drop-shadow(0 15px 25px rgba(0,0,0,0.3))"/>
  <ellipse cx="195" cy="180" rx="80" ry="50" fill="#fef08a"/>
  <!-- Baby Head -->
  <circle cx="160" cy="170" r="28" fill="#8d5524"/>
  <!-- Swaddle wrap -->
  <ellipse cx="210" cy="185" rx="55" ry="35" fill="#fbcfe8"/>
  <path d="M 152 170 Q 158 175 164 170" stroke="#3e2723" stroke-width="2" fill="none"/>
  
  <rect x="90" y="240" width="210" height="40" rx="10" fill="#f1f5f9"/>
  <text x="105" y="265" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a">Baby Amina • Birth Wt: 3.4 kg</text>

  <!-- Immunization Timeline Card -->
  <rect x="340" y="80" width="200" height="230" rx="18" fill="rgba(255,255,255,0.95)" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.2))"/>
  <text x="360" y="115" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e1b4b">IMMUNIZATION RECORD</text>
  
  <circle cx="365" cy="145" r="7" fill="#10b981"/>
  <text x="382" y="149" font-family="sans-serif" font-size="11" fill="#334155">BCG Vaccine (Done)</text>
  
  <circle cx="365" cy="180" r="7" fill="#10b981"/>
  <text x="382" y="184" font-family="sans-serif" font-size="11" fill="#334155">Polio 0 (Done)</text>
  
  <circle cx="365" cy="215" r="7" fill="#f59e0b"/>
  <text x="382" y="219" font-family="sans-serif" font-size="11" fill="#334155">6-Week DTP (Due)</text>
  
  <circle cx="365" cy="250" r="7" fill="#94a3b8"/>
  <text x="382" y="254" font-family="sans-serif" font-size="11" fill="#64748b">10-Week Pentavalent</text>
  
  <rect x="360" y="275" width="160" height="22" rx="6" fill="#ede9fe"/>
  <text x="375" y="290" font-family="sans-serif" font-size="9" font-weight="bold" fill="#6d28d9">Next SMS Scheduled</text>
</svg>'''

with open(os.path.join(assets_dir, 'newborn_care.svg'), 'w', encoding='utf-8') as f:
    f.write(newborn_svg)

print("Generated 4 SVG graphical assets in assets/images/")

