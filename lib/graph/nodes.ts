import { GraphNode } from './types';

export const nodes: GraphNode[] = [

  // ═══════════════════════════════════════════
  // ANCIENT CIVILIZATIONS
  // ═══════════════════════════════════════════

  {
    id: 'gobekli-tepe',
    title: 'Göbekli Tepe',
    category: 'Ancient Civilizations',
    description: 'A Neolithic sanctuary in southeastern Turkey dated to approximately 9600–8200 BCE, making it the oldest known monumental stone structure in the world — predating Stonehenge by 6,000 years and the Egyptian pyramids by 7,000 years. Discovered by Klaus Schmidt in 1994, the site consists of T-shaped limestone pillars up to 5.5 meters tall arranged in circular enclosures, decorated with sophisticated bas-relief carvings of animals and abstract symbols. It was deliberately buried around 8000 BCE.',
    claims: [
      'Challenges the accepted model that agriculture preceded monumental architecture — the reverse may be true.',
      'The scale of organization required implies social complexity far earlier than previously understood.',
      'Astronomical alignments in the pillar arrangements have been proposed by multiple research teams.',
      'The deliberate burial of the site raises questions about intentionality and cultural memory.',
    ],
    criticisms: [
      'The site\'s builders were hunter-gatherers — complex structures do not require full agricultural civilization.',
      'Proposed astronomical alignments remain contested and are not universally accepted by archaeoastronomers.',
      'The deliberate burial may have served ritual purposes rather than encoding information for the future.',
    ],
    mainstream_view: 'Mainstream archaeology views Göbekli Tepe as a revolutionary but explicable discovery. It demonstrates that Neolithic hunter-gatherers were capable of sustained organized effort for ritual purposes, pushing back the timeline for complex social behavior. It does not require a prior advanced civilization as an explanatory framework.',
    tags: ['Neolithic', 'Turkey', 'monumental architecture', 'hunter-gatherer', 'ritual', 'Klaus Schmidt', 'UNESCO'],
    evidence_level: 'verified',
    confidence_score: 0.98,
    color: '#a16207',
    icon: '🗿',
    coordinates: [37.2231, 38.9224],
    year: -9600,
  },

  {
    id: 'atlantis',
    title: 'Atlantis',
    category: 'Ancient Civilizations',
    description: 'A legendary island civilization first described by the Greek philosopher Plato in his dialogues Timaeus and Critias (c. 360 BCE). Plato portrayed Atlantis as a powerful naval empire located "beyond the Pillars of Hercules" that sank into the Atlantic Ocean roughly 9,000 years before Solon\'s time following divine punishment for moral corruption. The story has generated centuries of scholarly debate about whether it represents allegory, philosophical invention, or a memory of real events.',
    claims: [
      'Plato claimed the story originated from Egyptian priests who told Solon of a historical event.',
      'Some researchers identify Atlantis with the Minoan civilization disrupted by the Thera eruption (~1600 BCE).',
      'Others propose a connection to the Younger Dryas impact hypothesis and catastrophic sea level rise.',
      'The story\'s geographic and social details have led some to treat it as historical rather than allegorical.',
    ],
    criticisms: [
      'No archaeological evidence of an Atlantean civilization has been discovered.',
      'Academic classicists overwhelmingly regard Atlantis as a literary and philosophical construction by Plato.',
      'The proposed timeline of 9,600 BCE predates all known complex civilizations by thousands of years.',
      'Dozens of incompatible proposed locations undermine geographic literalism.',
    ],
    mainstream_view: 'Scholars of classical antiquity regard Atlantis as Plato\'s literary device, constructed to explore themes of hubris, divine retribution, and the decline of ideal states. It serves clear philosophical functions in Plato\'s writing and bears the hallmarks of literary invention rather than historical record.',
    tags: ['Plato', 'mythology', 'Atlantic Ocean', 'lost civilization', 'Greek philosophy', 'catastrophe'],
    evidence_level: 'speculative',
    confidence_score: 0.12,
    color: '#0ea5e9',
    icon: '🌊',
    year: -360,
  },

  {
    id: 'sumerian-civilization',
    title: 'Sumerian Civilization',
    category: 'Ancient Civilizations',
    description: 'One of the earliest known complex civilizations, emerging in Mesopotamia (modern southern Iraq) around 4500–4000 BCE. The Sumerians developed cuneiform writing, monumental ziggurats, sophisticated legal systems (including the Code of Ur-Nammu), astronomy, mathematics including a base-60 system still used for time and angles, and elaborate mythological traditions recorded in texts such as the Enuma Elish and the Epic of Gilgamesh. Sumerian culture profoundly influenced Babylonian, Assyrian, and later civilizations.',
    claims: [
      'Sumerian astronomical records show sophisticated observation of planetary cycles centuries before Greek astronomy.',
      'The Sumerian King List describes antediluvian rulers with impossibly long reigns, possibly encoding earlier oral traditions.',
      'Sumerians\' own origin myths describe themselves as a gift of the gods, with no clear record of their geographic origins.',
    ],
    criticisms: [
      'Long reign lengths in the King List are mythological and not historical records.',
      'Sumerian civilization developed from traceable earlier cultures including the Ubaid period.',
    ],
    mainstream_view: 'Sumer is one of the best-documented early civilizations in archaeology. Its development from agricultural villages through urban centers is traceable in the archaeological record. It represents independent development of civilization rather than any external origin.',
    tags: ['Mesopotamia', 'cuneiform', 'ziggurat', 'Gilgamesh', 'mathematics', 'astronomy', 'writing', 'Iraq'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#d97706',
    icon: '📐',
    coordinates: [31.0, 45.0],
    year: -4000,
  },

  {
    id: 'indus-valley',
    title: 'Indus Valley Civilization',
    category: 'Ancient Civilizations',
    description: 'A Bronze Age civilization (c. 3300–1300 BCE) centered in the northwestern regions of South Asia, comprising the modern countries of Pakistan and northwest India. At its peak, it encompassed over 1 million square kilometres — larger than ancient Egypt or Mesopotamia. Cities like Mohenjo-daro and Harappa featured planned street grids, sophisticated drainage systems, standardized weights and measures, and evidence of long-distance trade. The Indus script remains undeciphered.',
    claims: [
      'The undeciphered Indus script may represent a sophisticated language system encoding unknown knowledge.',
      'Evidence of standardized weights and measures across thousands of kilometers suggests centralized administration or trade networks more sophisticated than contemporary civilizations.',
      'The relatively sudden decline around 1900 BCE may reflect a major climate shift or river course change rather than invasion.',
    ],
    criticisms: [
      'The script\'s complexity may be overestimated — it may encode a proto-writing or administrative system rather than full language.',
      'Decline is best explained by climate change and river abandonment rather than any catastrophic or mysterious event.',
    ],
    mainstream_view: 'The Indus Valley Civilization is a well-documented archaeological culture distinguished by urban planning, craft specialization, and long-distance trade. Its decline is attributed to climate change (aridification) and the shifting of the Ghaggar-Hakra river system.',
    tags: ['Bronze Age', 'Pakistan', 'India', 'Harappa', 'Mohenjo-daro', 'undeciphered script', 'urban planning'],
    evidence_level: 'verified',
    confidence_score: 0.95,
    color: '#b45309',
    icon: '🏙️',
    coordinates: [27.0, 68.0],
    year: -2600,
  },

  {
    id: 'easter-island',
    title: 'Easter Island (Rapa Nui)',
    category: 'Ancient Civilizations',
    description: 'A remote Polynesian island in the southeastern Pacific Ocean, home to the Rapa Nui people who erected approximately 900 massive stone statues called moai between roughly 1200 and 1500 CE. The moai average 4 meters in height and 12.5 tons in weight, with the largest standing 10 meters and weighing 74 tons. How the relatively small island population transported and erected these statues — and the role of internal conflict and deforestation in the civilization\'s decline — are subjects of ongoing research.',
    claims: [
      'The logistics of moai transport without wheels or draft animals represents an organizational and engineering achievement that continues to be debated.',
      'Oral traditions record that the moai "walked" to their positions — research by Carl Lipo and Terry Hunt suggests a rocking upright transport method.',
      'The sudden collapse of Rapa Nui society may reflect ecological overshoot and deforestation rather than external causes.',
    ],
    criticisms: [
      'The "mystery" of moai transport has been largely resolved — experimental archaeology has demonstrated viable methods.',
      'The collapse narrative is contested; recent research suggests significant European contact disease mortality contributed.',
    ],
    mainstream_view: 'Archaeologists have extensively documented moai construction and transport methods through experimental archaeology. The civilization\'s decline involved a complex mix of resource depletion, social conflict, and devastating contact with European diseases and slave raids.',
    tags: ['Polynesia', 'moai', 'Pacific', 'statues', 'Rapa Nui', 'deforestation', 'collapse'],
    evidence_level: 'verified',
    confidence_score: 0.93,
    color: '#78716c',
    icon: '🗿',
    coordinates: [-27.1127, -109.3497],
    year: 1250,
  },

  {
    id: 'younger-dryas',
    title: 'Younger Dryas Event',
    category: 'Ancient Civilizations',
    description: 'A rapid and severe climatic cooling period approximately 12,900–11,700 years ago that interrupted the warming trend following the Last Glacial Maximum. Temperatures in Greenland dropped by approximately 10°C within decades. The Younger Dryas Boundary (YDB) is marked globally by a distinctive layer of platinum, nano-diamonds, and microspherules. An ongoing scientific debate concerns whether a cosmic impact or airburst event triggered the cooling, which may have caused widespread megafauna extinction, human population decline, and the conditions that spurred the Agricultural Revolution.',
    claims: [
      'The Younger Dryas Impact Hypothesis proposes that a fragmented comet struck or exploded above North America, triggering cooling, massive fires, and megafauna extinction.',
      'The YDB platinum and nano-diamond signatures appear on multiple continents, suggesting a simultaneous global event.',
      'Population genomic data shows a significant bottleneck in some human populations coinciding with this period.',
    ],
    criticisms: [
      'The impact hypothesis remains contested — some researchers attribute the YDB markers to volcanic activity or terrestrial sources.',
      'An independent review found some YDB sites could not be replicated, raising questions about the methodology.',
      'Climate modeling shows the observed cooling can be explained by disruption of Atlantic Ocean circulation patterns without requiring an impact.',
    ],
    mainstream_view: 'The Younger Dryas is a well-established climatic event. The impact hypothesis is actively debated in peer-reviewed literature — it is neither confirmed nor dismissed. Most paleoclimatologists currently attribute the cooling primarily to disruption of Atlantic Meridional Overturning Circulation, possibly triggered by massive freshwater influx from melting ice sheets.',
    tags: ['paleoclimatology', 'cosmic impact', 'megafauna extinction', 'ice age', 'climate', 'geological', 'bottleneck'],
    evidence_level: 'debated',
    confidence_score: 0.55,
    color: '#6366f1',
    icon: '☄️',
    year: -10900,
  },

  {
    id: 'nabta-playa',
    title: 'Nabta Playa',
    category: 'Ancient Civilizations',
    description: 'An ancient basin in the Nubian Desert of Egypt containing one of the world\'s earliest known astronomical alignments, dated to approximately 6700–5000 BCE — predating Stonehenge by at least 1,000 years. The site includes a stone circle with alignment to the summer solstice sunrise and five megalithic structures that may correspond to bright stars. It was occupied by cattle-herding peoples during a wetter climatic period in the Sahara.',
    claims: [
      'The Nabta Playa stone circle represents the earliest confirmed astronomical alignment in Africa.',
      'Some researchers propose alignments to Orion, Sirius, and other bright stars, suggesting sophisticated naked-eye astronomy.',
      'The cattle cult evidenced at the site may represent a precursor to Egyptian religious traditions involving the Apis bull.',
    ],
    criticisms: [
      'Proposed stellar alignments are contested and depend on uncertain dating and reconstruction of the original arrangement.',
      'The connection to later Egyptian religion is speculative without direct evidence of cultural continuity.',
    ],
    mainstream_view: 'Nabta Playa is an accepted significant prehistoric site. The summer solstice solar alignment is broadly agreed upon. More specific stellar alignment claims remain contested in archaeoastronomy.',
    tags: ['Egypt', 'Neolithic', 'astronomy', 'stone circle', 'Sahara', 'solstice', 'cattle'],
    evidence_level: 'debated',
    confidence_score: 0.72,
    color: '#ca8a04',
    icon: '⭐',
    coordinates: [22.5, 30.7],
    year: -5500,
  },

  {
    id: 'ancient-megalithic-sites',
    title: 'Ancient Megalithic Architecture',
    category: 'Ancient Civilizations',
    description: 'A global pattern of monumental stone construction spanning from the British Isles to Southeast Asia, dating from approximately 4500 BCE through 1500 CE. Key examples include Stonehenge (UK), Carnac (France), Avebury (UK), Newgrange (Ireland), Puma Punku (Bolivia), and hundreds of sites across Europe, the Mediterranean, and the Pacific. The movement and precision placement of stones weighing tens to hundreds of tons, often aligned to astronomical events, represents a consistent engineering tradition across cultures with no known direct contact.',
    claims: [
      'The global distribution of megalithic construction traditions suggests either diffusion of knowledge or independent convergent development of similar solutions.',
      'Precision alignments to solstices, equinoxes, and specific stellar events appear consistently across unrelated cultures.',
      'Some sites, particularly Puma Punku, feature stonework of unusual precision that has generated debate about ancient tool use.',
    ],
    criticisms: [
      'Independent invention of similar construction techniques is well-documented in archaeology.',
      'Astronomical alignments were culturally important and practically motivating across all ancient societies.',
      'Experimental archaeology has demonstrated that all documented megalithic construction techniques are achievable with period-appropriate tools and organized labor.',
    ],
    mainstream_view: 'Megalithic traditions developed independently in multiple regions as cultures with settled agriculture developed surplus resources, organized labor, and religious traditions requiring permanent sacred spaces. Astronomical alignments reflect the practical importance of seasonal calendars for agricultural societies.',
    tags: ['Stonehenge', 'Carnac', 'Newgrange', 'megalith', 'astronomy', 'prehistoric', 'construction'],
    evidence_level: 'verified',
    confidence_score: 0.94,
    color: '#57534e',
    icon: '🪨',
    year: -4000,
  },

  // ═══════════════════════════════════════════
  // EGYPT & ANCIENT ENGINEERING
  // ═══════════════════════════════════════════

  {
    id: 'great-pyramid',
    title: 'Great Pyramid of Giza',
    category: 'Egypt & Ancient Engineering',
    description: 'The largest of the Giza pyramids, constructed c. 2560 BCE under Pharaoh Khufu of the Fourth Dynasty. It originally stood 146.5 meters tall and contains approximately 2.3 million stone blocks averaging 2.5 tons each, with some granite blocks exceeding 80 tons. The pyramid aligns to true north within 3/60 of a degree. For 3,800 years it was the tallest human-made structure on Earth. The Khufu graffiti — cartouches identifying work gangs — found in relieving chambers provides direct historical attribution.',
    claims: [
      'Mathematical relationships between the pyramid\'s dimensions encode Pi and the Golden Ratio — though debate continues about whether these were intentional or emergent from construction methods.',
      'Researcher Robert Bauval proposed the Orion Correlation Theory: the three Giza pyramids mirror the belt stars of Orion in their relative positions.',
      'Geologist Robert Schoch has proposed that the Sphinx enclosure shows precipitation weathering suggesting a construction date earlier than 2500 BCE.',
      'Ongoing scanning projects using cosmic ray muon tomography have identified anomalous voids within the structure.',
    ],
    criticisms: [
      'The Orion Correlation Theory requires the star map to be flipped horizontally to work, which critics call arbitrary.',
      'Mathematical ratios emerge naturally from seked-based construction methods without requiring knowledge of Pi or Phi.',
      'Schoch\'s water weathering hypothesis is contested by most geologists and Egyptologists, who attribute the erosion to wind.',
      'The Khufu graffiti, papyri found at Wadi al-Jarf documenting pyramid construction logistics, and the workers\' village at Heit el-Ghurab provide robust evidence for conventional construction.',
    ],
    mainstream_view: 'Egyptologists and archaeologists view the Great Pyramid as a remarkable achievement of organized human labor and Egyptian state-level engineering. Recent discoveries including logistics papyri and a harbor system have substantially filled in the construction picture. The pyramid was built as a royal tomb.',
    tags: ['Egypt', 'Khufu', 'Fourth Dynasty', 'Giza', 'tomb', 'engineering', 'Old Kingdom', 'UNESCO'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#eab308',
    icon: '🔺',
    coordinates: [29.9792, 31.1342],
    year: -2560,
  },

  {
    id: 'sphinx',
    title: 'Great Sphinx of Giza',
    category: 'Egypt & Ancient Engineering',
    description: 'A monolithic limestone statue depicting a recumbent lion with a human head, located on the Giza plateau in Egypt. Mainstream Egyptology dates it to the reign of Pharaoh Khafre (c. 2558–2532 BCE). The Sphinx faces due east and aligns with the rising sun at the spring and autumn equinoxes. It is the largest surviving monolithic statue in the world, approximately 73 meters long and 20 meters tall.',
    claims: [
      'Geologist Robert Schoch argues that erosion patterns on the Sphinx enclosure walls show characteristics of water weathering rather than wind erosion, implying a date predating 5000 BCE when Egypt last experienced significant rainfall.',
      'The Sphinx Temple blocks align with the Temple of Khafre, suggesting a relationship between the monuments.',
      'West and Schoch\'s water erosion hypothesis, if confirmed, would require a major revision of Egyptian history.',
    ],
    criticisms: [
      'The overwhelming consensus among Egyptologists and geologists attributes the Sphinx to Khafre, supported by the Dream Stele, the proximity to Khafre\'s Valley Temple, and a diorite statue of Khafre found in the Valley Temple.',
      'Geological analysis by Lal Gauri and others attributes the erosion patterns to salt weathering and wind erosion rather than rainfall.',
      'Khafre\'s face is generally considered a match with the Sphinx\'s proportions.',
    ],
    mainstream_view: 'Mainstream Egyptology attributes the Sphinx to Khafre (c. 2530 BCE) based on contextual archaeological evidence. The water erosion hypothesis, while stimulating debate, has not displaced the conventional dating.',
    tags: ['Egypt', 'Khafre', 'Giza', 'limestone', 'erosion', 'water', 'Old Kingdom', 'monolith'],
    evidence_level: 'debated',
    confidence_score: 0.78,
    color: '#d4a017',
    icon: '🦁',
    coordinates: [29.9753, 31.1376],
    year: -2530,
  },

  {
    id: 'pyramid-construction-debate',
    title: 'Pyramid Construction Methods',
    category: 'Egypt & Ancient Engineering',
    description: 'The engineering methods used to construct the Egyptian pyramids remain an active area of research. While the conventional framework — organized state labor, copper tools, wooden sledges, and ramp systems — is supported by extensive archaeological evidence, specific logistical details continue to be debated. Key questions include the exact ramp configuration, how granite beams were moved from Aswan to Giza, and the organization of the approximately 20,000-strong workforce.',
    claims: [
      'The Wadi al-Jarf papyri (discovered 2013) are the oldest papyri ever found and document the transport of limestone for the Great Pyramid under inspector Merer.',
      'Workers\' villages at Heit el-Ghurab show evidence of well-fed, organized labor — not slave labor as traditionally assumed.',
      'Alternative proposals include internal ramp systems, water lubrication of sledge paths, and hydraulic lifting mechanisms, none of which have been definitively confirmed.',
    ],
    criticisms: [
      'No single ramp design has been shown to scale to the full height of the pyramid while remaining structurally and logistically feasible.',
      'Granite transport from Aswan (900 km) using known period technology remains logistically complex.',
    ],
    mainstream_view: 'Archaeologists have extensive documentation of pyramid construction through the Wadi al-Jarf papyri, the Heit el-Ghurab workers\' village, and experimental archaeology. The broad framework is well-established; specific technical details continue to be refined.',
    tags: ['Egypt', 'engineering', 'ramps', 'papyri', 'workforce', 'copper tools', 'logistics'],
    evidence_level: 'strong_evidence',
    confidence_score: 0.88,
    color: '#f59e0b',
    icon: '⚙️',
    coordinates: [29.9792, 31.1342],
    year: -2560,
  },

  // ═══════════════════════════════════════════
  // RELIGIOUS TEXTS & MYTHOLOGY
  // ═══════════════════════════════════════════

  {
    id: 'book-of-enoch',
    title: 'Book of Enoch (1 Enoch)',
    category: 'Religious Texts & Mythology',
    description: 'An ancient Jewish religious text attributed to Enoch, the great-grandfather of Noah, composed primarily between the 3rd century BCE and 1st century CE. It describes the Watchers — a class of angels who descended to Earth, took human wives, and taught forbidden knowledge — and their offspring the Nephilim. Multiple copies were found among the Dead Sea Scrolls, confirming its circulation in Second Temple Judaism. The Ethiopian Orthodox Church includes it in its biblical canon. The Epistle of Jude in the New Testament quotes directly from 1 Enoch.',
    claims: [
      'The Watchers narrative provides a detailed account of divine-human interbreeding and the transmission of advanced knowledge to humanity.',
      'The text describes astronomical knowledge including solar and lunar calendars of unusual precision for its era.',
      'Its exclusion from most biblical canons is interpreted by some researchers as deliberate suppression of significant theological content.',
    ],
    criticisms: [
      'Scholarly consensus classifies 1 Enoch as pseudepigraphical — written under a famous name centuries after the attributed author\'s era.',
      'The Watchers narrative follows conventions of Jewish apocalyptic literature rather than functioning as historical record.',
      'Its exclusion from most canons reflects rabbinic and early Christian debates about canonicity based on apostolic origin, not suppression.',
    ],
    mainstream_view: 'Biblical scholars regard 1 Enoch as an important and genuine window into Second Temple Judaism, apocalyptic traditions, and early Jewish cosmology. It has significant historical and theological value as a primary source, regardless of its canonical status.',
    tags: ['Second Temple Judaism', 'apocalyptic', 'Dead Sea Scrolls', 'Watchers', 'Nephilim', 'Ethiopia', 'canon'],
    evidence_level: 'verified',
    confidence_score: 0.95,
    color: '#f59e0b',
    icon: '📜',
    year: -200,
  },

  {
    id: 'watchers',
    title: 'The Watchers (Grigori)',
    category: 'Religious Texts & Mythology',
    description: 'A class of angels described in the Book of Enoch who are assigned to observe humanity but instead descend to Mount Hermon, take human wives, and teach forbidden knowledge. The text names 200 Watchers who made a binding oath on the mountain. Their leader Samyaza, alongside named angels including Azazel, is said to have taught metalworking, cosmetics, sorcery, astrology, and weapons manufacture. The resulting corruption of humanity is presented as a cause of the biblical flood.',
    claims: [
      'The Watcher narrative is the most detailed account in Jewish literature of divine beings directly intervening in human civilization and transmitting knowledge.',
      'The specific knowledge attributed to Watchers — metallurgy, astronomy, writing — corresponds to technologies that appeared suddenly in the archaeological record.',
      'The narrative has parallels in Mesopotamian traditions of the Apkallu, the seven antediluvian sages who brought civilization to humanity.',
    ],
    criticisms: [
      'The Watchers are theological figures serving the literary and moral purposes of apocalyptic literature.',
      'The correspondence between attributed knowledge and actual historical developments is coincidental — these were simply the remarkable technologies of the author\'s awareness.',
      'Mesopotamian Apkallu parallels suggest literary borrowing rather than independent documentation of real events.',
    ],
    mainstream_view: 'The Watchers serve as theological and narrative agents in Jewish apocalyptic literature, explaining the origin of evil, forbidden knowledge, and divine-human boundaries. The narrative is understood in the context of Second Temple religious thought.',
    tags: ['angels', 'forbidden knowledge', 'Mount Hermon', 'metallurgy', 'Nephilim', 'flood', 'Azazel'],
    evidence_level: 'mythological',
    confidence_score: 0.18,
    color: '#7c3aed',
    icon: '👁',
    year: -200,
  },

  {
    id: 'nephilim',
    title: 'Nephilim',
    category: 'Religious Texts & Mythology',
    description: 'Beings described in Genesis 6:4 and Numbers 13:33 as arising from the union of the "sons of God" and "daughters of men." The term has been translated as "giants," "fallen ones," or "those who cause others to fall." The Book of Enoch elaborates them as the offspring of the Watchers. In Numbers, Israelite spies describe the inhabitants of Canaan as Nephilim, causing the Israelites to see themselves as grasshoppers by comparison. The Rephaim and Anakim in the Hebrew Bible are sometimes connected to post-flood Nephilim traditions.',
    claims: [
      'The Nephilim narrative reflects widespread ancient traditions of semi-divine heroic beings predating recorded civilization.',
      'Global traditions of giant ancestors — from Greek Titans and Norse Jotnar to Mesoamerican and Native American traditions — may preserve memory of real genetic or cultural diversity.',
      'The biological implausibility of giant humans is challenged by known examples of pathological gigantism in the fossil record.',
    ],
    criticisms: [
      'No archaeologically authenticated human skeletal remains with truly anomalous size have been confirmed.',
      'Widely circulated "giant skeleton" photographs have been comprehensively debunked as digital manipulations or misidentified remains.',
      'Giant traditions across cultures are better explained as mythological amplification of real human scale differences or metaphors for power.',
    ],
    mainstream_view: 'Biblical scholars understand Nephilim as mythological beings serving narrative purposes in the Hebrew Bible, connected to traditions about the boundaries between divine and human. They are not supported by physical anthropological evidence.',
    tags: ['Genesis', 'giants', 'Hebrew Bible', 'divine-human', 'mythology', 'Rephaim', 'Anakim'],
    evidence_level: 'mythological',
    confidence_score: 0.12,
    color: '#ef4444',
    icon: '⚡',
    year: -500,
  },

  {
    id: 'dead-sea-scrolls',
    title: 'Dead Sea Scrolls',
    category: 'Religious Texts & Mythology',
    description: 'A collection of approximately 900 manuscripts discovered between 1947 and 1956 in caves near Qumran on the northwestern shore of the Dead Sea. Dated to between 150 BCE and 70 CE, they include the oldest known surviving copies of books later included in the Hebrew Bible, apocryphal texts including multiple copies of 1 Enoch and the Book of Jubilees, sectarian texts believed to originate from the Essene community at Qumran, and the enigmatic Copper Scroll describing hidden treasures. They fundamentally advanced understanding of Second Temple Judaism and early Christianity.',
    claims: [
      'The scrolls provide evidence that Jewish textual diversity in the Second Temple period was far greater than previously understood.',
      'The Qumran community\'s practices and theology show parallels with early Christianity that have generated significant scholarly discussion.',
      'The Temple Scroll contains what appears to be a detailed architectural blueprint for an idealized temple.',
    ],
    criticisms: [],
    mainstream_view: 'The Dead Sea Scrolls are universally recognized as among the most significant archaeological discoveries of the 20th century. They have transformed the study of the Hebrew Bible, early Judaism, and the origins of Christianity. Their content is extensively researched and published.',
    tags: ['Qumran', 'Essenes', 'manuscripts', 'Hebrew Bible', 'Second Temple', 'Jordan', 'archaeology', 'UNESCO'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#92400e',
    icon: '📜',
    coordinates: [31.7425, 35.4594],
    year: -150,
  },

  {
    id: 'epic-of-gilgamesh',
    title: 'Epic of Gilgamesh',
    category: 'Religious Texts & Mythology',
    description: 'Among the oldest known works of literature, the Epic of Gilgamesh is a Babylonian poem originating from Sumerian sources around 2100 BCE and compiled into a standard version by the scholar Sîn-lēqi-unninni around 1200 BCE. It follows the legendary king Gilgamesh of Uruk and his companion Enkidu through adventures, the death of Enkidu, and Gilgamesh\'s subsequent quest for immortality. Tablet XI contains a detailed flood narrative that predates and closely parallels the biblical account of Noah, including a divinely-chosen hero, a boat containing animals, a dove and raven sent to find land, and the vessel coming to rest on a mountain.',
    claims: [
      'The flood narrative in Gilgamesh (and the older Atra-Hasis epic) is sufficiently similar to the Genesis flood account to suggest a shared Mesopotamian literary tradition or common historical memory.',
      'Gilgamesh\'s quest for immortality through a plant growing at the bottom of the sea contains imagery paralleled in mythologies across cultures.',
      'The text describes Gilgamesh as two-thirds divine and one-third human — an ancient categorization of demigods that parallels later traditions.',
    ],
    criticisms: [
      'Parallels between Gilgamesh and Genesis reflect literary borrowing or shared Mesopotamian cultural context, not shared historical events.',
      'Flood narratives are widespread in world literature and may independently reflect genuine memories of localized but catastrophic flooding events.',
    ],
    mainstream_view: 'The Epic of Gilgamesh is recognized as a foundational work of world literature and an invaluable primary source for Mesopotamian civilization and religion. The flood narrative parallels with Genesis are well-established and form part of the academic discussion of biblical source traditions.',
    tags: ['Sumerian', 'Babylonian', 'literature', 'flood narrative', 'immortality', 'Uruk', 'mythology', 'cuneiform'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#d97706',
    icon: '⚔️',
    year: -2100,
  },

  {
    id: 'flood-narratives',
    title: 'Global Flood Traditions',
    category: 'Religious Texts & Mythology',
    description: 'Flood mythology appears in an estimated 200+ independent cultural traditions worldwide, including in Mesopotamia (Gilgamesh, Atra-Hasis), the Hebrew Bible (Noah), Hindu texts (Manu), ancient Greece (Deucalion), Mesoamerica (Popol Vuh), the American Pacific Northwest, Aboriginal Australia, and China. The consistency of core elements — a divinely-ordered catastrophe, a chosen survivor, a boat containing animals or seeds, and post-flood world renewal — has generated sustained debate about whether these reflect shared historical memory of real catastrophic flooding events.',
    claims: [
      'The global distribution of structurally similar flood myths suggests a common cultural memory of real events, potentially including Black Sea flooding (~5600 BCE per Ryan and Pitman) or Younger Dryas sea level rise.',
      'The Black Sea Flood Hypothesis proposes that Mediterranean waters broke through the Bosporus into a freshwater lake, potentially inspiring regional flood traditions.',
      'Post-glacial sea level rise of approximately 120 meters over several thousand years would have been catastrophic for coastal populations.',
    ],
    criticisms: [
      'Many flood traditions show significant regional variation that argues against a single common source.',
      'Universal flooding of the entire Earth\'s surface is not supported by geological evidence.',
      'Flood myths may independently arise from universal human experience of localized catastrophic floods rather than a single global event.',
    ],
    mainstream_view: 'Historians of religion and folklorists recognize flood myths as one of the most widespread mythological motifs. The relationship between these traditions is studied through comparative mythology. Some connection to real flooding events is plausible; a single universal flood is not supported by geology.',
    tags: ['mythology', 'Noah', 'Gilgamesh', 'comparative mythology', 'Black Sea', 'sea level', 'catastrophe'],
    evidence_level: 'debated',
    confidence_score: 0.6,
    color: '#1d4ed8',
    icon: '🌊',
    year: -5000,
  },

  {
    id: 'comparative-mythology',
    title: 'Comparative Mythology',
    category: 'Religious Texts & Mythology',
    description: 'The academic field studying relationships between mythologies of different cultures. Key figures include Max Müller, James Frazer, Carl Jung, Joseph Campbell, and Georges Dumézil. Central findings include recurring mythological structures (Campbell\'s monomyth/Hero\'s Journey), shared Indo-European mythological inheritance documented through linguistic and textual analysis, and consistent archetypes across unrelated cultures. The field bridges folklore, linguistics, psychology, anthropology, and religious studies.',
    claims: [
      'The consistency of mythological archetypes across unrelated cultures — dying and rising gods, trickster figures, world trees, primordial floods — may reflect universal features of human cognition (Jung\'s collective unconscious) or shared very ancient cultural heritage.',
      'Dumézil\'s trifunctional hypothesis identifies a shared three-class social structure in Indo-European mythologies spanning from India to Ireland.',
    ],
    criticisms: [
      'Pattern-matching across mythologies risks over-fitting — the categories are sometimes so broad that nearly any myth fits.',
      'The universality of some motifs may reflect universal human developmental experiences rather than shared history.',
    ],
    mainstream_view: 'Comparative mythology is a well-established academic field. Its findings on Indo-European mythological inheritance are well-supported. Campbell\'s monomyth is influential but contested in its universality. Jungian interpretations are treated with more skepticism in academic contexts.',
    tags: ['mythology', 'Campbell', 'Jung', 'Indo-European', 'archetypes', 'folklore', 'anthropology'],
    evidence_level: 'verified',
    confidence_score: 0.88,
    color: '#7c3aed',
    icon: '🌐',
    year: 1870,
  },

  // ═══════════════════════════════════════════
  // UFO / UAP
  // ═══════════════════════════════════════════

  {
    id: 'roswell-incident',
    title: 'Roswell Incident',
    category: 'UFO / UAP',
    description: 'In July 1947, an unidentified object crashed on a ranch near Roswell, New Mexico. The Roswell Army Air Field initially issued a press release announcing recovery of a "flying disc," which was retracted within hours and replaced with an explanation of a weather balloon. Decades of subsequent investigation, witness testimony, and Freedom of Information Act document releases have generated ongoing controversy. The 1994 Air Force report attributed the crash to debris from Project Mogul, a classified program using high-altitude balloons to monitor Soviet nuclear testing.',
    claims: [
      'Intelligence officer Jesse Marcel, who retrieved the debris, stated in later years that the material was unlike any weather balloon or aircraft he had encountered.',
      'Multiple witnesses claimed to have seen non-human bodies or unusual materials, with some making deathbed statements.',
      'The initial "flying disc" press release and subsequent rapid retraction suggest something unusual was recovered.',
    ],
    criticisms: [
      'The Project Mogul explanation is documented, classified at the time, and explains the initial confusion and cover-up.',
      'Memory research demonstrates that testimony gathered decades after an event is unreliable, particularly for emotionally significant events.',
      'No physical evidence authenticated as non-terrestrial has been presented in any verifiable form.',
    ],
    mainstream_view: 'The scientific and government consensus attributes the Roswell incident to Project Mogul balloon debris. The perception of a cover-up reflects real military secrecy around the classified balloon program rather than concealment of extraterrestrial material.',
    tags: ['New Mexico', '1947', 'military', 'UFO', 'Project Mogul', 'Jesse Marcel', 'cover-up', 'Cold War'],
    evidence_level: 'debated',
    confidence_score: 0.35,
    color: '#22c55e',
    icon: '🛸',
    coordinates: [33.3943, -104.5230],
    year: 1947,
  },

  {
    id: 'pentagon-uap-reports',
    title: 'Pentagon UAP Reports',
    category: 'UFO / UAP',
    description: 'Beginning in 2017 with the New York Times\' revelation of the Advanced Aerospace Threat Identification Program (AATIP), the U.S. government has progressively acknowledged formal UAP (Unidentified Aerial Phenomena) investigation programs. The 2021 preliminary ODNI report acknowledged 144 UAP reports from U.S. military personnel, explaining only one definitively. The 2022 establishment of the All-domain Anomaly Resolution Office (AARO) formalized ongoing investigation. In 2023, former intelligence official David Grusch testified to Congress under oath that the U.S. government possesses retrieved non-human craft and biologics.',
    claims: [
      'The U.S. government\'s 2021 UAP report acknowledged that the majority of reported incidents remain unexplained.',
      'Documented sensor data including radar, infrared, and electro-optical recording from military assets shows objects performing maneuvers inconsistent with known aircraft.',
      'David Grusch\'s congressional testimony (2023) under oath claims a classified UAP reverse-engineering program exists.',
    ],
    criticisms: [
      'Grusch\'s testimony is secondhand — he claims to have been told about programs, not to have directly witnessed UAP or retrieved material.',
      'Sensor data anomalies can reflect instrumentation artifacts, atmospheric phenomena, or classified human aerospace technology.',
      'Official acknowledgment of unexplained phenomena does not confirm extraterrestrial origin.',
    ],
    mainstream_view: 'The U.S. government\'s formal acknowledgment of UAP investigation programs is significant. Scientific bodies including the National Academies of Sciences have called for rigorous investigation. Most scientists consider extraordinary claims about non-human origin to require extraordinary evidence not yet provided.',
    tags: ['AATIP', 'AARO', 'military', 'Senate', 'disclosure', 'radar', 'FLIR', 'Grusch', 'Congress'],
    evidence_level: 'debated',
    confidence_score: 0.45,
    color: '#16a34a',
    icon: '🛸',
    year: 2017,
  },

  {
    id: 'rendlesham-forest',
    title: 'Rendlesham Forest Incident',
    category: 'UFO / UAP',
    description: 'A series of reported sightings of unexplained lights in Rendlesham Forest, Suffolk, England, in late December 1980, near the twin NATO air bases RAF Bentwaters and RAF Woodbridge (used by the U.S. Air Force). Multiple U.S. military personnel, including Deputy Base Commander Lt. Col. Charles Halt, reported witnessing lights in the forest, finding physical traces on the ground, and observing a craft with unknown markings. Halt documented the events in an official memorandum to the Ministry of Defence.',
    claims: [
      'Lt. Col. Halt\'s contemporaneous memo to the Ministry of Defence provides official military documentation of unexplained phenomena.',
      'Halt\'s personal audio tape, recorded during the incident, is a contemporaneous record of military officers observing unexplained phenomena.',
      'Physical landing traces found in the forest — broken branches, indentations — were documented.',
    ],
    criticisms: [
      'A nearby lighthouse at Orfordness has been proposed as an explanation for the light phenomena, though witnesses dispute this.',
      'Radar records for the relevant period were not preserved.',
      'Some witness accounts have evolved or been embellished over the decades.',
    ],
    mainstream_view: 'The Rendlesham incident is one of the best-documented UFO cases in terms of official military documentation. Skeptics attribute the phenomena to the Orfordness lighthouse, re-entry debris, and psychological factors. No consensus explanation has been established.',
    tags: ['UK', '1980', 'RAF', 'US Air Force', 'Suffolk', 'official documentation', 'Cold War', 'military'],
    evidence_level: 'debated',
    confidence_score: 0.4,
    color: '#15803d',
    icon: '🌲',
    coordinates: [52.0897, 1.4407],
    year: 1980,
  },

  {
    id: 'ancient-astronaut-hypothesis',
    title: 'Ancient Astronaut Hypothesis',
    category: 'UFO / UAP',
    description: 'A pseudoscientific hypothesis proposing that extraterrestrial beings visited Earth in ancient times and made contact with ancient human civilizations, influencing the development of technology, religion, architecture, and culture. Popularized by Erich von Däniken\'s "Chariots of the Gods?" (1968) and the long-running History Channel series "Ancient Aliens." The hypothesis reinterprets ancient religious texts, monumental architecture, and artifacts as evidence of extraterrestrial contact.',
    claims: [
      'Ancient architectural achievements (pyramids, megaliths) are interpreted as beyond the capability of period technology without extraterrestrial assistance.',
      'Depictions of gods in ancient art are interpreted as literal spacecraft or astronauts.',
      'Zecharia Sitchin\'s interpretation of Sumerian texts proposes that the Anunnaki gods were extraterrestrials from a hypothetical planet Nibiru.',
    ],
    criticisms: [
      'Sitchin\'s translations are rejected by virtually all professional Assyriologists and Sumerologists as fundamentally incorrect.',
      'The "ancient people couldn\'t do this" argument is consistently challenged by experimental archaeology.',
      'The hypothesis implicitly underestimates ancient human intelligence and capability.',
      'Proposed evidence is routinely shown to have conventional archaeological and historical explanations.',
    ],
    mainstream_view: 'The ancient astronaut hypothesis is rejected by mainstream archaeology, anthropology, history, and linguistics. It is classified as pseudoscience. It has been criticized for cultural bias in assuming ancient peoples of certain regions required outside help.',
    tags: ['von Däniken', 'Sitchin', 'Anunnaki', 'pseudoscience', 'ancient architecture', 'extraterrestrial', 'popular culture'],
    evidence_level: 'speculative',
    confidence_score: 0.05,
    color: '#84cc16',
    icon: '👽',
    year: 1968,
  },

  // ═══════════════════════════════════════════
  // HUMAN ORIGINS
  // ═══════════════════════════════════════════

  {
    id: 'human-evolution',
    title: 'Human Evolution',
    category: 'Human Origins',
    description: 'The evolutionary history of Homo sapiens, tracing the lineage from common ancestors with other great apes through australopithecines and various Homo species to anatomically modern humans (c. 300,000 years ago in Africa). Supported by convergent evidence from paleontology, comparative anatomy, genetics, and genomics. Key milestones include bipedalism (c. 4+ million years ago), stone tool use (Oldowan c. 3.3 million years ago), controlled fire use (c. 1 million years ago), and behavioral modernity (c. 70,000–50,000 years ago).',
    claims: [
      'Genomic analysis has revealed that modern humans carry 1–4% Neanderthal DNA (non-African populations) and some populations carry Denisovan DNA, documenting interbreeding events.',
      'The pace of brain size increase in the Homo lineage is remarkable in evolutionary terms and its drivers are still actively debated.',
      'Behavioral modernity — art, complex language, abstract thought — appears to have emerged rapidly relative to anatomical modernity.',
    ],
    criticisms: [],
    mainstream_view: 'Human evolution through natural selection is one of the most robustly supported theories in science, with convergent evidence from multiple independent fields. Ongoing research continues to refine the timeline, geography, and specific evolutionary events.',
    tags: ['paleoanthropology', 'genetics', 'Homo sapiens', 'Africa', 'bipedalism', 'brain', 'out of Africa'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#10b981',
    icon: '🧬',
    year: -300000,
  },

  {
    id: 'neanderthals',
    title: 'Neanderthals',
    category: 'Human Origins',
    description: 'An archaic human species (Homo neanderthalensis) that inhabited Europe and western Asia from approximately 400,000 to 40,000 years ago, overlapping with the arrival of Homo sapiens in Europe. Neanderthals had larger brains than modern humans (on average), made sophisticated Mousterian tools, buried their dead, used pigments and feathers for adornment, and may have produced rudimentary symbolic art. Ancient DNA analysis has confirmed interbreeding with Homo sapiens — non-African modern humans carry approximately 1–4% Neanderthal DNA.',
    claims: [
      'The presence of Neanderthal DNA in modern non-African human populations is definitively established through ancient DNA analysis.',
      'Evidence for Neanderthal symbolic behavior including eagle feather use and pigment application is growing but remains debated.',
      'The cause of Neanderthal extinction — competition with Homo sapiens, climate change, or a combination — is not fully resolved.',
    ],
    criticisms: [],
    mainstream_view: 'Neanderthals are well-documented through a rich fossil and archaeological record. Ancient DNA has transformed our understanding of their relationship with modern humans from a simple replacement model to one of complex interaction and interbreeding.',
    tags: ['paleoanthropology', 'Europe', 'ancient DNA', 'Mousterian', 'extinction', 'interbreeding', 'fossil'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#0891b2',
    icon: '🦴',
    year: -200000,
  },

  {
    id: 'denisovans',
    title: 'Denisovans',
    category: 'Human Origins',
    description: 'An archaic human population or species known almost entirely from ancient DNA analysis of fragmentary remains found in Denisova Cave, Siberia, dated to approximately 30,000–200,000 years ago. Denisovans are genetically distinct from both Neanderthals and Homo sapiens. Modern Melanesian, Aboriginal Australian, and some East Asian and Pacific Islander populations carry up to 5% Denisovan DNA, suggesting interbreeding. A jawbone from Tibet (Xiahe mandible) suggests Denisovans were adapted to high altitude environments.',
    claims: [
      'Denisovans represent a major human lineage previously completely unknown until ancient DNA analysis in 2010.',
      'The geographic distribution of Denisovan DNA in modern populations suggests they occupied a vast range from Siberia to Southeast Asia.',
      'High Denisovan DNA in some Tibetan and Sherpa populations may have contributed adaptive genes for high-altitude living.',
    ],
    criticisms: [],
    mainstream_view: 'Denisovans are one of the most significant recent discoveries in paleoanthropology, demonstrating the power of ancient DNA analysis. They are a confirmed archaic human population with documented genetic legacy in modern human populations.',
    tags: ['ancient DNA', 'Siberia', 'Melanesia', 'interbreeding', 'paleoanthropology', 'Tibet', 'genome'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#0e7490',
    icon: '🧬',
    year: -50000,
  },

  {
    id: 'stoned-ape-theory',
    title: 'Stoned Ape Theory',
    category: 'Human Origins',
    description: 'A hypothesis proposed by ethnobotanist Terence McKenna in his 1992 book "Food of the Gods," suggesting that the consumption of psilocybin-containing mushrooms by early hominids in sub-Saharan Africa played a role in the rapid expansion of human cognitive capabilities, contributing to the development of language, art, and consciousness.',
    claims: [
      'Psilocybe cubensis grows naturally in the dung of African cattle — a food source that expanding hominid groups following herds would have encountered.',
      'Modern neuroscience confirms that psilocybin promotes neuroplasticity and facilitates novel cognitive connections.',
      'Some cave art from the Magdalenian period depicts what some researchers interpret as mushroom imagery.',
    ],
    criticisms: [
      'The hypothesis is not scientifically falsifiable in its original form.',
      'Brain size increase in the Homo lineage began approximately 2 million years ago — earlier than the plausible timeline for significant mushroom consumption.',
      'Evolutionary biologists have proposed more parsimonious explanations including dietary changes, social complexity, and sexual selection.',
    ],
    mainstream_view: 'The Stoned Ape Theory is not accepted by mainstream evolutionary biology or paleoanthropology. It is considered untestable in its current form. Modern psilocybin research confirms neurological effects but does not support the specific evolutionary claims McKenna made.',
    tags: ['McKenna', 'psilocybin', 'evolution', 'consciousness', 'neuroplasticity', 'Africa', 'speculative'],
    evidence_level: 'speculative',
    confidence_score: 0.15,
    color: '#9333ea',
    icon: '🍄',
    year: 1992,
  },

  {
    id: 'human-migration',
    title: 'Human Migration Out of Africa',
    category: 'Human Origins',
    description: 'The "Out of Africa" model, supported by extensive genetic, archaeological, and paleontological evidence, proposes that anatomically modern Homo sapiens evolved in Africa and dispersed across the globe beginning approximately 60,000–70,000 years ago. By 45,000 years ago, humans had reached Australia; by 15,000–25,000 years ago, the Americas.',
    claims: [
      'The genetic evidence for a recent African origin of all modern humans is robust and supported by multiple independent analyses.',
      'Some researchers propose multiple smaller dispersal events rather than a single major migration.',
      'The timing of the Americas\' peopling continues to be debated, with some sites potentially suggesting earlier arrival than 15,000 BP.',
    ],
    criticisms: [],
    mainstream_view: 'The African origin of modern Homo sapiens and their subsequent global dispersal is one of the best-supported conclusions in human evolutionary biology. Details of timing, route, and number of migration events continue to be refined by ongoing genetic and archaeological research.',
    tags: ['genetics', 'Africa', 'migration', 'Homo sapiens', 'bottleneck', 'Americas', 'Australia'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#059669',
    icon: '🌍',
    year: -65000,
  },

  // ═══════════════════════════════════════════
  // CONSCIOUSNESS & REALITY
  // ═══════════════════════════════════════════

  {
    id: 'simulation-hypothesis',
    title: 'Simulation Hypothesis',
    category: 'Consciousness & Reality',
    description: 'A philosophical proposition formalized by Nick Bostrom in his 2003 paper "Are You Living in a Computer Simulation?" arguing that at least one of three scenarios must be true: (1) nearly all civilizations go extinct before developing simulation technology; (2) advanced civilizations choose not to run such simulations; or (3) we are almost certainly living in a computer simulation.',
    claims: [
      'The mathematical precision of physical laws is consistent with computational design.',
      'The quantum observer effect has been compared to computational rendering-on-demand.',
      'James Gates\' discovery of error-correcting codes in supersymmetry equations has been cited as suggestive.',
    ],
    criticisms: [
      'The hypothesis is not empirically falsifiable with current methods — it remains philosophy rather than science.',
      'The observer effect is fully explained within quantum mechanics without requiring computational interpretation.',
      'The presence of mathematical structure in physics may reflect the nature of reality rather than its computational substrate.',
    ],
    mainstream_view: 'The simulation hypothesis is treated by physicists and philosophers as a legitimate philosophical thought experiment but not a scientific theory. It cannot currently be tested.',
    tags: ['Bostrom', 'philosophy', 'consciousness', 'quantum mechanics', 'physics', 'computation', 'reality'],
    evidence_level: 'speculative',
    confidence_score: 0.15,
    color: '#6366f1',
    icon: '💻',
    year: 2003,
  },

  {
    id: 'hard-problem-consciousness',
    title: 'Hard Problem of Consciousness',
    category: 'Consciousness & Reality',
    description: 'Philosopher David Chalmers coined the phrase "hard problem of consciousness" in 1995 to describe the explanatory gap between objective physical brain processes and subjective experience (qualia). The hard problem asks: why is there subjective experience at all? Why does brain activity feel like something from the inside? This problem remains one of the deepest unsolved questions in philosophy of mind.',
    claims: [
      'No current physical theory explains why any physical process should give rise to subjective experience.',
      'Integrated Information Theory (IIT, Tononi) proposes that consciousness is identical to integrated information (Φ).',
      'Panpsychism — the view that consciousness is a fundamental feature of reality — is taken seriously by some philosophers.',
    ],
    criticisms: [
      'Some philosophers (Dennett, Frankish) argue that qualia as commonly described are an illusion — the hard problem dissolves on closer analysis.',
      'IIT is criticized for implying that certain simple systems would be more conscious than complex brains.',
    ],
    mainstream_view: 'The hard problem of consciousness is recognized as a genuine and unsolved philosophical problem by most philosophers of mind and many neuroscientists. Multiple competing frameworks exist.',
    tags: ['Chalmers', 'philosophy of mind', 'qualia', 'panpsychism', 'neuroscience', 'IIT', 'Tononi'],
    evidence_level: 'debated',
    confidence_score: 0.5,
    color: '#8b5cf6',
    icon: '🧠',
    year: 1995,
  },

  {
    id: 'quantum-consciousness',
    title: 'Quantum Consciousness (Orch-OR)',
    category: 'Consciousness & Reality',
    description: 'The Orchestrated Objective Reduction (Orch-OR) theory proposed by physicist Roger Penrose and anesthesiologist Stuart Hameroff proposes that consciousness arises from quantum computations in microtubules within neurons, and that consciousness is connected to fundamental features of spacetime geometry.',
    claims: [
      'Microtubules in neurons may maintain quantum coherence long enough for quantum computation to play a role in neural information processing.',
      'Anesthetic agents that disrupt microtubule function also eliminate consciousness, potentially supporting a microtubule role.',
      'Penrose\'s Gödel-based argument suggests human mathematical understanding cannot be purely computational.',
    ],
    criticisms: [
      'The warm, wet brain environment is generally considered hostile to quantum coherence by most physicists.',
      'Most cognitive scientists consider classical neural network computation sufficient to explain known cognitive functions.',
      'Penrose\'s Gödel argument has been extensively critiqued by philosophers and logicians.',
    ],
    mainstream_view: 'Orch-OR is a minority position in neuroscience and physics. Most researchers consider quantum effects unlikely to play a significant role in neural computation at the relevant scales and temperatures.',
    tags: ['Penrose', 'Hameroff', 'microtubules', 'quantum mechanics', 'neuroscience', 'anesthesia'],
    evidence_level: 'speculative',
    confidence_score: 0.2,
    color: '#7c3aed',
    icon: '⚛️',
    year: 1994,
  },

  {
    id: 'collective-unconscious',
    title: 'Collective Unconscious',
    category: 'Consciousness & Reality',
    description: 'Carl Jung\'s concept of a part of the unconscious mind shared among beings of the same species, containing archetypes — universal, archaic patterns and images that derive from the accumulated experience of humanity. Jung proposed that the collective unconscious explains why myths and symbols from unrelated cultures share structural similarities.',
    claims: [
      'The consistent appearance of structurally similar mythological figures and themes across unrelated cultures supports the existence of shared unconscious structures.',
      'Archetypal images appearing in dreams, psychosis, and shamanic experiences across cultures suggest their origin in a collective rather than individual unconscious.',
    ],
    criticisms: [
      'The collective unconscious is not empirically testable by scientific methods — it is a theoretical construct.',
      'Cross-cultural mythological similarities can be explained through shared human developmental experiences or common cognitive features without positing a collective unconscious.',
    ],
    mainstream_view: 'Jung\'s collective unconscious is influential in depth psychology and humanities but is not part of mainstream cognitive science or neuroscience.',
    tags: ['Jung', 'archetypes', 'depth psychology', 'mythology', 'dreams', 'symbols', 'unconscious'],
    evidence_level: 'speculative',
    confidence_score: 0.35,
    color: '#6d28d9',
    icon: '🌀',
    year: 1916,
  },

  // ═══════════════════════════════════════════
  // SECRET SOCIETIES & ESOTERIC
  // ═══════════════════════════════════════════

  {
    id: 'freemasonry',
    title: 'Freemasonry',
    category: 'Secret Societies & Esoteric',
    description: 'A fraternal organization tracing its formal origins to the founding of the Grand Lodge of England in 1717. Its initiatory structure involves three craft degrees (Entered Apprentice, Fellow Craft, Master Mason) plus additional rites. Notable Freemasons have included George Washington, Benjamin Franklin, and Wolfgang Amadeus Mozart.',
    claims: [
      'The physical layout of Washington D.C. incorporates Masonic symbols and geometric relationships.',
      'Masonic networks among American founding fathers may have influenced founding documents.',
      'Higher degrees of Freemasonry contain esoteric knowledge traditions traced to Hermeticism and Kabbalah.',
    ],
    criticisms: [
      'Masonic influence on American founding is routinely overstated — most founders were not Freemasons.',
      'The organization is a documented fraternal and charitable society with public membership and published rituals.',
      'Claims of secret world domination conflict with the well-documented public history and declining membership.',
    ],
    mainstream_view: 'Freemasonry is a well-documented historical organization. Historians acknowledge its influence in specific contexts without supporting claims of global secret governance.',
    tags: ['fraternal', 'ritual', 'Washington DC', 'Solomon', 'esoteric', 'craft degrees', 'charitable'],
    evidence_level: 'verified',
    confidence_score: 0.92,
    color: '#1e40af',
    icon: '📐',
    year: 1717,
  },

  {
    id: 'rosicrucianism',
    title: 'Rosicrucianism',
    category: 'Secret Societies & Esoteric',
    description: 'A philosophical and esoteric tradition that emerged in early 17th-century Europe with the anonymous publication of the Rosicrucian manifestos: the Fama Fraternitatis (1614), the Confessio Fraternitatis (1615), and The Chymical Wedding of Christian Rosenkreuz (1616). Whether an actual Rosicrucian brotherhood existed at the time or the manifestos were a literary hoax remains debated.',
    claims: [
      'The Rosicrucian manifestos influenced early modern natural philosophy and arguably contributed to the intellectual environment from which the Royal Society emerged.',
      'Rosicrucian thought influenced later organizations including certain branches of Freemasonry and Hermeticism.',
    ],
    criticisms: [
      'Scholars generally consider the original manifestos to be a literary hoax or satirical work rather than documentation of an existing brotherhood.',
      'No original Rosicrucian brotherhood has been historically documented despite extensive searches.',
    ],
    mainstream_view: 'Historians of early modern thought regard Rosicrucianism as an important intellectual current that influenced hermeticism, natural philosophy, and early modern science.',
    tags: ['hermetic', 'alchemy', '17th century', 'manifestos', 'esoteric', 'Europe', 'natural philosophy'],
    evidence_level: 'debated',
    confidence_score: 0.65,
    color: '#dc2626',
    icon: '🌹',
    year: 1614,
  },

  {
    id: 'hermeticism',
    title: 'Hermeticism',
    category: 'Secret Societies & Esoteric',
    description: 'A philosophical, religious, and esoteric tradition based primarily on writings attributed to Hermes Trismegistus, a legendary figure representing a synthesis of the Greek god Hermes and the Egyptian god Thoth. The Hermetic corpus, compiled in Alexandria between the 1st and 3rd centuries CE, covers theology, astrology, alchemy, and theurgy. Core Hermetic principles include "As above, so below."',
    claims: [
      'The Hermetic texts preserve ancient Egyptian and Neoplatonic wisdom transmitted through a tradition of initiated scholars.',
      'Hermetic principles of correspondence anticipate certain developments in systems theory and idealist philosophy.',
    ],
    criticisms: [
      'Isaac Casaubon\'s 1614 dating of the Hermetic corpus to the 2nd–3rd century CE undermined claims of ancient Egyptian origin.',
      'The texts are a product of Hellenistic syncretism rather than transmission of primordial Egyptian wisdom.',
    ],
    mainstream_view: 'Hermeticism is studied as a significant philosophical tradition with documented influence on Renaissance thought, early modern science, and esoteric traditions.',
    tags: ['Alexandria', 'Hermes Trismegistus', 'alchemy', 'Renaissance', 'Neoplatonism', 'Thoth', 'esoteric'],
    evidence_level: 'verified',
    confidence_score: 0.9,
    color: '#b45309',
    icon: '☿',
    year: 200,
  },

  {
    id: 'illuminati-history',
    title: 'Illuminati (Historical)',
    category: 'Secret Societies & Esoteric',
    description: 'The Order of the Illuminati was founded by Adam Weishaupt on May 1, 1776, in Bavaria. Its goals were the opposition to superstition, religious influence over public life, and abuses of state power. At its peak it had approximately 2,000 members drawn from Enlightenment intellectuals. It was infiltrated by the Bavarian government and formally dissolved in 1785.',
    claims: [
      'The Illuminati\'s documented membership included significant Enlightenment intellectuals.',
      'Contemporary conspiracy theories propose the Illuminati survived suppression and continues to secretly control global events.',
    ],
    criticisms: [
      'The historical Illuminati was definitively suppressed and disbanded in 1785 — no credible historical evidence supports its continuation.',
      'Modern "Illuminati" conspiracy narratives emerged primarily from 19th-century anti-Masonic pamphlet literature.',
    ],
    mainstream_view: 'Historians have thoroughly documented the historical Illuminati as a genuine Enlightenment organization that was successfully suppressed. The contemporary conspiracy use of the term has no historical grounding.',
    tags: ['Weishaupt', 'Bavaria', '1776', 'Enlightenment', 'conspiracy', 'suppressed', 'historical'],
    evidence_level: 'verified',
    confidence_score: 0.95,
    color: '#7c3aed',
    icon: '🔺',
    year: 1776,
  },

  {
    id: 'mystery-schools',
    title: 'Ancient Mystery Schools',
    category: 'Secret Societies & Esoteric',
    description: 'Initiatory religious institutions of ancient Greece and Rome offering initiates direct experience of divine mysteries through rituals, altered states, and symbolic dramas. The Eleusinian Mysteries were celebrated for nearly 2,000 years and attracted initiates including Plato, Aristotle, and Marcus Aurelius.',
    claims: [
      'The Eleusinian kykeon, likely containing ergot alkaloids with psychedelic properties, may have produced genuine visionary experiences as the core of the initiatory ritual.',
      'Mystery school traditions influenced Neoplatonic philosophy and early Christian theological development.',
    ],
    criticisms: [
      'The psychedelic interpretation of the Eleusinian Mysteries is one hypothesis among several and is not the scholarly consensus.',
      'Mystery schools were public religious institutions with known locations and widespread participation.',
    ],
    mainstream_view: 'Ancient mystery schools are extensively documented in classical literature and archaeology. They were recognized civic and religious institutions. The content of the initiatory rituals remains unknown by design.',
    tags: ['Eleusis', 'Greek religion', 'initiation', 'Plato', 'Mithras', 'ritual', 'psychedelic', 'Dionysus'],
    evidence_level: 'verified',
    confidence_score: 0.9,
    color: '#7c2d12',
    icon: '🏛️',
    year: -500,
  },

  // ═══════════════════════════════════════════
  // GLOBAL MYSTERIES
  // ═══════════════════════════════════════════

  {
    id: 'bronze-age-collapse',
    title: 'Bronze Age Collapse',
    category: 'Global Mysteries',
    description: 'One of history\'s most dramatic civilizational collapses, occurring approximately 1200–1150 BCE. Within a few decades, virtually every major palace civilization of the eastern Mediterranean — the Mycenaeans, the Hittites, the Kassite Babylonians, Ugarit — collapsed. The cause remains debated among historians.',
    claims: [
      'The "Sea Peoples" mentioned in Egyptian records have traditionally been blamed for the collapse, but the cause of their own movement is unclear.',
      'Recent research emphasizes a "perfect storm" of interconnected causes: drought, disrupted trade, internal rebellions, earthquakes, and systems collapse.',
      'Paleoclimatological data shows a 300-year drought beginning approximately 1200 BCE in the eastern Mediterranean.',
    ],
    criticisms: [
      'The "systems collapse" model is compelling but difficult to falsify — it risks becoming a catch-all explanation.',
      'The relative weight of each proposed cause remains actively contested.',
    ],
    mainstream_view: 'The Bronze Age Collapse is a well-documented historical event studied through archaeology, texts, and paleoclimatology. Most current historians favor a multi-causal explanation emphasizing climate change, disrupted trade networks, and cascading systemic failure.',
    tags: ['Mycenaeans', 'Hittites', 'Sea Peoples', '1200 BCE', 'collapse', 'drought', 'systems', 'Mediterranean'],
    evidence_level: 'verified',
    confidence_score: 0.88,
    color: '#7c3aed',
    icon: '⚔️',
    year: -1200,
  },

  {
    id: 'antikythera-mechanism',
    title: 'Antikythera Mechanism',
    category: 'Global Mysteries',
    description: 'An ancient Greek analogue computer recovered from a shipwreck near the island of Antikythera, dated to approximately 87–60 BCE. It is the most sophisticated mechanical device known from antiquity — a hand-powered orrery capable of predicting astronomical positions and eclipses decades in advance. CT scanning has revealed approximately 30 interlocking bronze gears. Nothing of comparable mechanical complexity appears in the historical record for over 1,400 years after its manufacture.',
    claims: [
      'The Mechanism demonstrates that ancient Greek engineering capabilities substantially exceeded what scholars had assumed before its discovery.',
      'Its existence implies a sophisticated tradition of precision mechanical manufacture that left almost no other surviving examples.',
      'Recent analysis has revealed it may have tracked all five planets known to the ancients.',
    ],
    criticisms: [
      'The Mechanism is an extraordinary individual artifact, not evidence of routine advanced technology.',
      'Its apparent singularity may reflect preservation bias rather than actual historical singularity.',
    ],
    mainstream_view: 'The Antikythera Mechanism is universally accepted as genuine and as one of the most remarkable archaeological artifacts ever found. It has substantially revised scholarly understanding of ancient Greek technological capability.',
    tags: ['Greece', 'astronomy', 'bronze', 'shipwreck', 'eclipse', 'Hellenistic', 'orrery', 'UNESCO'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#374151',
    icon: '⚙️',
    year: -87,
  },

  {
    id: 'younger-dryas-impact',
    title: 'Younger Dryas Impact Hypothesis',
    category: 'Global Mysteries',
    description: 'A scientific hypothesis proposing that a fragmented comet or asteroid struck or exploded above North America approximately 12,900 years ago, triggering the Younger Dryas cooling period, contributing to North American megafauna extinction, and potentially devastating human populations. The hypothesis was first formally proposed in 2007 by Firestone et al. and remains actively debated in peer-reviewed literature.',
    claims: [
      'The YDB platinum anomaly appears at multiple sites on multiple continents, suggesting a simultaneous global event.',
      'Nano-diamonds and lonsdaleite found at YDB sites are consistent with cosmic impact but not with volcanic activity.',
      'The timing correlates with megafauna extinction, the disappearance of the Clovis culture, and the Younger Dryas cooling.',
    ],
    criticisms: [
      'Multiple independent replication attempts have produced inconsistent results for the claimed impact markers.',
      'Some proposed markers (lonsdaleite) have been reinterpreted as misidentified conventional minerals.',
      'Climate models can produce Younger Dryas-scale cooling through disruption of ocean circulation without requiring an impact.',
    ],
    mainstream_view: 'The Younger Dryas Impact Hypothesis is an active scientific debate, published in major peer-reviewed journals on both sides. It is neither confirmed nor dismissed by the scientific community.',
    tags: ['comet', 'asteroid', 'impact', 'paleoclimatology', 'Clovis', 'megafauna', 'platinum', 'nano-diamond'],
    evidence_level: 'debated',
    confidence_score: 0.45,
    color: '#dc2626',
    icon: '☄️',
    year: -10900,
  },

  {
    id: 'silk-road',
    title: 'Silk Road Knowledge Transfer',
    category: 'Global Mysteries',
    description: 'The Silk Road — a network of trade routes connecting China, Central Asia, India, the Middle East, and Europe — facilitated not only commerce but the transfer of technologies, religions, diseases, and ideas across Eurasia from approximately the 2nd century BCE to the 15th century CE.',
    claims: [
      'Technological and intellectual transfers along the Silk Road may explain apparent simultaneous developments in geographically distant civilizations.',
      'The spread of agricultural practices, metallurgy, and religious ideas may be more connected through Silk Road networks than traditional historiography suggests.',
    ],
    criticisms: [],
    mainstream_view: 'The Silk Road\'s role in facilitating cultural, technological, and intellectual exchange is well-documented and accepted by historians. It is one of the most significant mechanisms of pre-modern globalization.',
    tags: ['China', 'Rome', 'trade', 'Buddhism', 'technology transfer', 'Islam', 'Central Asia', 'medieval'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#b45309',
    icon: '🛤️',
    year: -200,
  },

  // ═══════════════════════════════════════════
  // LEGENDS & FOLKLORE
  // ═══════════════════════════════════════════

  {
    id: 'giants-ancient-texts',
    title: 'Giants in Ancient Texts',
    category: 'Legends & Folklore',
    description: 'References to beings of extraordinary physical stature appear across the ancient world\'s literature and mythology: the Nephilim and Rephaim of the Hebrew Bible; the Titans and Gigantes of Greek mythology; the Jötnar of Norse mythology; the Asuras of Hindu epics; and giant traditions in Mesoamerican, Native American, and Aboriginal Australian oral traditions.',
    claims: [
      'The global distribution of giant traditions may preserve collective memory of real genetic or physical diversity in ancient human populations.',
      'Certain fossil remains — mammoth bones, dinosaur bones — discovered by ancient peoples without paleontological context may have been interpreted as giant human remains.',
    ],
    criticisms: [
      'Giant traditions serve consistent mythological functions that explain their widespread occurrence without requiring real giants.',
      'No anatomically modern human skeletal remains exhibiting truly extraordinary size have been authenticated.',
    ],
    mainstream_view: 'Giant traditions are studied as mythological motifs reflecting universal human concerns about scale, power, and the relationship between humans and the forces of the natural world.',
    tags: ['mythology', 'Nephilim', 'Titans', 'Jotnar', 'Norse', 'Greek', 'Hebrew', 'fossil', 'folklore'],
    evidence_level: 'verified',
    confidence_score: 0.85,
    color: '#7c3aed',
    icon: '⚡',
    year: -2000,
  },

  {
    id: 'dragon-traditions',
    title: 'Dragon Traditions',
    category: 'Legends & Folklore',
    description: 'Large, powerful, reptilian or serpentine beings appear in the mythological traditions of cultures on every inhabited continent: the fire-breathing winged dragons of European medieval tradition; the benevolent Lóng of Chinese mythology; the feathered Quetzalcoatl of Mesoamerica; the Nāga of South and Southeast Asia; the Norse Jörmungandr; the Aboriginal Australian Rainbow Serpent.',
    claims: [
      'The near-universal presence of dragon/serpent beings in ancient mythology may reflect an innate human fear response to large snakes, predatory birds, and other predators — a composite predator archetype.',
      'Some researchers propose these traditions preserve cultural memory of actual encounters with large extinct reptiles.',
    ],
    criticisms: [
      'The specific features of dragon traditions vary so substantially across cultures that a single origin is unlikely.',
      'The "living fossil" hypothesis has no paleontological support for survival of large reptiles into the human era in the relevant regions.',
    ],
    mainstream_view: 'Folklorists and comparative mythologists study dragon traditions as one of the most widespread mythological motifs. The composite predator hypothesis is a leading naturalistic explanation for their cross-cultural prevalence.',
    tags: ['mythology', 'serpent', 'China', 'Europe', 'Quetzalcoatl', 'Rainbow Serpent', 'Naga', 'folklore'],
    evidence_level: 'verified',
    confidence_score: 0.85,
    color: '#15803d',
    icon: '🐉',
    year: -3000,
  },

];
