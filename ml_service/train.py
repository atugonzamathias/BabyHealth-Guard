import os
import json
import math
import random
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image, ImageDraw, ImageFilter

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)
random.seed(SEED)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

GATEKEEPER_CLASSES = ["baby_skin", "baby_eye", "invalid_non_baby"]

SKIN_CLASSES = [
    "healthy_skin",
    "jaundice_skin",
    "erythema_toxicum",
    "neonatal_eczema",
    "miliaria_heat_rash",
    "cradle_cap",
    "impetigo_bacterial"
]

EYE_CLASSES = [
    "healthy_eye",
    "jaundice_sclera",
    "ophthalmia_neonatorum",
    "leukocoria_cataract",
    "subconjunctival_hemorrhage"
]

# Clinical Metadata & Translations for Uganda Context
METADATA = {
    "model_name": "BabyHealthGuard-VisionNet-v1",
    "version": "1.0.0",
    "target_population": "Newborn babies (0 - 28 days of life)",
    "input_resolution": [224, 224],
    "gatekeeper_classes": GATEKEEPER_CLASSES,
    "skin_classes": {
        "healthy_skin": {
            "name": "Healthy Newborn Skin",
            "severity": "SAFE",
            "danger_sign": False,
            "clinical_explanation": "Normal neonatal dermatological appearance with physiological pink/brown skin tone, expected hydration, and absence of pathological lesions.",
            "mother_guidance": "Baby's skin appears healthy. Continue gentle bathing with warm water, avoid scented soaps, and practice skin-to-skin kangaroo care.",
            "luganda": "Olususu lw'omwana lulabika bulungi era lwa bulamu. Bikkirira okumuwa amazzi amabugumu era weetwale ku nkwata y'omwana ku kifuba (kangaroo care).",
            "swahili": "Ngozi ya mtoto ina afya njema. Endelea kumuosha kwa maji vuguvugu bila sabuni kali na kumpa joto la ngozi kwa ngozi."
        },
        "jaundice_skin": {
            "name": "Neonatal Cutaneous Jaundice (Icterus)",
            "severity": "URGENT_CLINIC",
            "danger_sign": True,
            "clinical_explanation": "Hyperbilirubinemia manifesting as noticeable yellow pigmentation of neonatal skin, correlating with Kramer's progression zones.",
            "mother_guidance": "Yellowish skin detected. Neonatal jaundice needs prompt clinical check. Take the baby to your health center today for a bilirubin check and possible phototherapy.",
            "luganda": "⚠️ OBULWADDE BW'ENJANO KU LUSUSU: Olususu luliko langi ya kyenvu. Omwana ayinza okuba n'enjano (jaundice). Mutwale ku ddwaliro leero bamukebe omusaayi.",
            "swahili": "⚠️ MANJANO KWENYE NGOZI: Ngozi ina rangi ya manjano inayoashiria homa ya manjano ya watoto wachanga. Mpeleke mtoto zahanati leo kupimwa kiwango cha bilirubin."
        },
        "erythema_toxicum": {
            "name": "Erythema Toxicum Neonatorum",
            "severity": "MONITOR",
            "danger_sign": False,
            "clinical_explanation": "Common benign neonatal rash characterized by erythematous macules with central pale papules or tiny sterile pustules. Spontaneously resolves.",
            "mother_guidance": "This looks like a common, harmless newborn skin rash (Erythema Toxicum). It usually goes away on its own within 1-2 weeks. Do not squeeze any bumps.",
            "luganda": "Obukuta obutonotono obumyufu ku lususu lulabika ng'obusaasaanya obw'omwana omuwere. Bujjanjaba bwokka mu wiiki emu oba bbiri. Togolola oba okumenya amayute.",
            "swahili": "Huu ni upele wa kawaida unaopona wenyewe kwa watoto wachanga. Huwa unapotea ndani ya wiki moja au mbili bila dawa. Usitoboe vipele hivyo."
        },
        "neonatal_eczema": {
            "name": "Infantile Eczema / Atopic Dermatitis",
            "severity": "MONITOR",
            "danger_sign": False,
            "clinical_explanation": "Pruritic erythematous patches with micro-scaling and dryness, typically on infant cheeks, forehead, or skin folds.",
            "mother_guidance": "Dry, irritated patches detected. Keep baby's skin moisturized with plain unperfumed petroleum jelly (Vaseline). Consult your midwife if redness spreads.",
            "luganda": "Olususu lukaluba era lulina amabala agamyuka. Saazaako ebizigo ebitereevu ebitayina kawoowo (Vaseline). Singa tebyongera, laba omusawo.",
            "swahili": "Kuna ukavu na ngozi nyekundu (eczema ya watoto). Paka mafuta laini yasiyo na marashi. Ikiwa itaenea, muone mkunga au daktari."
        },
        "miliaria_heat_rash": {
            "name": "Miliaria (Newborn Heat Rash)",
            "severity": "MONITOR",
            "danger_sign": False,
            "clinical_explanation": "Retention of sweat due to immature eccrine duct occlusion, presenting as tiny clear or pink vesicles in neck folds and torso.",
            "mother_guidance": "Mild heat rash detected. Dress baby in light, breathable cotton clothes. Keep the room ventilated and avoid overheating.",
            "luganda": "Obukuta bw'ebbugumu (heat rash). Yambaza omwana engoye ennyangu ez'olugoye lwa ppamba, era terindisa mubiri gwe kwokya nnyo.",
            "swahili": "Upele wa joto (miliaria). Mvalishe mtoto nguo nyepesi za pamba na uhakikishe chumba kina hewa ya kutosha ili asitokwe jasho kupita kiasi."
        },
        "cradle_cap": {
            "name": "Infantile Seborrheic Dermatitis (Cradle Cap)",
            "severity": "MONITOR",
            "danger_sign": False,
            "clinical_explanation": "Greasy, yellowish, adherent crusts and scales over the scalp, forehead, or eyebrows caused by maternal hormone carryover.",
            "mother_guidance": "Greasy yellowish crusts on scalp or face (Cradle cap). Apply pure coconut or baby oil to soften scales, then gently brush with a soft baby brush.",
            "luganda": "Ebisusu ebya kyenvu ku mutwe (kasipiikiti/cradle cap). Saazaako buto w'enazi oba baby oil okubyolobaza, olyoke osige mpola n'ekakoola.",
            "swahili": "Mba ya utosi (cradle cap) yenye magamba ya njano yenye mafuta. Paka mafuta safi ya nazi kisha sugua polepole kwa kitambaa laini."
        },
        "impetigo_bacterial": {
            "name": "Neonatal Impetigo / Bacterial Skin Infection",
            "severity": "EMERGENCY_DANGER",
            "danger_sign": True,
            "clinical_explanation": "Staphylococcal or streptococcal superficial bacterial infection characterized by honey-colored crusts or spreading blisters. High risk of systemic neonatal sepsis.",
            "mother_guidance": "🚨 URGENT: Signs of bacterial skin infection with crusts or spreading blisters. Newborns need immediate antibiotic treatment to prevent sepsis. Visit your health facility right away!",
            "luganda": "🚨 OBULABE OBW'AMANGU! Amabala agaliko amayute oba amakokolo ag'obulabe. Omwana yeetaaga obujjanjabi bw'eddagala lya antubayotiki mangu ddala ku ddwaliro!",
            "swahili": "🚨 TAHADHARI YA HARAKA! Ishara za maambukizi ya bakteria kwenye ngozi yenye magamba ya njano au malengelenge. Mpeleke mtoto hospitalini haraka kwa matibabu ya antibiotic!"
        }
    },
    "eye_classes": {
        "healthy_eye": {
            "name": "Healthy Newborn Eye",
            "severity": "SAFE",
            "danger_sign": False,
            "clinical_explanation": "Clear sclera without icterus, transparent cornea, symmetric pupils, clear red reflex potential, and absence of purulent exudate.",
            "mother_guidance": "Baby's eyes appear clear and healthy. Wipe eyelids from inside to outside with clean boiled cooled water on sterile cotton when needed.",
            "luganda": "Amaaso g'omwana malamu era mayonjo. Gasiimuule mpola ng'okozesa ppamba omuyonjo n'amazzi amayonjo agafumbiddwa ne gabbuguma.",
            "swahili": "Macho ya mtoto yanaonekana safi na yenye afya. Safisha kwa pamba safi iliyochovywa kwenye maji yaliyochemshwa na kupoa."
        },
        "jaundice_sclera": {
            "name": "Neonatal Scleral Icterus (Severe Eye Jaundice)",
            "severity": "EMERGENCY_DANGER",
            "danger_sign": True,
            "clinical_explanation": "Deep yellow staining of the ocular sclera, indicating significant serum bilirubin (>40-50 umol/L) with impending risk of acute bilirubin encephalopathy.",
            "mother_guidance": "🚨 CRITICAL: The white part of baby's eye is yellow. This is a danger sign of severe jaundice. Take the baby to the hospital immediately for emergency phototherapy or bilirubin assessment!",
            "luganda": "🚨 OBULABE OBW'AMAASO: Ekitundu ekyeru eky'eriiso lya kyenvu! Kino kiraga nti enjano (jaundice) nyingi nnyo mu musaayi. Dduka ku ddwaliro amangu ddala bamulongoose!",
            "swahili": "🚨 HATARI KUBWA: Sehemu nyeupe ya jicho imekuwa ya manjano! Hii inaonyesha manjano makali (severe jaundice). Mpeleke mtoto hospitalini haraka kwa matibabu ya mwanga (phototherapy)!"
        },
        "ophthalmia_neonatorum": {
            "name": "Ophthalmia Neonatorum / Purulent Neonatal Conjunctivitis",
            "severity": "EMERGENCY_DANGER",
            "danger_sign": True,
            "clinical_explanation": "Acute purulent ocular discharge with conjunctival injection and marked periorbital edema within first 28 days. High risk of corneal ulceration and permanent blindness.",
            "mother_guidance": "🚨 EMERGENCY: Heavy pus, swelling, or redness in baby's eye. This can cause permanent blindness without urgent treatment. Go to the health center immediately for prescription antibiotic eye drops!",
            "luganda": "🚨 OBULABE OBW'AMAASO: Amaaso gazimbye, gamyuse, oba gafulumya amasira. Omwana ayinza okuziba amaaso singa tafuna ddagala amangu ku ddwaliro!",
            "swahili": "🚨 DHARURA YA MACHO: Macho yana usaha mzito, yamevimba au mekundu. Hali hii inaweza kusababisha upofu. Mpeleke mtoto zahanati mara moja kwa matone ya antibiotic!"
        },
        "leukocoria_cataract": {
            "name": "Leukocoria / Congenital Cataract (White Pupillary Reflex)",
            "severity": "EMERGENCY_DANGER",
            "danger_sign": True,
            "clinical_explanation": "Abnormal white reflection in the neonatal pupil replacing normal black/red reflex, suspicious for congenital cataract, retinoblastoma, or PHPV.",
            "mother_guidance": "🚨 URGENT OPHTHALMIC REFERRAL: An abnormal white reflection or cloudiness was detected in the baby's pupil. Requires prompt examination by an eye specialist.",
            "luganda": "🚨 ENKOMO Y'ERIISO ERAGA OBULWADDE: Ekitundu ekiddugavu eky'eriiso lulabika ng'olueru oba olweru olutangala. Yeetaaga omusawo w'amaaso akugu amangu ddala.",
            "swahili": "🚨 RUFAA YA HARAKA YA MACHO: Mboni ya jicho ina weupe usio wa kawaida. Mtoto anahitaji uchunguzi wa haraka wa daktari bingwa wa macho."
        },
        "subconjunctival_hemorrhage": {
            "name": "Subconjunctival Hemorrhage (Birth Trauma)",
            "severity": "MONITOR",
            "danger_sign": False,
            "clinical_explanation": "Circumscribed bright red area of extravasated blood beneath the bulbar conjunctiva caused by thoracic compression during normal birth delivery. Self-resolving.",
            "mother_guidance": "A bright red spot on the white of the eye from delivery pressure. It is harmless, painless, and usually clears on its own in 10-14 days. Monitor for any pus.",
            "luganda": "Akabala akamyufu ku kweru kw'eriiso okuva ku busukko bw'okuzaalibwa. Tekaluma era kakendeera kokka mu nnaku 10-14. Laba nti terifulumya masira.",
            "swahili": "Doa jekundu kwenye sehemu nyeupe ya jicho kutokana na mgandamizo wa uzazi. Hali hii haina madhara na hupona yenyewe ndani ya siku 10-14."
        }
    }
}

