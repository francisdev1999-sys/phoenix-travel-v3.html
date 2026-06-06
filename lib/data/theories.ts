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
