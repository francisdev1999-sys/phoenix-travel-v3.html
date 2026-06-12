import { GraphNode } from './types';

// ══════════════════════════════════════════════════════════════════════
//  EXPANDED NODE LIBRARY — Phase 2
//  Covers: Technology, Modern Science, Government/Surveillance,
//          Historical Figures, Modern Mystery, Extraterrestrial
// ══════════════════════════════════════════════════════════════════════

export const expandedNodes: GraphNode[] = [

  // ═══════════════════════════════════════
  // TECHNOLOGY — MODERN SCIENCE
  // ═══════════════════════════════════════

  {
    id: 'crispr-cas9',
    title: 'CRISPR-Cas9 Gene Editing',
    category: 'Technology',
    description: 'A revolutionary molecular tool that allows precise editing of DNA sequences in any living organism. Derived from a natural bacterial immune system, CRISPR-Cas9 uses a guide RNA to direct the Cas9 enzyme to a specific genomic location, where it makes a targeted cut. The technology was adapted for eukaryotic cells by Jennifer Doudna and Emmanuelle Charpentier, whose work was recognized with the 2020 Nobel Prize in Chemistry. CRISPR has since been applied to medicine, agriculture, and basic research at a pace unprecedented in the history of molecular biology.',
    claims: [
      'CRISPR enables correction of single-gene disorders such as sickle cell disease and beta-thalassaemia — clinical trials using CRISPR therapies achieved functional cures in 2023.',
      'The technology is exponentially cheaper and faster than predecessor genome-editing tools such as TALEN and zinc-finger nucleases.',
      'CRISPR-based diagnostics (SHERLOCK, DETECTR) can detect viral RNA at attomolar sensitivity without laboratory equipment.',
      'Germline editing experiments by He Jiankui in 2018 produced the first gene-edited human babies, raising profound bioethical questions about heritable modifications.',
    ],
    criticisms: [
      'Off-target edits — cuts at unintended genomic locations — remain a safety concern despite improved high-fidelity Cas9 variants.',
      'Germline editing is banned or subject to moratoriums in most jurisdictions; international governance frameworks lag behind the technology.',
      'Equitable access to CRISPR therapies is uncertain; early approved treatments (e.g., Casgevy for sickle cell) cost over $2 million per patient.',
      'Ecological risks of gene drives that could alter or eliminate wild populations remain incompletely understood.',
    ],
    mainstream_view: 'CRISPR-Cas9 is widely regarded as one of the most significant biotechnological advances of the 21st century. The scientific community strongly supports continued research while calling for robust international governance of clinical applications, particularly germline editing. The 2020 Nobel Committee described it as a tool that "has taken the life sciences into a new epoch."',
    open_questions: [
      'Can base editing and prime editing variants eliminate off-target effects entirely, making therapeutic CRISPR reliably safe?',
      'How should international governance frameworks balance therapeutic promise with the risks of heritable germline modification?',
      'Will agricultural applications (disease-resistant crops, gene drives against malaria mosquitoes) gain regulatory approval in time to address food security and disease burden?',
    ],
    tags: ['gene editing', 'CRISPR', 'Cas9', 'Jennifer Doudna', 'Emmanuelle Charpentier', 'Nobel Prize', 'biotechnology', 'genomics', 'sickle cell', 'germline'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#16a34a',
    icon: '🧬',
    year: 2012,
    date_precision: 'exact',
  },

  {
    id: 'alphafold-protein',
    title: 'AlphaFold: Solving the Protein-Folding Problem',
    category: 'Technology',
    description: 'AlphaFold, developed by DeepMind (Google), is an artificial intelligence system that predicts the three-dimensional structure of proteins from their amino acid sequences with accuracy rivalling experimental methods. AlphaFold 2, published in Nature in 2021, solved a 50-year grand challenge in biology — the protein-folding problem — by predicting structures for the majority of the human proteome and, subsequently, nearly all catalogued proteins across living organisms. The AlphaFold Protein Structure Database, released in partnership with the European Bioinformatics Institute, contains over 200 million predicted structures freely available to researchers worldwide.',
    claims: [
      'AlphaFold 2 achieved a median backbone accuracy of approximately 0.96 Å RMSD on the CASP14 benchmark, comparable to experimental cryo-EM resolution.',
      'The freely accessible AlphaFold database has accelerated drug discovery, with researchers identifying novel antibiotic candidates and malaria vaccine targets within months of release.',
      'AlphaFold predictions have resolved structures of proteins that resisted experimental determination for decades, including membrane proteins critical for drug targets.',
      'The underlying transformer architecture demonstrated that sequence co-evolutionary information encodes geometric constraints sufficient for near-complete structural determination.',
    ],
    criticisms: [
      'AlphaFold predicts static structures; the dynamic conformational changes proteins undergo during function — critical for understanding allostery and enzyme catalysis — are not captured.',
      'Intrinsically disordered regions, which constitute about 30% of the human proteome and are central to cellular signalling, are not reliably predicted.',
      'Predictions for protein–protein complexes and multi-domain proteins with flexible linkers are less accurate than single-domain predictions.',
      'The model cannot predict how mutations outside the training distribution will affect folding, limiting applicability to de novo protein design without additional tools.',
    ],
    mainstream_view: 'The scientific community regards AlphaFold as a landmark achievement — a paradigm shift in structural biology comparable to the sequencing of the human genome. John Moult, who founded the CASP assessment, described the 2021 result as "a stunning advance." The system does not replace experimental structural biology but massively accelerates the field by providing high-quality starting models and filling gaps in protein structure space.',
    open_questions: [
      'Can AI methods be extended to accurately model protein dynamics, conformational ensembles, and intrinsic disorder — not just static ground-state structures?',
      'Will the structural database enable the rational design of proteins with entirely novel functions beyond what evolution has produced?',
      'How can AlphaFold-style methods be combined with cryo-EM and NMR to study protein complexes and membrane-embedded systems?',
    ],
    tags: ['AlphaFold', 'DeepMind', 'protein folding', 'artificial intelligence', 'bioinformatics', 'John Jumper', 'Demis Hassabis', 'CASP', 'structural biology', 'drug discovery'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#0891b2',
    icon: '🔬',
    year: 2021,
    date_precision: 'exact',
  },

  {
    id: 'large-language-models',
    title: 'Large Language Models and the AI Revolution',
    category: 'Technology',
    description: 'Large language models (LLMs) are neural networks trained on vast corpora of text using a self-supervised prediction objective, enabling them to generate coherent, contextually appropriate language across virtually any domain. The transformer architecture, introduced by Vaswani et al. at Google in 2017 in the paper "Attention Is All You Need," became the foundational building block. GPT-3 (OpenAI, 2020) demonstrated emergent capabilities — reasoning, translation, code generation — not explicitly trained for. By 2023, models such as GPT-4, Claude, Gemini, and LLaMA had reached performance levels sufficient to pass professional licensing exams, assist in scientific research, and generate persuasive long-form text indistinguishable from human writing.',
    claims: [
      'LLMs exhibit emergent capabilities — coherent reasoning, chain-of-thought problem solving, few-shot learning — that arise unpredictably as model scale increases.',
      'GPT-4 scored in the 90th percentile on the Uniform Bar Exam and passed the USMLE Step 1 medical licensing exam, raising questions about professional knowledge monopolies.',
      'LLMs are being integrated into scientific workflows for drug discovery, materials science, and code generation, potentially compressing research timelines.',
      'The concentration of capability in a handful of well-resourced companies raises concerns about democratic access and geopolitical AI competition.',
    ],
    criticisms: [
      '"Hallucination" — confident generation of factually incorrect statements — remains a fundamental failure mode with no complete solution, limiting high-stakes deployment.',
      'LLMs have no grounded world model; they are statistical pattern matchers over tokens, and their apparent "understanding" may not generalize beyond distributional overlap with training data.',
      'Training large models requires enormous energy consumption and water for cooling, raising environmental sustainability concerns.',
      'Alignment — ensuring LLMs reliably pursue intended goals without deceptive or harmful behaviour — is an unsolved research problem that scales in difficulty with capability.',
    ],
    mainstream_view: 'AI researchers broadly agree that LLMs represent a qualitative advance over previous NLP systems, though deep disagreement exists about whether they constitute a path toward artificial general intelligence or remain fundamentally limited by their architecture. Regulatory bodies in the EU, US, and UK are developing governance frameworks. The scientific consensus holds that near-term risks (misinformation, automation displacement) require urgent attention, while long-term existential risks remain speculative but non-negligible.',
    open_questions: [
      'Do LLMs develop internal representations that constitute genuine semantic understanding, or do they simulate understanding through sophisticated pattern completion?',
      'What technical approaches — constitutional AI, RLHF, interpretability research — will be sufficient to align highly capable AI systems with human values?',
      'How will LLM integration reshape labour markets, education, scientific publishing, and democratic discourse over the next decade?',
    ],
    tags: ['LLM', 'AI', 'GPT', 'transformer', 'OpenAI', 'neural network', 'artificial intelligence', 'ChatGPT', 'Anthropic', 'deep learning', 'alignment'],
    evidence_level: 'strong_evidence',
    confidence_score: 0.95,
    color: '#7c3aed',
    icon: '🤖',
    year: 2017,
    date_precision: 'exact',
  },

  {
    id: 'james-webb-telescope',
    title: 'James Webb Space Telescope Discoveries',
    category: 'Technology',
    description: 'The James Webb Space Telescope (JWST), launched on 25 December 2021 and reaching its operational orbit at Lagrange Point 2 (1.5 million km from Earth) in early 2022, is the most powerful space telescope ever built. With a 6.5-metre gold-beryllium primary mirror and infrared instruments capable of detecting light from galaxies formed within 300 million years of the Big Bang, JWST has already overturned assumptions about early galaxy formation, detected carbon dioxide and methane in exoplanet atmospheres, and observed star-forming regions with unprecedented clarity. First science images were released on 12 July 2022.',
    claims: [
      'JWST detected galaxies at redshifts above z=10 — existing just 400 million years after the Big Bang — that are far more massive than Lambda-CDM cosmological models predicted, challenging standard galaxy formation theory.',
      'Atmospheric spectroscopy of TRAPPIST-1c revealed no thick CO₂ atmosphere, constraining but not ruling out habitability for this rocky exoplanet.',
      'JWST observations of protostars in the Chameleon I cloud detected complex organic molecules — ices containing methanol, ethanol, and carbonyl sulphide — predating star formation.',
      'The telescope\'s detection of CO₂ and methane simultaneously in the atmosphere of K2-18b raised the possibility of a "hycean world" with a hydrogen-rich atmosphere and liquid water ocean.',
    ],
    criticisms: [
      'The unexpectedly massive early galaxies may reflect measurement biases or novel dust properties rather than a fundamental failure of ΛCDM cosmology; follow-up spectroscopy is needed.',
      'Detection of biosignature gases such as dimethyl sulphide in exoplanet atmospheres requires ruling out abiotic production pathways, which remains methodologically challenging.',
      'JWST\'s 10-year design life and the irreversibility of its L2 position mean that any instrumental failure cannot be repaired, unlike Hubble.',
    ],
    mainstream_view: 'JWST is universally regarded as a transformative instrument in astronomy. Observed tensions with ΛCDM predictions for early galaxies are taken seriously by cosmologists but considered likely to require model refinements rather than abandonment of the standard model. The scientific community is cautious about exoplanet biosignature claims, emphasising the need for multiple independent detections before conclusions about habitability.',
    open_questions: [
      'Do the unexpectedly massive early galaxies require new physics — such as modified dark matter models or early dark energy — or can they be explained within ΛCDM with updated baryonic feedback models?',
      'Will JWST achieve sufficient signal-to-noise on Earth-like rocky exoplanet atmospheres to detect biosignatures, or are missions such as the Habitable Worlds Observatory required?',
      'What is the nature of the "cosmic dawn" reionisation epoch, and which sources — galaxies, quasars, or Population III stars — drove it?',
    ],
    tags: ['JWST', 'James Webb', 'space telescope', 'exoplanet', 'galaxy formation', 'cosmology', 'NASA', 'ESA', 'infrared', 'biosignatures', 'Big Bang'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#0369a1',
    icon: '🔭',
    year: 2022,
    date_precision: 'exact',
    coordinates: [0, 0], // L2 point
  },

  {
    id: 'mrna-vaccine-technology',
    title: 'mRNA Vaccine Technology',
    category: 'Technology',
    description: 'Messenger RNA vaccines work by delivering synthetic mRNA strands into cells, instructing them to produce a target antigen — typically a viral protein — that primes the immune system without introducing live virus. The foundational research was conducted by Katalin Karikó and Drew Weissman at the University of Pennsylvania, who discovered that incorporating modified nucleosides (pseudouridine) into synthetic mRNA prevents the immune system from destroying it before translation. Their work, largely ignored for decades, became the basis for the Pfizer-BioNTech (BNT162b2) and Moderna (mRNA-1273) COVID-19 vaccines, which received emergency use authorisation in December 2020 and were administered to hundreds of millions within months. Karikó and Weissman received the 2023 Nobel Prize in Physiology or Medicine.',
    claims: [
      'mRNA vaccines can be designed in days once a pathogen\'s genetic sequence is published, enabling a historically unprecedented development-to-deployment timeline.',
      'The platform is now being applied to influenza, RSV, cancer (personalised neoantigen vaccines), HIV, and tuberculosis — diseases that have resisted conventional vaccine approaches.',
      'Clinical trial data for BNT162b2 and mRNA-1273 showed efficacy rates of 94–95% against symptomatic COVID-19 in the initial trials.',
      'mRNA does not enter the cell nucleus and cannot integrate into genomic DNA, as it lacks reverse transcriptase and nuclear entry signals.',
    ],
    criticisms: [
      'Rare adverse events associated with mRNA COVID vaccines — myocarditis in young males (estimated 1–4 per 100,000 doses), anaphylaxis — require ongoing pharmacovigilance.',
      'Cold-chain storage requirements (−70 °C for Pfizer-BioNTech) complicated global distribution to low-income countries.',
      'The long-term durability of mRNA-induced immunity and the optimal booster schedule for variant-prone pathogens remain areas of active research.',
      'Public hesitancy around the novel platform — amplified by misinformation about DNA integration — was a significant barrier to vaccination campaigns worldwide.',
    ],
    mainstream_view: 'mRNA vaccine technology is regarded by the scientific and medical community as one of the most important biomedical advances in decades. The COVID-19 vaccines demonstrated both the platform\'s power and the speed advantage of a sequence-to-vaccine pipeline. The 2023 Nobel Prize recognised the foundational research. Clinical and regulatory communities continue to monitor safety signals while expanding the pipeline to other diseases.',
    open_questions: [
      'Can personalised mRNA cancer vaccines — designed around a patient\'s tumour neoantigen profile — demonstrate durable clinical benefit at scale?',
      'What is the optimal lipid nanoparticle formulation for organ-targeted delivery in therapeutic (non-vaccine) mRNA applications?',
      'How can the cold-chain requirement be overcome to make mRNA vaccines viable for endemic disease in low-resource settings?',
    ],
    tags: ['mRNA', 'vaccine', 'Katalin Karikó', 'Drew Weissman', 'Nobel Prize', 'COVID-19', 'Pfizer', 'Moderna', 'BioNTech', 'immunology', 'lipid nanoparticle'],
    evidence_level: 'verified',
    confidence_score: 0.98,
    color: '#16a34a',
    icon: '💉',
    year: 2020,
    date_precision: 'exact',
  },

  {
    id: 'quantum-computing',
    title: 'Quantum Computing',
    category: 'Technology',
    description: 'Quantum computers exploit quantum mechanical phenomena — superposition, entanglement, and interference — to perform certain computations exponentially or polynomially faster than classical computers. Unlike classical bits (0 or 1), quantum bits (qubits) can exist in superposition states, allowing parallel exploration of solution spaces. In 2019, Google\'s Sycamore processor performed a specific random circuit sampling task in 200 seconds that Google estimated would take the world\'s fastest classical supercomputer approximately 10,000 years — a claim disputed by IBM. IBM\'s Eagle (127 qubits, 2021), Osprey (433 qubits, 2022), and Condor (1,121 qubits, 2023) processors have since demonstrated the rapid pace of hardware scaling.',
    claims: [
      'Shor\'s algorithm, if implemented on a sufficiently error-corrected quantum computer, would factor large integers in polynomial time, breaking RSA and elliptic-curve cryptography.',
      'Quantum simulation of molecular systems — fermion interactions, photosynthetic energy transfer — could revolutionise drug discovery and materials science in ways classical computers cannot match.',
      'Variational quantum eigensolvers and quantum approximate optimisation algorithms show promise for near-term applications on noisy intermediate-scale quantum (NISQ) devices.',
      'Nation-state investment in quantum computing (US, China, EU, UK) reflects its strategic importance for cryptography, logistics optimisation, and intelligence gathering.',
    ],
    criticisms: [
      'Current quantum hardware is severely limited by decoherence and gate error rates; fault-tolerant quantum computation requires error correction overhead estimated at 1,000+ physical qubits per logical qubit, far beyond current scale.',
      'Google\'s 2019 "quantum supremacy" claim used an artificial task of no practical value; IBM\'s counter-claim used better classical algorithms that reduced the advantage significantly.',
      'No commercially viable quantum advantage over classical computers has been demonstrated for real-world problems as of 2024.',
      'The "quantum winter" risk — a funding collapse if near-term applications fail to materialise — mirrors the trajectory of previous AI hype cycles.',
    ],
    mainstream_view: 'The scientific consensus is that quantum computing holds genuine long-term promise for specific problem classes — cryptography, simulation, optimisation — but that the timeline to large-scale fault-tolerant quantum computers capable of practical advantage remains uncertain, with credible estimates ranging from 10 to 30+ years. Near-term NISQ devices are viewed as important research tools but not yet commercially transformative.',
    open_questions: [
      'What is the minimum qubit count and error rate required to achieve fault-tolerant quantum computation at practically useful scale?',
      'Will topological qubits (Microsoft\'s approach) or other hardware architectures demonstrate superior decoherence properties compared to superconducting qubits?',
      'When should organisations begin transitioning to post-quantum cryptographic standards to defend against "harvest now, decrypt later" strategies?',
    ],
    tags: ['quantum computing', 'qubit', 'Google', 'IBM', 'Shor\'s algorithm', 'quantum supremacy', 'superposition', 'entanglement', 'cryptography', 'NISQ'],
    evidence_level: 'strong_evidence',
    confidence_score: 0.85,
    color: '#7c3aed',
    icon: '⚛️',
    year: 2019,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // HISTORICAL FIGURES
  // ═══════════════════════════════════════

  {
    id: 'nikola-tesla',
    title: 'Nikola Tesla',
    category: 'Historical Figure',
    description: 'Nikola Tesla (1856–1943) was a Serbian-American inventor, electrical engineer, and physicist whose work during the War of Currents established alternating current (AC) as the global standard for electrical power transmission. Born in Smiljan, then part of the Austrian Empire (modern Croatia), Tesla emigrated to the United States in 1884 and briefly worked for Thomas Edison before launching his own research. His inventions include the rotating magnetic field, the induction motor, the Tesla coil, polyphase AC systems, and foundational contributions to radio — contested with Guglielmo Marconi until the US Supreme Court partially restored Tesla\'s priority in 1943. His later career was marked by visionary but increasingly unsupported projects, including a global wireless energy transmission system (Wardenclyffe Tower).',
    claims: [
      'Tesla\'s polyphase AC system, commercialised with George Westinghouse, became the foundation of modern electrical infrastructure — every household outlet in the world reflects his design.',
      'Tesla\'s 1897 patent for radio transmission predated Marconi\'s; the US Supreme Court ruled in 1943 that several Marconi patents were anticipated by Tesla\'s prior art.',
      'Declassified FBI files from 1943 indicate the US government confiscated Tesla\'s papers after his death, citing national security; most were eventually returned to Serbia.',
      'Tesla\'s descriptions of directed energy weapons and ball-lightning experiments in his Colorado Springs notes have inspired speculation about classified weapons programmes.',
    ],
    criticisms: [
      'Tesla\'s later claims — wireless global power, "death ray" weapons, thought photography — were never demonstrated and are not considered credible by physicists.',
      'His reputation suffered from his own eccentricities and his failure to commercialise his most advanced ideas; Wardenclyffe Tower was never completed.',
      'Popular hagiography of Tesla often exaggerates his contributions while diminishing the collaborative and commercial roles of Westinghouse, Steinmetz, and others who brought AC to market.',
      'The "Tesla vs Edison" narrative is largely a retrospective cultural construction; in reality both worked on complementary rather than purely competing systems.',
    ],
    mainstream_view: 'Historians of science regard Tesla as a genuine genius and important inventor whose contributions to AC power, motors, and radio were foundational — and also as a tragic figure whose later career was characterised by financial failure and increasingly isolated claims. His cultural rehabilitation in the internet era has sometimes tilted into hagiography that distorts the historical record.',
    open_questions: [
      'What was the scientific basis of Tesla\'s claims about earthquake machines and "telegeodynamics" — genuine physics applied speculatively, or misunderstood resonance effects?',
      'Could a version of Wardenclyffe Tower have transmitted usable wireless energy at global scale, or were the electromagnetic losses insurmountable with 1900s-era technology?',
      'What exactly did the FBI confiscate from Tesla\'s hotel room in 1943, and has all of the recovered material been fully declassified and returned to public record?',
    ],
    tags: ['Nikola Tesla', 'AC current', 'induction motor', 'Wardenclyffe', 'radio', 'Westinghouse', 'Edison', 'War of Currents', 'inventor', 'electrical engineering'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#f59e0b',
    icon: '⚡',
    coordinates: [44.5639, 15.3453], // Smiljan, Croatia (birthplace)
    year: 1856,
    date_start: 1856,
    date_end: 1943,
    date_precision: 'exact',
    country: 'Croatia',
  },

  {
    id: 'alan-turing',
    title: 'Alan Turing',
    category: 'Historical Figure',
    description: 'Alan Mathison Turing (1912–1954) was a British mathematician, logician, and computer scientist whose foundational contributions span theoretical computer science, cryptanalysis, and artificial intelligence. His 1936 paper "On Computable Numbers, with an Application to the Entscheidungsproblem" defined the universal Turing machine — a mathematical abstraction that formalised the concept of computation and established the theoretical limits of what is computable. During World War II, Turing led the effort at Bletchley Park to break the German Enigma cipher, work that is credited with shortening the war by at least two years. In 1950, he proposed the "imitation game" (now called the Turing Test) as a criterion for machine intelligence. Turing was convicted of "gross indecency" for his homosexuality in 1952, chemically castrated, and died in 1954 — officially ruled a suicide, though the circumstances remain disputed.',
    claims: [
      'Turing\'s Bombe machine and the theoretical framework he developed for cryptanalysis were instrumental in breaking Enigma, enabling Allied naval commanders to track German U-boat movements in the Atlantic.',
      'The Church-Turing thesis — that any effectively computable function can be computed by a Turing machine — remains the foundational premise of theoretical computer science, unchallenged for nearly 90 years.',
      'Turing\'s 1952 paper on morphogenesis — reaction-diffusion systems that generate biological patterns — anticipated modern mathematical biology by decades and has been experimentally validated in animal pigmentation studies.',
      'A royal pardon was granted posthumously to Turing in 2013; in 2017, the "Turing Law" in the UK extended pardons to all men convicted under historical homosexuality laws.',
    ],
    criticisms: [
      'The Turing Test has been widely criticised as an insufficient criterion for genuine machine intelligence; systems can pass it through sophisticated pattern matching without understanding.',
      'The degree of Turing\'s individual contribution to breaking Enigma, relative to the Polish Biuro Szyfrów and colleagues such as Gordon Welchman, is sometimes understated in popular accounts.',
      'The circumstances of Turing\'s death — cyanide poisoning from a half-eaten apple — led some biographers to argue it was accidental rather than suicide; the question remains open.',
    ],
    mainstream_view: 'Turing is universally recognised as one of the founders of theoretical computer science and artificial intelligence. His wartime cryptanalysis contributions are considered decisive for the Allied victory. The British government\'s treatment of Turing — prosecuting him for homosexuality after his wartime service — is regarded as one of the most egregious acts of institutional injustice in modern British history. His image appearing on the £50 note since 2021 represents a formal national recognition.',
    open_questions: [
      'Was Turing\'s death in June 1954 a deliberate suicide, an accidental cyanide ingestion from his laboratory experiments, or — as a small minority suggests — an intelligence-related killing?',
      'Can quantum or hypercomputation models exceed the Church-Turing bound, or is the thesis a fundamental physical limit?',
      'How much of the Bletchley Park cryptanalytic work remains classified, and what additional operational intelligence might historical records reveal?',
    ],
    tags: ['Alan Turing', 'Turing machine', 'Enigma', 'Bletchley Park', 'artificial intelligence', 'Turing Test', 'computer science', 'cryptography', 'WWII', 'morphogenesis'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#0369a1',
    icon: '💻',
    coordinates: [51.9984, -0.7411], // Bletchley Park
    year: 1912,
    date_start: 1912,
    date_end: 1954,
    date_precision: 'exact',
    country: 'United Kingdom',
  },

  // ═══════════════════════════════════════
  // GOVERNMENT SECRECY / INTELLIGENCE
  // ═══════════════════════════════════════

  {
    id: 'nsa-prism-surveillance',
    title: 'NSA PRISM Surveillance Program',
    category: 'Government Secrecy',
    description: 'PRISM is a clandestine electronic surveillance programme operated by the US National Security Agency (NSA) under Section 702 of the Foreign Intelligence Surveillance Act (FISA). The programme was classified until June 2013, when former NSA contractor Edward Snowden provided classified documents to journalists Glenn Greenwald and Laura Poitras, who published them in The Guardian and Washington Post. PRISM enabled the NSA to collect internet communications — emails, video calls, chat, cloud documents — directly from the servers of major US technology companies including Microsoft, Google, Apple, Facebook, and Yahoo. The disclosures sparked a global debate about mass surveillance, the extent of intelligence community powers, and the balance between national security and civil liberties.',
    claims: [
      'NSA PRISM slides published in 2013 showed the agency had direct access to servers of nine major US internet companies under FISA court orders, covering email, video, voice, chat, photos, documents, and connection logs.',
      'The FISA Court, which issues PRISM orders, operates in secret and approves the vast majority of government requests — the court had rejected only 11 of 33,900 government surveillance applications between 1979 and 2012.',
      'Snowden documents revealed that GCHQ (UK) shared intelligence with the NSA and conducted its own mass interception of transatlantic fibre-optic cable data under the TEMPORA programme.',
      'In 2020, the US Court of Appeals for the Ninth Circuit ruled that the NSA\'s bulk phone records collection programme revealed by Snowden was illegal and possibly unconstitutional.',
    ],
    criticisms: [
      'US intelligence officials argued that PRISM and related programmes had helped disrupt specific terrorist plots; the claims remain difficult to verify independently given ongoing classification.',
      'Technology companies initially disputed the "direct access" framing in the leaked slides, stating they responded to lawful orders rather than providing backdoors — a distinction that critics regard as semantic.',
      'Snowden\'s method of disclosure — leaking classified information to journalists — is legally characterised by the US government as espionage; he remains in Russia under asylum.',
    ],
    mainstream_view: 'The Snowden disclosures are regarded by civil liberties organisations, legal scholars, and a significant portion of the public as a watershed moment in the history of surveillance. The US government regards Snowden as having caused significant intelligence damage. A federal court ruling that the bulk phone records programme was illegal — years after Snowden disclosed it — validated a core element of his concerns. The legality and extent of current NSA surveillance under Section 702 remains actively debated in Congress.',
    open_questions: [
      'What is the current scope of NSA surveillance under Section 702 following post-Snowden reforms, and does it still constitute mass collection of US persons\' communications?',
      'Have foreign intelligence services — particularly China and Russia — exploited the vulnerabilities Snowden revealed in US cryptographic and network infrastructure?',
      'Did the Snowden disclosures cause net harm or net benefit to US national security, and how can that trade-off be assessed without access to classified operational information?',
    ],
    tags: ['NSA', 'PRISM', 'Edward Snowden', 'surveillance', 'FISA', 'Section 702', 'GCHQ', 'mass surveillance', 'privacy', 'intelligence', 'Glenn Greenwald'],
    evidence_level: 'verified',
    confidence_score: 0.99,
    color: '#0369a1',
    icon: '👁️',
    year: 2013,
    date_precision: 'exact',
    country: 'United States',
  },

  {
    id: 'five-eyes-alliance',
    title: 'Five Eyes Intelligence Alliance',
    category: 'Intelligence Operation',
    description: 'The Five Eyes (FVEY) is a multilateral intelligence-sharing alliance comprising the signals intelligence agencies of the United States (NSA), United Kingdom (GCHQ), Canada (CSE), Australia (ASD), and New Zealand (GCSB). The alliance originates from the 1946 UKUSA Agreement — a classified signals intelligence treaty between the US and UK that emerged from wartime collaboration at Bletchley Park and Arlington Hall. Declassified in 2010, the agreement has since been expanded and elaborated. Five Eyes operates the most extensive global signals intelligence collection network in existence, sharing raw intercepts, analytical products, and technical cooperation across the five nations. In the post-Snowden era, its structure, collection methods, and legal basis have received significant public and parliamentary scrutiny.',
    claims: [
      'The UKUSA Agreement, when declassified in 2010, confirmed a framework for avoiding intelligence collection on each other\'s nationals while pooling all other foreign intelligence — effectively creating a loophole allowing partner nations to collect on each other\'s citizens.',
      'Snowden documents revealed Five Eyes operated a joint programme (MUSCULAR) that accessed data from Google and Yahoo internal networks without company knowledge, in addition to PRISM\'s legal orders.',
      'Five Eyes\' shared technical infrastructure extends to satellite collection, undersea cable tapping (GCHQ\'s Bude station), and coordinated cyber operations attributed to the alliance.',
      'Nine Eyes (adding Denmark, France, Netherlands, Norway) and Fourteen Eyes (adding Germany, Belgium, Italy, Spain, Sweden) represent broader but shallower intelligence-sharing tiers below Five Eyes.',
    ],
    criticisms: [
      'The arrangement creates legal ambiguity: each nation\'s laws restrict spying on its own citizens, but ally collection shared across borders may circumvent domestic legal protections.',
      'The alliance\'s opacity makes democratic oversight difficult; parliamentary oversight bodies in member states have acknowledged significant gaps in their ability to review Five Eyes operations.',
      'Critics argue that Five Eyes functions as an instrument of geopolitical interest rather than pure counter-terrorism, citing documented collection against French industrial targets and Brazilian government communications.',
    ],
    mainstream_view: 'The existence, general structure, and historical origins of Five Eyes are now well-documented through declassified government records and Snowden disclosures. Intelligence scholars regard it as the world\'s most effective and enduring signals intelligence alliance. The legal and constitutional questions raised by its cross-border collection arrangements remain actively contested in domestic courts and legislatures across member states.',
    open_questions: [
      'Does the mutual collection-and-share arrangement between Five Eyes partners effectively circumvent the domestic legal restrictions each nation places on spying on its own citizens?',
      'How has Five Eyes adapted to encrypted communications, end-to-end messaging platforms, and quantum-resistant cryptography?',
      'What is the scope of joint Five Eyes offensive cyber operations, and under what legal frameworks are they authorised?',
    ],
    tags: ['Five Eyes', 'FVEY', 'NSA', 'GCHQ', 'UKUSA Agreement', 'intelligence sharing', 'signals intelligence', 'SIGINT', 'surveillance', 'Snowden', 'Bletchley Park'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#0369a1',
    icon: '🌐',
    year: 1946,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // MODERN MYSTERY / UNEXPLAINED
  // ═══════════════════════════════════════

  {
    id: 'havana-syndrome',
    title: 'Havana Syndrome',
    category: 'Modern Mystery',
    description: 'Havana Syndrome is the popular name for a cluster of mysterious neurological symptoms — sudden intense headache, tinnitus, vertigo, cognitive difficulties, and visual disturbances — first reported by US Embassy staff in Havana, Cuba, beginning in late 2016. The symptoms were accompanied by reports of a directional sound or pressure sensation. Over 1,000 US government personnel worldwide, including CIA officers, State Department staff, and their families, have subsequently reported similar episodes. The cause has been disputed since the first cases; hypotheses include microwave weapons (the "Frey effect"), ultrasound devices, psychogenic illness, and environmental factors. A 2023 assessment by the US intelligence community concluded that most cases were "very unlikely" caused by a foreign adversary.',
    claims: [
      'An initial National Academies of Sciences review (2020) found "directed, pulsed radio frequency energy" to be the most plausible mechanism consistent with reported symptoms and auditory phenomena.',
      'Cases were concentrated among intelligence officers and were reported in China (Guangzhou, 2018), Germany, Austria, Australia, and within the United States — a geographic pattern consistent with a targeted campaign.',
      'Independent research published in peer-reviewed journals documented structural brain abnormalities (white matter changes) in some affected US government personnel compared to matched controls.',
      'Former CIA Director William Burns stated publicly in 2021 that he believed Havana Syndrome was caused by a foreign adversary, while acknowledging the intelligence case was not conclusive.',
    ],
    criticisms: [
      'The 2023 US intelligence community assessment, drawing on classified and unclassified sources, concluded that most reported cases were not the result of a foreign adversary\'s directed-energy or acoustic weapon.',
      'Functional neurological disorder — a recognized condition involving genuine neurological symptoms without a structural cause, often triggered by anxiety or psychological stress — could explain many cases consistent with the symptom pattern.',
      'The absence of any recovered device, captured operator, or intercepted communications referencing such a programme is a significant evidentiary gap for the foreign attack hypothesis.',
      'Neuroimaging studies of affected personnel have been methodologically criticised for small sample sizes and potential selection bias.',
    ],
    mainstream_view: 'The scientific and intelligence communities remain divided. The 2020 National Academies report favoured a directed energy explanation; the 2023 intelligence assessment moved toward a psychogenic or environmental explanation for most cases while not excluding the possibility of a small number of genuine anomalous cases. The mystery remains unresolved to the satisfaction of affected personnel and congressional oversight committees.',
    open_questions: [
      'If a directed-energy weapon was used against some personnel, why has no adversary state claimed credit, and what would be the strategic objective of a non-lethal covert harassment campaign?',
      'Can brain imaging and biomarker studies definitively distinguish functional neurological disorder from organic injury caused by pulsed RF exposure?',
      'Will the US government release the full classified annex of the 2023 intelligence assessment, and would it resolve the dispute?',
    ],
    tags: ['Havana Syndrome', 'directed energy', 'microwave weapon', 'CIA', 'US embassy', 'Cuba', 'neurological', 'Frey effect', 'intelligence', 'psychogenic'],
    evidence_level: 'debated',
    confidence_score: 0.45,
    color: '#b91c1c',
    icon: '🧠',
    year: 2016,
    date_precision: 'exact',
    country: 'Cuba',
    coordinates: [23.1136, -82.3666], // Havana
  },

  {
    id: 'near-death-experiences',
    title: 'Near-Death Experiences (NDEs)',
    category: 'Unexplained Phenomenon',
    description: 'Near-death experiences (NDEs) are vivid, structured subjective experiences reported by people who have been clinically near death — during cardiac arrest, surgery, or other life-threatening events — and subsequently resuscitated. Common features across cultures include: a sensation of floating above the body, movement through a dark tunnel toward a light, encountering deceased relatives, a life review, a profound sense of peace, and an unwillingness to return. Cardiologist Pim van Lommel published a landmark prospective study in The Lancet (2001) following 344 cardiac arrest patients, finding that 18% reported NDEs despite lacking cortical brain activity during the arrest. NDEs have been reported since antiquity but entered scientific discourse following Raymond Moody\'s 1975 book Life After Life.',
    claims: [
      'Van Lommel\'s prospective Lancet study found that NDEs occurred during periods of verified cardiac arrest and flatline EEG, appearing to challenge the assumption that conscious experience requires measurable cortical activity.',
      'The AWARE (AWAreness during REsuscitation) study by Sam Parnia at NYU Langone attempted to verify out-of-body visual perceptions using hidden targets above resuscitation beds; one validated case of accurate out-of-body perception was reported in the AWARE II study.',
      'Cross-cultural consistency in NDE elements — life review, tunnel, light, deceased relatives — despite variation in religious interpretation, has been proposed as evidence against purely culturally constructed hallucination.',
      'Long-term after-effects of NDEs — loss of fear of death, increased altruism, reduced materialism — are robustly documented and suggest a genuinely transformative experience regardless of mechanism.',
    ],
    criticisms: [
      'The neuroscientific consensus holds that NDEs are generated by a dying or resuscitating brain: cortical disinhibition, temporal lobe hypoxia, REM intrusion, and endorphin release can each account for elements of the phenomenology.',
      'Accurate veridical perception during NDEs has not been replicated under controlled conditions; existing cases involve methodological ambiguities about the timing of consciousness relative to the arrest.',
      'The cultural universality of NDE elements is overstated; systematic cross-cultural analysis shows significant variation in the presence and interpretation of specific features.',
      'Survivor bias is inherent in NDE research: only patients who survive and can report their experience are studied, making population-level prevalence and mechanistic claims difficult.',
    ],
    mainstream_view: 'Mainstream neuroscience and psychology regard NDEs as extraordinary experiences generated by the brain under extreme physiological stress. They are of great scientific interest as windows into consciousness and dying, but do not constitute evidence for survival of consciousness after death. Researchers such as van Lommel and Parnia who take seriously the possibility of non-local consciousness are a minority within neuroscience, though their work is published in peer-reviewed journals and taken seriously as empirical research.',
    open_questions: [
      'Can a future prospective study with well-controlled hidden targets and continuous EEG monitoring definitively test whether accurate out-of-body perception occurs during verified cardiac arrest?',
      'What neural mechanisms — specifically the timing and nature of the surge in gamma-band activity observed in dying rat brains — might generate the coherent, narrative structure of NDEs?',
      'Do the long-term psychological and behavioural changes in NDE survivors have therapeutic implications for end-of-life care or treatment of existential distress?',
    ],
    tags: ['NDE', 'near-death', 'cardiac arrest', 'consciousness', 'Pim van Lommel', 'Sam Parnia', 'AWARE', 'life review', 'out-of-body', 'afterlife', 'neuroscience'],
    evidence_level: 'debated',
    confidence_score: 0.38,
    color: '#7c3aed',
    icon: '✨',
    year: 1975,
    date_precision: 'decade',
  },

  {
    id: 'ball-lightning',
    title: 'Ball Lightning',
    category: 'Unexplained Phenomenon',
    description: 'Ball lightning is a rare atmospheric phenomenon characterised by luminous, spherical objects ranging from pea-sized to several meters in diameter, most commonly observed during thunderstorms. Reports describe glowing orbs of various colours that move slowly, pass through windows and walls, and vanish silently or with a loud bang. Thousands of eyewitness accounts dating back to antiquity are documented in scientific literature, including by Tsar Nicholas II in 1878 and in a 1960 RAND Corporation technical report. Despite extensive reporting, ball lightning has never been reliably produced in the laboratory or captured on high-quality scientific imaging instruments until a 2014 Chinese study reported spectroscopic data from a naturally occurring event.',
    claims: [
      'A 2014 publication by researchers at Northwest Normal University in China reported the first spectroscopic observation of natural ball lightning during a storm, recording emission lines consistent with silicon, iron, and calcium — elements found in soil — supporting a microwave-sustained silicon vapour hypothesis.',
      'The phenomenon\'s consistency across cultures, time periods, and geographic locations — including indoor occurrences behind closed windows — resists dismissal as pure hallucination or misidentification of conventional lightning artefacts.',
      'Theoretical models including plasma vortices, microwave cavity resonance, and concentrated oxidising reactions of silicon nanoparticles each match some but not all observed properties.',
      'Soviet and US military research programmes investigated ball lightning as a potential energy storage phenomenon during the Cold War; some documents remain classified.',
    ],
    criticisms: [
      'Virtually all documented ball lightning evidence is eyewitness testimony; controlled scientific observation is nearly impossible given the phenomenon\'s unpredictability and brief duration.',
      'Optical illusions, afterimages from lightning strikes, ionised gas bubbles, and St. Elmo\'s Fire are capable of generating experiences consistent with ball lightning reports.',
      'The 2014 Chinese spectroscopic observation has not been independently replicated, and the emission spectra reported are consistent with conventional soil-derived lightning-induced plasma.',
      'No proposed theoretical model has successfully predicted ball lightning\'s full range of observed properties — colour variation, wall penetration, floating motion, and terminal explosion.',
    ],
    mainstream_view: 'Ball lightning is taken seriously by atmospheric physicists as a genuine and unexplained phenomenon, but the evidence base remains almost entirely anecdotal. The scientific consensus is agnostic: the phenomenon probably exists as an unusual plasma or electrical formation, but its mechanism is unknown and no theory has achieved consensus. It is not considered paranormal or extraterrestrial by mainstream science.',
    open_questions: [
      'Can a dedicated network of lightning observation stations with spectrographs, high-speed cameras, and electromagnetic sensors capture a controlled observation of ball lightning sufficient for definitive characterisation?',
      'Which theoretical mechanism — silicon vapour, plasma vortex, microwave cavity, or Bose-Einstein condensate of metallic hydrogen — best accounts for all reliably documented properties?',
      'Is the "wall penetration" reported in numerous well-documented cases a physical reality or a perceptual effect during the extreme stress of a lightning storm?',
    ],
    tags: ['ball lightning', 'atmospheric physics', 'plasma', 'lightning', 'unexplained', 'silicon vapour', 'spectroscopy', 'China 2014', 'eyewitness', 'St Elmo\'s Fire'],
    evidence_level: 'debated',
    confidence_score: 0.52,
    color: '#eab308',
    icon: '⚡',
    year: 1960,
    date_precision: 'decade',
  },

  // ═══════════════════════════════════════
  // HISTORICAL CONTROVERSY / ARTIFACT
  // ═══════════════════════════════════════

  {
    id: 'voynich-manuscript',
    title: 'Voynich Manuscript',
    category: 'Historical Controversy',
    description: 'The Voynich Manuscript is an illustrated codex hand-written in an unknown writing system, held at Yale University\'s Beinecke Rare Book & Manuscript Library (MS 408). Radiocarbon dating places its vellum parchment between 1404 and 1438 CE, consistent with early-15th-century Central European manufacture. Named after Wilfrid Voynich, the Polish-American rare books dealer who acquired it in 1912 from the Jesuit college at Villa Mondragone in Italy, the manuscript contains approximately 240 pages of illustrations — herbal, astronomical, balneological, and cosmological — accompanied by dense, entirely undeciphered text in an unknown language or cipher. No cryptographer, linguist, or AI system has produced an accepted decipherment.',
    claims: [
      'Statistical analysis of the Voynich text reveals properties inconsistent with random noise — it follows Zipf\'s law and contains structure indicative of a natural or constrained artificial language.',
      'Linguistic researchers using Sukhotin\'s algorithm and information-theoretic measures have found the text\'s entropy characteristics most similar to those of East Asian logographic languages.',
      'A 2018 study by Gerard Cheshire proposed the manuscript was written in a lost proto-Romance language; his reading of several pages was challenged and largely rejected by professional medievalists and linguists.',
      'The manuscript\'s provenance traces to Emperor Rudolf II of Prague (reigned 1576–1612), who reportedly purchased it for 600 gold ducats, suggesting it was considered valuable and meaningful at the time.',
    ],
    criticisms: [
      'Computational analysis of Voynich text has produced dozens of conflicting and incompatible claimed decipherments, none of which have been accepted by independent scholars.',
      'The statistical properties of the text — including Zipf distribution and entropy levels — can be reproduced by glossolalia, elaborate hoaxes, or systematic algorithmic generation, and do not prove meaningful content.',
      'The absence of word-final vowels and other morphological regularities has led some researchers to propose the manuscript is a sophisticated hoax, possibly created by Voynich himself or by figures in Rudolf II\'s court of scientific curiosity-seekers.',
    ],
    mainstream_view: 'The manuscript is genuine 15th-century vellum, but its content remains entirely undeciphered after more than a century of professional and amateur cryptanalysis. The academic consensus considers three leading hypotheses roughly equal in plausibility: an unknown natural language written in a custom alphabet; an elaborate cipher (possibly polyalphabetic) concealing Latin or another European language; or a complex, sophisticated hoax constructed to appear meaningful without encoding decodable content.',
    open_questions: [
      'Will AI-assisted analysis — machine translation models trained on known 15th-century language families — identify structural parallels sufficient to determine the linguistic family of the Voynich text?',
      'Can the provenance chain be extended earlier than Rudolf II, and would earlier provenance resolve questions about the manuscript\'s geographic origin?',
      'Is the botanical section\'s illustrated plant iconography identifiable with any known species or regional flora, and if so, does the geographic range of those species constrain the manuscript\'s origin?',
    ],
    tags: ['Voynich Manuscript', 'cryptography', 'cipher', 'medieval', 'Beinecke Library', 'Yale', 'Wilfrid Voynich', 'unknown language', 'Rudolf II', 'undeciphered'],
    evidence_level: 'debated',
    confidence_score: 0.42,
    color: '#a16207',
    icon: '📜',
    year: 1420,
    date_precision: 'decade',
  },

  {
    id: 'baghdad-battery',
    title: 'Baghdad Battery',
    category: 'Ancient Technology',
    description: 'The Baghdad Battery (also called the Parthian Battery) is an artefact discovered near Khujut Rabu, south of Baghdad, Iraq, in 1936 by Wilhelm König, then director of the National Museum of Iraq. It consists of a terracotta jar approximately 14 cm tall containing a copper cylinder enclosing an iron rod, with asphalt sealing the top. König proposed in 1940 that the device was an ancient galvanic cell capable of generating a small electric current when filled with an acidic electrolyte such as grape juice or vinegar. Replicas have produced between 0.8 and 2 volts. The original artefact is dated to the Parthian period (250 BCE–224 CE) or possibly the Sassanid period (224–640 CE).',
    claims: [
      'Replicas constructed by researchers and demonstrated on television programmes have generated measurable voltages sufficient for electroplating thin gold or silver films onto objects.',
      'König proposed the device was used for electroplating religious artefacts with thin metal coatings — a practice that would explain the high quality of gilded objects from the period without accounting for the full gold mass.',
      'The discovery predates the Western identification of electrical phenomena by Volta in 1800 by approximately 2,000 years, suggesting independent empirical discovery of galvanic principles.',
      'Chemical analysis of some ancient Near Eastern artefacts has revealed thin metal coatings that some researchers argue are consistent with electroplating rather than fire gilding.',
    ],
    criticisms: [
      'König\'s identification of the jar as an electrical device is not supported by any written record, inscription, or iconographic representation from the Parthian or Sassanid period.',
      'The artefact most plausibly functioned as a storage vessel for scrolls — a common use for sealed terracotta jars in the period — with the copper and iron components being internal fittings for roll supports.',
      'The voltages generated by replicas (under 2 V) are insufficient to produce durable electroplated coatings on complex artefacts; ancient fire-gilding techniques are well-documented and produce superior results.',
      'No copper or gold deposit consistent with electroplating has been identified on any contemporary Near Eastern artefact under rigorous metallographic analysis.',
    ],
    mainstream_view: 'Archaeologists and historians of technology consider the electroplating hypothesis unsubstantiated. There is no written or iconographic evidence of electrical knowledge in Parthian or Sassanid culture, the voltages are insufficient for practical electroplating, and alternative explanations for the artefact\'s composition are more parsimonious. The "Baghdad Battery" designation reflects popular interest in ancient technology mysteries rather than archaeological consensus.',
    open_questions: [
      'Has any systematic metallographic survey of Parthian or Sassanid gilded artefacts been conducted specifically testing for electrodeposition signatures distinguishable from fire gilding?',
      'Could a series of Baghdad Battery-type cells connected in series have produced practical electroplating voltage, and is there any evidence of such multi-cell arrangements?',
      'What was the actual function of the jar? If scroll storage, why was it sealed with asphalt rather than clay — a more common sealant for that purpose?',
    ],
    tags: ['Baghdad Battery', 'Parthian', 'ancient electricity', 'electroplating', 'Wilhelm König', 'Iraq', 'galvanic cell', 'Volta', 'ancient technology', 'archaeology'],
    evidence_level: 'debated',
    confidence_score: 0.25,
    color: '#a16207',
    icon: '🔋',
    year: -200,
    date_start: -250,
    date_end: 640,
    date_precision: 'century',
    coordinates: [33.3406, 44.3939], // Near Baghdad
    country: 'Iraq',
  },

  // ═══════════════════════════════════════
  // UFO / UAP — RECENT
  // ═══════════════════════════════════════

  {
    id: 'uap-congressional-hearings-2023',
    title: 'UAP Congressional Whistleblower Hearings (2023)',
    category: 'UFO / UAP',
    description: 'On 26 July 2023, the US House Oversight Committee held a historic public hearing on Unidentified Anomalous Phenomena (UAP), at which three military and intelligence witnesses testified under oath. David Grusch, a former intelligence official and UAP Task Force representative, testified that the US government possessed non-human intelligence craft and biological remains, and that he had been denied access to relevant programmes. David Fravor, a retired Navy commander who encountered the "Tic-Tac" UAP in 2004, and Ryan Graves, a former F/A-18 pilot who reported sustained UAP encounters off the US East Coast, also testified. The hearing occurred against the backdrop of the 2023 National Defense Authorization Act\'s UAP disclosure provisions and NASA\'s concurrent UAP study.',
    claims: [
      'David Grusch testified under oath that he had spoken with individuals who had direct knowledge of US government programmes involving non-human intelligence craft and biological material, and that he was denied access to those programmes through illegal means.',
      'Ryan Graves stated that UAP sightings by active military pilots are grossly underreported due to stigma and career concerns, and that the phenomena have been observed near sensitive US military installations for decades.',
      'The 2023 NDAA included provisions establishing a UAP disclosure review board modelled on the JFK Records Act, suggesting legislative intent to declassify historical UAP records.',
      'NASA\'s Independent Study on UAP (released September 2023) concluded that current data are insufficient to draw firm conclusions about UAP nature but recommended a rigorous scientific approach and acknowledged the potential for genuine physical anomalies.',
    ],
    criticisms: [
      'Grusch\'s testimony was second- and third-hand — he reported what others told him rather than personal direct observation; no physical evidence, documentary proof, or named corroborating witnesses were provided in the public hearing.',
      'The intelligence community Inspector General found Grusch\'s complaint "credible and urgent" but this assessment relates to the seriousness of his allegations, not their truth — an important procedural distinction.',
      'Congressional UAP attention intensifies around budget cycles and NDAA negotiations; critics note that extraordinary claims about non-human intelligence require extraordinary evidence, none of which has been made publicly available.',
      'Historical "crash retrieval" narratives (Roswell, Kecksburg) have proven, on investigation, to involve misidentified human-made objects; Grusch\'s claims fit a pattern of rumours that have circulated in aerospace communities for decades.',
    ],
    mainstream_view: 'The mainstream scientific community regards Grusch\'s specific claims about retrieved non-human craft as unsubstantiated pending verifiable evidence. The hearing is nonetheless regarded as historically significant as the first serious congressional airing of the topic with credible military witnesses. Atmospheric physicists and astronomers support systematic scientific study of UAP — particularly well-documented cases from calibrated sensors — while maintaining that unknown phenomena do not require extraterrestrial explanations.',
    open_questions: [
      'Will the UAP Disclosure Act\'s review board result in the declassification of records that substantiate or refute Grusch\'s specific claims about recovered craft and biological material?',
      'What fraction of military UAP reports involve genuine atmospheric or technological phenomena not explained by known physics, and can a systematic sensor network characterise them?',
      'If the US government does possess anomalous materials of unknown origin, what would a credible chain of custody and scientific authentication process look like?',
    ],
    tags: ['UAP', 'UFO', 'David Grusch', 'Ryan Graves', 'David Fravor', 'Congress', 'whistleblower', '2023', 'non-human intelligence', 'Tic-Tac', 'NASA', 'disclosure'],
    evidence_level: 'debated',
    confidence_score: 0.35,
    color: '#16a34a',
    icon: '🛸',
    year: 2023,
    date_precision: 'exact',
    country: 'United States',
  },

  {
    id: 'oumuamua',
    title: 'ʻOumuamua — First Interstellar Object',
    category: 'Extraterrestrial Hypothesis',
    description: '1I/ʻOumuamua (from Hawaiian: "scout" or "messenger") was discovered on 19 October 2017 by astronomer Robert Weryk using the Pan-STARRS telescope at Haleakalā Observatory, Hawaii. It is the first confirmed interstellar object detected passing through the solar system. ʻOumuamua displayed several anomalous characteristics: a highly elongated or disc-like shape (estimated 10:1 aspect ratio), tumbling rotation, an absence of observable cometary outgassing despite solar heating, and a non-gravitational acceleration (trajectory deviation not attributable to solar gravity, radiation pressure, or identified outgassing). Avi Loeb, Chair of Harvard\'s Department of Astronomy, proposed in a 2018 paper and subsequent 2021 book Extraterrestrial that the non-gravitational acceleration is best explained by a light-sail — an artificial structure — of extraterrestrial origin.',
    claims: [
      'ʻOumuamua\'s non-gravitational acceleration was measured with high statistical significance (>30σ) by multiple independent teams and is not consistent with comet outgassing given the absence of detected CN, OH, CO, CO₂, or dust in deep spectroscopic searches.',
      'Loeb and Bialy\'s 2018 Astrophysical Journal Letters paper calculated that a thin hydrogen or dust sheet of roughly 1 mm thickness with ≥20 m radius, if composed of natural or artificial material with low surface density, could account for the observed radiation-pressure-induced acceleration.',
      'The object\'s extreme luminosity variation (factor of 10 or more) is highly unusual among solar system objects and implies either an extreme elongation inconsistent with most natural formation processes or a highly reflective geometry.',
      'Harvard\'s Galileo Project, founded by Loeb in 2021, is conducting systematic astronomical surveys to characterise anomalous objects in Earth\'s vicinity using calibrated scientific instrumentation.',
    ],
    criticisms: [
      'The dominant scientific consensus holds that hydrogen iceberg outgassing, "pancake" ice slab geometry from tidal disruption, or other natural mechanisms can account for the non-gravitational acceleration without requiring an artificial explanation.',
      'Loeb\'s hypothesis violates Occam\'s razor: before invoking extraterrestrial technology, natural explanations — even novel and exotic natural explanations — should be exhausted, and several plausible natural mechanisms have been proposed.',
      'ʻOumuamua was only observed for approximately three months before it became too faint to track; the data set is insufficient to definitively rule in or out any hypothesis.',
      'Loeb\'s public communication approach — book deals, extensive media appearances, and press-release-driven claims — has been criticised by colleagues as inconsistent with scientific norms for extraordinary claims.',
    ],
    mainstream_view: 'Planetary scientists and astronomers regard ʻOumuamua as a genuinely anomalous and scientifically interesting object whose nature remains uncertain. The consensus view favours natural explanations — novel forms of cometary activity, tidal disruption debris, or hydrogen-rich ices — over artificial origin. The Galileo Project\'s methodical observational programme is broadly supported as a reasonable scientific response, even among researchers who reject the artificial-origin hypothesis.',
    open_questions: [
      'Will the Vera Rubin Observatory\'s Legacy Survey of Space and Time (LSST) detect additional interstellar objects allowing statistical comparison with ʻOumuamua\'s anomalies?',
      'Can laboratory experiments constrain whether hydrogen ice or nitrogen ice outgassing under solar radiation could produce the observed acceleration profile without detectable spectroscopic signatures?',
      'If the Galileo Project identifies further anomalous near-Earth objects, what chain of evidence would be scientifically sufficient to conclude artificial origin?',
    ],
    tags: ['Oumuamua', 'interstellar object', 'Avi Loeb', 'Pan-STARRS', 'non-gravitational acceleration', 'light sail', 'Galileo Project', 'extraterrestrial', 'comet', 'anomaly', 'Harvard'],
    evidence_level: 'debated',
    confidence_score: 0.28,
    color: '#0891b2',
    icon: '🌌',
    year: 2017,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // ORGANIZATION
  // ═══════════════════════════════════════

  {
    id: 'bilderberg-group',
    title: 'Bilderberg Group',
    category: 'Organization',
    description: 'The Bilderberg Group is an annual invitation-only conference of approximately 120–150 leading figures from politics, business, finance, academia, and media, primarily from Europe and North America. Founded in 1954 at the Hotel de Bilderberg in Oosterbeek, Netherlands, under the initiative of Prince Bernhard of the Netherlands and with US State Department support, the meetings were originally conceived as a forum to strengthen transatlantic relations during the Cold War. The Bilderberg Meetings publish an annual communiqué listing agenda topics and participants but do not release transcripts or detailed minutes, citing the off-the-record format as necessary for frank exchange.',
    claims: [
      'Bilderberg participants include heads of government, NATO officials, European Union commissioners, central bank governors, and the chief executives of major corporations — a roster with significant actual policy influence in the institutions they lead.',
      'Critics including researchers such as Daniel Estulin argue that Bilderberg functions as a shadow government that coordinates elite consensus on geopolitical and economic policy before it is implemented through official institutions.',
      'Multiple future heads of government and central bank governors were Bilderberg participants in the year before their appointments, suggesting the forum may function as a vetting mechanism for leadership positions.',
      'European Parliament member Mario Borghezio introduced a resolution in 2010 calling for EU oversight of Bilderberg on democratic accountability grounds.',
    ],
    criticisms: [
      'Bilderberg has no decision-making authority; it is a discussion forum. Participants return to institutions where decisions are made through normal institutional processes, limiting Bilderberg\'s causal policy role.',
      'The "shadow government" critique conflates correlation (powerful people attend) with causation (the meeting determines outcomes), a fallacy common to conspiracy reasoning.',
      'Many comparable informal elite forums — Davos World Economic Forum, Aspen Ideas Festival, Council on Foreign Relations — are more transparent; Bilderberg\'s opacity is a cultural artefact of its Cold War origins rather than evidence of sinister coordination.',
      'The participant list is publicly released; the claimed secrecy is of discussion content, not membership — a standard practice in diplomatic and business negotiations.',
    ],
    mainstream_view: 'Political scientists and journalists who have studied Bilderberg conclude it is a real and influential elite networking forum that operates with less transparency than is desirable in democratic societies, but is not a secret world government. Its significance lies in the relationships and informal consensus it facilitates rather than in any binding decision-making authority. The political science literature treats it as one of several informal transnational elite forums that shape the ideational environment of policy-making.',
    open_questions: [
      'Is there demonstrable causal evidence that Bilderberg discussions have shaped specific policies — interest rate decisions, treaty language, electoral strategies — in ways traceable to the meetings?',
      'Would mandatory disclosure of Bilderberg meeting transcripts after a fixed embargo period (as applies to Federal Reserve Board minutes) be consistent with participants\' roles as public officials?',
    ],
    tags: ['Bilderberg', 'elite', 'secret meeting', 'NATO', 'Prince Bernhard', 'globalism', 'transatlantic', 'shadow government', 'geopolitics', 'annual conference'],
    evidence_level: 'strong_evidence',
    confidence_score: 0.80,
    color: '#475569',
    icon: '🏛️',
    year: 1954,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // CONSPIRACY THEORY / MODERN SOCIETY
  // ═══════════════════════════════════════

  {
    id: 'cbdc-central-bank-digital-currency',
    title: 'Central Bank Digital Currencies (CBDCs)',
    category: 'Conspiracy Theory',
    description: 'A Central Bank Digital Currency (CBDC) is a digital form of sovereign currency issued directly by a central bank, representing a liability of the central bank rather than a commercial bank. As of 2024, over 130 countries, representing more than 98% of global GDP, are at some stage of researching, piloting, or launching a CBDC. China\'s e-CNY (digital yuan) is the most advanced large-economy implementation, with active pilots in dozens of cities and integration with payment platforms. The Bahamas launched the "Sand Dollar" in 2020 as the world\'s first live retail CBDC. CBDCs range from wholesale instruments (central bank–to–bank settlement) to retail instruments (direct individual accounts). The policy rationale includes financial inclusion, payment efficiency, and the preservation of monetary sovereignty in an era of private stablecoins.',
    claims: [
      'A programmable CBDC could include expiry dates, geographic restrictions, or category restrictions on spending — capabilities that critics argue could enable unprecedented state control over individual financial behaviour.',
      'China\'s e-CNY trials have integrated the digital yuan with social credit scoring infrastructure in some pilot regions, providing a concrete precedent for financial surveillance tied to behavioural compliance.',
      'The Bank for International Settlements (BIS) has published research suggesting CBDCs could allow central banks to implement "helicopter money" and negative interest rates more effectively than current tools — a form of direct monetary policy on household balances.',
      'Privacy advocates and civil liberties organisations, including the ACLU, have warned that retail CBDCs without strong legal anonymity protections would constitute the most comprehensive financial surveillance infrastructure in history.',
    ],
    criticisms: [
      'Most proposed Western CBDC designs specifically exclude programmability for spending restrictions and are designed to preserve financial privacy at least to the level of existing bank accounts.',
      'The surveillance capabilities of proposed CBDCs are not categorically different from those of existing digital payment systems (Visa, PayPal, bank cards) which already transmit transaction data to financial institutions and governments under existing law.',
      'Financial inclusion and payment competition arguments for CBDCs are legitimate policy goals with empirical support from underbanked populations in emerging economies.',
      'The conflation of China\'s surveillance-oriented e-CNY design with Western CBDC proposals is a category error: different jurisdictions are designing fundamentally different systems.',
    ],
    mainstream_view: 'Central bank economists and monetary policy institutions regard CBDCs as a significant evolution in monetary infrastructure with legitimate policy applications. The key policy debates are technical and legal: privacy protections, intermediation risk (disintermediation of commercial banks), and interoperability. Civil liberties concerns about programmability and surveillance are taken seriously by democratic central banks and are being addressed through design choices and legislative frameworks in most Western CBDC projects.',
    open_questions: [
      'Can a retail CBDC be designed with genuinely robust transaction privacy — equivalent to physical cash — while also preventing money laundering and sanctions evasion?',
      'What legal frameworks would prevent a future government from activating programmability restrictions in a CBDC that was originally launched with privacy protections?',
      'Will private stablecoins (USDC, Tether) or emerging decentralised payment systems forestall the need for CBDCs in developed economies, or will interoperability make all these systems coexist?',
    ],
    tags: ['CBDC', 'digital currency', 'central bank', 'e-CNY', 'digital yuan', 'financial surveillance', 'BIS', 'monetary policy', 'programmable money', 'privacy', 'China'],
    evidence_level: 'strong_evidence',
    confidence_score: 0.82,
    color: '#b91c1c',
    icon: '💰',
    year: 2020,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // DISEASE & PANDEMIC — RECENT
  // ═══════════════════════════════════════

  {
    id: 'long-covid',
    title: 'Long COVID (Post-COVID Condition)',
    category: 'Disease & Pandemic',
    description: 'Long COVID, formally defined by the World Health Organization as Post-COVID Condition (PCC), is a multi-system illness characterised by symptoms persisting or emerging more than 12 weeks after acute SARS-CoV-2 infection and not explained by an alternative diagnosis. Common symptoms include profound fatigue, post-exertional malaise (worsening of symptoms after physical or mental effort), cognitive dysfunction ("brain fog"), shortness of breath, and autonomic dysfunction. Epidemiological studies estimate that 10–30% of non-hospitalised COVID-19 cases and a higher proportion of hospitalised cases develop Long COVID, with the condition affecting an estimated 65 million people globally as of 2023. The condition shares phenotypic overlap with myalgic encephalomyelitis/chronic fatigue syndrome (ME/CFS), fibromyalgia, and post-viral syndromes following influenza and Epstein-Barr virus.',
    claims: [
      'Viral reservoir persistence — SARS-CoV-2 RNA and protein detected in gut, lymph nodes, and tissues months post-infection — is increasingly supported as a mechanism for sustained immune activation in a subgroup of Long COVID patients.',
      'Small fibre neuropathy, documented in skin biopsies of Long COVID patients, provides a physiological basis for autonomic dysfunction, post-exertional malaise, and sensory disturbances.',
      'Microbiome dysbiosis, reactivation of latent herpesviruses (particularly Epstein-Barr virus), and autoantibodies targeting G protein-coupled receptors have all been documented in Long COVID cohort studies.',
      'COVID-19 vaccination significantly reduces (but does not eliminate) the risk of developing Long COVID following breakthrough infection, providing population-level evidence that viral load and immune response shape Long COVID pathogenesis.',
    ],
    criticisms: [
      'The definition of Long COVID is symptom-based and heterogeneous, likely encompassing multiple mechanistically distinct conditions — making population-level prevalence estimates and treatment trial designs difficult to interpret.',
      'Many reported Long COVID symptoms — fatigue, cognitive difficulty, mood changes — are non-specific and occur at elevated rates in populations under pandemic-related social and economic stress, independent of infection status.',
      'Controlled studies comparing Long COVID patients with sociodemographically matched COVID-negative controls with similar levels of pandemic stress show smaller differences in symptom prevalence than uncontrolled studies.',
      'The absence of validated biomarkers means Long COVID diagnosis depends entirely on self-reported symptoms; placebo response in clinical trials is substantial, complicating drug development.',
    ],
    mainstream_view: 'Long COVID is recognised as a genuine medical condition by the WHO, NIH, CDC, and major medical institutions worldwide. The NIH RECOVER initiative has committed $1.15 billion to mechanistic and therapeutic research. The scientific consensus holds that it is a heterogeneous condition with real biological underpinnings — viral persistence, immune dysregulation, microbiome disruption — while acknowledging that symptom-based definitions require biomarker development to stratify patients for targeted trials.',
    open_questions: [
      'Will antivirals (nirmatrelvir, AV-4656) or immune modulators targeting specific Long COVID subgroups (viral reservoir, autoantibody, autonomic) demonstrate clinical benefit in ongoing Phase III trials?',
      'What is the natural history of Long COVID — does it resolve spontaneously in the majority over 2–3 years, or do a significant subset develop permanent disability?',
      'Can a validated biomarker panel — serum markers, microbiome profile, neuroimaging signature — enable objective diagnosis and stratification of Long COVID patients?',
    ],
    tags: ['Long COVID', 'post-COVID', 'SARS-CoV-2', 'post-viral', 'ME/CFS', 'brain fog', 'fatigue', 'WHO', 'NIH', 'viral persistence', 'autonomic dysfunction'],
    evidence_level: 'strong_evidence',
    confidence_score: 0.88,
    color: '#e11d48',
    icon: '🦠',
    year: 2020,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // ANCIENT KNOWLEDGE / ALTERNATIVE HISTORY
  // ═══════════════════════════════════════

  {
    id: 'ancient-roman-concrete',
    title: 'Ancient Roman Concrete: Self-Healing Seawater Formula',
    category: 'Ancient Technology',
    description: 'Roman marine concrete — used in harbours, breakwaters, and coastal structures throughout the Mediterranean — has proved more durable than modern Portland cement-based concrete after 2,000 years of seawater exposure, where modern concrete typically fails within 50 years. The secret lies in the use of volcanic ash (pozzolana) from the Campi Flegrei region mixed with seawater and lime. Research by Marie Jackson and colleagues at UC Berkeley and published in American Mineralogist (2017) and Science Advances (2023) demonstrated that seawater flowing through cracks causes the growth of aluminous tobermorite and phillipsite crystals — a self-healing mineralisation process that actually strengthens the material over centuries rather than degrading it, as occurs with Portland cement.',
    claims: [
      'Seawater infiltration through cracks in Roman marine concrete triggers a mineralisation reaction producing aluminous tobermorite — a rare silicate mineral not present in the original mixture — that seals fractures and increases compressive strength over decades.',
      'The specific combination of Campi Flegrei volcanic ash (high aluminium content), sea water, and lime at moderate temperatures produced a mineral chemistry that modern Portland cement cannot replicate at ambient temperature.',
      'Structures such as the Pantheon\'s unreinforced concrete dome (built 125 CE) and the harbour at Caesarea Maritima have survived without maintenance because the material\'s chemistry is fundamentally different from modern cement formulations.',
      'The Roman recipe was largely lost during the medieval period; systematic reconstruction of the formula from archaeomineralogical analysis is being used to develop low-carbon concrete formulations with superior longevity.',
    ],
    criticisms: [
      'The self-healing mineralisation requires specific conditions — seawater exposure, low curing temperature, specific volcanic ash chemistry — that are not universally applicable to modern construction contexts.',
      'Roman concrete is excellent in compression but weak in tension, which is why Roman structures are arch-dominated; modern reinforced concrete\'s versatility cannot be replaced by Roman formulations for most structural applications.',
      'The Roman formula was not a single standardised recipe but varied by region, contractor, and application; generalising from exceptional surviving examples may overstate the typical durability of Roman concrete construction.',
    ],
    mainstream_view: 'Materials scientists and archaeologists regard the Roman marine concrete research as genuinely important for sustainable construction. The mechanisms are well-characterised and the durability is not in dispute. The scientific interest lies in applying the mineralogical insights to develop supplementary cementitious materials using volcanic ashes that reduce the carbon footprint of concrete while improving longevity — addressing both environmental and infrastructure durability challenges simultaneously.',
    open_questions: [
      'Can the Roman pozzolanic concrete formula be adapted using non-Italian volcanic ashes to produce low-carbon concrete suitable for marine infrastructure in other regions?',
      'What was the extent of Roman builders\' empirical knowledge of why their formula worked — did they understand the mineralogical mechanism, or simply replicate a successful recipe by tradition?',
      'Is the self-healing mechanism limited to marine environments, or can analogous crystallisation processes be induced in non-marine concrete through additive design?',
    ],
    tags: ['Roman concrete', 'pozzolana', 'seawater', 'self-healing', 'Marie Jackson', 'UC Berkeley', 'Pantheon', 'Caesarea Maritima', 'tobermorite', 'low-carbon', 'ancient engineering'],
    evidence_level: 'verified',
    confidence_score: 0.95,
    color: '#a16207',
    icon: '🏛️',
    year: -200,
    date_start: -200,
    date_end: 400,
    date_precision: 'century',
    region: 'Mediterranean',
  },

  // ═══════════════════════════════════════
  // EXTRATERRESTRIAL / COSMOS
  // ═══════════════════════════════════════

  {
    id: 'fermi-paradox',
    title: 'Fermi Paradox',
    category: 'Extraterrestrial Hypothesis',
    description: 'The Fermi Paradox is the apparent contradiction between the high probability estimates for extraterrestrial civilisations, derived from the Drake Equation and our understanding of the cosmos, and the complete absence of confirmed evidence for such civilisations. Enrico Fermi\'s famous table-lunch question — "Where is everybody?" — posed to colleagues at Los Alamos in 1950 captured the intuition that a galaxy 13.6 billion years old with 200–400 billion stars, many with planetary systems, should have produced technological civilisations capable of interstellar colonisation or communication long before our solar system formed. Given plausible expansion rates, a single such civilisation could populate the Milky Way within 10–100 million years — a geological eyeblink.',
    claims: [
      'The Great Silence — no confirmed technosignature, structured signal, or artefact has been detected despite seven decades of SETI observation — is statistically surprising given the number of potentially habitable exoplanets now known from Kepler and JWST data.',
      'The "Great Filter" hypothesis (Robin Hanson, 1998) proposes that some step in the development chain from simple chemistry to interstellar civilisation is nearly impossible — the filter may lie behind us (rare complex life, rare intelligence) or ahead (nuclear war, AI, ecological collapse).',
      'The simulation hypothesis, the Zoo hypothesis, the Dark Forest hypothesis, and the "galaxy is young" hypothesis each offer distinct resolutions that are internally consistent but empirically untestable with current technology.',
      'Stephen Webb\'s taxonomy in If the Universe Is Teeming with Aliens... identifies 75 distinct solutions to the Fermi Paradox, reflecting the genuine breadth of the parameter space.',
    ],
    criticisms: [
      'The Drake Equation\'s parameters — particularly the longevity of technological civilisations (L) and the fraction of planets giving rise to life (fl) — are essentially unconstrained; the equation can be tuned to produce any answer from thousands of civilisations to fewer than one.',
      'SETI\'s search space is vast and the fraction searched infinitesimal; absence of detected signals after 70 years is not statistically significant given the search coverage of the electromagnetic spectrum and sky.',
      'Arguments from the expected rate of interstellar colonisation assume human-like motivations and fail to account for civilisations that exist but choose not to expand — perhaps the default for sufficiently advanced entities.',
    ],
    mainstream_view: 'The Fermi Paradox is considered a genuine scientific puzzle. Astronomers and astrobiologists take it seriously as a constraint on theories of life\'s prevalence and civilisation development. The scientific consensus is that the paradox remains genuinely unresolved — the Great Silence is either informative (life is rare or civilisations are short-lived) or the result of our limited observational coverage, and current data cannot distinguish between these possibilities.',
    open_questions: [
      'Will technosignature surveys by the Vera Rubin Observatory, the Square Kilometre Array, and next-generation space telescopes constrain the frequency of industrial civilisations to a level that is statistically meaningful?',
      'Is the biosignature detection capacity of JWST sufficient to find evidence of biotic chemistry on nearby rocky exoplanets, and would a positive detection shift the Fermi Paradox calculus toward the "Great Filter is ahead of us" interpretation?',
      'Does the Fermi Paradox apply if the simulation hypothesis is correct, or is the question meaningless in that context?',
    ],
    tags: ['Fermi Paradox', 'Great Filter', 'Drake Equation', 'SETI', 'Great Silence', 'extraterrestrial', 'interstellar', 'Robin Hanson', 'Enrico Fermi', 'technosignature', 'civilisation'],
    evidence_level: 'debated',
    confidence_score: 0.50,
    color: '#0891b2',
    icon: '🌌',
    year: 1950,
    date_precision: 'exact',
  },

  // ═══════════════════════════════════════
  // WHISTLEBLOWER
  // ═══════════════════════════════════════

  {
    id: 'edward-snowden',
    title: 'Edward Snowden & the NSA Revelations',
    category: 'Whistleblower',
    description: 'Edward Joseph Snowden (born 1983) is a former US intelligence contractor who in 2013 disclosed to journalists Glenn Greenwald, Laura Poitras, and Ewen MacAskill thousands of classified documents revealing the scale and methods of US and allied surveillance programmes. Snowden worked as a technical contractor for NSA via Booz Allen Hamilton; in May 2013 he travelled to Hong Kong and provided documents to journalists, whose reporting in The Guardian and Washington Post beginning 5 June 2013 revealed PRISM, bulk phone records collection under Section 215 of the Patriot Act, GCHQ\'s TEMPORA programme, XKeyscore, and more than 40 other classified surveillance systems. Charged with espionage under the 1917 Espionage Act, Snowden received asylum in Russia where he has resided since August 2013. In 2020 he was granted permanent residency; in 2022 he received Russian citizenship.',
    claims: [
      'Snowden\'s disclosures triggered the most significant reform of US surveillance law since the 1970s Church Committee: the USA FREEDOM Act (2015) ended NSA bulk phone records collection, and multiple Section 702 provisions have been contested in Congress.',
      'A federal appeals court ruled in 2020 that the NSA\'s bulk phone records programme was unlawful — vindicating the core of Snowden\'s public concern eight years after his disclosure.',
      'The disclosures damaged US diplomatic relationships and accelerated global deployment of end-to-end encryption in commercial platforms (WhatsApp, iMessage, Signal), fundamentally changing the landscape of digital surveillance.',
      'The Pulitzer Prize-winning journalists who reported on Snowden\'s documents — Glenn Greenwald and Laura Poitras — describe a careful, methodical source who understood the legal and personal consequences of his actions.',
    ],
    criticisms: [
      'US intelligence officials, including former NSA Director Michael Hayden, argue Snowden\'s disclosures damaged intelligence relationships with allies, burned sources and methods, and provided adversaries with a roadmap to evade collection.',
      'Snowden did not follow internal whistleblowing procedures available to intelligence community contractors; critics argue that disclosure to foreign-based journalists rather than inspector general channels was a deliberate choice to maximise public impact at the cost of operational security.',
      'Snowden\'s presence in Russia and his subsequent Russian citizenship have raised questions about whether he provided classified information to Russian intelligence, though no public evidence has established this.',
      'The full consequences of his disclosures — including damage to ongoing collection operations — remain classified and cannot be independently assessed.',
    ],
    mainstream_view: 'Snowden is simultaneously regarded as a traitor by the US government and intelligence community and as a public interest whistleblower by civil liberties organisations, a significant portion of the public, and the courts that have ruled against the programmes he exposed. His moral and legal status remains genuinely contested. The information he disclosed was factually accurate; the disagreement is whether the public interest in knowing justified the method and security costs of disclosure.',
    open_questions: [
      'Did Snowden, intentionally or through operational security failures, expose classified information to Russian or Chinese intelligence services during his transit through Moscow or subsequent residence?',
      'Would a presidential pardon be legally and politically viable for Snowden, and would he return to the United States if the Espionage Act charges were addressed?',
      'Have the post-Snowden reforms to Section 702 and other surveillance programmes been adequate to address the constitutional concerns he raised, or has the legal framework been reconstructed to achieve the same ends?',
    ],
    tags: ['Edward Snowden', 'NSA', 'whistleblower', 'PRISM', 'surveillance', 'Espionage Act', 'Glenn Greenwald', 'Russia', 'Booz Allen', 'USA FREEDOM Act', 'privacy'],
    evidence_level: 'verified',
    confidence_score: 0.97,
    color: '#475569',
    icon: '📡',
    year: 2013,
    date_precision: 'exact',
    country: 'United States',
  },

];