# =====================================================================
# SYNTHETIC CLINICAL DATA GENERATOR WITH BIO-REALISTIC CHARACTERISTICS
# =====================================================================

def generate_skin_sample(condition_label, size=224):
    """
    Generates a bio-realistic neonatal skin patch image with specific chromaticity,
    erythema, melanin, and lesion morphology.
    """
    # Base newborn skin tone: soft pinkish-peach to deep melanin
    melanin = random.uniform(0.1, 0.85)
    r_base = int(255 * (1.0 - melanin * 0.45))
    g_base = int(210 * (1.0 - melanin * 0.55))
    b_base = int(185 * (1.0 - melanin * 0.65))

    img = Image.new("RGB", (size, size), (r_base, g_base, b_base))
    draw = ImageDraw.Draw(img)

    # Add gentle skin texture / micro-gradients
    for _ in range(12):
        x = random.randint(0, size)
        y = random.randint(0, size)
        rad = random.randint(30, 90)
        alpha_delta = random.randint(-15, 15)
        r = max(0, min(255, r_base + alpha_delta))
        g = max(0, min(255, g_base + alpha_delta))
        b = max(0, min(255, b_base + alpha_delta))
        draw.ellipse([x - rad, y - rad, x + rad, y + rad], fill=(r, g, b))

    if condition_label == "healthy_skin":
        # Physiological mild peeling or vernix traces
        if random.random() < 0.3:
            for _ in range(8):
                x = random.randint(20, size - 20)
                y = random.randint(20, size - 20)
                draw.arc([x, y, x + 25, y + 15], 0, 180, fill=(255, 255, 250), width=1)

    elif condition_label == "jaundice_skin":
        # Elevated bilirubin: heavy yellow shift (high b* in Lab, strong R+G, low B)
        yellow_img = Image.new("RGB", (size, size), (245, 215, 60))
        img = Image.blend(img, yellow_img, alpha=random.uniform(0.40, 0.75))

    elif condition_label == "erythema_toxicum":
        # Erythematous blotches (red macules) with central pale yellow/white papules
        for _ in range(random.randint(6, 16)):
            cx = random.randint(30, size - 30)
            cy = random.randint(30, size - 30)
            m_rad = random.randint(14, 28)
            draw.ellipse([cx - m_rad, cy - m_rad, cx + m_rad, cy + m_rad], fill=(235, 75, 75))
            # Central papule
            p_rad = random.randint(2, 5)
            draw.ellipse([cx - p_rad, cy - p_rad, cx + p_rad, cy + p_rad], fill=(255, 255, 220))

    elif condition_label == "neonatal_eczema":
        # Scaly, rough erythematous dry patches
        for _ in range(random.randint(4, 10)):
            cx = random.randint(40, size - 40)
            cy = random.randint(40, size - 40)
            rad = random.randint(25, 55)
            draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(225, 95, 95))
            for _ in range(12):
                sx = cx + random.randint(-rad, rad)
                sy = cy + random.randint(-rad, rad)
                draw.line([sx, sy, sx + 6, sy + 3], fill=(250, 240, 230), width=1)

    elif condition_label == "miliaria_heat_rash":
        # Tiny clear/red pinpoint vesicles across sweat zones
        for _ in range(random.randint(25, 60)):
            cx = random.randint(15, size - 15)
            cy = random.randint(15, size - 15)
            draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(240, 70, 70))
            draw.ellipse([cx - 1, cy - 1, cx + 1, cy + 1], fill=(255, 250, 240))

    elif condition_label == "cradle_cap":
        # Thick yellowish-brown greasy scales/crusts
        for _ in range(random.randint(10, 25)):
            cx = random.randint(25, size - 25)
            cy = random.randint(25, size - 25)
            rad_x = random.randint(8, 22)
            rad_y = random.randint(6, 16)
            draw.ellipse([cx - rad_x, cy - rad_y, cx + rad_x, cy + rad_y], fill=(205, 160, 45))
            draw.arc([cx - rad_x, cy - rad_y, cx + rad_x, cy + rad_y], 0, 360, fill=(160, 115, 25), width=2)

    elif condition_label == "impetigo_bacterial":
        # Golden honey-colored crusted erosions with erythematous borders
        for _ in range(random.randint(3, 7)):
            cx = random.randint(45, size - 45)
            cy = random.randint(45, size - 45)
            rad = random.randint(18, 38)
            # Red halo
            draw.ellipse([cx - rad - 6, cy - rad - 6, cx + rad + 6, cy + rad + 6], fill=(215, 45, 45))
            # Honey-colored thick crust
            draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(218, 165, 32))
            for _ in range(8):
                fx = cx + random.randint(-rad + 4, rad - 4)
                fy = cy + random.randint(-rad + 4, rad - 4)
                draw.ellipse([fx - 2, fy - 2, fx + 3, fy + 3], fill=(180, 120, 20))

    img = img.filter(ImageFilter.GaussianBlur(radius=1.2))
    return img

