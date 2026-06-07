import { Theory } from '@/lib/types';

export const theories: Theory[] = [
  {
    id: 'atlantis',
    title: 'Atlantis',
    category: 'Ancient Civilizations',
    overview: 'Atlantis is a legendary island civilization first described by the ancient Greek philosopher Plato around 360 BCE. According to his dialogues Timaeus and Critias, Atlantis was a powerful naval empire that supposedly sank into the ocean "in a single day and night" due to divine punishment. Alternative researchers propose it may represent a memory of a real advanced civilization lost to history.',
    historicalBackground: 'The story originates from Plato\'s dialogues written around 360 BCE. Plato claimed the story came from Solon, who heard it from Egyptian priests. Whether Plato intended it as allegory, political commentary, or a genuine historical account remains debated among scholars. The tale describes a civilization beyond the "Pillars of Hercules" (Strait of Gibraltar) approximately 9,000 years before Solon\'s time.',
    mainClaims: [
      'An advanced civilization existed thousands of years before recorded history',
      'The civilization possessed technology far beyond what mainstream archaeology acknowledges',
      'The civilization was destroyed by a catastrophic event, possibly a flood or geological upheaval',
      'Survivors spread throughout the world, seeding ancient cultures with advanced knowledge',
      'Evidence of Atlantis may exist beneath the Atlantic Ocean or in locations like Antarctica'
    ],
    evidence: [
      { title: 'Plato\'s Dialogues', description: 'The primary source — Timaeus and Critias describe Atlantis in detail including its geography, social structure, and downfall', type: 'text', contested: true },
      { title: 'Bimini Road', description: 'Underwater formation near the Bahamas discovered in 1968, claimed by some researchers to be evidence of a sunken civilization', type: 'site', contested: true },
      { title: 'Sonar Anomalies', description: 'Various ocean floor anomalies have been proposed as potential Atlantean ruins, though none have been verified archaeologically', type: 'observation', contested: true },
      { title: 'Global Flood Myths', description: 'Nearly every ancient culture has flood myths, which some researchers connect to a real catastrophic event involving Atlantis', type: 'text', contested: true }
    ],
    criticisms: [
      'No physical evidence has ever been discovered that conclusively identifies Atlantis',
      'Most scholars believe Plato invented Atlantis as a literary device for his philosophical arguments',
      'The timeline proposed by Plato (9,600 BCE) predates known complex civilizations by thousands of years',
      'The geological record does not support a continent-sized landmass sinking rapidly in the Atlantic',
      'Proposed locations for Atlantis number in the dozens, suggesting the story may not be geographically grounded'
    ],
    mainstreamPerspective: 'Academic historians and archaeologists overwhelmingly view Atlantis as a literary invention by Plato, used to explore themes of hubris, divine punishment, and the dangers of moral corruption. The story serves clear philosophical purposes in Plato\'s work and shows signs of being crafted narrative rather than historical record.',
    sources: [
      { title: 'Timaeus', author: 'Plato', year: -360, type: 'ancient_text' },
      { title: 'Critias', author: 'Plato', year: -360, type: 'ancient_text' },
      { title: 'Atlantis: The Antediluvian World', author: 'Ignatius Donnelly', year: 1882, type: 'book' },
      { title: 'The Flood from Heaven', author: 'Eberhard Zangger', year: 1992, type: 'book' }
    ],
    relatedTopics: ['lost-civilizations', 'gobekli-tepe', 'lemuria', 'ancient-engineering', 'flood-narratives'],
    timelinePlacement: 'Allegedly 9,600 BCE according to Plato\'s account; written record 360 BCE',
    geographicConnections: ['Atlantic Ocean', 'Mediterranean Sea', 'Gibraltar', 'Bahamas', 'Santorini'],
    coordinates: [25.0, -45.0],
    tags: ['ancient', 'civilization', 'ocean', 'catastrophe', 'Plato', 'mythology'],
    difficulty: 'beginner',
    connections: ['lemuria', 'ancient-engineering', 'flood-narratives', 'gobekli-tepe', 'egyptian-mysteries'],
    color: '#00bfff',
    icon: '🌊',
    featured: true
  },
  {
    id: 'anunnaki',
    title: 'Anunnaki',
    category: 'Ancient Astronaut Theories',
    overview: 'The Anunnaki are deities from ancient Mesopotamian mythology — Sumerian, Akkadian, Assyrian, and Babylonian traditions. Alternative researchers, most notably Zecharia Sitchin, proposed that these figures were not mythological but actual extraterrestrial beings who visited Earth, genetically engineered humanity, and established the first civilizations.',
    historicalBackground: 'In ancient Mesopotamia, the Anunnaki were a group of deities associated with the sky, earth, and underworld. They appear in cuneiform texts spanning thousands of years. Zecharia Sitchin began publishing his alternative interpretations in 1976 with "The 12th Planet," claiming that ancient Sumerian texts described the Anunnaki as visitors from a hypothetical planet called Nibiru who created humans to mine gold.',
    mainClaims: [
      'The Anunnaki were extraterrestrial beings from a planet called Nibiru or Planet X',
      'They visited Earth approximately 450,000 years ago seeking gold to repair their planet\'s atmosphere',
      'They genetically engineered Homo sapiens by mixing their DNA with Homo erectus to create a worker species',
      'They established civilization, gave humanity language, law, and advanced knowledge',
      'Ancient texts and artifacts contain coded references to their presence and technology',
      'They are expected to return when Nibiru completes its alleged long orbital cycle'
    ],
    evidence: [
      { title: 'Sumerian Cuneiform Tablets', description: 'Ancient tablets describe the Anunnaki\'s actions and roles; Sitchin claimed these represent literal historical accounts of extraterrestrial activity', type: 'artifact', contested: true },
      { title: 'The Enuma Elish', description: 'Babylonian creation myth that Sitchin interpreted as a cosmological record of Nibiru\'s origin and the Anunnaki\'s activities', type: 'text', contested: true },
      { title: 'The Atra-Hasis Epic', description: 'Describes the creation of humans to labor for the gods, which proponents interpret as evidence of genetic engineering', type: 'text', contested: true },
      { title: 'Ancient Depictions', description: 'Winged figures and hybrid beings in Mesopotamian art are interpreted as realistic depictions of technologically advanced beings', type: 'artifact', contested: true }
    ],
    criticisms: [
      'Sitchin\'s translations of Sumerian texts are rejected by virtually all professional Assyriologists and Sumerologists',
      'The planet Nibiru does not exist according to astronomical observation; no evidence for Planet X in the proposed orbit',
      'Sitchin\'s interpretations often contradict established translations of the same texts',
      'The theory relies on selective reading of texts and ignoring contradictory evidence',
      'No physical evidence of extraterrestrial DNA modification has been discovered in the human genome'
    ],
    mainstreamPerspective: 'Academic scholars of ancient Mesopotamia view the Anunnaki as religious deities within a polytheistic mythological system, serving social, political, and spiritual functions similar to deities in other ancient cultures. Sitchin\'s translations are considered fundamentally flawed by professional linguists. Modern genetics traces human evolution through well-documented evolutionary processes.',
    sources: [
      { title: 'The 12th Planet', author: 'Zecharia Sitchin', year: 1976, type: 'book' },
      { title: 'The Wars of Gods and Men', author: 'Zecharia Sitchin', year: 1985, type: 'book' },
      { title: 'Mesopotamian Cosmic Geography', author: 'Wayne Horowitz', year: 1998, type: 'book' },
      { title: 'The Sumerians', author: 'Samuel Noah Kramer', year: 1963, type: 'book' }
    ],
    relatedTopics: ['ancient-astronaut', 'nephilim', 'book-of-enoch', 'sumerian-mythology', 'human-origins'],
    timelinePlacement: 'Mythological origins circa 3500 BCE; Sitchin\'s proposed timeline 450,000 BCE',
    geographicConnections: ['Mesopotamia', 'Iraq', 'Sumer', 'Babylon'],
    coordinates: [32.5, 44.4],
    tags: ['extraterrestrial', 'ancient', 'genetic engineering', 'Sumerian', 'mythology', 'Sitchin'],
    difficulty: 'intermediate',
    connections: ['ancient-astronaut', 'nephilim', 'book-of-enoch', 'human-origins', 'simulation-theory'],
    color: '#ffd700',
    icon: '👽',
    featured: true
  },
  {
    id: 'simulation-theory',
    title: 'Simulation Theory',
    category: 'Simulation Theory',
    overview: 'Simulation theory proposes that reality as we perceive it is actually a sophisticated computer simulation or computational process. Popularized by philosopher Nick Bostrom and physicists including James Gates and Neil deGrasse Tyson, the theory explores whether our universe\'s mathematical precision and quantum peculiarities might indicate we exist within a constructed reality.',
    historicalBackground: 'While ancient philosophers like Plato explored the nature of reality through allegories like the Cave, modern simulation theory emerged as a serious philosophical proposition with Nick Bostrom\'s 2003 paper "Are You Living in a Computer Simulation?" which argued that at least one of three scenarios must be true. The discovery of error-correcting codes embedded in physics equations by physicist James Gates further energized the debate.',
    mainClaims: [
      'Our universe operates according to mathematical laws consistent with computational processes',
      'Quantum mechanics\' observer effect suggests reality may render like a video game — only when observed',
      'The Planck length represents a fundamental "pixel size" suggesting a discrete, rendered universe',
      'Error-correcting codes discovered in physics equations by James Gates mirror those used in computer science',
      'Advanced civilizations would inevitably create ancestor simulations indistinguishable from base reality',
      'Consciousness may be computational rather than biological in nature'
    ],
    evidence: [
      { title: 'Bostrom\'s Trilemma', description: 'Philosophical argument that advanced civilizations will almost certainly run simulations, making simulated realities vastly outnumber real ones', type: 'document', contested: false },
      { title: 'Error-Correcting Codes in Physics', description: 'James Gates Jr. discovered doubly-even binary self-dual linear codes embedded in the equations describing supersymmetry', type: 'observation', contested: true },
      { title: 'Quantum Observer Effect', description: 'Particles appear to exist in superposition until observed, potentially suggesting computational rendering on demand', type: 'observation', contested: true },
      { title: 'Mathematical Universe Hypothesis', description: 'Max Tegmark\'s proposal that mathematics is not just a tool to describe reality but the fundamental nature of reality itself', type: 'document', contested: false }
    ],
    criticisms: [
      'No empirical test has been devised that could distinguish a simulated from a non-simulated universe',
      'The theory assumes future civilizations would have both the desire and capability to run such simulations',
      'Consciousness and subjective experience present hard problems for purely computational explanations',
      'The regress problem: if we are simulated, what is the nature of the "base reality"?',
      'Mathematical elegance in physics may reflect the structure of reality rather than computational architecture'
    ],
    mainstreamPerspective: 'Simulation theory is taken seriously by philosophers, physicists, and computer scientists as a legitimate philosophical thought experiment, though not as an accepted scientific theory. It intersects with questions about consciousness, the nature of mathematics, and anthropic reasoning. While not provable, it cannot currently be disproven either.',
    sources: [
      { title: 'Are You Living in a Computer Simulation?', author: 'Nick Bostrom', year: 2003, type: 'journal' },
      { title: 'Our Mathematical Universe', author: 'Max Tegmark', year: 2014, type: 'book' },
      { title: 'The Simulation Hypothesis', author: 'Rizwan Virk', year: 2019, type: 'book' }
    ],
    relatedTopics: ['consciousness', 'quantum-physics', 'artificial-intelligence', 'reality-nature', 'philosophy'],
    timelinePlacement: 'Modern philosophical concept, with roots in ancient philosophical inquiry; formal proposal 2003',
    geographicConnections: ['Global', 'Academic institutions worldwide'],
    tags: ['philosophy', 'physics', 'consciousness', 'technology', 'reality', 'quantum'],
    difficulty: 'advanced',
    connections: ['consciousness', 'quantum-concepts', 'human-origins', 'ai-singularity', 'holographic-universe'],
    color: '#7c3aed',
    icon: '💻',
    featured: true
  },
  {
    id: 'book-of-enoch',
    title: 'Book of Enoch',
    category: 'Book Of Enoch',
    overview: 'The Book of Enoch is an ancient Jewish religious text, attributed to Enoch, the great-grandfather of Noah. Excluded from most biblical canons but revered in Ethiopian Christianity and the Dead Sea Scrolls community, it describes the Watchers — divine beings who descended to Earth, took human wives, and produced the Nephilim. Alternative researchers propose this represents actual historical events involving advanced beings.',
    historicalBackground: 'Fragments of the Book of Enoch were found among the Dead Sea Scrolls, confirming it was circulating as early as the 3rd century BCE. The Ethiopian Orthodox Church considers it canonical scripture. It was excluded from most Christian and Jewish canons during the formation of the biblical canon in the early centuries CE. The text describes cosmic journeys, angelic hierarchies, and prophetic visions that have fascinated scholars and alternative researchers alike.',
    mainClaims: [
      'The Watchers (Grigori) were a specific class of angels who descended to Mount Hermon and made a pact',
      'The Watchers taught forbidden knowledge including astronomy, metallurgy, sorcery, and weapons-making',
      'Their offspring — the Nephilim — were giants of superhuman capabilities',
      'The Nephilim\'s violence and corruption precipitated the biblical flood as divine response',
      'The text preserves historical memory of actual beings, possibly extraterrestrial, who intervened in human affairs',
      'Hidden connections exist between Enoch, the Great Pyramid, and sacred geometry'
    ],
    evidence: [
      { title: 'Dead Sea Scrolls Fragments', description: 'Multiple copies of 1 Enoch found among the Dead Sea Scrolls indicate widespread acceptance in ancient Jewish communities', type: 'artifact', contested: false },
      { title: 'New Testament References', description: 'The Epistle of Jude quotes directly from 1 Enoch, and 2 Peter appears to reference it, suggesting early Christian familiarity', type: 'text', contested: false },
      { title: 'Cross-Cultural Giant Legends', description: 'Nearly every ancient culture maintains legends of giant beings, which proponents argue reflects the historical reality of Nephilim', type: 'text', contested: true },
      { title: 'Ethiopian Canon', description: 'The Ethiopian Orthodox Tewahedo Church includes 1 Enoch in its biblical canon, representing a preserved tradition of its authority', type: 'text', contested: false }
    ],
    criticisms: [
      'The text is considered pseudepigraphical — written centuries after Enoch\'s supposed time under a famous name',
      'Giant skeleton claims often cited as evidence have been repeatedly debunked as hoaxes or misidentified fossils',
      'The text reflects Jewish apocalyptic literature conventions of its era rather than historical record',
      'Alternative interpretations of Watchers as extraterrestrials are not supported by the text\'s own cultural context',
      'The "forbidden knowledge" described can be explained as mythological encoding of the development of civilization'
    ],
    mainstreamPerspective: 'Biblical scholars classify 1 Enoch as Jewish apocalyptic literature composed between the 3rd century BCE and 1st century CE. It represents an important window into Second Temple Judaism and early Jewish cosmology. The Watchers and Nephilim are understood as theological and mythological constructs serving moral and eschatological purposes.',
    sources: [
      { title: '1 Enoch: A Commentary', author: 'George W.E. Nickelsburg', year: 2001, type: 'academic' },
      { title: 'The Book of Enoch', author: 'R.H. Charles (translator)', year: 1912, type: 'ancient_text' },
      { title: 'Enoch and the Mosaic Torah', author: 'Gabriele Boccaccini', year: 2009, type: 'academic' }
    ],
    relatedTopics: ['nephilim', 'watchers', 'fallen-angels', 'giants', 'ancient-texts', 'flood-narratives'],
    timelinePlacement: 'Attributed to antediluvian period; composed 3rd century BCE to 1st century CE',
    geographicConnections: ['Mount Hermon', 'Jerusalem', 'Ethiopia', 'Qumran (Dead Sea)'],
    coordinates: [31.5, 35.2],
    tags: ['religion', 'angels', 'giants', 'ancient texts', 'scripture', 'forbidden knowledge'],
    difficulty: 'intermediate',
    connections: ['nephilim', 'anunnaki', 'ancient-astronaut', 'flood-narratives', 'watchers'],
    color: '#f59e0b',
    icon: '📜',
    featured: true
  },
  {
    id: 'great-pyramid',
    title: 'Great Pyramid Theories',
    category: 'Egyptian Mysteries',
    overview: 'The Great Pyramid of Giza, built around 2560 BCE, remains one of history\'s most studied and debated structures. While mainstream archaeology attributes it to Pharaoh Khufu as a tomb, alternative researchers have proposed everything from energy machines and astronomical observatories to maps of Earth\'s geography encoded in its dimensions. Its precision engineering continues to generate questions about ancient capabilities.',
    historicalBackground: 'The Great Pyramid stood as the tallest man-made structure for over 3,800 years. It contains approximately 2.3 million stone blocks averaging 2.5 to 15 tons each. The structure aligns almost perfectly with true north (within 3/60 of a degree) and is positioned near the center of Earth\'s landmass. Since the 19th century, researchers have noted mathematical relationships in its dimensions relating to Pi, Phi, and the speed of light.',
    mainClaims: [
      'The pyramid\'s precision exceeds what ancient Egyptian technology should have been capable of',
      'Mathematical constants (Pi, Phi, speed of light) encoded in its dimensions suggest advanced mathematical knowledge',
      'The pyramid\'s geographic position at Earth\'s geodetic center and its alignment with Orion\'s Belt suggest advanced astronomical knowledge',
      'Hidden chambers may still exist containing records of a pre-Egyptian civilization',
      'The structure may have functioned as an acoustic resonance device, power generator, or astronomical instrument',
      'The water erosion on the Sphinx suggests both structures are far older than mainstream dating indicates'
    ],
    evidence: [
      { title: 'Orion Correlation Theory', description: 'Robert Bauval\'s proposal that the three Giza pyramids align with Orion\'s Belt stars in their 10,500 BCE configuration', type: 'observation', contested: true },
      { title: 'Mathematical Precision', description: 'Pi ratio appears encoded in the pyramid\'s perimeter to height relationship; Phi appears in its slope angle', type: 'observation', contested: false },
      { title: 'Sphinx Water Erosion', description: 'Geologist Robert Schoch argues weathering patterns on the Sphinx indicate exposure to prolonged rainfall, possibly placing its construction before 5000 BCE', type: 'observation', contested: true },
      { title: 'Dendera Light Relief', description: 'A relief at the Dendera temple interpreted by some researchers as depicting an electric light bulb or plasma discharge device', type: 'artifact', contested: true },
      { title: 'Scorch Marks in King\'s Chamber', description: 'Unusual chemical residues and scorch marks have been noted inside the King\'s Chamber, interpreted by some as evidence of energy-related use', type: 'observation', contested: true }
    ],
    criticisms: [
      'Mathematical relationships appear significant partly due to selective measurement and the large number of possible ratios available',
      'Ancient Egyptian texts, papyri, and images document construction methods involving copper tools, wooden sledges, and organized labor',
      'The Orion correlation is disputed as the match is not precise and requires the map to be flipped',
      'Schoch\'s water erosion hypothesis is contested by most geologists and Egyptologists',
      'The "Khufu graffiti" found inside the pyramid provides direct written evidence of its construction team'
    ],
    mainstreamPerspective: 'Egyptologists and archaeologists view the Great Pyramid as a remarkable but human-achievable engineering feat, built by a well-organized state using sophisticated but non-mysterious techniques. The workers\' village discovered nearby provided extensive evidence of a paid workforce. The mathematical relationships are considered partly coincidental and partly reflect the practical geometry of pyramid construction.',
    sources: [
      { title: 'The Orion Mystery', author: 'Robert Bauval & Adrian Gilbert', year: 1994, type: 'book' },
      { title: 'The Complete Pyramids', author: 'Mark Lehner', year: 1997, type: 'book' },
      { title: 'Fingerprints of the Gods', author: 'Graham Hancock', year: 1995, type: 'book' }
    ],
    relatedTopics: ['ancient-engineering', 'lost-civilizations', 'orion-correlation', 'sphinx', 'ancient-astronomy'],
    timelinePlacement: 'Officially dated 2560 BCE; alternative dating ranges from 10,500 BCE to 36,000 BCE',
    geographicConnections: ['Giza', 'Egypt', 'Nile River', 'Cairo'],
    coordinates: [29.9792, 31.1342],
    tags: ['pyramid', 'Egypt', 'ancient engineering', 'mathematics', 'astronomy', 'Khufu'],
    difficulty: 'beginner',
    connections: ['atlantis', 'ancient-engineering', 'lost-civilizations', 'gobekli-tepe', 'orion-belt'],
    color: '#eab308',
    icon: '🔺',
    featured: true
  },
  {
    id: 'nephilim',
    title: 'Nephilim',
    category: 'Giants In History',
    overview: 'The Nephilim are enigmatic beings described in Genesis 6:4 as arising from the union of "sons of God" and "daughters of men." The word Nephilim has been translated as "giants," "fallen ones," and "those who cause others to fall." Alternative researchers connect them to global giant legends, claimed skeletal discoveries, and the Watchers of the Book of Enoch, proposing they represent a real historical race of superhuman beings.',
    historicalBackground: 'The Nephilim appear in two significant biblical contexts: before the flood (Genesis 6) and as inhabitants of Canaan encountered by Israelite spies (Numbers 13:33). The Dead Sea Scrolls and Book of Enoch elaborate on their origin as offspring of the Watchers. The Septuagint (Greek Old Testament) translates Nephilim as "gigantes" (giants). Throughout history, various cultures have maintained traditions of ancient races of giant beings.',
    mainClaims: [
      'The Nephilim were literal giants of superhuman size and strength, offspring of divine-human interbreeding',
      'Giant skeleton discoveries worldwide represent physical evidence of the Nephilim\'s historical existence',
      'The Smithsonian Institution and other bodies have systematically concealed or destroyed Nephilim skeletal evidence',
      'Ancient megalithic structures were built by the Nephilim, explaining the superhuman scale of construction',
      'Post-flood Nephilim remnants survived and appear in various biblical accounts as Rephaim, Anakim, and other groups'
    ],
    evidence: [
      { title: 'Biblical Accounts', description: 'Multiple references in Genesis, Numbers, and Deuteronomy to giant beings inhabiting Canaan and surrounding regions', type: 'text', contested: false },
      { title: 'Global Giant Legends', description: 'Native American traditions, Greek mythology, Norse sagas, and many other cultures describe races of giants predating modern humans', type: 'text', contested: false },
      { title: 'Anomalous Skeletal Reports', description: 'Numerous 19th and 20th century newspaper accounts claim discovery of giant human skeletons; proponents argue these were suppressed', type: 'testimony', contested: true },
      { title: 'Megalithic Architecture', description: 'Structures like Baalbek\'s stone blocks (weighing up to 1,650 tons) are cited as evidence that beings of superhuman strength must have built them', type: 'site', contested: true }
    ],
    criticisms: [
      'All widely circulated "giant skeleton" photographs have proven to be hoaxes, digital manipulations, or misidentified remains',
      'No confirmed giant human skeleton exceeding significantly normal human proportions has been authenticated by any scientific institution',
      'The "Smithsonian cover-up" narrative lacks credible documentation or whistleblower testimony from insiders',
      'Megalithic construction can be explained through known engineering techniques using organized labor',
      'Biblical "giants" may represent exaggerated descriptions of tall enemies or may be metaphorical language'
    ],
    mainstreamPerspective: 'Biblical scholars understand the Nephilim as theological and mythological figures within ancient Israelite religion, connected to ancient Near Eastern traditions about divine-human boundaries. No authenticated archaeological evidence supports the existence of a giant human species. The Rephaim and related groups may represent historical peoples or tribal identities exaggerated in collective memory.',
    sources: [
      { title: 'The Book of Giants', author: 'Loren Stuckenbruck', year: 1997, type: 'academic' },
      { title: 'Genes, Giants, Monsters, and Men', author: 'Joseph P. Farrell', year: 2011, type: 'book' },
      { title: 'When Giants Roamed the Earth', author: 'Steve Quayle', year: 2002, type: 'book' }
    ],
    relatedTopics: ['book-of-enoch', 'watchers', 'giants', 'ancient-civilizations', 'anunnaki'],
    timelinePlacement: 'Biblical account: pre-flood and approximately 1400-1200 BCE (Exodus period)',
    geographicConnections: ['Canaan', 'Hebron', 'Dead Sea region', 'Mesopotamia'],
    coordinates: [31.5, 35.5],
    tags: ['giants', 'biblical', 'fallen angels', 'ancient beings', 'cover-up', 'mythology'],
    difficulty: 'beginner',
    connections: ['book-of-enoch', 'anunnaki', 'watchers', 'ancient-engineering', 'flood-narratives'],
    color: '#ef4444',
    icon: '👁',
    featured: false
  },
  {
    id: 'roswell',
    title: 'Roswell Incident',
    category: 'UFOs And UAPs',
    overview: 'In July 1947, something crashed near Roswell, New Mexico. The initial U.S. Army Air Force press release announced the recovery of a "flying disc." Within hours, this was retracted and explained as a weather balloon. Decades of witness testimony, document releases, and government statements have made Roswell the most famous alleged UFO crash in history, raising fundamental questions about government transparency and extraterrestrial contact.',
    historicalBackground: 'Mac Brazel discovered unusual debris on the Foster Ranch in early July 1947. Roswell Army Air Field intelligence officer Jesse Marcel was dispatched to investigate. On July 8, 1947, the RAAF public information office issued a press release announcing recovery of a "flying disc." Within hours, the story was changed to a weather balloon. In 1978, Major Jesse Marcel broke decades of silence to claim the material was not any weather balloon he had ever seen. The 1994 Air Force report attributed the crash to Project Mogul — a classified balloon program. Many witnesses maintained different accounts until their deaths.',
    mainClaims: [
      'An extraterrestrial spacecraft crashed near Roswell and was recovered by the U.S. military',
      'Non-human bodies were recovered from the crash site and taken to facilities for examination',
      'The U.S. government engaged in a systematic cover-up that has persisted for over 75 years',
      'Witness testimony from military personnel, civilians, and medical staff consistently describes non-human remains',
      'Reverse engineering of recovered technology accelerated 20th century technological development'
    ],
    evidence: [
      { title: 'Jesse Marcel Testimony', description: 'The intelligence officer who retrieved the debris stated in later years that the material was unlike anything he had seen and did not match any known aircraft', type: 'testimony', contested: true },
      { title: 'Multiple Witness Accounts', description: 'Dozens of individuals claimed to have seen unusual debris, non-human bodies, or were warned to stay silent under military orders', type: 'testimony', contested: true },
      { title: '1947 Press Release', description: 'The original Army Air Force press release announcing recovery of a "flying disc" before rapid retraction', type: 'document', contested: false },
      { title: 'Deathbed Testimonies', description: 'Several individuals claimed on their deathbeds to have witnessed non-human beings or unusual materials at Roswell', type: 'testimony', contested: true }
    ],
    criticisms: [
      'The 1994 Air Force report attributed the crash to Project Mogul — a classified high-altitude balloon project with unusual reflective material',
      'Memory is demonstrably unreliable, especially over decades; witnesses may have added details over time',
      'No physical evidence authenticated as extraterrestrial has been publicly verified',
      'The "alien bodies" may have been crash test dummies used in Project High Dive parachute tests',
      'The desire to believe in extraterrestrial contact may have shaped witness memories over time'
    ],
    mainstreamPerspective: 'The U.S. government\'s official explanation attributes the Roswell incident to debris from Project Mogul, a classified program using high-altitude balloons to monitor Soviet nuclear tests. Most aerospace historians accept this explanation. The initial press release error and subsequent cover-up of Mogul\'s classified nature created the conditions for the UFO narrative to develop.',
    sources: [
      { title: 'The Roswell Incident', author: 'Charles Berlitz & William Moore', year: 1980, type: 'book' },
      { title: 'Witness to Roswell', author: 'Thomas Carey & Donald Schmitt', year: 2007, type: 'book' },
      { title: 'The Roswell Report: Case Closed', author: 'U.S. Air Force', year: 1997, type: 'website' }
    ],
    relatedTopics: ['uap-reports', 'government-disclosure', 'area-51', 'alien-contact', 'secret-societies'],
    timelinePlacement: 'July 1947; public revelation of witnesses 1978 onward',
    geographicConnections: ['Roswell, New Mexico', 'Wright-Patterson Air Force Base', 'Area 51', 'White Sands'],
    coordinates: [33.3943, -104.5230],
    tags: ['UFO', 'crash', 'government', 'cover-up', 'extraterrestrial', 'military', '1947'],
    difficulty: 'beginner',
    connections: ['uap-reports', 'area-51', 'government-disclosure', 'secret-societies', 'ancient-astronaut'],
    color: '#22c55e',
    icon: '🛸',
    featured: true
  },
  {
    id: 'secret-societies',
    title: 'Secret Societies',
    category: 'Secret Societies',
    overview: 'Throughout history, organizations have operated with varying degrees of secrecy, exclusive membership, and esoteric knowledge claims. From the Freemasons and Rosicrucians to Skull and Bones and the Illuminati, these groups have inspired theories about hidden power structures shaping world events. While documented connections exist between members and historical events, the degree of coordinated influence remains hotly debated.',
    historicalBackground: 'Organized secret brotherhoods have documented histories dating back centuries. The Freemasons trace their organizational origins to 1717 in London, though they claim connections to medieval stonemason guilds and even Solomon\'s Temple. The Illuminati was founded by Adam Weishaupt in Bavaria in 1776 and was suppressed within a decade, though its name became attached to conspiracy theories about continued covert influence. The Skull and Bones society at Yale has counted among its members U.S. Presidents, CIA directors, and powerful political figures since 1832.',
    mainClaims: [
      'Secret societies coordinate global events including wars, economic crises, and political transitions',
      'Membership networks provide an invisible power structure above formal governments',
      'Esoteric knowledge preserved in these societies includes suppressed historical truths and technologies',
      'Symbols embedded in architecture, currency, and media signal coordination between members',
      'A unified agenda exists for global governance under the control of a hidden elite'
    ],
    evidence: [
      { title: 'Documented Membership Overlaps', description: 'Multiple U.S. Presidents, intelligence chiefs, and powerful figures are documented members of organizations like Skull and Bones, Council on Foreign Relations, and Bilderberg Group', type: 'document', contested: false },
      { title: 'Masonic Symbolism in Architecture', description: 'Deliberate use of Masonic symbols in the layout of Washington D.C. and government buildings, acknowledged by historical accounts', type: 'observation', contested: false },
      { title: 'Bohemian Grove', description: 'Documented annual gathering of powerful political and business figures at a private California estate, featuring ritual performances', type: 'observation', contested: false },
      { title: 'Skull and Bones Roster', description: 'Documented membership including William Howard Taft, George H.W. Bush, George W. Bush, John Kerry and other influential figures', type: 'document', contested: false }
    ],
    criticisms: [
      'Most "secret" societies have documented public histories, published rosters, and charitable activities',
      'Shared membership in elite networks reflects class advantage rather than coordinated conspiracy',
      'Historians find no evidence of the unified hidden agenda claimed by conspiracy theories',
      'The Illuminati was definitively suppressed in 1785; its modern usage is largely symbolic or metaphorical',
      'Power concentrations can be explained by social networks and privilege without requiring secret coordination'
    ],
    mainstreamPerspective: 'Historians acknowledge that elite social networks including gentlemen\'s clubs, fraternities, and professional societies have historically influenced political and economic decisions through shared membership. However, evidence for coordinated secret governance is not established. These networks represent social stratification and informal influence rather than a hidden world government.',
    sources: [
      { title: 'The Secret Architecture of Our Nation\'s Capital', author: 'David Ovason', year: 1999, type: 'book' },
      { title: 'America\'s Secret Establishment', author: 'Antony Sutton', year: 1986, type: 'book' },
      { title: 'The Illuminati: The Secret Society That Hijacked the World', author: 'Jim Marrs', year: 2017, type: 'book' }
    ],
    relatedTopics: ['illuminati', 'freemasons', 'skull-and-bones', 'global-power', 'elite-influence'],
    timelinePlacement: 'Documented history from 1717 (Freemasonry); modern period 1776 (Illuminati)-present',
    geographicConnections: ['London', 'Bavaria', 'Washington D.C.', 'Yale University', 'Rome'],
    coordinates: [38.8951, -77.0364],
    tags: ['conspiracy', 'elite', 'power', 'Freemasons', 'Illuminati', 'government'],
    difficulty: 'beginner',
    connections: ['global-power', 'roswell', 'uap-reports', 'elite-influence', 'financial-systems'],
    color: '#8b5cf6',
    icon: '🔐',
    featured: false
  },
  {
    id: 'gobekli-tepe',
    title: 'Göbekli Tepe',
    category: 'Ancient Civilizations',
    overview: 'Göbekli Tepe in southeastern Turkey is the oldest known monumental structure in the world, dated to approximately 9600-8200 BCE — predating Stonehenge by 6,000 years and the Egyptian pyramids by 7,000 years. Its existence challenges the conventional narrative of civilization\'s development, as it was built by people believed to have been hunter-gatherers, suggesting organized complex society existed far earlier than previously understood.',
    historicalBackground: 'Discovered by Klaus Schmidt in 1994, Göbekli Tepe consists of massive T-shaped limestone pillars arranged in circles, weighing up to 10-20 tons each, decorated with sophisticated animal carvings. Schmidt\'s excavation revealed the site was deliberately buried around 8000 BCE. It predates pottery, writing, and agriculture. The scale of organization required to build it implies social complexity far beyond what was thought possible for its era.',
    mainClaims: [
      'Göbekli Tepe represents the world\'s oldest known religious or ceremonial complex, suggesting organized spirituality predates civilization as defined',
      'Its existence proves that complex social organization, engineering capability, and symbolic thinking existed 12,000 years ago',
      'The site may represent the earliest evidence of an advanced pre-agricultural civilization potentially connected to Atlantis or other lost cultures',
      'Deliberate burial of the site encoded information for future discovery',
      'Astrological alignments embedded in the site\'s structure suggest advanced astronomical knowledge'
    ],
    evidence: [
      { title: 'Carbon Dating', description: 'Organic material found at the site has been carbon dated to approximately 9600-8200 BCE with high confidence', type: 'artifact', contested: false },
      { title: 'Architectural Complexity', description: 'The scale and precision of construction, including 10-20 ton limestone pillars moved and erected without modern equipment, indicates significant organizational capability', type: 'site', contested: false },
      { title: 'Sophisticated Iconography', description: 'Detailed animal carvings, abstract symbols, and anthropomorphic T-pillars demonstrate advanced artistic and symbolic thinking', type: 'artifact', contested: false },
      { title: 'Astronomical Alignments', description: 'Research by various teams has proposed that pillar arrangements correspond to specific star patterns, suggesting astronomical knowledge', type: 'observation', contested: true }
    ],
    criticisms: [
      'The existence of Göbekli Tepe is not disputed; it is the interpretation of what it implies that varies',
      'Building complex structures does not require the level of civilization assumed by alternative researchers',
      'Mobile hunter-gatherer communities have created impressive structures in many documented cultures',
      'The site does not demonstrate writing, mathematics, or technology beyond its structural achievement',
      'Connection to Atlantis or other lost civilizations is not supported by the archaeological evidence at the site'
    ],
    mainstreamPerspective: 'Archaeologists view Göbekli Tepe as a revolutionary discovery that genuinely pushes back the timeline of complex religious and social organization. It demonstrates that hunter-gatherer communities could achieve remarkable things but does not necessitate the existence of a prior advanced civilization. It represents complexity within the Neolithic, not a remnant of an earlier high civilization.',
    sources: [
      { title: 'Göbekli Tepe: Genesis of the Gods', author: 'Andrew Collins', year: 2014, type: 'book' },
      { title: 'Who Built Göbekli Tepe?', author: 'Klaus Schmidt', year: 2010, type: 'journal' },
      { title: 'The First Temple', author: 'Ian Tattersall', year: 2016, type: 'journal' }
    ],
    relatedTopics: ['atlantis', 'lost-civilizations', 'ancient-engineering', 'human-origins', 'ancient-religion'],
    timelinePlacement: '9600-8200 BCE',
    geographicConnections: ['Şanlıurfa Province, Turkey', 'Anatolia', 'Fertile Crescent'],
    coordinates: [37.2231, 38.9224],
    tags: ['prehistoric', 'Turkey', 'megalith', 'ancient religion', 'hunter-gatherer', 'revolutionary'],
    difficulty: 'intermediate',
    connections: ['atlantis', 'lost-civilizations', 'ancient-engineering', 'human-origins', 'flood-narratives'],
    color: '#a16207',
    icon: '🗿',
    featured: true
  },
  {
    id: 'reptilian-theory',
    title: 'Reptilian Theory',
    category: 'Reptilian Theory',
    overview: 'Popularized by former BBC broadcaster David Icke in the 1990s, the Reptilian theory proposes that shape-shifting extraterrestrial reptilian beings have infiltrated human society by taking human form, occupying positions of power in governments, royal families, corporations, and media. The theory draws on ancient reptilian deity descriptions, DNA research, and claimed eyewitness accounts.',
    historicalBackground: 'David Icke introduced this theory in his 1998 book "The Biggest Secret," claiming that a race of reptilian extraterrestrials called the Anunnaki (borrowing from Sitchin\'s work) have been interbreeding with humanity for thousands of years and now control society through bloodlines. The theory gained enormous online traction in the early 2000s. Critics have noted that the theory\'s framing has antisemitic parallels, a charge Icke has repeatedly denied. Ancient cultures from the Egyptians to the Nagas of India describe reptilian divine beings.',
    mainClaims: [
      'Reptilian extraterrestrial beings exist and can shift between reptilian and human form',
      'These beings have occupied positions of power throughout history, including modern political and financial leadership',
      'Specific bloodlines maintain their power through carefully managed interbreeding with reptilian genetics',
      'Ancient cultures worldwide preserved knowledge of reptilian divine beings in their mythologies',
      'The global control system is maintained through psychological manipulation using media and institutions'
    ],
    evidence: [
      { title: 'Ancient Reptilian Deities', description: 'Numerous ancient cultures describe reptilian or serpentine divine beings including Nagas (India), Quetzalcoatl (Mesoamerica), and Egyptian cobra deities', type: 'text', contested: false },
      { title: 'Eye Color Anomalies in Video', description: 'Low-resolution video compression artifacts have been interpreted by proponents as evidence of reptilian eyes beneath human appearances', type: 'observation', contested: true },
      { title: 'Eyewitness Testimonies', description: 'Icke and others have collected testimonies from individuals claiming to have witnessed shape-shifting behavior', type: 'testimony', contested: true }
    ],
    criticisms: [
      'No credible, authenticated evidence of shape-shifting or reptilian biology in any human being has been presented',
      'The theory relies on unfalsifiable claims that cannot be tested or disproven',
      'Many scholars have noted that "reptilian elites" maps onto historical antisemitic tropes about secret Jewish control',
      'Video "evidence" consists entirely of compression artifacts in digital video, a well-understood technical phenomenon',
      'The biological implausibility of shape-shifting based on current understanding of genetics and physiology is extreme'
    ],
    mainstreamPerspective: 'The reptilian conspiracy theory is rejected by scientists, historians, and political analysts as having no empirical basis. Psychologists and sociologists have studied it as an example of how conspiracy theories function as meaning-making systems during perceived social uncertainty. The theory\'s persistence is studied more for what it reveals about social psychology than for its content.',
    sources: [
      { title: 'The Biggest Secret', author: 'David Icke', year: 1998, type: 'book' },
      { title: 'Children of the Matrix', author: 'David Icke', year: 2001, type: 'book' },
      { title: 'A Culture of Conspiracy', author: 'Michael Barkun', year: 2003, type: 'academic' }
    ],
    relatedTopics: ['secret-societies', 'global-power', 'ancient-astronaut', 'anunnaki', 'elite-control'],
    timelinePlacement: 'Modern theory: 1990s-present; ancient reptilian mythology: thousands of years old',
    geographicConnections: ['Global', 'United Kingdom', 'United States'],
    tags: ['extraterrestrial', 'shapeshifting', 'elite', 'David Icke', 'control', 'mythology'],
    difficulty: 'beginner',
    connections: ['secret-societies', 'anunnaki', 'global-power', 'ancient-astronaut', 'simulation-theory'],
    color: '#15803d',
    icon: '🦎',
    featured: false
  },
  {
    id: 'stoned-ape',
    title: 'Stoned Ape Theory',
    category: 'Human Origins',
    overview: 'Proposed by ethnobotanist Terence McKenna, the Stoned Ape Hypothesis suggests that psilocybin mushrooms played a critical role in the rapid expansion of human consciousness and cognitive capabilities that occurred approximately 2-3 million years ago. McKenna argued that as African savanna forests receded, early hominids following cattle herds consumed mushrooms growing in dung, triggering neurological development.',
    historicalBackground: 'Terence McKenna introduced the theory in his 1992 book "Food of the Gods." The hypothesis attempts to explain what evolutionary biologists call the "neural leap" — the unusually rapid tripling of human brain size over roughly 2 million years, with no clear evolutionary predecessor of equivalent cognitive capability. McKenna proposed that psilocybin\'s neurological effects — enhanced visual acuity, increased energy, neural plasticity — provided selective advantages.',
    mainClaims: [
      'Psilocybin mushroom consumption by early hominids directly enhanced cognitive function, contributing to brain size increase',
      'Enhanced visual acuity at low doses provided hunting advantages, favoring survival of mushroom-consuming individuals',
      'Higher doses triggered states of ego dissolution, pattern recognition, and creative thinking that accelerated language and tool development',
      'Psilocybin promotes neuroplasticity and neurogenesis, which over generations may have influenced brain development trajectories',
      'The universal human affinity for altered states reflects an evolutionary relationship with psychedelic plants'
    ],
    evidence: [
      { title: 'Neuroplasticity Research', description: 'Modern studies confirm psilocybin promotes neuroplasticity, new neural connection formation, and neurogenesis in adult brains', type: 'observation', contested: false },
      { title: 'Magdalenian Cave Art', description: 'Some paleolithic cave art, particularly at sites like Selva Pascuala, has been interpreted as depicting mushrooms and possible altered states', type: 'artifact', contested: true },
      { title: 'African Ecology', description: 'Psilocybe cubensis grows naturally in sub-Saharan Africa in cattle dung, in environments consistent with early hominid habitat expansion', type: 'observation', contested: false }
    ],
    criticisms: [
      'The theory is nearly impossible to test or falsify with current methods',
      'No definitive evidence links psilocybin consumption to human evolutionary development',
      'Brain size increase has multiple potential explanatory factors including diet, tool use, social complexity, and sexual selection',
      'The timeline of mushroom availability and early hominid migration patterns is contested',
      'Professional evolutionary biologists have not adopted the hypothesis as a significant explanatory framework'
    ],
    mainstreamPerspective: 'Mainstream evolutionary biology attributes the rapid brain size increase in human ancestors to a complex interplay of factors including dietary changes (particularly increased meat and cooked food consumption), social complexity, bipedal locomotion, tool use, and sexual selection. The Stoned Ape hypothesis is considered speculative and untestable. Modern research does confirm psilocybin\'s neurological effects but does not support the evolutionary claims.',
    sources: [
      { title: 'Food of the Gods', author: 'Terence McKenna', year: 1992, type: 'book' },
      { title: 'The Origins of the Human Brain', author: 'Jean-Pierre Changeux', year: 1985, type: 'academic' },
      { title: 'How to Change Your Mind', author: 'Michael Pollan', year: 2018, type: 'book' }
    ],
    relatedTopics: ['human-origins', 'consciousness', 'psychedelics', 'evolution', 'neuroscience'],
    timelinePlacement: 'Hypothesis covers 2-3 million years ago; modern formulation 1992',
    geographicConnections: ['Sub-Saharan Africa', 'East African Rift Valley'],
    coordinates: [-1.0, 37.0],
    tags: ['evolution', 'consciousness', 'psychedelics', 'McKenna', 'brain', 'mushrooms'],
    difficulty: 'intermediate',
    connections: ['consciousness', 'human-origins', 'simulation-theory', 'ancient-religion', 'philosophy'],
    color: '#7c3aed',
    icon: '🍄',
    featured: false
  },
  {
    id: 'ancient-astronaut',
    title: 'Ancient Astronaut Theory',
    category: 'Ancient Astronaut Theories',
    overview: 'Ancient astronaut theory proposes that intelligent extraterrestrial beings visited Earth in prehistory and were recorded as gods, angels, or divine beings in mythology and religious texts. Their encounters were expressed in architecture, iconography, and ritual. Popularized by Erich von Däniken in 1968, the framework argues that unexplained engineering achievements and cross-cultural descriptions of aerial beings reflect actual contact events rather than mythology.',
    historicalBackground: 'Erich von Däniken\'s 1968 "Chariots of the Gods?" brought the hypothesis to mass audiences, cataloguing sites from the Nazca lines to the pyramids as evidence of extraterrestrial assistance. Zecharia Sitchin developed a parallel argument from Mesopotamian texts, proposing the Anunnaki were literal astronauts. The theory gained substantial cultural reach through the History Channel\'s "Ancient Aliens" series beginning in 2009. It draws on a wide reading of ancient texts, artwork, and architectural anomalies across unconnected civilizations as converging evidence.',
    mainClaims: [
      'Extraterrestrial beings visited Earth in prehistoric and ancient times and were recorded as gods across independent cultural traditions',
      'Ancient texts including Sumerian tablets, the Vedas, Ezekiel\'s vision, and Mesoamerican codices describe spacecraft and advanced technology in pre-modern language',
      'Architectural achievements — Egyptian pyramids, Baalbek, Sacsayhuamán, Göbekli Tepe — required knowledge or technology beyond demonstrated ancient capability',
      'The Nazca lines and similar geoglyphs served as landing markers or astronomical signals for aerial observers',
      'Human cognitive and cultural development was accelerated by deliberate extraterrestrial intervention or genetic modification'
    ],
    evidence: [
      { title: 'Vedic Vimana Descriptions', description: 'Sanskrit texts including the Ramayana and Mahabharata describe Vimanas as aerial vehicles capable of flight between cities and across the sky, interpreted by proponents as aircraft or spacecraft', type: 'text', contested: true },
      { title: 'Palenque Sarcophagus Lid', description: 'The tomb lid of Maya ruler Pakal depicts him reclining amid mechanical imagery; von Däniken interpreted this as an astronaut at spacecraft controls, though Mayanists identify it as a standard death-and-rebirth scene', type: 'artifact', contested: true },
      { title: 'Nazca Lines', description: 'Vast geoglyphs in the Peruvian desert, some only fully visible from altitude, proposed as landing markers; archaeological evidence shows Nazca culture created them with simple surveying tools', type: 'site', contested: true },
      { title: 'Ezekiel\'s Wheel Vision', description: 'The biblical prophet Ezekiel\'s description of a wheeled celestial vehicle with living creatures has been interpreted by Josef Blumrich (former NASA engineer) as a detailed spacecraft description', type: 'text', contested: true }
    ],
    criticisms: [
      'The theory consistently underestimates ancient human ingenuity and the documented capabilities of organized labor forces',
      'Every cited engineering achievement has alternative explanations supported by incremental archaeological evidence of technique development',
      'Von Däniken\'s and Sitchin\'s interpretations frequently contradict the cultural context established by mainstream scholars of the same texts',
      'The framework has been criticized for implicitly denying the creative and intellectual agency of ancient non-European peoples',
      'Mainstream archaeologists, Egyptologists, Mayanists, and Assyriologists uniformly reject the hypothesis as lacking credible evidentiary basis'
    ],
    mainstreamPerspective: 'Mainstream archaeology and anthropology regard ancient astronaut theory as pseudoscience that misinterprets artifacts, mistranslates ancient texts, and ignores established archaeological context. Every proposed example of extraterrestrial influence has documented alternative explanations grounded in physical evidence. Professional scholars study the theory\'s cultural appeal as a social phenomenon rather than engaging with its claims as archaeology.',
    sources: [
      { title: 'Chariots of the Gods?', author: 'Erich von Däniken', year: 1968, type: 'book' },
      { title: 'The Spaceships of Ezekiel', author: 'Josef Blumrich', year: 1974, type: 'book' },
      { title: 'Frauds, Myths, and Mysteries', author: 'Kenneth Feder', year: 2018, type: 'academic' }
    ],
    relatedTopics: ['anunnaki', 'nephilim', 'watchers', 'ancient-engineering', 'uap-reports'],
    timelinePlacement: 'Alleged visits proposed from 450,000 BCE to approximately 3000 BCE; modern theory formulated 1968',
    geographicConnections: ['Mesopotamia', 'Egypt', 'Peru', 'Mexico', 'India', 'Cambodia'],
    coordinates: [29.9, 31.1],
    tags: ['extraterrestrial', 'ancient', 'mythology', 'von Däniken', 'gods', 'intervention'],
    difficulty: 'beginner',
    connections: ['anunnaki', 'nephilim', 'gobekli-tepe', 'great-pyramid', 'roswell'],
    color: '#f97316',
    icon: '🌌',
    featured: false
  },
  {
    id: 'flood-narratives',
    title: 'Global Flood Narratives',
    category: 'Religion And Ancient Texts',
    overview: 'More than 200 independent flood myths exist across cultures with no documented contact — Mesopotamian (Epic of Gilgamesh), Hebrew (Genesis), Hindu (Manu Smriti), Greek (Deucalion), Mesoamerican (Popol Vuh), Chinese (Gun-Yu), and dozens of indigenous traditions across six continents. Alternative researchers cite this convergence as evidence of a real catastrophic flood event that reset human civilization around 10,000–5,000 BCE, possibly connected to post-glacial sea level rise, a cosmic impact, or a regional megaflood.',
    historicalBackground: 'The discovery that the Epic of Gilgamesh (ca. 2100 BCE) contains a flood narrative virtually identical to Genesis — including a boat, a single survivor family, birds sent to find land, and a divine promise afterward — shocked Victorian scholars when George Smith translated the tablet in 1872. The Black Sea Flood hypothesis, proposed by geologists William Ryan and Walter Pitman in 1997, suggests the Mediterranean breached into the Black Sea basin around 5600 BCE in a catastrophic flooding event, potentially matching the geographic memory preserved in Near Eastern flood texts.',
    mainClaims: [
      'A real catastrophic flood event occurred in human prehistory, preserved in cultural memory across all inhabited continents as convergent flood traditions',
      'Post-glacial sea level rise (120 metres between 19,000 and 7,000 BCE) inundated vast coastal regions where early civilizations may have existed',
      'The Black Sea catastrophic inundation around 5600 BCE provides a plausible basis for Near Eastern flood myths',
      'The Younger Dryas Impact hypothesis proposes a cosmic impact or airburst around 10,800 BCE caused civilizational collapse and flood conditions',
      'Advanced coastal civilizations lost to post-glacial sea level rise would explain the parallel accounts of a pre-flood world with greater knowledge'
    ],
    evidence: [
      { title: 'Epic of Gilgamesh — Tablet XI', description: 'Sumerian/Akkadian flood narrative predating Genesis by centuries, with near-identical structure: divine warning to one man, boat construction, animal preservation, dove and raven reconnaissance, and divine covenant after flood', type: 'text', contested: false },
      { title: 'Black Sea Flood Evidence', description: 'Geologists Ryan and Pitman documented submerged ancient shorelines and freshwater species below the current Black Sea salt layer, consistent with catastrophic inundation around 5600 BCE', type: 'observation', contested: true },
      { title: 'Younger Dryas Boundary Layer', description: 'A platinum-rich impact layer across multiple continents dated to approximately 10,800 BCE, associated with abrupt climate shift, coincides with widespread evidence of megafauna extinction and human population disruption', type: 'observation', contested: true },
      { title: 'Cross-Cultural Structural Parallels', description: 'Flood narratives across independent traditions share structural elements: divine warning, single survivor, vessel, animal preservation, bird reconnaissance, and divine covenant — a convergence statistically difficult to attribute to coincidence', type: 'text', contested: false }
    ],
    criticisms: [
      'Flood myths differ significantly in detail across cultures; the structural similarities may reflect universal storytelling patterns rather than shared historical memory',
      'The Black Sea hypothesis explains only Near Eastern traditions and cannot account for flood myths in Australia, the Americas, or sub-Saharan Africa',
      'Post-glacial sea level rise was gradual over thousands of years, not a single catastrophic event in most regions',
      'The Younger Dryas Impact hypothesis remains contested among geologists; the platinum layer has multiple possible explanations',
      'Anthropologists find that flood myths often encode seasonal or agricultural cycles rather than literal historical events'
    ],
    mainstreamPerspective: 'Biblical scholars and anthropologists view flood myths as serving theological, cosmological, and moral functions within their respective traditions. The Epic of Gilgamesh parallel is explained by shared oral tradition within the ancient Near East rather than a universal historical event. Geologists acknowledge post-glacial flooding events but consider the idea of a single global flood within human memory unsupported. The Black Sea hypothesis is a legitimate ongoing scientific debate.',
    sources: [
      { title: 'Noah\'s Flood', author: 'William Ryan & Walter Pitman', year: 1998, type: 'book' },
      { title: 'The Epic of Gilgamesh', author: 'Andrew George (translator)', year: 2003, type: 'ancient_text' },
      { title: 'Magicians of the Gods', author: 'Graham Hancock', year: 2015, type: 'book' }
    ],
    relatedTopics: ['atlantis', 'book-of-enoch', 'nephilim', 'lost-civilizations', 'watchers'],
    timelinePlacement: 'Proposed events: 10,800 BCE (Younger Dryas) to 5600 BCE (Black Sea); oldest written accounts ca. 2100 BCE',
    geographicConnections: ['Mesopotamia', 'Black Sea', 'Near East', 'Global indigenous traditions'],
    coordinates: [37.9, 41.0],
    tags: ['flood', 'mythology', 'catastrophe', 'Gilgamesh', 'Genesis', 'prehistory'],
    difficulty: 'beginner',
    connections: ['atlantis', 'book-of-enoch', 'nephilim', 'gobekli-tepe', 'lost-civilizations'],
    color: '#0ea5e9',
    icon: '⛈️',
    featured: false
  },
  {
    id: 'ancient-engineering',
    title: 'Ancient Engineering Anomalies',
    category: 'Ancient Civilizations',
    overview: 'A cluster of ancient construction achievements challenges standard archaeological explanations of available technology. The Great Pyramid\'s 2.3 million multi-ton blocks with sub-centimetre joint tolerances, Baalbek\'s 1,650-tonne monoliths, Sacsayhuamán\'s interlocking polygonal stones without mortar, and Puma Punku\'s machine-like H-shaped andesite blocks represent engineering feats whose mechanisms remain actively debated. Alternative researchers propose a lost technology, predecessor civilization, or external assistance as explanations mainstream archaeology has not fully addressed.',
    historicalBackground: 'The engineering puzzles of antiquity have fascinated researchers since the Enlightenment. The precision of the Great Pyramid was confirmed by modern survey (the base is level to within 2.1 centimetres across 230 metres), and its orientation to true north is accurate to 0.05 degrees — more precise than the Paris Observatory. The 800-tonne "Stone of the Pregnant Woman" at Baalbek remains the largest quarried stone in the world and was never moved to the building site. Puma Punku\'s andesite blocks show cuts and bores consistent with machine tooling, though no tools capable of this work have been found in context.',
    mainClaims: [
      'The engineering precision of multiple ancient sites exceeds what contemporary scholarship attributes to the tools and organizational capability of the time',
      'The movement and placement of multi-hundred-tonne stone blocks at sites including Baalbek, Göbekli Tepe, and the pyramids requires explanations beyond simple ramp-and-sledge models',
      'Puma Punku\'s geometric stone cutting and bore holes are consistent with machine tooling, suggesting a technology that has not survived archaeologically',
      'The geographic distribution of similar megalithic construction techniques across cultures with no documented contact implies either diffusion from a single advanced source or parallel development of lost methods',
      'Acoustic properties, geodetic positioning, and mathematical constants embedded in ancient structures suggest purposes beyond simple tombs or temples'
    ],
    evidence: [
      { title: 'Great Pyramid Survey Data', description: 'Modern surveys confirm base levelling to 2.1 cm across 230 m and true north alignment within 0.05 degrees, raising questions about the surveying instruments used', type: 'observation', contested: false },
      { title: 'Baalbek Monoliths', description: 'The Temple of Jupiter platform includes stones weighing 800–1,650 tonnes; the largest was quarried but never moved, suggesting the capability to move similar stones that were emplaced elsewhere', type: 'site', contested: false },
      { title: 'Sacsayhuamán Polygonal Masonry', description: 'Interlocking polygonal Inca stonework with no mortar, joints fitting to within a fraction of a millimetre, constructed with stone types from quarries up to 90 km away', type: 'site', contested: false },
      { title: 'Puma Punku Stone Cutting', description: 'H-shaped andesite blocks at Puma Punku show geometric precision and bore holes whose regularity proponents argue requires rotary cutting tools not present in the archaeological record', type: 'artifact', contested: true }
    ],
    criticisms: [
      'Experimental archaeology has demonstrated that organized labor using copper tools, wooden sledges, and lubricants can reproduce ancient Egyptian construction methods at scale',
      'The absence of tools capable of Puma Punku\'s cuts may reflect incomplete archaeological recovery rather than technological absence',
      'Baalbek\'s large stones predate the Roman temple and may have served as a quarry rather than a building component',
      'Acoustic and mathematical properties cited in ancient structures often reflect selective measurement or projection of modern frameworks onto ancient design',
      'Cross-cultural similarity in megalithic construction reflects universal solutions to engineering constraints rather than shared advanced technology or diffusion'
    ],
    mainstreamPerspective: 'Mainstream archaeologists acknowledge that ancient construction achievements are remarkable and that full explanatory models are not always complete. However, the gap between ancient capability and achievement is consistently narrowed by experimental archaeology. Every site has plausible models grounded in known materials and human organization. The persistent appeal of alternative explanations is studied as a cultural phenomenon.',
    sources: [
      { title: 'The Complete Pyramids', author: 'Mark Lehner', year: 1997, type: 'book' },
      { title: 'Baalbek: Lebanon\'s Sacred Fortress', author: 'Friedrich Ragette', year: 1980, type: 'book' },
      { title: 'Technology of the Gods', author: 'David Childress', year: 2000, type: 'book' }
    ],
    relatedTopics: ['great-pyramid', 'gobekli-tepe', 'lost-civilizations', 'nephilim', 'ancient-astronaut'],
    timelinePlacement: 'Sites range from 9600 BCE (Göbekli Tepe) to approximately 500 CE (Tiwanaku)',
    geographicConnections: ['Egypt', 'Lebanon', 'Peru', 'Bolivia', 'Turkey', 'Malta', 'Easter Island'],
    coordinates: [29.9, 31.1],
    tags: ['megalith', 'construction', 'precision', 'pyramid', 'Baalbek', 'technology'],
    difficulty: 'intermediate',
    connections: ['great-pyramid', 'gobekli-tepe', 'atlantis', 'nephilim', 'lost-civilizations'],
    color: '#d97706',
    icon: '⚙️',
    featured: false
  },
  {
    id: 'human-origins',
    title: 'Human Origins Debates',
    category: 'Human Origins',
    overview: 'The standard evolutionary model places modern Homo sapiens emerging in Africa approximately 300,000 years ago, with a "cognitive revolution" around 70,000–50,000 BCE producing the behavioral modernity seen in art, symbolic thinking, and complex language. Alternative frameworks challenge aspects of this timeline: Göbekli Tepe at 9600 BCE demonstrates social complexity millennia earlier than expected; anomalous genetic markers suggest population bottlenecks or introgressions not fully modelled; and the Anunnaki hypothesis, Stoned Ape theory, and ancient astronaut frameworks each propose non-standard mechanisms for the origin of human cognitive capability.',
    historicalBackground: 'Paleoanthropology has revised the human origins timeline substantially since the 1990s. Homo sapiens fossils at Jebel Irhoud (Morocco) dated to 315,000 years ago pushed back anatomically modern humans by 100,000 years. The discovery that modern humans carry 1–4% Neanderthal DNA (and additional Denisovan DNA in Pacific populations) confirmed interbreeding with archaic human species. Göbekli Tepe\'s 9600 BCE complexity challenged the "agricultural revolution necessitated civilization" model. Mitochondrial DNA analysis identified a severe population bottleneck approximately 70,000 years ago, consistent with a near-extinction event, potentially coinciding with the Toba supervolcanic eruption.',
    mainClaims: [
      'The timeline and mechanism of human cognitive development contain unexplained gaps and accelerations not fully accounted for by the standard evolutionary model',
      'Archaeological evidence of complex symbolic behavior appears earlier and more discontinuously than a gradual emergence model predicts',
      'Genetic evidence of archaic human introgression (Neanderthal, Denisovan, and unidentified "ghost lineages") suggests a more complex ancestry than previously modelled',
      'The Toba catastrophe around 74,000 BCE may have created a severe population bottleneck, with implications for how modern human traits became universal',
      'External intervention — whether extraterrestrial, chemical (psychedelics), or contact with a lost advanced civilization — is proposed by alternative researchers as a mechanism for unexplained cognitive acceleration'
    ],
    evidence: [
      { title: 'Jebel Irhoud Fossils', description: 'Anatomically modern Homo sapiens fossils dated to 315,000 years ago, pushing the emergence of modern humans 100,000 years earlier than previously established', type: 'artifact', contested: false },
      { title: 'Archaic Human Introgression', description: 'Genome sequencing confirms modern humans carry 1–4% Neanderthal DNA and up to 6% Denisovan DNA in some populations, evidence of successful interbreeding with archaic lineages', type: 'observation', contested: false },
      { title: 'Göbekli Tepe Social Complexity', description: 'A ceremonial complex requiring coordinated labor by hunter-gatherers at 9600 BCE demonstrates social organization millennia earlier than the agricultural revolution was believed to have enabled it', type: 'site', contested: false },
      { title: 'Toba Bottleneck Evidence', description: 'Genetic diversity analyses suggest the human population may have contracted to as few as 10,000 individuals around 70,000 BCE, coinciding with the Toba supervolcanic eruption', type: 'observation', contested: true }
    ],
    criticisms: [
      'Each apparent "gap" in the human evolutionary record has been progressively reduced as more fossil and genetic evidence is recovered',
      'The cognitive revolution\'s apparent abruptness may reflect preservation bias in the archaeological record rather than a real discontinuity',
      'Alternative theories of human origins fail to make falsifiable predictions or engage with the detailed evidence of incremental evolutionary change',
      'Extraterrestrial or chemical intervention hypotheses introduce mechanisms with no physical evidence while ignoring the well-evidenced role of sexual selection, diet, and social complexity',
      'The "ghost lineage" in genetics refers to archaic human populations, not non-human or extraterrestrial ones'
    ],
    mainstreamPerspective: 'Paleoanthropology describes human origins as the product of evolutionary processes operating over millions of years, with complex patterns of migration, interbreeding, selection, and drift. The apparent discontinuities alternative researchers cite are understood as artefacts of incomplete evidence. Ongoing research consistently fills gaps with evolutionary explanations. The field acknowledges many open questions while firmly rejecting non-evolutionary frameworks.',
    sources: [
      { title: 'The Origin of Our Species', author: 'Chris Stringer', year: 2011, type: 'book' },
      { title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', year: 2011, type: 'book' },
      { title: 'Who We Are and How We Got Here', author: 'David Reich', year: 2018, type: 'book' }
    ],
    relatedTopics: ['stoned-ape', 'anunnaki', 'gobekli-tepe', 'consciousness', 'ancient-astronaut'],
    timelinePlacement: 'Homo sapiens emergence: 315,000 BCE; behavioral modernity: 70,000–50,000 BCE; cognitive revolution debate ongoing',
    geographicConnections: ['East Africa', 'Morocco', 'Siberia (Denisovan sites)', 'Middle East', 'Southeast Asia'],
    coordinates: [-3.0, 36.0],
    tags: ['evolution', 'genetics', 'cognition', 'paleoanthropology', 'origins', 'Neanderthal'],
    difficulty: 'intermediate',
    connections: ['anunnaki', 'stoned-ape', 'gobekli-tepe', 'consciousness', 'ancient-astronaut'],
    color: '#ec4899',
    icon: '🧬',
    featured: false
  },
  {
    id: 'consciousness',
    title: 'Consciousness and Its Origins',
    category: 'Simulation Theory',
    overview: 'Consciousness — the subjective, first-person experience of being aware — remains one of the hardest problems in philosophy and neuroscience. The standard materialist position holds that consciousness is produced by neural activity; alternative frameworks propose that consciousness is fundamental to reality rather than produced by it. These positions intersect with simulation theory, the effects of psychedelic compounds on cognition, ancient religious frameworks that treated awareness as primary, and the question of whether human consciousness required external enhancement.',
    historicalBackground: 'Philosopher David Chalmers coined the "hard problem of consciousness" in 1995: even a complete physical account of brain processes would not explain why there is subjective experience at all. Physicist Max Planck stated "I regard consciousness as fundamental. I regard matter as derivative from consciousness." Integrated Information Theory (Giulio Tononi) proposes consciousness as a measurable property of information integration, potentially present in degrees across physical systems. Research into psilocybin, DMT, and ketamine has revived scientific interest in non-ordinary states and their relationship to baseline consciousness, with clinical trials at Johns Hopkins and Imperial College producing significant findings.',
    mainClaims: [
      'Consciousness cannot be fully explained by current materialist neuroscience; the subjective experience of awareness remains unexplained by any known physical process',
      'Panpsychism — the view that consciousness is a fundamental feature of reality present in all matter — is a serious philosophical position defended by mainstream philosophers',
      'Psychedelic compounds produce measurable changes in the default mode network associated with ego dissolution and suggest that ordinary consciousness is a constructed and constrained mode of awareness',
      'Ancient religious and philosophical traditions worldwide — Vedanta, Platonism, Hermeticism, Buddhist consciousness philosophy — identify awareness as primary and matter as secondary',
      'The evolution of uniquely human self-awareness may have been catalysed by specific chemical, cultural, or environmental triggers rather than gradual neurological accumulation'
    ],
    evidence: [
      { title: 'Hard Problem of Consciousness', description: 'Chalmers\' 1995 formulation identifying the explanatory gap between physical brain processes and subjective experience has not been resolved by any proposed physical theory', type: 'document', contested: false },
      { title: 'Default Mode Network Research', description: 'Neuroimaging shows psilocybin and similar compounds suppress the brain\'s default mode network — associated with ego and self-referential thought — producing states of expanded awareness studied in clinical trials', type: 'observation', contested: false },
      { title: 'Near-Death Experience Research', description: 'Prospective studies including Pim van Lommel\'s Dutch cardiac arrest study document verified perceptions during periods of clinical cardiac arrest, raising questions about consciousness\'s dependence on brain activity', type: 'observation', contested: true },
      { title: 'Integrated Information Theory', description: 'Giulio Tononi\'s IIT provides a mathematical framework for consciousness as a measurable quantity (phi) arising from the integrated information structure of any system', type: 'document', contested: false }
    ],
    criticisms: [
      'The hard problem may reflect conceptual confusion about what "explanation" means rather than a genuine gap in physical science',
      'Near-death experience reports are consistent with known neurological phenomena occurring during brain oxygen deprivation',
      'Panpsychism faces the combination problem: how micro-consciousness in particles combines into unified human experience',
      'Psychedelic research findings are preliminary and surrounded by significant methodological challenges including expectation effects and difficulty with double-blind design',
      'No evidence supports consciousness existing independently of specific physical neural processes in any individual case'
    ],
    mainstreamPerspective: 'Neuroscience treats consciousness as a product of neural activity, with ongoing research into neural correlates, predictive processing, and global workspace theory as candidate frameworks. The hard problem is acknowledged but regarded as ultimately resolvable by physical science. Psychedelic research has re-entered mainstream science after decades of prohibition. No scientific consensus exists on the hard problem; multiple competing frameworks are actively debated.',
    sources: [
      { title: 'The Conscious Mind', author: 'David Chalmers', year: 1996, type: 'book' },
      { title: 'How to Change Your Mind', author: 'Michael Pollan', year: 2018, type: 'book' },
      { title: 'Consciousness Explained', author: 'Daniel Dennett', year: 1991, type: 'book' }
    ],
    relatedTopics: ['simulation-theory', 'stoned-ape', 'human-origins', 'anunnaki', 'ancient-astronaut'],
    timelinePlacement: 'Philosophical inquiry ancient; modern neuroscientific study 20th century–present; psychedelic research revival 2000s–present',
    geographicConnections: ['Global academic institutions', 'Johns Hopkins University', 'Imperial College London'],
    tags: ['philosophy', 'neuroscience', 'psychedelics', 'awareness', 'hard problem', 'panpsychism'],
    difficulty: 'advanced',
    connections: ['simulation-theory', 'stoned-ape', 'human-origins', 'anunnaki', 'ancient-astronaut'],
    color: '#a855f7',
    icon: '🧠',
    featured: false
  },
  {
    id: 'uap-reports',
    title: 'UAP Reports and Sightings',
    category: 'UFOs And UAPs',
    overview: 'Unidentified Aerial Phenomena (UAP) — the U.S. government\'s post-2020 term — refer to aerial observations by military pilots, radar operators, civilian aviation, and civilians that cannot be attributed to known aircraft, drones, atmospheric phenomena, or sensor artifacts. The U.S. Director of National Intelligence 2021 Preliminary Assessment acknowledged 144 incidents, with only one explained. Congressional hearings in 2023 featured active-duty military personnel describing structured craft exhibiting physics-defying performance characteristics under oath.',
    historicalBackground: 'The modern UAP era began institutionally with the U.S. Navy\'s 2019 release of three declassified videos (FLIR1, GOFAST, GIMBAL) showing objects exhibiting capabilities beyond known aircraft. These followed the exposure of the Pentagon\'s Advanced Aerospace Threat Identification Program (AATIP), a classified $22 million study run from 2007–2012. The 2023 National Defense Authorization Act mandated the All-domain Anomaly Resolution Office (AARO) to collect government-wide UAP data. In July 2023, former intelligence officer David Grusch testified before Congress under oath that the U.S. government possesses non-human craft and biological material.',
    mainClaims: [
      'Military radar and sensor systems have recorded objects exhibiting flight characteristics beyond the performance envelope of any known human technology',
      'The U.S. government operated classified UAP programs beyond congressional oversight, according to sworn congressional testimony',
      'Multiple nations\' military forces have documented UAP encounters, suggesting a global phenomenon with consistent behavioral characteristics',
      'UAP activity has been disproportionately observed near nuclear weapons facilities, suggesting possible monitoring of human nuclear capability',
      'Government UAP programs have recovered non-human craft and biological material, according to sworn testimony before the U.S. House Oversight Committee (2023)'
    ],
    evidence: [
      { title: 'Navy FLIR/GIMBAL/GOFAST Videos', description: 'Three U.S. Navy gun-camera videos officially released by the Pentagon in 2020 show objects with no visible propulsion, wings, or exhaust performing maneuvers inconsistent with known aircraft', type: 'document', contested: false },
      { title: '2021 ODNI UAP Report', description: 'The Director of National Intelligence\'s Preliminary Assessment acknowledged 144 UAP incidents reported by government sources between 2004 and 2021, with only one attributed to known technology', type: 'document', contested: false },
      { title: 'Nimitz Carrier Group Encounter (2004)', description: 'Documented encounter by U.S. Navy pilots, radar operators, and the USS Princeton\'s advanced radar system with an object that descended from 28,000 feet to sea level in under a second', type: 'testimony', contested: true },
      { title: 'David Grusch Congressional Testimony', description: 'Former AATIP intelligence officer David Grusch testified under oath before the U.S. House Oversight Committee in July 2023 that classified programs possess non-human craft and biological material', type: 'testimony', contested: true }
    ],
    criticisms: [
      'The majority of UAP sightings are explained by sensor artifacts, atmospheric phenomena, classified human technology, or misidentified conventional aircraft',
      'Sworn congressional testimony is not independently verified evidence; Grusch acknowledged he had not personally seen the material he described',
      'The "physics-defying" characteristics in released videos are consistent with gimbal lock artifacts and sensor tracking errors explained in detail by analysts',
      'Classification of UAP programs reflects military secrecy about sensor capabilities rather than necessarily about the nature of observed objects',
      'The shift from "UFO" to "UAP" terminology does not change the absence of verified physical evidence'
    ],
    mainstreamPerspective: 'The scientific and intelligence community treats UAP as a genuine national security and scientific question requiring systematic study, while remaining agnostic on non-human origin. The Pentagon\'s AARO has acknowledged that some UAP cannot be immediately explained but continues to investigate prosaic explanations including foreign technology. The shift toward institutional engagement represents a policy change, not an evidentiary conclusion about the phenomena\'s origin.',
    sources: [
      { title: 'Preliminary Assessment: Unidentified Aerial Phenomena', author: 'Office of the Director of National Intelligence', year: 2021, type: 'website' },
      { title: 'UFOs: Generals, Pilots, and Government Officials Go on the Record', author: 'Leslie Kean', year: 2010, type: 'book' },
      { title: 'Passport to Magonia', author: 'Jacques Vallée', year: 1969, type: 'book' }
    ],
    relatedTopics: ['roswell', 'government-disclosure', 'secret-societies', 'ancient-astronaut'],
    timelinePlacement: 'Modern institutional documentation from 1947; systematic government study 2007–present; congressional hearings 2023',
    geographicConnections: ['Roswell (New Mexico)', 'Area 51 (Nevada)', 'Washington D.C.', 'Global military installations'],
    coordinates: [37.2, -115.8],
    tags: ['UAP', 'UFO', 'military', 'government', 'sightings', 'disclosure'],
    difficulty: 'beginner',
    connections: ['roswell', 'secret-societies', 'government-disclosure', 'ancient-astronaut'],
    color: '#10b981',
    icon: '📡',
    featured: false
  },
  {
    id: 'watchers',
    title: 'The Watchers (Grigori)',
    category: 'Book Of Enoch',
    overview: 'The Watchers, called Grigori or Irin in the Book of Enoch, are a specific class of divine beings described as having been sent to observe and assist humanity but who instead descended to Mount Hermon, took human wives, and transmitted forbidden knowledge. Led by Semyaza and Azazel, their transgressions produced the Nephilim and introduced to humanity: astronomy, metallurgy, the art of cosmetics, enchantments, root-cuttings, astrology, and weapons-making. Their actions are presented in Enoch as the direct cause of the corruption that necessitated the flood.',
    historicalBackground: 'The Watchers appear across multiple strands of Second Temple Jewish literature: 1 Enoch (the Book of Watchers, chapters 1–36), the Book of Jubilees, the Damascus Document from the Dead Sea Scrolls, and the Book of Giants (fragments found at Qumran). They parallel the Mesopotamian apkallū — seven antediluvian sages described in Babylonian sources as fish-man advisors who brought civilization\'s arts to humanity from the sea. The New Testament Epistle of Jude cites the Watchers narrative directly, and 2 Peter alludes to it, establishing that early Christian communities regarded the account as authoritative. Azazel\'s punishment — bound beneath the desert of Dudael — parallels the scapegoat ritual of Leviticus 16.',
    mainClaims: [
      'The Watchers were a specific class of divine beings who abandoned their designated role and physically descended to Earth at Mount Hermon',
      'Their transmission of "forbidden knowledge" — including metallurgy, astronomy, and cosmetics — encodes a historical memory of a specific cultural transfer event',
      'The Watchers narrative in Enoch is the oldest extended account of the origin of evil in Jewish tradition, predating the Garden of Eden as an explanatory framework',
      'The apkallū of Mesopotamian tradition — fish-man sages who brought civilization\'s arts — represent the same cultural memory as the Watchers, preserved independently in two traditions',
      'Alternative researchers propose the Watchers were extraterrestrial beings whose intervention in human genetics and knowledge produced the Nephilim and accelerated human civilization'
    ],
    evidence: [
      { title: 'Dead Sea Scrolls — Book of Watchers', description: 'Multiple Aramaic fragments of 1 Enoch\'s Book of Watchers recovered from Qumran Cave 4 date to the 2nd century BCE, confirming the text\'s antiquity and wide circulation in Second Temple Judaism', type: 'artifact', contested: false },
      { title: 'Mesopotamian Apkallū Parallel', description: 'Babylonian texts describe seven antediluvian fish-man sages who taught humanity writing, mathematics, medicine, and statecraft — a structurally parallel tradition to the Watchers, arising in the same geographic region', type: 'text', contested: false },
      { title: 'Jude 6 and 2 Peter 2:4 Citations', description: 'New Testament authors directly cite the Watcher tradition as authoritative history, indicating early Christian communities treated 1 Enoch\'s account as factual', type: 'text', contested: false },
      { title: 'Mount Hermon Tablet Inscription', description: 'A fragmentary text from the region of Mount Hermon references a divine oath or covenant, consistent with Enoch\'s account of the Watchers swearing a binding oath at that location', type: 'artifact', contested: true }
    ],
    criticisms: [
      'The Watchers narrative is pseudepigraphical Jewish apocalyptic literature, composed centuries after the events it purports to describe',
      'The apkallū parallel reflects cultural exchange between Jewish and Babylonian traditions during the Exile (6th century BCE) rather than independent memory of the same historical event',
      'The "forbidden knowledge" transmitted by Watchers describes technologies that developed gradually across multiple ancient cultures with no single point of origin',
      'The narrative functions as a theodicy — an explanation for the origin of evil — serving theological purposes rather than recording historical events',
      'Alternative extraterrestrial interpretations project modern technological concepts onto texts written within a specific ancient cosmological framework'
    ],
    mainstreamPerspective: 'Biblical scholars classify the Watcher tradition as part of Jewish apocalyptic literature of the Second Temple period (3rd century BCE–1st century CE), serving to explain the origin of evil, the existence of giants, and the justification for divine judgment through the flood. The parallel with Mesopotamian apkallū is explained by cultural exchange. The Watchers are theological constructs within an ancient Near Eastern cosmological worldview, not historical records of physical beings.',
    sources: [
      { title: '1 Enoch: A Commentary on the Book of 1 Enoch', author: 'George W.E. Nickelsburg', year: 2001, type: 'academic' },
      { title: 'The Watchers and the Holy Ones', author: 'Ida Fröhlich', year: 2014, type: 'academic' },
      { title: 'Fallen Angels and the History of Judaism and Christianity', author: 'Annette Reed', year: 2005, type: 'academic' }
    ],
    relatedTopics: ['book-of-enoch', 'nephilim', 'flood-narratives', 'anunnaki', 'ancient-astronaut'],
    timelinePlacement: 'Attributed to antediluvian period; literary tradition composed 3rd–2nd century BCE; cited in New Testament 1st century CE',
    geographicConnections: ['Mount Hermon (Syria/Lebanon border)', 'Qumran (Dead Sea)', 'Ethiopia', 'Mesopotamia'],
    coordinates: [33.4, 35.8],
    tags: ['angels', 'fallen', 'Book of Enoch', 'forbidden knowledge', 'Second Temple', 'apkallu'],
    difficulty: 'intermediate',
    connections: ['book-of-enoch', 'nephilim', 'flood-narratives', 'ancient-astronaut', 'anunnaki'],
    color: '#fbbf24',
    icon: '⭐',
    featured: false
  },
  {
    id: 'lost-civilizations',
    title: 'Lost Civilizations Hypothesis',
    category: 'Ancient Civilizations',
    overview: 'The lost civilizations hypothesis proposes that one or more advanced human civilizations flourished before the established historical timeline and were destroyed by catastrophic events — sea level rise, cosmic impacts, geological upheaval, or the Younger Dryas — leaving only fragmentary evidence in myth, anomalous archaeological sites, and architectural achievements attributed to later cultures. Plato\'s Atlantis, Graham Hancock\'s proposed pre-Ice Age civilization, and the anomalous complexity of Göbekli Tepe are central reference points.',
    historicalBackground: 'The hypothesis has ancient roots in Plato\'s Atlantis (360 BCE) and resurged in the 19th century with Ignatius Donnelly\'s "Atlantis: The Antediluvian World" (1882). Graham Hancock\'s "Fingerprints of the Gods" (1995) and subsequent work proposed a geologically sophisticated civilization existing before 10,000 BCE, destroyed by the Younger Dryas impact or climate shift, with survivors seeding multiple subsequent civilizations. The 2018 confirmation of the Younger Dryas impact hypothesis (platinum layer, nanodiamonds across four continents) provided a real catastrophic event in the right timeframe. Post-glacial sea level rise of 120 metres since the Last Glacial Maximum inundated vast coastal continental shelves where early complex societies may have developed.',
    mainClaims: [
      'Extensive coastal territories were permanently inundated by 120 metres of sea level rise between 19,000 and 7,000 BCE, destroying any archaeological record of civilizations that existed there',
      'The structural similarity of myths, astronomical knowledge, and architectural conventions across civilizations with no documented contact suggests diffusion from a common predecessor',
      'Göbekli Tepe\'s complexity at 9600 BCE implies a prior tradition of organized construction and symbolic thinking that pre-dates its own appearance in the record',
      'Ancient maps including the Piri Reis map appear to show coastlines — particularly Antarctica\'s sub-ice topography — that were not mapped until the 20th century',
      'Advanced astronomical knowledge preserved in ancient monuments (precession cycles, solstitial alignments) implies observation periods far longer than the officially recognized age of those structures'
    ],
    evidence: [
      { title: 'Göbekli Tepe', description: 'A monumental ceremonial complex at 9600 BCE demonstrates organized religion, coordinated labor, and sophisticated iconography among supposed hunter-gatherers, with no clear precursor in the archaeological record', type: 'site', contested: false },
      { title: 'Submerged Continental Shelves', description: 'Extensive continental shelves now under 30–120 metres of water were habitable land throughout the Last Glacial Maximum and would have supported coastal settlements now inaccessible to conventional archaeology', type: 'observation', contested: false },
      { title: 'Piri Reis Map (1513)', description: 'An Ottoman map drawn from earlier source maps appears to show a southern landmass resembling Antarctica\'s sub-glacial coastline, which was not surveyed until the 1950s seismic study', type: 'artifact', contested: true },
      { title: 'Younger Dryas Boundary Layer', description: 'Physical evidence of a cosmic impact or airburst ca. 10,800 BCE — platinum enrichment, nanodiamonds, shocked quartz, and a global soot layer — supports a catastrophic event capable of destroying a pre-existing civilization', type: 'observation', contested: true }
    ],
    criticisms: [
      'The hypothesis is unfalsifiable in its strong form: the claimed civilization conveniently existed in areas now underwater or otherwise inaccessible',
      'Göbekli Tepe\'s complexity is explained by archaeologists within the framework of mobile hunter-gatherer societies, which demonstrably achieved remarkable things in documented cases worldwide',
      'The Piri Reis map\'s resemblance to Antarctica is partial, requires significant stretching of the map projection, and is consistent with speculative cartography of the era rather than accurate source data',
      'Hancock\'s model requires an extraordinarily large and advanced civilization to have left essentially no durable evidence beyond claimed influences in later cultures',
      'The convergence of myths and astronomical knowledge across cultures is better explained by universal human cognitive tendencies and the limited number of astronomical phenomena visible to any culture'
    ],
    mainstreamPerspective: 'Mainstream archaeology acknowledges that the underwater continental shelves are an underexplored area with genuine potential for early human sites, and that Göbekli Tepe genuinely revised understanding of early social complexity. However, no evidence requires invoking a sophisticated lost civilization as an explanatory mechanism. The Piri Reis map is regarded as a product of Renaissance-era speculative cartography. The hypothesis appeals to the genuine uncertainty of deep prehistory but proposes explanations more complex than the evidence requires.',
    sources: [
      { title: 'Fingerprints of the Gods', author: 'Graham Hancock', year: 1995, type: 'book' },
      { title: 'Magicians of the Gods', author: 'Graham Hancock', year: 2015, type: 'book' },
      { title: 'Underworld: The Mysterious Origins of Civilization', author: 'Graham Hancock', year: 2002, type: 'book' }
    ],
    relatedTopics: ['atlantis', 'great-pyramid', 'gobekli-tepe', 'flood-narratives', 'ancient-engineering'],
    timelinePlacement: 'Proposed civilization: 12,000–10,000 BCE; destruction at Younger Dryas; sea level inundation 19,000–7,000 BCE',
    geographicConnections: ['Global coastal continental shelves', 'Antarctic', 'Mediterranean', 'Indian Ocean', 'Persian Gulf'],
    coordinates: [36.0, 28.0],
    tags: ['prehistoric', 'civilization', 'flood', 'Hancock', 'Younger Dryas', 'sea level'],
    difficulty: 'intermediate',
    connections: ['atlantis', 'great-pyramid', 'gobekli-tepe', 'flood-narratives', 'ancient-engineering'],
    color: '#6366f1',
    icon: '🏛️',
    featured: false
  },
  {
    id: 'government-disclosure',
    title: 'Government UAP Disclosure',
    category: 'UFOs And UAPs',
    overview: 'Government disclosure refers to the sustained effort — through whistleblowers, Freedom of Information Act requests, congressional legislation, and direct testimony — to compel governments to release classified information about UAP encounters, alleged extraterrestrial contact, and related programs. In the United States, the Unidentified Aerial Phenomena Task Force (2020), the All-domain Anomaly Resolution Office (2022), and the Intelligence Authorization Act requirements represent incremental institutional responses to sustained pressure from researchers, pilots, and former officials.',
    historicalBackground: 'Modern disclosure advocacy traces to the Disclosure Project, organized by Steven Greer, whose 2001 National Press Club event presented 21 former government and military witnesses describing UAP encounters. The 2007–2012 Advanced Aerospace Threat Identification Program (AATIP), revealed by investigative reporting in the New York Times in December 2017, confirmed the U.S. government had maintained a classified UAP study program. Former Senate Majority Leader Harry Reid championed funding for AATIP. The 2023 National Defense Authorization Act mandated AARO to produce a historical UAP record going back to 1945. David Grusch\'s 2023 congressional testimony, given under the Inspector General\'s whistleblower protection framework, alleged active retrieval and reverse-engineering programs.',
    mainClaims: [
      'Governments — particularly the United States — have maintained classified programs studying UAP and alleged non-human materials for decades beyond congressional awareness',
      'Whistleblowers operating under legal protections have alleged that craft of non-human origin have been recovered and are held in classified facilities',
      'The incremental official acknowledgment of UAP — from denial to task forces to congressional offices — represents a controlled disclosure strategy rather than spontaneous transparency',
      'International governments including France (GEIPAN), the United Kingdom, and Brazil have released UAP study documents confirming institutional engagement with the phenomenon',
      'Delayed full disclosure is attributed to concerns about technological advantage, public panic, or implications for established social and religious institutions'
    ],
    evidence: [
      { title: 'AATIP Program Confirmation', description: 'The New York Times\' December 2017 investigation confirmed the existence of a classified $22 million UAP study program, corroborated by the Department of Defense', type: 'document', contested: false },
      { title: 'UAP Task Force and AARO Legislation', description: 'Congressional mandates requiring the establishment of systematic UAP reporting offices and historical records represent the strongest institutional acknowledgment of the phenomenon\'s significance', type: 'document', contested: false },
      { title: 'French COMETA Report (1999)', description: 'A study by senior French military and intelligence officials concluded that UAP represents a real phenomenon whose extraterrestrial origin cannot be excluded, and recommended preparation for official contact', type: 'document', contested: true },
      { title: 'Grusch Inspector General Complaint', description: 'David Grusch filed a whistleblower complaint with the Intelligence Community Inspector General, which was assessed as "credible and urgent" before his congressional testimony', type: 'testimony', contested: true }
    ],
    criticisms: [
      'Institutional acknowledgment of UAP as an unexplained phenomenon does not imply extraterrestrial origin or the existence of classified non-human craft',
      'Grusch acknowledged not personally witnessing the materials he described; his complaint is based on accounts from alleged witnesses rather than direct evidence',
      'The controlled disclosure narrative is unfalsifiable: any government action (study, denial, acknowledgment) can be interpreted as confirming a predetermined conclusion',
      'Classification of UAP programs reflects operational security around advanced sensor systems rather than necessarily the nature of what is observed',
      'Historical UFO disclosure documents released by governments have consistently revealed prosaic explanations rather than evidence of extraterrestrial contact'
    ],
    mainstreamPerspective: 'The scientific and policy community views government UAP programs as a legitimate national security and scientific matter warranting systematic study. Institutional acknowledgment represents a correction of excessive secrecy about a genuine atmospheric and aerospace phenomenon, not confirmation of extraterrestrial presence. The consensus position is that UAP requires rigorous investigation; conclusions about origin remain open pending physical evidence.',
    sources: [
      { title: 'Glowing Auras and Black Money (New York Times)', author: 'Helene Cooper, Ralph Blumenthal, Leslie Kean', year: 2017, type: 'website' },
      { title: 'The COMETA Report', author: 'COMETA Study Group', year: 1999, type: 'academic' },
      { title: 'UFOs: Generals, Pilots, and Government Officials Go on the Record', author: 'Leslie Kean', year: 2010, type: 'book' }
    ],
    relatedTopics: ['roswell', 'uap-reports', 'secret-societies', 'global-power', 'ancient-astronaut'],
    timelinePlacement: 'AATIP: 2007–2012; public revelation 2017; UAP Task Force 2020; AARO established 2022; congressional hearings 2023',
    geographicConnections: ['Washington D.C.', 'Pentagon', 'Wright-Patterson AFB', 'France', 'United Kingdom'],
    coordinates: [38.9, -77.0],
    tags: ['disclosure', 'UAP', 'government', 'whistleblower', 'AATIP', 'AARO'],
    difficulty: 'beginner',
    connections: ['roswell', 'uap-reports', 'secret-societies', 'global-power', 'ancient-astronaut'],
    color: '#94a3b8',
    icon: '📋',
    featured: false
  },
  {
    id: 'global-power',
    title: 'Global Power Structures',
    category: 'Global Power Structures',
    overview: 'The study of how concentrated wealth, transnational institutional networks, and coordinated elite decision-making shape global events beyond the reach of formal democratic accountability. Historical documentation exists for coordination through institutions including the Council on Foreign Relations (founded 1921), the Trilateral Commission (1973), the Bilderberg Group (1954), and the World Economic Forum. Alternative researchers propose these represent a visible layer of a deeper and less accountable governance structure operating across national governments.',
    historicalBackground: 'The post-World War II international order created overlapping institutional networks: the Bretton Woods institutions (IMF, World Bank), the United Nations, NATO, and a series of private forums bringing together political, financial, and industrial leadership. Carroll Quigley, a Georgetown University historian and mentor to Bill Clinton, documented in "Tragedy and Hope" (1966) that an Anglo-American network of banking families and their allies had exercised consistent behind-the-scenes influence on British and American foreign policy since the late 19th century. Quigley had access to this network\'s records and approved of its goals, making his account notable as neither hostile nor conspiratorial but descriptive. The 2014 Princeton study by Gilens and Page concluded that U.S. policy outcomes correlate strongly with the preferences of economic elites and weakly with majority public opinion.',
    mainClaims: [
      'Transnational elite networks coordinate policy outcomes across national governments through private forums, shared institutional membership, and financial interdependence',
      'Central banking systems — particularly the Federal Reserve system and Bank for International Settlements — operate with limited democratic accountability and significant autonomous influence over economic policy',
      'The personnel overlap between major financial institutions, government positions, regulatory bodies, and media ownership creates a revolving-door governance structure insulated from democratic correction',
      'International forums including Davos (WEF), Bilderberg, and the Trilateral Commission set agenda priorities before formal democratic processes engage with them',
      'The concentrated ownership of global media across a small number of conglomerates enables agenda-setting that shapes rather than reflects public political priorities'
    ],
    evidence: [
      { title: 'Tragedy and Hope (Carroll Quigley)', description: 'Georgetown historian Carroll Quigley documented an Anglo-American network of financial power operating across governments, with access to the network\'s own records and explicit approval of its goals', type: 'document', contested: false },
      { title: 'Princeton Elite Theory Study (2014)', description: 'Political scientists Gilens and Page analyzed 1,779 U.S. policy outcomes and found policy changes correlate with economic elite preferences but near-zero with majority public opinion', type: 'document', contested: false },
      { title: 'Bilderberg Group Documented Membership', description: 'Annual meetings since 1954 bring together heads of state, central bank governors, senior NATO officials, and corporate executives under Chatham House rules with no public record of discussions', type: 'observation', contested: false },
      { title: 'Regulatory Revolving Door', description: 'Documented patterns of personnel moving between senior positions in regulatory agencies (SEC, FDA, FCC) and the industries they regulate have been studied by governmental accountability organizations', type: 'document', contested: false }
    ],
    criticisms: [
      'Elite coordination through shared institutional membership and class affiliation does not require a secret conspiracy; it reflects normal operation of social networks and shared interests',
      'The Bilderberg Group and similar forums produce no documented binding decisions; their influence operates through persuasion and agenda-setting rather than command',
      'Democratic systems do produce policy changes contrary to elite preferences, demonstrating the limits of coordinated elite influence',
      'Alternative researchers frequently overstate the coherence and coordination of elite networks, which are internally competitive and often divided',
      'The "global power structure" framework can become unfalsifiable: any evidence of elite disagreement is attributed to managed conflict or deeper coordination'
    ],
    mainstreamPerspective: 'Political scientists and sociologists recognize that elite networks exercise disproportionate political and economic influence through institutional access, shared educational backgrounds, and concentrated financial resources. This is studied empirically in elite theory and political economy. The question of whether this constitutes coordinated governance beyond democratic accountability is an active area of mainstream political science research. Conspiracy-level claims about a unified hidden world government are not supported by the evidence.',
    sources: [
      { title: 'Tragedy and Hope', author: 'Carroll Quigley', year: 1966, type: 'book' },
      { title: 'Testing Theories of American Politics', author: 'Martin Gilens & Benjamin Page', year: 2014, type: 'journal' },
      { title: 'The Power Elite', author: 'C. Wright Mills', year: 1956, type: 'book' }
    ],
    relatedTopics: ['secret-societies', 'reptilian-theory', 'government-disclosure', 'uap-reports'],
    timelinePlacement: 'Modern institutional form from 1910s; Bilderberg 1954; Trilateral Commission 1973; WEF 1971–present',
    geographicConnections: ['London', 'Washington D.C.', 'New York', 'Basel (BIS)', 'Davos', 'Brussels'],
    tags: ['elite', 'power', 'Bilderberg', 'finance', 'geopolitics', 'accountability'],
    difficulty: 'intermediate',
    connections: ['secret-societies', 'reptilian-theory', 'government-disclosure', 'uap-reports'],
    color: '#dc2626',
    icon: '🌐',
    featured: false
  }
];

export const getTheoryById = (id: string): Theory | undefined => {
  return theories.find(t => t.id === id);
};

export const getTheoriesByCategory = (category: string): Theory[] => {
  return theories.filter(t => t.category === category);
};

export const getRelatedTheories = (id: string): Theory[] => {
  const theory = getTheoryById(id);
  if (!theory) return [];
  return theories.filter(t => theory.connections.includes(t.id) || theory.relatedTopics.includes(t.id));
};

export const categories = [
  'Ancient Civilizations',
  'Egyptian Mysteries',
  'Ancient Astronaut Theories',
  'Giants In History',
  'Book Of Enoch',
  'Human Origins',
  'UFOs And UAPs',
  'Secret Societies',
  'Global Power Structures',
  'Reptilian Theory',
  'Simulation Theory',
  'Religion And Ancient Texts'
];