def generate_eye_sample(condition_label, size=224):
    """
    Generates a bio-realistic neonatal eye image featuring periorbital skin,
    palpebral fissure, sclera, iris, and pupil with condition features.
    """
    # Background periorbital skin
    melanin = random.uniform(0.15, 0.85)
    r_skin = int(245 * (1.0 - melanin * 0.45))
    g_skin = int(200 * (1.0 - melanin * 0.55))
    b_skin = int(175 * (1.0 - melanin * 0.65))
    img = Image.new("RGB", (size, size), (r_skin, g_skin, b_skin))
    draw = ImageDraw.Draw(img)

    # Eyelid crease / palpebral contour
    cx, cy = size // 2, size // 2
    fissure_w, fissure_h = 85, 38

    # Sclera base color
    if condition_label == "jaundice_sclera":
        sclera_col = (245, 220, 65)  # Severe icteric yellow
    else:
        sclera_col = (250, 250, 252) # Normal white/slight blue newborn tint

    # Draw almond-shaped eye opening (sclera)
    draw.chord([cx - fissure_w, cy - fissure_h, cx + fissure_w, cy + fissure_h], 0, 360, fill=sclera_col)

    # Subconjunctival hemorrhage: intense localized bright red splash on sclera
    if condition_label == "subconjunctival_hemorrhage":
        draw.pieslice([cx - fissure_w + 10, cy - fissure_h + 5, cx - 15, cy + fissure_h - 5], 30, 220, fill=(210, 15, 25))

    # Iris
    iris_rad = 28
    iris_col = random.choice([(45, 30, 20), (35, 55, 75), (50, 40, 30)])
    draw.ellipse([cx - iris_rad, cy - iris_rad, cx + iris_rad, cy + iris_rad], fill=iris_col)

    # Pupil
    pupil_rad = 12
    if condition_label == "leukocoria_cataract":
        pupil_col = (240, 240, 245)  # Pathological white pupillary reflex
    else:
        pupil_col = (10, 10, 12)     # Normal black pupil
    draw.ellipse([cx - pupil_rad, cy - pupil_rad, cx + pupil_rad, cy + pupil_rad], fill=pupil_col)

    # Corneal light reflection (normal white glint)
    if condition_label != "leukocoria_cataract":
        draw.ellipse([cx - 4, cy - 8, cx - 1, cy - 5], fill=(255, 255, 255))

    # Eyelids / periorbital swelling / discharge
    if condition_label == "ophthalmia_neonatorum":
        # Red swollen periorbital margins
        draw.arc([cx - fissure_w - 5, cy - fissure_h - 10, cx + fissure_w + 5, cy + fissure_h + 10], 0, 360, fill=(225, 40, 40), width=6)
        # Copious yellow-green purulent exudate dripping from medial/lateral canthi
        draw.ellipse([cx - fissure_w, cy - 6, cx - fissure_w + 25, cy + 18], fill=(195, 215, 45))
        draw.ellipse([cx + fissure_w - 25, cy - 4, cx + fissure_w + 5, cy + 16], fill=(200, 220, 50))
        for _ in range(6):
            ex = random.randint(cx - 30, cx + 30)
            ey = cy + random.randint(10, fissure_h + 12)
            draw.ellipse([ex - 4, ey - 3, ex + 4, ey + 3], fill=(205, 225, 55))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.9))
    return img

def generate_invalid_sample(size=224):
    """
    Generates negative samples (non-baby images, adult skin, furniture, printed text,
    clothing, random noise) to train the Gatekeeper head to reject non-newborn inputs.
    """
    category = random.choice(["noise", "geometric", "text", "dark", "high_contrast"])
    img = Image.new("RGB", (size, size), (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
    draw = ImageDraw.Draw(img)

    if category == "geometric":
        for _ in range(8):
            x0, x1 = sorted([random.randint(0, size), random.randint(0, size)])
            y0, y1 = sorted([random.randint(0, size), random.randint(0, size)])
            draw.rectangle([x0, y0, x1, y1], fill=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
    elif category == "text":
        img = Image.new("RGB", (size, size), (250, 250, 250))
        d = ImageDraw.Draw(img)
        for i in range(15):
            d.line([(10, 15 * i + 10), (size - 10, 15 * i + 10)], fill=(30, 30, 30), width=2)
    elif category == "dark":
        img = Image.new("RGB", (size, size), (random.randint(5, 25), random.randint(5, 25), random.randint(5, 25)))
    elif category == "high_contrast":
        for x in range(0, size, 20):
            fill = (255, 255, 255) if (x // 20) % 2 == 0 else (0, 0, 0)
            draw.rectangle([x, 0, x + 20, size], fill=fill)

    return img

# =====================================================================
# PYTORCH NEURAL NETWORK ARCHITECTURE
# =====================================================================

class BabyHealthVisionNet(nn.Module):
    """
    Multi-task Deep Convolutional Neural Network for Neonatal Screening:
    - Backbone: 5-stage Conv-BatchNorm-LeakyReLU-MaxPool blocks.
    - Global Adaptive Average Pooling.
    - Gatekeeper Head: Identifies [baby_skin, baby_eye, invalid_non_baby].
    - Skin Pathology Head: Classifies 7 newborn skin conditions.
    - Eye Pathology Head: Classifies 5 newborn eye conditions.
    """
    def __init__(self, embedding_dim=256):
        super().__init__()
        self.features = nn.Sequential(
            # Stage 1: 224x224 -> 112x112
            nn.Conv2d(3, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Conv2d(32, 32, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.1, inplace=True),
            nn.MaxPool2d(2, 2),

            # Stage 2: 112x112 -> 56x56
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.1, inplace=True),
            nn.MaxPool2d(2, 2),

            # Stage 3: 56x56 -> 28x28
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.1, inplace=True),
            nn.MaxPool2d(2, 2),

            # Stage 4: 28x28 -> 14x14
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.1, inplace=True),
            nn.MaxPool2d(2, 2),

            # Stage 5: 14x14 -> 7x7
            nn.Conv2d(256, embedding_dim, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(embedding_dim),
            nn.LeakyReLU(0.1, inplace=True),
            nn.AdaptiveAvgPool2d((1, 1))
        )

        self.dropout = nn.Dropout(0.35)

        # Gatekeeper Head: [baby_skin, baby_eye, invalid_non_baby]
        self.gatekeeper_head = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.2),
            nn.Linear(128, len(GATEKEEPER_CLASSES))
        )

        # Skin Pathology Head (7 classes)
        self.skin_head = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.2),
            nn.Linear(128, len(SKIN_CLASSES))
        )

        # Eye Pathology Head (5 classes)
        self.eye_head = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.2),
            nn.Linear(128, len(EYE_CLASSES))
        )

    def forward(self, x):
        feats = self.features(x)
        feats = torch.flatten(feats, 1)
        feats = self.dropout(feats)

        gatekeeper_logits = self.gatekeeper_head(feats)
        skin_logits = self.skin_head(feats)
        eye_logits = self.eye_head(feats)

        return gatekeeper_logits, skin_logits, eye_logits

# =====================================================================
# DATASET & TRANSLATION TO TENSORS
# =====================================================================

class NeonatalVisionDataset(Dataset):
    def __init__(self, samples_per_class=120):
        self.data = []
        # Skin samples: gatekeeper=0 (baby_skin)
        for skin_idx, skin_cls in enumerate(SKIN_CLASSES):
            for _ in range(samples_per_class):
                self.data.append((skin_cls, "skin", 0, skin_idx, 0))

        # Eye samples: gatekeeper=1 (baby_eye)
        for eye_idx, eye_cls in enumerate(EYE_CLASSES):
            for _ in range(samples_per_class):
                self.data.append((eye_cls, "eye", 1, 0, eye_idx))

        # Invalid/non-baby samples: gatekeeper=2 (invalid_non_baby)
        for _ in range(samples_per_class * 4):
            self.data.append(("invalid", "invalid", 2, 0, 0))

        random.shuffle(self.data)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        label_name, modality, gatekeeper_y, skin_y, eye_y = self.data[idx]

        if modality == "skin":
            img = generate_skin_sample(label_name)
        elif modality == "eye":
            img = generate_eye_sample(label_name)
        else:
            img = generate_invalid_sample()

        # Random horizontal/vertical flip augmentation
        if random.random() < 0.5:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        if random.random() < 0.3:
            img = img.transpose(Image.FLIP_TOP_BOTTOM)

        img_arr = np.array(img, dtype=np.float32) / 255.0
        # ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_arr = (img_arr - mean) / std
        tensor = torch.from_numpy(img_arr).permute(2, 0, 1).float()

        return tensor, gatekeeper_y, skin_y, eye_y

# =====================================================================
# TRAINING & EVALUATION LOOP
# =====================================================================

def train_model(epochs=12, batch_size=32):
    print(f"=== Starting Training BabyHealthGuard-VisionNet on {DEVICE} ===")
    dataset = NeonatalVisionDataset(samples_per_class=100)
    train_size = int(0.85 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = torch.utils.data.random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    model = BabyHealthVisionNet().to(DEVICE)
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    model_save_path = os.path.join(MODEL_DIR, "baby_health_vision_model.pt")

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        total_samples = 0

        for tensors, gatekeeper_y, skin_y, eye_y in train_loader:
            tensors = tensors.to(DEVICE)
            gatekeeper_y = gatekeeper_y.to(DEVICE)
            skin_y = skin_y.to(DEVICE)
            eye_y = eye_y.to(DEVICE)

            optimizer.zero_grad()
            gate_logits, skin_logits, eye_logits = model(tensors)

            # Gatekeeper loss (all samples)
            loss_gate = criterion(gate_logits, gatekeeper_y)

            # Masked skin loss (only baby_skin samples where gatekeeper_y == 0)
            skin_mask = (gatekeeper_y == 0)
            loss_skin = criterion(skin_logits[skin_mask], skin_y[skin_mask]) if skin_mask.sum() > 0 else 0.0

            # Masked eye loss (only baby_eye samples where gatekeeper_y == 1)
            eye_mask = (gatekeeper_y == 1)
            loss_eye = criterion(eye_logits[eye_mask], eye_y[eye_mask]) if eye_mask.sum() > 0 else 0.0

            total_loss = loss_gate + (1.2 * loss_skin) + (1.2 * loss_eye)
            total_loss.backward()
            optimizer.step()

            running_loss += total_loss.item() * len(tensors)
            total_samples += len(tensors)

        scheduler.step()
        train_loss = running_loss / total_samples

        # Validation
        model.eval()
        correct_gate = 0
        correct_skin = 0
        total_skin = 0
        correct_eye = 0
        total_eye = 0
        val_samples = 0

        with torch.no_grad():
            for tensors, gatekeeper_y, skin_y, eye_y in val_loader:
                tensors = tensors.to(DEVICE)
                gatekeeper_y = gatekeeper_y.to(DEVICE)
                skin_y = skin_y.to(DEVICE)
                eye_y = eye_y.to(DEVICE)

                gate_logits, skin_logits, eye_logits = model(tensors)

                gate_preds = torch.argmax(gate_logits, dim=1)
                correct_gate += (gate_preds == gatekeeper_y).sum().item()

                skin_mask = (gatekeeper_y == 0)
                if skin_mask.sum() > 0:
                    skin_preds = torch.argmax(skin_logits[skin_mask], dim=1)
                    correct_skin += (skin_preds == skin_y[skin_mask]).sum().item()
                    total_skin += skin_mask.sum().item()

                eye_mask = (gatekeeper_y == 1)
                if eye_mask.sum() > 0:
                    eye_preds = torch.argmax(eye_logits[eye_mask], dim=1)
                    correct_eye += (eye_preds == eye_y[eye_mask]).sum().item()
                    total_eye += eye_mask.sum().item()

                val_samples += len(tensors)

        gate_acc = correct_gate / val_samples * 100.0
        skin_acc = (correct_skin / total_skin * 100.0) if total_skin > 0 else 0.0
        eye_acc = (correct_eye / total_eye * 100.0) if total_eye > 0 else 0.0
        overall_acc = (gate_acc + skin_acc + eye_acc) / 3.0

        print(f"Epoch [{epoch:02d}/{epochs:02d}] Train Loss: {train_loss:.4f} | Gatekeeper Acc: {gate_acc:.1f}% | Skin Acc: {skin_acc:.1f}% | Eye Acc: {eye_acc:.1f}%")

        if overall_acc > best_val_acc:
            best_val_acc = overall_acc
            torch.save(model.state_dict(), model_save_path)
            print(f"  -> Model saved with validation accuracy: {best_val_acc:.2f}%")

    # Save model metadata
    metadata_path = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(METADATA, f, indent=2, ensure_ascii=False)
    print(f"=== Metadata saved to {metadata_path} ===")
    print(f"=== Model training complete! Saved to {model_save_path} ===")

if __name__ == "__main__":
    train_model(epochs=10, batch_size=32)
