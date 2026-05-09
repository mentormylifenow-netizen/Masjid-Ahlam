(function () {
  "use strict";

  /**
   * Mishary Rashid Alafasy — public MP3 from open-source project achaudhry/adhan
   * (same file as in repo: Adhan-Mishary-Rashid-Al-Afasy.mp3).
   * @see https://github.com/achaudhry/adhan
   */
  const ADHAN_MP3_URL =
    "https://raw.githubusercontent.com/achaudhry/adhan/master/Adhan-Mishary-Rashid-Al-Afasy.mp3";
  /** Single global player for all prayer sequence recitations (local + remote). */
  const mainPlayer = new Audio();

  /** Display order; Tahajjud uses API field `Lastthird`. */
  const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Tahajjud"];

  /** English prayer name → Arabic (for Virtual Imam / prayer view titles). */
  const PRAYER_NAME_AR = {
    Fajr: "الفجر",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء",
    Tahajjud: "التهجد",
  };

  /**
   * @param {string} englishName
   * @returns {string}
   */
  function arabicPrayerName(englishName) {
    return PRAYER_NAME_AR[englishName] || "";
  }

  /**
   * Takbīr transitions (see posture steps). Final taslim uses {@link FAJR_SALAM_AUDIO_SRC}.
   */
  const FAJR_TAKBEER_TRANSITION_SRC = "./allahu-akbar.mp3";

  /** Standing from rukū — Samiʿ Allāhu liman ḥamidah (both rakʿāt). */
  const SAMIALLAH_STANDING_AUDIO_SRC = "./sami-allahu.mp3";

  /** After second takbīr for standing for Rakaʿt 2: wait this long after `allahu-akbar.mp3` ends before Al-Fātiḥah. */
  const STAND_SECOND_RAKAT_POST_TAKBEER_MS = 3000;

  /** Single track: right + left salām (final step). */
  const FAJR_SALAM_AUDIO_SRC = "./salam.mp3";
  const TRADITIONAL_SURAH_SILENCE_MS = 4500;
  const DHUHR_OPENING_TAKBEER_AUDIO_SRC = "./allahu-akbar.mp3";

  /** Mishary Rashid Al-Afasy 128kbps — filename pattern `SSSVVV.mp3` (e.g. 001003 = Surah 1 Ayah 3). */
  const EVERYAYAH_ALAFASY_128_BASE =
    "https://everyayah.com/data/Alafasy_128kbps";

  /**
   * Surah Al-Fatiha — seven ayāt including Bismillah; each step has its own `audioUrl`.
   * @type {Array<{ arabic: string, transliteration: string, english: string, audioUrl: string }>}
   */
  const FATIHA_AYAH_STEPS = [
    {
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      transliteration: "Bismillaahir Rahmaanir Raheem",
      english: "In the name of Allah, the Most Gracious, the Most Merciful",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001001.mp3`,
    },
    {
      arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      transliteration: "Alhamdu lillaahi Rabbil 'Aalameen",
      english: "All praise is due to Allah, Lord of all the worlds",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001002.mp3`,
    },
    {
      arabic: "الرَّحْمَٰنِ الرَّحِيمِ",
      transliteration: "Ar-Rahmaanir-Raheem",
      english: "The Most Gracious, the Most Merciful",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001003.mp3`,
    },
    {
      arabic: "مَالِكِ يَوْمِ الدِّينِ",
      transliteration: "Maaliki Yawmid-Deen",
      english: "Master of the Day of Judgment",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001004.mp3`,
    },
    {
      arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      transliteration: "Iyyaaka na'budu wa iyyaaka nasta'een",
      english: "You alone we worship, and You alone we ask for help",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001005.mp3`,
    },
    {
      arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
      transliteration: "Ihdinas-Siraatal-Mustaqeem",
      english: "Guide us to the straight path",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001006.mp3`,
    },
    {
      arabic:
        "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
      transliteration:
        "Siraatal-lazeena an'amta 'alayhim ghayril-maghdoobi 'alayhim walad-daal-leen",
      english:
        "The path of those You have favored—not those who earned anger, nor those who go astray",
      isSurah: true,
      audioUrl: `${EVERYAYAH_ALAFASY_128_BASE}/001007.mp3`,
    },
  ];

  /**
   * Rakaʿt 1 “Powerhouse” bank — second recitation after Amīn; one step per surah (full MP3 + title card).
   * Picked at random when Play starts (with {@link rakat2SurahBank}) via {@link buildFajrRakat1Sequence}.
   */
  const rakat1SurahBank = [
    {
      arabic: "سُورَةُ الْأَعْلَى",
      transliteration: "Surah Al-A'la",
      english: "The Most High (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/087.mp3",
    },
    {
      arabic: "سُورَةُ الْغَاشِيَةِ",
      transliteration: "Surah Al-Ghashiyah",
      english: "The Overwhelming (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/088.mp3",
    },
    {
      arabic: "سُورَةُ الْفَجْرِ",
      transliteration: "Surah Al-Fajr",
      english: "The Dawn (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/089.mp3",
    },
    {
      arabic: "سُورَةُ الشَّمْسِ",
      transliteration: "Surah Ash-Shams",
      english: "The Sun (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/091.mp3",
    },
    {
      arabic: "سُورَةُ الِانْشِقَاقِ",
      transliteration: "Surah Al-Inshiqaq",
      english: "The Sundering (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/084.mp3",
    },
  ];

  /**
   * Rakaʿt 2 “Authentic Finish” bank — after second Amīn; one step per surah (full MP3 + title card).
   * Picked at random when Play starts (with {@link rakat1SurahBank}) via {@link buildFajrRakat1Sequence}.
   */
  const rakat2SurahBank = [
    {
      arabic: "سُورَةُ الْبَلَدِ",
      transliteration: "Surah Al-Balad",
      english: "The City (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/090.mp3",
    },
    {
      arabic: "سُورَةُ الضُّحَى",
      transliteration: "Surah Ad-Duha",
      english: "The Morning Brightness (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/093.mp3",
    },
    {
      arabic: "سُورَةُ الشَّرْحِ",
      transliteration: "Surah Ash-Sharh",
      english: "The Relief (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/094.mp3",
    },
    {
      arabic: "سُورَةُ التِّينِ",
      transliteration: "Surah At-Tin",
      english: "The Fig (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/095.mp3",
    },
    {
      arabic: "سُورَةُ الْقَدْرِ",
      transliteration: "Surah Al-Qadr",
      english: "The Night of Decree (Full Recitation)",
      isSurah: true,
      audioUrl: "https://server8.mp3quran.net/afs/097.mp3",
    },
  ];

  /** Opening silence before takbeer. */
  const NIYYAH_SILENCE_MS = 5000;

  /** Opening supplication (Thanāʾ) — silent tutor window after takbīr, before istiʿādha. */
  const SANA_SILENCE_MS = 12000;

  /** Istiʿādha (Taʿawwudh) — silent tutor window before Al-Fātiḥah audio. */
  const ISTIADHA_SILENCE_MS = 5000;

  /** Pause after Al-Fatiha for “Āmīn” before the randomized short surah — timer-only (`silenceMs`). */
  const AMEEN_PAUSE_MS = 4000;

  /**
   * Rukū dhikr window — silent repetition in bowing (`silenceMs`).
   */
  const RUKU_SUBHAN_SILENCE_MS = 6000;

  /** After rising from rukū — silent tutor window for “Rabbana wa lakal-hamd” (`silenceMs`). */
  const STANDING_TAHMID_SILENCE_MS = 4000;

  /** In sujūd — silent repetition of “Subḥāna rabbiyal-aʿlā” (`silenceMs`). */
  const SAJDA_SUBHAN_SILENCE_MS = 6000;

  /** Jalsa between sujūd — silent tutor window for “Rabbighfir lī” (`silenceMs`). */
  const JALSA_SILENCE_MS = 4000;

  /** Final sitting — at-tahiyyah (silent tutor window). */
  const TASHAHHUD_SILENCE_MS = 15000;

  /** Final sitting — ṣalāt ʿalā l-nabī (silent tutor window). */
  const SALAWAT_SILENCE_MS = 15000;

  /**
   * Opening through first Rakaʿt Amīn; short surah is injected at Play via {@link buildFajrRakat1Sequence}.
   * Step shape: `arabic`, `transliteration`, `english`, optional `isSurah`, `silenceMs`, `audioUrl`, `audioMaxDurationMs`, `silenceAfterAudioMs`.
   */
  const FAJR_RAKAT1_SEQUENCE_HEAD = [
    {
      arabic: "النِّيَّة",
      transliteration: "Niyyah",
      english: "Set your intention (Silent Pause)",
      silenceMs: NIYYAH_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic:
        "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ",
      transliteration:
        "SubhaanakAllaahumma wa bihamdika, wa tabaarakasmuka, wa ta'aalaa jadduka, wa laa ilaaha ghairuk",
      english:
        "Glory be to You, O Allah, and all praises are due unto You, and blessed is Your Name, and exalted is Your majesty, and there is none worthy of worship except You.",
      silenceMs: SANA_SILENCE_MS,
    },
    {
      arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
      transliteration: "A'oodhu billaahi minash-shaitaanir-rajeem",
      english: "I seek refuge in Allah from Satan the accursed.",
      silenceMs: ISTIADHA_SILENCE_MS,
    },
    ...FATIHA_AYAH_STEPS,
    {
      arabic: "آمين",
      transliteration: "Ameen",
      english: "(Pause)",
      silenceMs: AMEEN_PAUSE_MS,
    },
  ];

  /**
   * Rakaʿt 1 bowing / sujūd / stand for Rakaʿt 2 — follows Rakaʿt 1 randomized surah.
   */
  const FAJR_POST_RAKAT1_SURAH_STEPS = [
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Bow Down)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      transliteration: "Subhaana Rabbiyal 'Azeem",
      english: "Glory be to my Lord, the Almighty (Repeat 3x)",
      silenceMs: RUKU_SUBHAN_SILENCE_MS,
    },
    {
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
      transliteration: "Sami'Allaahu liman hamidah",
      english: "Allah hears those who praise Him (Stand Up)",
      audioUrl: SAMIALLAH_STANDING_AUDIO_SRC,
    },
    {
      arabic: "رَبَّنَا وَلَكَ الْحَمْدُ",
      transliteration: "Rabbanaa wa lakal-hamd",
      english: "Our Lord, to You alone belongs all the praise",
      silenceMs: STANDING_TAHMID_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: SAJDA_SUBHAN_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit Up)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "رَبِّ اغْفِرْ لِي",
      transliteration: "Rabbighfir lee",
      english: "O my Lord, forgive me",
      silenceMs: JALSA_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: SAJDA_SUBHAN_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Stand up for 2nd Rakat)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
      silenceAfterAudioMs: STAND_SECOND_RAKAT_POST_TAKBEER_MS,
    },
  ];

  /** Al-Fātiḥah and Amīn pause for Rakaʿt 2; Authentic Finish surah injected after this via {@link buildFajrRakat1Sequence}. */
  const FAJR_RAKAT2_FATIHA_AND_AMEN = [
    ...FATIHA_AYAH_STEPS,
    {
      arabic: "آمين",
      transliteration: "Ameen",
      english: "(Pause)",
      silenceMs: AMEEN_PAUSE_MS,
    },
  ];

  /**
   * Rakaʿt 2 bowing through second sujūd — follows Rakaʿt 2 randomized surah (`onended` → first step here is rukū takbīr).
   */
  const FAJR_POST_RAKAT2_SURAH_STEPS = [
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Bow Down)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      transliteration: "Subhaana Rabbiyal 'Azeem",
      english: "Glory be to my Lord, the Almighty (Repeat 3x)",
      silenceMs: RUKU_SUBHAN_SILENCE_MS,
    },
    {
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
      transliteration: "Sami'Allaahu liman hamidah",
      english: "Allah hears those who praise Him (Stand Up)",
      audioUrl: SAMIALLAH_STANDING_AUDIO_SRC,
    },
    {
      arabic: "رَبَّنَا وَلَكَ الْحَمْدُ",
      transliteration: "Rabbanaa wa lakal-hamd",
      english: "Our Lord, to You alone belongs all the praise",
      silenceMs: STANDING_TAHMID_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: SAJDA_SUBHAN_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit Up)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "رَبِّ اغْفِرْ لِي",
      transliteration: "Rabbighfir lee",
      english: "O my Lord, forgive me",
      silenceMs: JALSA_SILENCE_MS,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: SAJDA_SUBHAN_SILENCE_MS,
    },
  ];

  /**
   * After second sajda of Rakaʿt 2: at-tahiyyah, salawāt, then one taslim step (`salam.mp3`).
   */
  const FAJR_FINAL_SITTING_STEPS = [
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english:
        "Allah is the Greatest (Sit up, rest hands on thighs, and raise right index finger)",
      audioUrl: FAJR_TAKBEER_TRANSITION_SRC,
    },
    {
      arabic:
        "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
      transliteration:
        "At-tahiyyaatu Lillaahi was-salawaatu wat-tayyibaat. As-salaamu 'alayka ayyuhan-Nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alaynaa wa 'alaa 'ibaadillaahis-saaliheen. Ash-hadu an laa ilaaha illallaah, wa ash-hadu anna Muhammadan 'abduhu wa Rasooluh.",
      english:
        "All compliments, prayers, and pure words are due to Allah... (Raise Index Finger)",
      silenceMs: TASHAHHUD_SILENCE_MS,
    },
    {
      arabic:
        "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
      transliteration:
        "Allaahumma salli 'alaa Muhammadin wa 'alaa aali Muhammad, kamaa sallaita 'alaa Ibraaheema wa 'alaa aali Ibraaheem, innaka hameedun majeed. Allaahumma baarik 'alaa Muhammadin wa 'alaa aali Muhammad, kamaa baarakta 'alaa Ibraaheema wa 'alaa aali Ibraaheem, innaka hameedun majeed.",
      english:
        "O Allah, send prayers upon Muhammad and the followers of Muhammad...",
      silenceMs: SALAWAT_SILENCE_MS,
    },
    {
      arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ",
      transliteration: "Assalaamu 'alaikum wa rahmatullaah",
      english:
        "Peace and blessings of Allah be upon you (Turn head to the Right, then to the Left)",
      audioUrl: FAJR_SALAM_AUDIO_SRC,
    },
  ];

  /**
   * Full Fajr sequence: random {@link rakat1SurahBank} + random {@link rakat2SurahBank} chosen once per Play.
   * Flow: Rakaʿt 1 Amīn → surah 1 → … → Rakaʿt 2 Amīn → surah 2 → rukū… → sitting → taslim.
   * @returns {Array<{ arabic: string, transliteration: string, english: string, isSurah?: boolean, silenceMs?: number, audioUrl?: string, audioMaxDurationMs?: number, silenceAfterAudioMs?: number }>}
   */
  function buildFajrRakat1Sequence() {
    const rakat1SurahStep =
      rakat1SurahBank[Math.floor(Math.random() * rakat1SurahBank.length)];
    const rakat2SurahStep =
      rakat2SurahBank[Math.floor(Math.random() * rakat2SurahBank.length)];
    return FAJR_RAKAT1_SEQUENCE_HEAD.concat(
      [rakat1SurahStep],
      FAJR_POST_RAKAT1_SURAH_STEPS,
      FAJR_RAKAT2_FATIHA_AND_AMEN,
      [rakat2SurahStep],
      FAJR_POST_RAKAT2_SURAH_STEPS,
      FAJR_FINAL_SITTING_STEPS
    );
  }

  /**
   * Tahajjud opening through Rakaʿt 1 Amīn — same steps as Fajr except intention label (night vigil).
   */
  const TAHAJJUD_RAKAT1_SEQUENCE_HEAD = [
    {
      arabic: "النِّيَّة",
      transliteration: "Niyyah",
      english: "Tahajjud - night vigil — set your intention (silent pause)",
      silenceMs: NIYYAH_SILENCE_MS,
    },
  ].concat(FAJR_RAKAT1_SEQUENCE_HEAD.slice(1));

  /**
   * Tahajjud Rakaʿt 1 — long surah title cards (full MP3; Traditional mode uses muteDuration).
   */
  const tahajjudSurahsRakat1 = [
    {
      arabic: "سورة المزمل",
      transliteration: "Surah Al-Muzzammil",
      english: "The Enshrouded One",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/073.mp3",
    },
    {
      arabic: "سورة الرحمن",
      transliteration: "Surah Ar-Rahman",
      english: "The Most Gracious",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/055.mp3",
    },
    {
      arabic: "سورة يس",
      transliteration: "Surah Yaseen",
      english: "Ya-Sin",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/036.mp3",
    },
    {
      arabic: "سورة مريم",
      transliteration: "Surah Maryam",
      english: "Mary",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/019.mp3",
    },
    {
      arabic: "سورة الملك",
      transliteration: "Surah Al-Mulk",
      english: "The Sovereignty",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/067.mp3",
    },
    {
      arabic: "سورة الواقعة",
      transliteration: "Surah Al-Waqi'ah",
      english: "The Inevitable",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/056.mp3",
    },
    {
      arabic: "سورة يوسف",
      transliteration: "Surah Yusuf",
      english: "Joseph",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/012.mp3",
    },
    {
      arabic: "سورة طه",
      transliteration: "Surah Taha",
      english: "Ta-Ha",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/020.mp3",
    },
    {
      arabic: "سورة الكهف",
      transliteration: "Surah Al-Kahf",
      english: "The Cave",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/018.mp3",
    },
    {
      arabic: "سورة النور",
      transliteration: "Surah An-Nur",
      english: "The Light",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/024.mp3",
    },
  ];

  /**
   * Tahajjud Rakaʿt 2 — long surah title cards (full MP3; Traditional mode uses muteDuration).
   */
  const tahajjudSurahsRakat2 = [
    {
      arabic: "سورة السجدة",
      transliteration: "Surah As-Sajdah",
      english: "The Prostration",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/032.mp3",
    },
    {
      arabic: "سورة الإنسان",
      transliteration: "Surah Al-Insan",
      english: "Man",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/076.mp3",
    },
    {
      arabic: "سورة لقمان",
      transliteration: "Surah Luqman",
      english: "Luqman",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/031.mp3",
    },
    {
      arabic: "سورة الزمر",
      transliteration: "Surah Az-Zumar",
      english: "The Troops",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/039.mp3",
    },
    {
      arabic: "سورة ق",
      transliteration: "Surah Qaf",
      english: "Qaf",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/050.mp3",
    },
    {
      arabic: "سورة الإسراء",
      transliteration: "Surah Al-Isra",
      english: "The Night Journey",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/017.mp3",
    },
    {
      arabic: "سورة الفرقان",
      transliteration: "Surah Al-Furqan",
      english: "The Criterion",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/025.mp3",
    },
    {
      arabic: "سورة غافر",
      transliteration: "Surah Ghafir",
      english: "The Forgiver",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/040.mp3",
    },
    {
      arabic: "سورة الدخان",
      transliteration: "Surah Ad-Dukhan",
      english: "The Smoke",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/044.mp3",
    },
    {
      arabic: "سورة الحشر",
      transliteration: "Surah Al-Hashr",
      english: "The Exile",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/059.mp3",
    },
  ];

  /**
   * Full Tahajjud sequence (2 rakʿahs, aloud): Fajr mechanics; surahs from {@link tahajjudSurahsRakat1} / {@link tahajjudSurahsRakat2}.
   * @returns {Array<{ arabic: string, transliteration: string, english: string, isSurah?: boolean, muteDuration?: number, silenceMs?: number, audioUrl?: string, audioMaxDurationMs?: number, silenceAfterAudioMs?: number }>}
   */
  function buildTahajjudSequence() {
    const rakat1SurahStep =
      tahajjudSurahsRakat1[
        Math.floor(Math.random() * tahajjudSurahsRakat1.length)
      ];
    const rakat2SurahStep =
      tahajjudSurahsRakat2[
        Math.floor(Math.random() * tahajjudSurahsRakat2.length)
      ];
    return TAHAJJUD_RAKAT1_SEQUENCE_HEAD.concat(
      [rakat1SurahStep],
      FAJR_POST_RAKAT1_SURAH_STEPS,
      FAJR_RAKAT2_FATIHA_AND_AMEN,
      [rakat2SurahStep],
      FAJR_POST_RAKAT2_SURAH_STEPS,
      FAJR_FINAL_SITTING_STEPS
    );
  }

  /**
   * @type {typeof buildTahajjudSequence}
   */
  const tahajjudSequence = buildTahajjudSequence;

  const DHUHR_RAKAT1_SEQUENCE_HEAD = [
    {
      arabic: "نَوَيْتُ أَنْ أُصَلِّيَ فَرْضَ الظُّهْرِ",
      transliteration: "Nawaytu an usalliya fardad-Dhuhr",
      english: "I intend to pray the 4 Rakats of Dhuhr",
      silenceMs: 5000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar!",
      english: "Allah is the Greatest (Raise hands to ears)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ",
      transliteration: "SubhaanakAllaahumma wa bihamdik",
      english: "Glory be to You, O Allah, and all praises are due unto You,",
      silenceMs: 4000,
    },
    {
      arabic: "وَتَبَارَكَ اسْمُكَ",
      transliteration: "Wa tabaarakasmuk",
      english: "and blessed is Your name,",
      silenceMs: 3000,
    },
    {
      arabic: "وَتَعَالَى جَدُّكَ",
      transliteration: "Wa ta'aalaa jadduk",
      english: "and high is Your majesty,",
      silenceMs: 3000,
    },
    {
      arabic: "وَلَا إِلَهَ غَيْرُكَ",
      transliteration: "Wa laa ilaaha ghairuk",
      english: "and none is worthy of worship but You.",
      silenceMs: 3000,
    },
    {
      arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
      transliteration: "A'oodhu billaahi minash-shaitaanir-rajeem",
      english: "I seek refuge in Allah from Satan the accursed.",
      silenceMs: 5000,
    },
    ...FATIHA_AYAH_STEPS.map(function (step) {
      return Object.assign({}, step, { isSurah: true });
    }),
    {
      arabic: "آمِين",
      transliteration: "Ameen",
      english: "O Allah, answer our prayer.",
      isSurah: true,
      silenceMs: 2500,
    },
  ];

  /**
   * Dhuhr Rakaʿt 1 second-surah bank (single full-recitation step, one surah randomly selected each start).
   * `muteDuration` customizes Traditional mode silent reading window for these full-recitation items.
   */
  const dhuhrRakat1SurahBank = [
    {
      arabic: "سُورَةُ الْعَصْر",
      transliteration: "Surah Al-Asr",
      english: "Time",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/103.mp3",
    },
    {
      arabic: "سُورَةُ الْكَوْثَر",
      transliteration: "Surah Al-Kawthar",
      english: "The Abundance",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/108.mp3",
    },
    {
      arabic: "سُورَةُ الْكَافِرُون",
      transliteration: "Surah Al-Kafirun",
      english: "The Disbelievers",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/109.mp3",
    },
    {
      arabic: "سُورَةُ الْإِخْلَاص",
      transliteration: "Surah Al-Ikhlas",
      english: "The Sincerity",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/112.mp3",
    },
    {
      arabic: "سُورَةُ النَّاس",
      transliteration: "Surah An-Nas",
      english: "Mankind",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/114.mp3",
    },
  ];

  /** Dhuhr Rakaʿt 1 posture steps after randomized surah. */
  const DHUHR_RAKAT1_SEQUENCE_TAIL = [
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Bow down, resting hands on knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      transliteration: "Subhaana rabbiyal-'Azeem",
      english: "Glory be to my Lord the Supreme (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
      transliteration: "Sami'Allaahu liman hamidah",
      english: "Allah hears those who praise Him (Stand up straight)",
      audioUrl: SAMIALLAH_STANDING_AUDIO_SRC,
    },
    {
      arabic: "رَبَّنَا وَلَكَ الْحَمْدُ",
      transliteration: "Rabbanaa wa lakal hamd",
      english: "Our Lord, and to You belongs all praise.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate on the floor)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit up on your knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي",
      transliteration: "Rabbighfir lee, Rabbighfir lee",
      english: "Lord, forgive me. Lord, forgive me.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate again)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Stand up for the 2nd Rakat)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
      silenceAfterAudioMs: STAND_SECOND_RAKAT_POST_TAKBEER_MS,
    },
    ...FATIHA_AYAH_STEPS.map(function (step) {
      return Object.assign({}, step, { isSurah: true });
    }),
    {
      arabic: "آمِين",
      transliteration: "Aameen",
      english: "Amen.",
      isSurah: true,
      silenceMs: 2500,
    },
  ];

  /** Dhuhr Rakaʿt 2: posture steps after randomized short surah. */
  const DHUHR_RAKAT2_POST_SURAH_STEPS = [
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Bow down with hands on knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      transliteration: "Subhaana rabbiyal-'Azeem",
      english: "Glory be to my Lord, the Supreme (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
      transliteration: "Sami'Allaahu liman hamidah",
      english: "Allah hears those who praise Him (Stand up straight)",
      audioUrl: SAMIALLAH_STANDING_AUDIO_SRC,
    },
    {
      arabic: "رَبَّنَا وَلَكَ الْحَمْدُ",
      transliteration: "Rabbanaa wa lakal hamd",
      english: "Our Lord, and to You belongs all praise.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate on the floor)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit up on your knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي",
      transliteration: "Rabbighfir lee, Rabbighfir lee",
      english: "Lord, forgive me. Lord, forgive me.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate again)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit up and rest hands on thighs)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic:
        "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ",
      transliteration:
        "At-tahiyyaatu lillaahi was-salawaatu wat-tayyibaat",
      english:
        "All greetings, prayers and beautiful expressions are for Allah.",
      silenceMs: 4000,
    },
    {
      arabic:
        "السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ",
      transliteration:
        "As-salaamu 'alayka ayyuhan-Nabiyyu wa rahmatullaahi wa barakaatuh",
      english:
        "Peace be upon you, O Prophet, and Allah's mercy and blessings.",
      silenceMs: 4000,
    },
    {
      arabic:
        "السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ",
      transliteration:
        "As-salaamu 'alaynaa wa 'alaa 'ibaadillaahis-saaliheen.",
      english:
        "Peace be upon us and upon all righteous servants of Allah.",
      silenceMs: 4000,
    },
    {
      arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ",
      transliteration: "Ash-hadu an laa ilaaha illallaah",
      english:
        "Raise right index finger while saying:\n\nI bear witness that there is no god except Allah.",
      silenceMs: 4000,
    },
    {
      arabic: "وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
      transliteration: "Wa ash-hadu anna Muhammadan 'abduhu wa Rasooluh",
      english:
        "and I bear witness that Muhammad is His servant and messenger.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Stand up for the 3rd Rakat)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
      silenceAfterAudioMs: STAND_SECOND_RAKAT_POST_TAKBEER_MS,
    },
    ...FATIHA_AYAH_STEPS.map(function (step) {
      return Object.assign({}, step, { isSurah: true });
    }),
    {
      arabic: "آمِين",
      transliteration: "Aameen",
      english: "Amen.",
      isSurah: true,
      silenceMs: 2500,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Bow down with hands on knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      transliteration: "Subhaana rabbiyal-'Azeem",
      english: "Glory be to my Lord, the Supreme (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
      transliteration: "Sami'Allaahu liman hamidah",
      english: "Allah hears those who praise Him (Stand up straight)",
      audioUrl: SAMIALLAH_STANDING_AUDIO_SRC,
    },
    {
      arabic: "رَبَّنَا وَلَكَ الْحَمْدُ",
      transliteration: "Rabbanaa wa lakal hamd",
      english: "Our Lord, and to You belongs all praise.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate on the floor)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit up on your knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي",
      transliteration: "Rabbighfir lee, Rabbighfir lee",
      english: "Lord, forgive me. Lord, forgive me.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate again)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Stand up for the 4th Rakat)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
      silenceAfterAudioMs: STAND_SECOND_RAKAT_POST_TAKBEER_MS,
    },
    ...FATIHA_AYAH_STEPS.map(function (step) {
      return Object.assign({}, step, { isSurah: true });
    }),
    {
      arabic: "آمِين",
      transliteration: "Aameen",
      english: "Amen.",
      isSurah: true,
      silenceMs: 2500,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Bow down with hands on knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ",
      transliteration: "Subhaana rabbiyal-'Azeem",
      english: "Glory be to my Lord, the Supreme (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ",
      transliteration: "Sami'Allaahu liman hamidah",
      english: "Allah hears those who praise Him (Stand up straight)",
      audioUrl: SAMIALLAH_STANDING_AUDIO_SRC,
    },
    {
      arabic: "رَبَّنَا وَلَكَ الْحَمْدُ",
      transliteration: "Rabbanaa wa lakal hamd",
      english: "Our Lord, and to You belongs all praise.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate on the floor)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit up on your knees)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "رَبِّ اغْفِرْ لِي، رَبِّ اغْفِرْ لِي",
      transliteration: "Rabbighfir lee, Rabbighfir lee",
      english: "Lord, forgive me. Lord, forgive me.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Prostrate again)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَى",
      transliteration: "Subhaana rabbiyal-A'laa",
      english: "Glory be to my Lord, the Most High (Repeat 3x)",
      silenceMs: 6000,
    },
    {
      arabic: "اللَّهُ أَكْبَر",
      transliteration: "Allahu Akbar",
      english: "Allah is the Greatest (Sit up for the Final Tashahhud)",
      audioUrl: DHUHR_OPENING_TAKBEER_AUDIO_SRC,
    },
    {
      arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ",
      transliteration: "At-tahiyyaatu lillaahi was-salawaatu wat-tayyibaat",
      english: "All greetings, prayers and beautiful expressions are for Allah.",
      silenceMs: 4000,
    },
    {
      arabic: "السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ",
      transliteration:
        "As-salaamu 'alayka ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh",
      english: "Peace be upon you, O Prophet, and Allah's mercy and blessings.",
      silenceMs: 4000,
    },
    {
      arabic: "السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ",
      transliteration: "As-salaamu 'alainaa wa 'alaa 'ibadillaahis-saliheen.",
      english: "Peace be upon us and upon all righteous servants of Allah.",
      silenceMs: 4000,
    },
    {
      arabic: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ",
      transliteration: "Ash-hadu al-laa ilaaha il-lAllaah",
      english:
        "Raise right index finger while saying:\n\nI bear witness that there is no god except Allah,",
      silenceMs: 4000,
    },
    {
      arabic: "وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
      transliteration: "wa ash-hadu anna Muhammadan 'abduhu wa rasooluh",
      english: "and I bear witness that Muhammad is His servant and messenger.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
      transliteration: "Allaahumma salli 'alaa Muhammadin wa 'alaa aali Muhammad",
      english: "O Allah, send prayers upon Muhammad and upon the family of Muhammad,",
      silenceMs: 4000,
    },
    {
      arabic: "كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ",
      transliteration: "Kamaa sallaita 'alaa Ibraaheema wa 'alaa aali Ibraaheem",
      english: "As You sent prayers upon Ibrahim and upon the family of Ibrahim;",
      silenceMs: 4000,
    },
    {
      arabic: "إِنَّكَ حَمِيدٌ مَجِيدٌ",
      transliteration: "Innaka Hameedun Majeed",
      english: "Indeed, You are praiseworthy and glorious.",
      silenceMs: 4000,
    },
    {
      arabic: "اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
      transliteration:
        "Allaahumma baarik 'alaa Muhammadin wa 'alaa aali Muhammad",
      english: "O Allah, bless Muhammad and the family of Muhammad,",
      silenceMs: 4000,
    },
    {
      arabic: "كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ",
      transliteration: "Kamaa baarakta 'alaa Ibraaheema wa 'alaa aali Ibraaheem",
      english: "As You blessed Ibrahim and the family of Ibrahim;",
      silenceMs: 4000,
    },
    {
      arabic: "إِنَّكَ حَمِيدٌ مَجِيدٌ",
      transliteration: "Innaka Hameedun Majeed",
      english: "Indeed, You are praiseworthy and glorious.",
      silenceMs: 4000,
    },
    {
      arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً",
      transliteration: "Rabbanaa aatinaa fid-dunya hasanah",
      english: "Our Lord! Give us good in this world,",
      silenceMs: 4000,
    },
    {
      arabic: "وَفِي الْآخِرَةِ حَسَنَةً",
      transliteration: "wa fil-aakhirati hasanah",
      english: "and good in the Hereafter",
      silenceMs: 4000,
    },
    {
      arabic: "وَقِنَا عَذَابَ النَّارِ",
      transliteration: "wa qinaa 'adhaaban-naar",
      english: "and protect us from the torment of the Fire.",
      silenceMs: 4000,
    },
    {
      arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ",
      transliteration: "As-salaamu 'alaikum wa rahmatullaah",
      english:
        "Turn your head right, then left, as the audio plays:\n\nPeace and mercy of Allah be upon you.",
      audioUrl: FAJR_SALAM_AUDIO_SRC,
    },
    {
      arabic: "اسْتَغْفِرُ اللَّهَ، اسْتَغْفِرُ اللَّهَ، اسْتَغْفِرُ اللَّهَ",
      transliteration: "Astaghfirullaah, astaghfirullaah, astaghfirullaah.",
      english:
        "I seek forgiveness from Allah, I seek forgiveness from Allah, I seek forgiveness from Allah.",
      silenceMs: 4000,
    },
    {
      arabic:
        "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
      transliteration:
        "Allaahumma antas-salaamu wa minkas-salaam, tabaarakta yaa dhal-jalaali wal-ikraam.",
      english:
        "O Allah, You are Peace and from You is peace. Blessed are You, O Owner of majesty and honor.",
      silenceMs: 5000,
    },
  ];

  /** Dhuhr randomized 2nd-rakat title-only surah cards (full-surah audio on each card). */
  const dhuhrSurahs = [
    {
      arabic: "سورة العصر",
      transliteration: "Surah Al-Asr",
      english: "The Declining Day",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/103.mp3",
    },
    {
      arabic: "سورة القدر",
      transliteration: "Surah Al-Qadr",
      english: "The Power",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/097.mp3",
    },
    {
      arabic: "سورة قريش",
      transliteration: "Surah Quraish",
      english: "Quraish",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/106.mp3",
    },
    {
      arabic: "سورة الفيل",
      transliteration: "Surah Al-Fil",
      english: "The Elephant",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/105.mp3",
    },
    {
      arabic: "سورة الماعون",
      transliteration: "Surah Al-Ma'un",
      english: "The Small Kindnesses",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/107.mp3",
    },
  ];

  /**
   * Dhuhr Rakaʿt 1 opening: head + one randomized short surah + tail.
   * @returns {Array<{ arabic: string, transliteration: string, english: string, isSurah?: boolean, muteDuration?: number, silenceMs?: number, audioUrl?: string, audioMaxDurationMs?: number, silenceAfterAudioMs?: number }>}
   */
  function buildDhuhrRakat1Sequence() {
    const randomSurahStep =
      dhuhrRakat1SurahBank[
        Math.floor(Math.random() * dhuhrRakat1SurahBank.length)
      ];
    const randomRakat2SurahStep =
      dhuhrSurahs[Math.floor(Math.random() * dhuhrSurahs.length)];
    return DHUHR_RAKAT1_SEQUENCE_HEAD.concat(
      [randomSurahStep],
      DHUHR_RAKAT1_SEQUENCE_TAIL,
      [randomRakat2SurahStep],
      DHUHR_RAKAT2_POST_SURAH_STEPS
    );
  }

  /**
   * Asr opening through Rakaʿt 1 Amīn — same as Dhuhr except intention (afternoon vs noon).
   */
  const ASR_RAKAT1_SEQUENCE_HEAD = [
    {
      arabic: "نَوَيْتُ أَنْ أُصَلِّيَ فَرْضَ الْعَصْرِ",
      transliteration: "Nawaytu an usalliya fardal-'Asr",
      english: "I intend to pray the 4 Rakats of Asr (afternoon)",
      silenceMs: 5000,
    },
  ].concat(DHUHR_RAKAT1_SEQUENCE_HEAD.slice(1));

  /**
   * Asr Rakaʿt 1 — randomized title-card short surah (full MP3 per card; Traditional mode uses muteDuration).
   */
  const asrSurahsRakat1 = [
    {
      arabic: "سورة الضحى",
      transliteration: "Surah Ad-Duhaa",
      english: "The Morning Hours",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/093.mp3",
    },
    {
      arabic: "سورة الشرح",
      transliteration: "Surah Ash-Sharh",
      english: "The Relief",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/094.mp3",
    },
    {
      arabic: "سورة التين",
      transliteration: "Surah At-Tin",
      english: "The Fig",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/095.mp3",
    },
    {
      arabic: "سورة الزلزلة",
      transliteration: "Surah Al-Zalzalah",
      english: "The Earthquake",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/099.mp3",
    },
    {
      arabic: "سورة العاديات",
      transliteration: "Surah Al-Adiyat",
      english: "The Chargers",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/100.mp3",
    },
  ];

  /**
   * Asr Rakaʿt 2 — randomized title-card short surah (full MP3 per card; Traditional mode uses muteDuration).
   */
  const asrSurahsRakat2 = [
    {
      arabic: "سورة القارعة",
      transliteration: "Surah Al-Qari'ah",
      english: "The Striking Calamity",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/101.mp3",
    },
    {
      arabic: "سورة التكاثر",
      transliteration: "Surah At-Takathur",
      english: "The Mutual Rivalry",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/102.mp3",
    },
    {
      arabic: "سورة الهمزة",
      transliteration: "Surah Al-Humazah",
      english: "The Traducer",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/104.mp3",
    },
    {
      arabic: "سورة النصر",
      transliteration: "Surah An-Nasr",
      english: "The Divine Support",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/110.mp3",
    },
    {
      arabic: "سورة المسد",
      transliteration: "Surah Al-Masad",
      english: "The Palm Fiber",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/111.mp3",
    },
  ];

  /** Same posture/recitation tail as Dhuhr (shared reference — identical steps). */
  const ASR_RAKAT1_SEQUENCE_TAIL = DHUHR_RAKAT1_SEQUENCE_TAIL;
  /** Same Rakaʿt 2+ block as Dhuhr (shared reference — identical steps). */
  const ASR_RAKAT2_POST_SURAH_STEPS = DHUHR_RAKAT2_POST_SURAH_STEPS;

  /**
   * Full Asr sequence (4 rakʿahs, silent): same mechanics as Dhuhr — `asrSequence` analogue.
   * Short surahs: Rakaʿt 1 from {@link asrSurahsRakat1}, Rakaʿt 2 from {@link asrSurahsRakat2}.
   * @returns {Array<{ arabic: string, transliteration: string, english: string, isSurah?: boolean, muteDuration?: number, silenceMs?: number, audioUrl?: string, audioMaxDurationMs?: number, silenceAfterAudioMs?: number }>}
   */
  function buildAsrSequence() {
    const randomSurahStep =
      asrSurahsRakat1[
        Math.floor(Math.random() * asrSurahsRakat1.length)
      ];
    const randomRakat2SurahStep =
      asrSurahsRakat2[
        Math.floor(Math.random() * asrSurahsRakat2.length)
      ];
    return ASR_RAKAT1_SEQUENCE_HEAD.concat(
      [randomSurahStep],
      ASR_RAKAT1_SEQUENCE_TAIL,
      [randomRakat2SurahStep],
      ASR_RAKAT2_POST_SURAH_STEPS
    );
  }

  /**
   * Builds the Asr step list (same shape as Dhuhr’s sequence; use when you need the `asrSequence` entry point by name).
   * @type {typeof buildAsrSequence}
   */
  const asrSequence = buildAsrSequence;

  /**
   * Isha opening through Rakaʿt 1 Amīn — same steps as Asr/Dhuhr except intention (night).
   */
  const ISHA_RAKAT1_SEQUENCE_HEAD = [
    {
      arabic: "نَوَيْتُ أَنْ أُصَلِّيَ فَرْضَ الْعِشَاءِ",
      transliteration: "Nawaytu an usalliya fardal-'Ishaa'",
      english: "Isha - night",
      silenceMs: 5000,
    },
  ].concat(DHUHR_RAKAT1_SEQUENCE_HEAD.slice(1));

  /**
   * Isha Rakaʿt 1 — Juz Amma title cards (full MP3 per card; Traditional mode uses muteDuration).
   */
  const ishaSurahsRakat1 = [
    {
      arabic: "سورة الطارق",
      transliteration: "Surah At-Tariq",
      english: "The Piercing Star",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/086.mp3",
    },
    {
      arabic: "سورة البروج",
      transliteration: "Surah Al-Buruj",
      english: "The Mansions of the Stars",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/085.mp3",
    },
    {
      arabic: "سورة الانفطار",
      transliteration: "Surah Al-Infitar",
      english: "The Cleaving",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/082.mp3",
    },
    {
      arabic: "سورة الانشقاق",
      transliteration: "Surah Al-Inshiqaq",
      english: "The Sundering",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/084.mp3",
    },
    {
      arabic: "سورة البينة",
      transliteration: "Surah Al-Bayyinah",
      english: "The Clear Proof",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/098.mp3",
    },
  ];

  /**
   * Isha Rakaʿt 2 — Juz Amma title cards (full MP3 per card; Traditional mode uses muteDuration).
   */
  const ishaSurahsRakat2 = [
    {
      arabic: "سورة النبأ",
      transliteration: "Surah An-Naba",
      english: "The Tidings",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/078.mp3",
    },
    {
      arabic: "سورة عبس",
      transliteration: "Surah 'Abasa",
      english: "He Frowned",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/080.mp3",
    },
    {
      arabic: "سورة التكوير",
      transliteration: "Surah At-Takwir",
      english: "The Overthrowing",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/081.mp3",
    },
    {
      arabic: "سورة المطففين",
      transliteration: "Surah Al-Mutaffifin",
      english: "The Defrauding",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/083.mp3",
    },
    {
      arabic: "سورة الفجر",
      transliteration: "Surah Al-Fajr",
      english: "The Dawn",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/089.mp3",
    },
  ];

  /** Same posture/recitation tail as Asr/Dhuhr (shared reference — identical steps). */
  const ISHA_RAKAT1_SEQUENCE_TAIL = ASR_RAKAT1_SEQUENCE_TAIL;
  /** Same Rakaʿt 2+ block as Asr/Dhuhr (shared reference — identical steps). */
  const ISHA_RAKAT2_POST_SURAH_STEPS = ASR_RAKAT2_POST_SURAH_STEPS;

  /**
   * Full Isha sequence (4 rakʿahs, silent): structurally identical to Asr; short surahs from {@link ishaSurahsRakat1} / {@link ishaSurahsRakat2}.
   * @returns {Array<{ arabic: string, transliteration: string, english: string, isSurah?: boolean, muteDuration?: number, silenceMs?: number, audioUrl?: string, audioMaxDurationMs?: number, silenceAfterAudioMs?: number }>}
   */
  function buildIshaSequence() {
    const randomSurahStep =
      ishaSurahsRakat1[
        Math.floor(Math.random() * ishaSurahsRakat1.length)
      ];
    const randomRakat2SurahStep =
      ishaSurahsRakat2[
        Math.floor(Math.random() * ishaSurahsRakat2.length)
      ];
    return ISHA_RAKAT1_SEQUENCE_HEAD.concat(
      [randomSurahStep],
      ISHA_RAKAT1_SEQUENCE_TAIL,
      [randomRakat2SurahStep],
      ISHA_RAKAT2_POST_SURAH_STEPS
    );
  }

  /**
   * Entry point for Isha (same pattern as `asrSequence`).
   * @type {typeof buildIshaSequence}
   */
  const ishaSequence = buildIshaSequence;

  /**
   * Maghrib Rakaʿt 1 — randomized title-card short surah (full MP3 per card; Traditional mode uses muteDuration).
   */
  const maghribSurahsRakat1 = [
    {
      arabic: "سورة الأعلى",
      transliteration: "Surah Al-A'la",
      english: "The Most High",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/087.mp3",
    },
    {
      arabic: "سورة الغاشية",
      transliteration: "Surah Al-Ghashiyah",
      english: "The Overwhelming",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/088.mp3",
    },
    {
      arabic: "سورة البلد",
      transliteration: "Surah Al-Balad",
      english: "The City",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/090.mp3",
    },
    {
      arabic: "سورة الكوثر",
      transliteration: "Surah Al-Kawthar",
      english: "The Abundance",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/108.mp3",
    },
    {
      arabic: "سورة الكافرون",
      transliteration: "Surah Al-Kafirun",
      english: "The Disbelievers",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/109.mp3",
    },
  ];

  /**
   * Maghrib Rakaʿt 2 — randomized title-card short surah (full MP3 per card; Traditional mode uses muteDuration).
   */
  const maghribSurahsRakat2 = [
    {
      arabic: "سورة الشمس",
      transliteration: "Surah Ash-Shams",
      english: "The Sun",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/091.mp3",
    },
    {
      arabic: "سورة الليل",
      transliteration: "Surah Al-Lail",
      english: "The Night",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/092.mp3",
    },
    {
      arabic: "سورة الإخلاص",
      transliteration: "Surah Al-Ikhlas",
      english: "The Sincerity",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/112.mp3",
    },
    {
      arabic: "سورة الفلق",
      transliteration: "Surah Al-Falaq",
      english: "The Daybreak",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/113.mp3",
    },
    {
      arabic: "سورة الناس",
      transliteration: "Surah An-Nas",
      english: "The Mankind",
      isSurah: true,
      muteDuration: 15000,
      audioUrl: "https://server8.mp3quran.net/afs/114.mp3",
    },
  ];

  /**
   * Maghrib (3 rakʿahs): splices Dhuhr — Rakaʿt 1–2 identical; Rakaʿt 3 is Fatiha + rukū + floor only, then final sitting (no 4th rakat).
   * Short surahs: Rakaʿt 1 from {@link maghribSurahsRakat1}, Rakaʿt 2 from {@link maghribSurahsRakat2}.
   * @returns {Array<{ arabic: string, transliteration: string, english: string, isSurah?: boolean, muteDuration?: number, silenceMs?: number, audioUrl?: string, audioMaxDurationMs?: number, silenceAfterAudioMs?: number }>}
   */
  function buildMaghribSequence() {
    const post = DHUHR_RAKAT2_POST_SURAH_STEPS;
    const idxAfterStand3rd =
      post.findIndex(function (s) {
        return (
          s.english === "Allah is the Greatest (Stand up for the 3rd Rakat)"
        );
      }) + 1;
    const idxStand4th = post.findIndex(function (s) {
      return (
        s.english === "Allah is the Greatest (Stand up for the 4th Rakat)"
      );
    });
    const idxSitFinalTashahhud = post.findIndex(function (s) {
      return (
        s.english === "Allah is the Greatest (Sit up for the Final Tashahhud)"
      );
    });
    const randomSurahStep =
      maghribSurahsRakat1[
        Math.floor(Math.random() * maghribSurahsRakat1.length)
      ];
    const randomRakat2SurahStep =
      maghribSurahsRakat2[
        Math.floor(Math.random() * maghribSurahsRakat2.length)
      ];

    const maghribHead = [
      {
        arabic: "نَوَيْتُ أَنْ أُصَلِّيَ فَرْضَ الْمَغْرِبِ",
        transliteration: "Nawaytu an usalliya fardal-Maghrib",
        english: "Maghrib - sunset",
        silenceMs: 5000,
      },
    ].concat(DHUHR_RAKAT1_SEQUENCE_HEAD.slice(1));

    const rakat2ThroughStand3rd = post.slice(0, idxAfterStand3rd);
    const rakat3ThroughSecondSajda = post.slice(idxAfterStand3rd, idxStand4th);
    const finalSittingFromSitUpForTashahhud = post.slice(idxSitFinalTashahhud);

    return maghribHead.concat(
      [randomSurahStep],
      DHUHR_RAKAT1_SEQUENCE_TAIL,
      [randomRakat2SurahStep],
      rakat2ThroughStand3rd,
      rakat3ThroughSecondSajda,
      finalSittingFromSitUpForTashahhud
    );
  }

  /**
   * Entry point for Maghrib (same pattern as `asrSequence`).
   * @type {typeof buildMaghribSequence}
   */
  const maghribSequence = buildMaghribSequence;

  /**
   * Modular audio-driven salah step runner (single queue `Audio` instance).
   * User pause is tracked as `paused`; expose via `isPaused()` on the runner.
   */
  function createSalahSequenceRunner() {
    const audio = mainPlayer;
    let silenceTimer = null;
    /** @type {'off' | 'silence' | 'audio' | 'postAudioSilence'} */
    let phase = "off";
    /** Sequence in progress (includes user-paused). */
    let active = false;
    /** User-requested pause — audio paused or silence timer cleared with remaining time kept. */
    let paused = false;
    let stepIndex = 0;
    /** @type {ReturnType<typeof buildFajrRakat1Sequence>} */
    let steps = [];
    /** Remaining silence for current step; deadline used while timer is armed. */
    let silenceRemainingMs = 0;
    let silenceDeadline = 0;
    /** Optional hard stop for long MP3s (e.g. adhān clipped to takbīr). */
    let audioClipTimer = null;
    let audioClipDeadline = 0;
    let audioClipRemainingMs = 0;
    /** @type {null | (() => void)} */
    let clipAdvanceFn = null;
    let postAudioSilenceTimer = null;
    let postAudioSilenceDeadline = 0;
    let postAudioSilenceRemainingMs = 0;
    /** @type {{ setRecitation?: (lines: { arabic: string, transliteration: string, english: string }) => void, onComplete?: () => void, onRunStart?: () => void, onTransportSync?: () => void, onLoadingChange?: (loading: boolean) => void }} */
    let callbacks = {};

    function clearPostAudioSilenceTimer() {
      if (postAudioSilenceTimer != null) {
        clearTimeout(postAudioSilenceTimer);
        postAudioSilenceTimer = null;
      }
    }

    function clearSilenceTimer() {
      if (silenceTimer != null) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    }

    function clearAudioClipTimer() {
      if (audioClipTimer != null) {
        clearTimeout(audioClipTimer);
        audioClipTimer = null;
      }
      audioClipDeadline = 0;
    }

    function detachAudioHandlers() {
      audio.onended = null;
      audio.onerror = null;
      audio.oncanplay = null;
      audio.onplaying = null;
    }

    function notifyTransport() {
      if (callbacks.onTransportSync) callbacks.onTransportSync();
    }

    function resolveSrc(step) {
      if (step.audioUrl) return step.audioUrl;
      return null;
    }

    function armSilenceTimer() {
      clearSilenceTimer();
      const ms = silenceRemainingMs;
      if (ms <= 0) {
        silenceRemainingMs = 0;
        silenceDeadline = 0;
        stepIndex += 1;
        if (active && !paused) tick();
        return;
      }
      silenceDeadline = Date.now() + ms;
      silenceTimer = window.setTimeout(function () {
        silenceTimer = null;
        silenceRemainingMs = 0;
        silenceDeadline = 0;
        stepIndex += 1;
        if (active && !paused) tick();
      }, ms);
    }

    /**
     * @param {string|null} src
     * @param {() => void} onEnded
     * @param {number|undefined} clipDurationMs — stop after this many ms (takbīr clip from full MP3).
     */
    function playQueueAudio(src, onEnded, clipDurationMs) {
      detachAudioHandlers();
      clearAudioClipTimer();
      clipAdvanceFn = null;
      audioClipRemainingMs = 0;
      audio.pause();
      if (callbacks.onLoadingChange) callbacks.onLoadingChange(false);
      if (!src) {
        onEnded();
        return;
      }
      const isRemoteSrc = /^https?:\/\//i.test(src);
      if (callbacks.onLoadingChange) callbacks.onLoadingChange(isRemoteSrc);
      let finished = false;
      function finishOnce() {
        if (finished) return;
        finished = true;
        if (callbacks.onLoadingChange) callbacks.onLoadingChange(false);
        clearAudioClipTimer();
        clipAdvanceFn = null;
        detachAudioHandlers();
        onEnded();
      }
      clipAdvanceFn = finishOnce;

      audio.src = src;
      if (isRemoteSrc) {
        audio.oncanplay = function () {
          if (callbacks.onLoadingChange) callbacks.onLoadingChange(false);
        };
        audio.onplaying = function () {
          if (callbacks.onLoadingChange) callbacks.onLoadingChange(false);
        };
      }
      audio.onended = function () {
        finishOnce();
      };
      audio.onerror = function () {
        finishOnce();
      };
      if (clipDurationMs != null && clipDurationMs > 0) {
        audioClipDeadline = Date.now() + clipDurationMs;
        audioClipTimer = window.setTimeout(function () {
          audioClipTimer = null;
          audio.pause();
          finishOnce();
        }, clipDurationMs);
      }
      const p = audio.play();
      if (p) {
        p.catch(function () {
          finishOnce();
        });
      }
    }

    function tick() {
      if (!active || paused) return;
      if (stepIndex >= steps.length) {
        active = false;
        paused = false;
        phase = "off";
        clearSilenceTimer();
        silenceRemainingMs = 0;
        silenceDeadline = 0;
        clearAudioClipTimer();
        clipAdvanceFn = null;
        if (callbacks.onLoadingChange) callbacks.onLoadingChange(false);
        detachAudioHandlers();
        audio.pause();
        if (callbacks.onComplete) callbacks.onComplete();
        return;
      }

      const step = steps[stepIndex];

      if (callbacks.setRecitation) {
        callbacks.setRecitation({
          arabic: step.arabic != null ? step.arabic : "",
          transliteration: step.transliteration != null ? step.transliteration : "",
          english: step.english != null ? step.english : "",
        });
      }

      if (step.silenceMs != null) {
        phase = "silence";
        silenceRemainingMs = step.silenceMs;
        armSilenceTimer();
        return;
      }

      if (step.isSurah && !isLearningMode) {
        phase = "silence";
        silenceRemainingMs =
          step.muteDuration != null ? step.muteDuration : TRADITIONAL_SURAH_SILENCE_MS;
        armSilenceTimer();
        return;
      }

      const src = resolveSrc(step);
      phase = "audio";
      playQueueAudio(
        src,
        function () {
          if (!active) return;
          const delayRaw = step.silenceAfterAudioMs;
          const delayMs =
            delayRaw != null && delayRaw > 0 ? delayRaw : 0;
          function advanceAfterCurrentAudioStep() {
            clearPostAudioSilenceTimer();
            postAudioSilenceDeadline = 0;
            postAudioSilenceRemainingMs = 0;
            phase = "off";
            if (!active || paused) return;
            stepIndex += 1;
            tick();
          }
          if (delayMs > 0) {
            phase = "postAudioSilence";
            postAudioSilenceRemainingMs = 0;
            postAudioSilenceDeadline = Date.now() + delayMs;
            postAudioSilenceTimer = window.setTimeout(function () {
              postAudioSilenceTimer = null;
              advanceAfterCurrentAudioStep();
            }, delayMs);
          } else {
            advanceAfterCurrentAudioStep();
          }
        },
        step.audioMaxDurationMs
      );
    }

    return {
      /**
       * @param {ReturnType<typeof buildFajrRakat1Sequence>} stepList
       * @param {{ setRecitation?: (lines: { arabic: string, transliteration: string, english: string }) => void, onComplete?: () => void, onRunStart?: () => void, onTransportSync?: () => void, onLoadingChange?: (loading: boolean) => void }} cb
       */
      start: function (stepList, cb) {
        this.stop();
        steps = stepList;
        callbacks = cb || {};
        stepIndex = 0;
        active = true;
        paused = false;
        phase = "off";
        silenceRemainingMs = 0;
        silenceDeadline = 0;
        if (callbacks.onRunStart) callbacks.onRunStart();
        tick();
        notifyTransport();
      },
      pause: function () {
        if (!active || paused) return;
        paused = true;
        if (phase === "silence") {
          clearSilenceTimer();
          silenceRemainingMs = Math.max(0, silenceDeadline - Date.now());
          silenceDeadline = 0;
        } else if (phase === "audio") {
          if (audioClipDeadline > 0) {
            audioClipRemainingMs = Math.max(0, audioClipDeadline - Date.now());
          }
          clearAudioClipTimer();
          audio.pause();
        } else if (phase === "postAudioSilence") {
          clearPostAudioSilenceTimer();
          postAudioSilenceRemainingMs = Math.max(
            0,
            postAudioSilenceDeadline - Date.now()
          );
          postAudioSilenceDeadline = 0;
        }
        notifyTransport();
      },
      resume: function () {
        if (!active || !paused) return;
        paused = false;
        if (phase === "silence") {
          armSilenceTimer();
        } else if (phase === "audio") {
          const p = audio.play();
          if (p) {
            p.catch(function () {
              paused = true;
              notifyTransport();
            });
          }
          if (audioClipRemainingMs > 0 && clipAdvanceFn) {
            const ms = audioClipRemainingMs;
            audioClipRemainingMs = 0;
            audioClipDeadline = Date.now() + ms;
            audioClipTimer = window.setTimeout(function () {
              audioClipTimer = null;
              audioClipDeadline = 0;
              audio.pause();
              clipAdvanceFn();
            }, ms);
          }
        } else if (phase === "postAudioSilence") {
          const ms = postAudioSilenceRemainingMs;
          postAudioSilenceRemainingMs = 0;
          postAudioSilenceDeadline = 0;
          if (ms <= 0) {
            phase = "off";
            if (!active || paused) return;
            stepIndex += 1;
            tick();
          } else {
            postAudioSilenceDeadline = Date.now() + ms;
            postAudioSilenceTimer = window.setTimeout(function () {
              postAudioSilenceTimer = null;
              postAudioSilenceDeadline = 0;
              phase = "off";
              if (!active || paused) return;
              stepIndex += 1;
              tick();
            }, ms);
          }
        } else {
          tick();
        }
        notifyTransport();
      },
      stop: function () {
        clearSilenceTimer();
        clearPostAudioSilenceTimer();
        clearAudioClipTimer();
        clipAdvanceFn = null;
        audioClipRemainingMs = 0;
        postAudioSilenceDeadline = 0;
        postAudioSilenceRemainingMs = 0;
        if (callbacks.onLoadingChange) callbacks.onLoadingChange(false);
        detachAudioHandlers();
        audio.pause();
        try {
          audio.removeAttribute("src");
        } catch {
          /* ignore */
        }
        active = false;
        paused = false;
        phase = "off";
        silenceRemainingMs = 0;
        silenceDeadline = 0;
        stepIndex = 0;
        steps = [];
        callbacks = {};
      },
      isActive: function () {
        return active;
      },
      isPaused: function () {
        return paused && active;
      },
      isRunning: function () {
        return active;
      },
    };
  }

  const fajrSalahSequence = createSalahSequenceRunner();

  let isLearningMode = true;
  let currentPrayerName = "";
  /** Whether the sequence player is currently waiting on remote audio readiness. */
  let isSequenceLoading = false;

  /**
   * Global user-pause flag for the Virtual Imam sequencer (Fajr); mirrors `fajrSalahSequence.isPaused()`.
   * @type {boolean}
   */
  let isPaused = false;

  /** localStorage key for per-prayer alarm switches (boolean map). */
  const STORAGE_KEY_ALARM_TOGGLES = "virtualImam.prayerAlarmToggles";

  /** Custom Tahajjud alarm clock time `HH:MM` (local); overrides API `Lastthird` for display and alarms. */
  const STORAGE_KEY_TAHAJJUD_ALARM_HM = "virtualImam.tahajjudCustomAlarmHm";
  /** Per-prayer manual time overrides (`PrayerName -> HH:MM`). */
  const STORAGE_KEY_PRAYER_TIME_OVERRIDES = "virtualImam.prayerTimeOverrides";

  /**
   * @returns {string | null}
   */
  function loadTahajjudCustomAlarmHm() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TAHAJJUD_ALARM_HM);
      if (!raw || typeof raw !== "string") return null;
      return toHmKey(raw.trim());
    } catch {
      return null;
    }
  }

  /**
   * @param {string} hm
   */
  function saveTahajjudCustomAlarmHm(hm) {
    const k = toHmKey(hm);
    if (!k) return;
    tahajjudCustomAlarmHm = k;
    try {
      localStorage.setItem(STORAGE_KEY_TAHAJJUD_ALARM_HM, k);
    } catch {
      /* private mode / quota */
    }
  }

  /** @type {string | null} */
  let tahajjudCustomAlarmHm = null;

  /**
   * Per-prayer manual clock overrides (`HH:MM`), including Tahajjud.
   * @type {Record<string, string>}
   */
  let prayerTimeOverrides = Object.create(null);

  /**
   * @returns {Record<string, string>}
   */
  function loadPrayerTimeOverrides() {
    /** @type {Record<string, string>} */
    const out = Object.create(null);
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRAYER_TIME_OVERRIDES);
      if (!raw) return out;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return out;
      for (let i = 0; i < PRAYERS.length; i++) {
        const prayerName = PRAYERS[i];
        const v = parsed[prayerName];
        if (typeof v !== "string") continue;
        const hm = toHmKey(v);
        if (hm) out[prayerName] = hm;
      }
      return out;
    } catch {
      return out;
    }
  }

  function savePrayerTimeOverrides() {
    try {
      localStorage.setItem(STORAGE_KEY_PRAYER_TIME_OVERRIDES, JSON.stringify(prayerTimeOverrides));
    } catch {
      /* private mode / quota */
    }
  }

  /**
   * @param {string} prayerName
   * @returns {string | null}
   */
  function manualPrayerHm(prayerName) {
    const fromMap = prayerTimeOverrides[prayerName];
    if (typeof fromMap === "string") return fromMap;
    if (prayerName === "Tahajjud" && tahajjudCustomAlarmHm) return tahajjudCustomAlarmHm;
    return null;
  }

  /**
   * @param {string} prayerName
   * @param {string} hm
   */
  function saveManualPrayerHm(prayerName, hm) {
    const k = toHmKey(hm);
    if (!k) return;
    prayerTimeOverrides[prayerName] = k;
    if (prayerName === "Tahajjud") {
      saveTahajjudCustomAlarmHm(k);
    } else {
      savePrayerTimeOverrides();
    }
  }

  /** @type {HTMLInputElement | null} */
  let prayerTimeInputEl = null;
  /** @type {string | null} */
  let activeEditablePrayerName = null;

  /**
   * Native `<input type="time">` can keep focus after `showPicker()` / iOS sheet closes,
   * leaving an invisible focus target that steals taps from the Tahajjud row.
   */
  function blurPrayerTimeInput() {
    const inp = prayerTimeInputEl;
    if (!inp) return;
    inp.blur();
    window.requestAnimationFrame(function () {
      if (document.activeElement === inp) inp.blur();
    });
    window.setTimeout(function () {
      if (document.activeElement === inp) inp.blur();
    }, 100);
  }

  /**
   * @param {Record<string, string>} timings
   * @returns {Record<string, string>}
   */
  function timingsWithManualOverrides(timings) {
    const out = Object.assign({}, timings);
    for (let i = 0; i < PRAYERS.length; i++) {
      const prayerName = PRAYERS[i];
      const manualHm = manualPrayerHm(prayerName);
      if (!manualHm) continue;
      out[timingApiKeyForPrayer(prayerName)] = manualHm;
    }
    return out;
  }

  /**
   * @returns {HTMLInputElement}
   */
  function ensurePrayerTimeInput() {
    if (prayerTimeInputEl) return prayerTimeInputEl;
    const inp = document.createElement("input");
    inp.type = "time";
    inp.step = "60";
    inp.className = "prayer-time-input-native";
    inp.setAttribute("aria-hidden", "true");
    inp.setAttribute("tabindex", "-1");
    inp.addEventListener("change", function () {
      if (!inp.value || !activeEditablePrayerName) return;
      saveManualPrayerHm(activeEditablePrayerName, inp.value);
      savePrayerTimeOverrides();
      updateAllPrayerTimeButtonLabels();
      updatePrayerRowsNextHighlight();
      blurPrayerTimeInput();
    });
    document.body.appendChild(inp);
    prayerTimeInputEl = inp;
    return inp;
  }

  /**
   * @param {string} prayerName
   */
  function openPrayerTimePicker(prayerName) {
    activeEditablePrayerName = prayerName;
    const inp = ensurePrayerTimeInput();
    let seed = manualPrayerHm(prayerName);
    if (!seed && currentTimings) {
      const effective = timingsWithManualOverrides(currentTimings);
      const raw = timingRawForPrayer(effective, prayerName);
      seed = toHmKey(typeof raw === "string" ? raw : "");
    }
    inp.value = seed || "02:00";
    function afterPickerUi() {
      blurPrayerTimeInput();
    }
    try {
      if (typeof inp.showPicker === "function") {
        const ret = inp.showPicker();
        if (ret && typeof ret.then === "function") {
          ret.then(afterPickerUi).catch(afterPickerUi);
        }
        /* If no Promise, rely on `change` + blur only — avoid blurring while UI is open. */
      } else {
        inp.focus();
        inp.click();
        window.setTimeout(afterPickerUi, 500);
      }
    } catch {
      inp.focus();
      window.setTimeout(afterPickerUi, 500);
    }
  }

  /**
   * @param {string} prayerName
   */
  function updatePrayerTimeButtonLabel(prayerName) {
    const btn = document.querySelector('[data-prayer-time-button="' + prayerName + '"]');
    if (!btn) return;
    let display = manualPrayerHm(prayerName) || "—";
    if (!manualPrayerHm(prayerName) && currentTimings) {
      const effective = timingsWithManualOverrides(currentTimings);
      const raw = timingRawForPrayer(effective, prayerName);
      display = cleanTime(typeof raw === "string" ? raw : "");
    }
    const inner = btn.querySelector(".prayer-time__inner");
    if (inner) inner.textContent = display;
    btn.setAttribute("aria-label", "Set " + prayerName + " alarm time, currently " + display);
  }

  function updateAllPrayerTimeButtonLabels() {
    for (let i = 0; i < PRAYERS.length; i++) {
      updatePrayerTimeButtonLabel(PRAYERS[i]);
    }
  }

  function updatePrayerRowsNextHighlight() {
    if (!els.prayerList || !currentTimings) return;
    const effective = timingsWithManualOverrides(currentTimings);
    const nextIdx = nextPrayerIndex(effective);
    const rows = els.prayerList.querySelectorAll("li.prayer-row");
    rows.forEach(function (li, index) {
      li.classList.toggle("prayer-row--next", index === nextIdx);
      const nameSpan = li.querySelector(".prayer-name");
      if (!nameSpan) return;
      const oldBadge = nameSpan.querySelector(".badge-next");
      if (oldBadge) oldBadge.remove();
      if (index === nextIdx) {
        const badge = document.createElement("span");
        badge.className = "badge-next";
        badge.textContent = "Next";
        nameSpan.appendChild(badge);
      }
    });
  }

  const els = {
    loading: document.getElementById("state-loading"),
    permission: document.getElementById("state-permission"),
    error: document.getElementById("state-error"),
    results: document.getElementById("state-results"),
    errorMessage: document.getElementById("error-message"),
    prayerList: document.getElementById("prayer-list"),
    locationLine: document.getElementById("location-line"),
    dateLine: document.getElementById("date-line"),
    btnRequest: document.getElementById("btn-request-location"),
    btnRetry: document.getElementById("btn-retry"),
    btnPreviewAdhan: document.getElementById("btn-preview-adhan"),
    audioError: document.getElementById("audio-error"),
    homeView: document.getElementById("home-view"),
    prayerView: document.getElementById("prayer-view"),
    prayerViewTitleAr: document.getElementById("prayer-view-title-ar"),
    prayerViewTitleEn: document.getElementById("prayer-view-title-en"),
    prayerHeader: document.getElementById("prayer-header"),
    btnPrayerBack: document.getElementById("btn-prayer-back"),
    btnLearningModeToggle: document.getElementById("btn-learning-mode-toggle"),
    learningModeLabel: document.getElementById("learning-mode-label"),
    fajrSalahPanel: document.getElementById("fajr-salah-panel"),
    btnStartFajrSalah: document.getElementById("btn-start-fajr-salah"),
    fajrRecitationDisplay: document.getElementById("fajr-recitation-display"),
    recitationAr: document.getElementById("recitation-ar"),
    recitationTranslit: document.getElementById("recitation-translit"),
    recitationEn: document.getElementById("recitation-en"),
    fajrPrayerComplete: document.getElementById("fajr-prayer-complete"),
    btnFajrPrayerRestart: document.getElementById("btn-fajr-prayer-restart"),
    btnFajrPrayerFinish: document.getElementById("btn-fajr-prayer-finish"),
  };

  /**
   * @returns {HTMLSpanElement | null}
   */
  function ensureSequenceLoadingBadge() {
    const btn = els.btnStartFajrSalah;
    if (!btn) return null;
    let badge = btn.querySelector(".fajr-play-btn__loading");
    if (badge) return /** @type {HTMLSpanElement} */ (badge);
    badge = document.createElement("span");
    badge.className = "fajr-play-btn__loading";
    badge.textContent = "Loading...";
    badge.setAttribute("aria-hidden", "true");
    btn.appendChild(badge);
    try {
      btn.style.position = "relative";
      badge.style.position = "absolute";
      badge.style.left = "50%";
      badge.style.bottom = "-1.1rem";
      badge.style.transform = "translateX(-50%)";
      badge.style.fontSize = "0.68rem";
      badge.style.fontWeight = "600";
      badge.style.letterSpacing = "0.03em";
      badge.style.color = "var(--accent-bright)";
      badge.style.whiteSpace = "nowrap";
      badge.style.opacity = "0";
      badge.style.pointerEvents = "none";
      badge.style.transition = "opacity 0.15s ease";
    } catch {
      /* ignore inline style failures */
    }
    return badge;
  }

  /**
   * @param {boolean} loading
   */
  function setSequenceLoading(loading) {
    isSequenceLoading = loading;
    const badge = ensureSequenceLoadingBadge();
    if (badge) badge.style.opacity = loading ? "1" : "0";
    const btn = els.btnStartFajrSalah;
    if (!btn) return;
    btn.classList.toggle("fajr-play-btn--loading", loading);
    syncFajrTransportUi();
  }

  function primeMainPlayerFromUserGesture() {
    try {
      mainPlayer.pause();
      mainPlayer.src = "";
      const p = mainPlayer.play();
      if (p) {
        p.catch(function () {
          /* Some browsers block this even on user gesture; normal playback still attempts later. */
        });
      }
    } catch {
      /* no-op */
    }
  }

  function syncFajrTransportUi() {
    const btn = els.btnStartFajrSalah;
    if (!btn) return;
    const sequenceActive = fajrSalahSequence.isActive();
    const userPaused = fajrSalahSequence.isPaused();
    isPaused = userPaused;
    btn.classList.toggle("fajr-play-btn--show-pause", sequenceActive && !userPaused);
    const prayerLabel = currentPrayerName || "Prayer";
    if (!sequenceActive) {
      btn.setAttribute("aria-label", "Start " + prayerLabel + " Salah");
      btn.setAttribute("aria-pressed", "false");
    } else if (userPaused) {
      btn.setAttribute("aria-label", "Resume " + prayerLabel + " Salah");
      btn.setAttribute("aria-pressed", "false");
    } else {
      btn.setAttribute("aria-label", "Pause " + prayerLabel + " Salah");
      btn.setAttribute("aria-pressed", "true");
    }
    if (isSequenceLoading) {
      btn.setAttribute("aria-label", "Loading " + prayerLabel + " recitation...");
    }
  }

  function syncLearningModeUi() {
    const btn = els.btnLearningModeToggle;
    if (!btn) return;
    const traditional = !isLearningMode;
    btn.classList.toggle("btn-learning-mode--traditional", traditional);
    btn.setAttribute("aria-pressed", isLearningMode ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      isLearningMode ? "Learning mode" : "Traditional mode"
    );
    if (els.learningModeLabel) {
      els.learningModeLabel.textContent = isLearningMode ? "Learning" : "Traditional";
    }
  }

  function clearRecitationDisplay() {
    if (els.recitationAr) els.recitationAr.textContent = "";
    if (els.recitationTranslit) els.recitationTranslit.textContent = "";
    if (els.recitationEn) els.recitationEn.textContent = "";
  }

  /** Hide Arabic/English prayer name during sequencer to maximize teleprompter space; show again after full reset. */
  function setPrayerHeaderSequencerHidden(hidden) {
    if (!els.prayerHeader) return;
    els.prayerHeader.classList.toggle("prayer-header--hidden", hidden);
    els.prayerHeader.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  function hideFajrPrayerCompleteUi() {
    if (els.fajrPrayerComplete) {
      els.fajrPrayerComplete.classList.add("hidden");
      els.fajrPrayerComplete.setAttribute("aria-hidden", "true");
    }
  }

  function showFajrPrayerCompleteUi() {
    if (els.fajrPrayerComplete) {
      els.fajrPrayerComplete.classList.remove("hidden");
      els.fajrPrayerComplete.setAttribute("aria-hidden", "false");
    }
    if (els.btnFajrPrayerRestart && typeof els.btnFajrPrayerRestart.focus === "function") {
      try {
        els.btnFajrPrayerRestart.focus({ preventScroll: true });
      } catch {
        els.btnFajrPrayerRestart.focus();
      }
    }
  }

  function resetFajrSalahPanelUi() {
    hideFajrPrayerCompleteUi();
    clearRecitationDisplay();
    if (els.btnStartFajrSalah) els.btnStartFajrSalah.disabled = false;
    isPaused = false;
    setSequenceLoading(false);
    setPrayerHeaderSequencerHidden(false);
    syncFajrTransportUi();
  }

  function abortFajrSalahSequence() {
    fajrSalahSequence.stop();
    resetFajrSalahPanelUi();
  }

  function sequenceForPrayerName(prayerName) {
    if (prayerName === "Fajr") return buildFajrRakat1Sequence();
    if (prayerName === "Dhuhr") return buildDhuhrRakat1Sequence();
    if (prayerName === "Asr") return asrSequence();
    if (prayerName === "Maghrib") return maghribSequence();
    if (prayerName === "Isha") return ishaSequence();
    if (prayerName === "Tahajjud") return tahajjudSequence();
    return null;
  }

  function startSelectedPrayerSequence() {
    const selectedSequence = sequenceForPrayerName(currentPrayerName);
    if (!selectedSequence) return;
    hideFajrPrayerCompleteUi();
    setPrayerHeaderSequencerHidden(true);
    fajrSalahSequence.start(selectedSequence, {
      setRecitation: function (lines) {
        if (els.recitationAr) els.recitationAr.textContent = lines.arabic;
        if (els.recitationTranslit) els.recitationTranslit.textContent = lines.transliteration;
        if (els.recitationEn) els.recitationEn.textContent = lines.english;
      },
      onTransportSync: syncFajrTransportUi,
      onLoadingChange: setSequenceLoading,
      onComplete: function () {
        clearRecitationDisplay();
        setSequenceLoading(false);
        setPrayerHeaderSequencerHidden(false);
        syncFajrTransportUi();
        showFajrPrayerCompleteUi();
      },
    });
  }

  function syncFajrSalahPanel(prayerName) {
    const showFajrChrome =
      prayerName === "Fajr" ||
      prayerName === "Dhuhr" ||
      prayerName === "Asr" ||
      prayerName === "Maghrib" ||
      prayerName === "Isha" ||
      prayerName === "Tahajjud";
    if (els.fajrSalahPanel) {
      els.fajrSalahPanel.classList.toggle("hidden", !showFajrChrome);
    }
    if (els.fajrRecitationDisplay) {
      els.fajrRecitationDisplay.classList.toggle("hidden", !showFajrChrome);
    }
    if (!showFajrChrome) {
      abortFajrSalahSequence();
    }
  }

  /**
   * @returns {Record<string, boolean>}
   */
  function defaultAlarmToggleMap() {
    const m = Object.create(null);
    for (let i = 0; i < PRAYERS.length; i++) {
      m[PRAYERS[i]] = true;
    }
    return m;
  }

  /**
   * Read saved per-prayer alarm toggles. Unknown keys default to on (`true`).
   * @returns {Record<string, boolean>}
   */
  function loadAlarmTogglesFromStorage() {
    const base = defaultAlarmToggleMap();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ALARM_TOGGLES);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return base;
      for (let i = 0; i < PRAYERS.length; i++) {
        const p = PRAYERS[i];
        if (Object.prototype.hasOwnProperty.call(parsed, p)) {
          base[p] = Boolean(parsed[p]);
        }
      }
      return base;
    } catch {
      return defaultAlarmToggleMap();
    }
  }

  /**
   * @param {Record<string, boolean>} map
   */
  function saveAlarmTogglesToStorage(map) {
    try {
      const out = Object.create(null);
      for (let i = 0; i < PRAYERS.length; i++) {
        out[PRAYERS[i]] = Boolean(map[PRAYERS[i]]);
      }
      localStorage.setItem(STORAGE_KEY_ALARM_TOGGLES, JSON.stringify(out));
    } catch {
      /* private mode, quota, or storage disabled */
    }
  }

  /**
   * In-memory map; initialized from localStorage on load, updated on each toggle.
   * @type {Record<string, boolean>}
   */
  let alarmToggleState = loadAlarmTogglesFromStorage();

  /**
   * @param {string} prayerName
   * @returns {boolean}
   */
  function isPrayerAlarmEnabled(prayerName) {
    return alarmToggleState[prayerName] !== false;
  }

  /**
   * @param {string} prayerName
   * @param {boolean} enabled
   */
  function setPrayerAlarmEnabled(prayerName, enabled) {
    alarmToggleState[prayerName] = enabled;
    saveAlarmTogglesToStorage(alarmToggleState);
  }

  /** @type {Record<string, string>|null} */
  let currentTimings = null;
  /** Set of "YYYY-MM-DD|PrayerName" fired today */
  const firedPrayerKeys = new Set();
  let lastCalendarDateKey = "";

  /** Coordinates from the last successful timings fetch (for silent day rollover). */
  let cachedLatitude = null;
  let cachedLongitude = null;
  /** Local calendar date (`YYYY-MM-DD`) for which `currentTimings` was loaded. */
  let timingsFetchedForDateKey = "";
  /** Timeout id for the next scheduled midnight refresh. */
  let midnightRefreshTimerId = null;

  /** After one silent unlock, scheduled `play()` is allowed by autoplay policy. */
  let adhanAutoplayUnlocked = false;
  let silentAutoplayUnlockInFlight = false;

  const adhanAudio = new Audio();
  adhanAudio.preload = "auto";
  adhanAudio.src = ADHAN_MP3_URL;

  function hideAudioError() {
    if (!els.audioError) return;
    els.audioError.textContent = "";
    els.audioError.classList.add("hidden");
  }

  function showAudioError(message) {
    if (!els.audioError) return;
    els.audioError.textContent = message;
    els.audioError.classList.remove("hidden");
  }

  /**
   * Resolve when the remote MP3 can play (handles slow networks).
   * @returns {Promise<void>}
   */
  function whenAdhanCanPlay() {
    return new Promise(function (resolve, reject) {
      if (adhanAudio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve();
        return;
      }
      const onReady = function () {
        adhanAudio.removeEventListener("canplay", onReady);
        adhanAudio.removeEventListener("error", onErr);
        resolve();
      };
      const onErr = function () {
        adhanAudio.removeEventListener("canplay", onReady);
        adhanAudio.removeEventListener("error", onErr);
        reject(new Error("Could not load the Adhan audio file."));
      };
      adhanAudio.addEventListener("canplay", onReady);
      adhanAudio.addEventListener("error", onErr);
    });
  }

  function showHomeView() {
    abortFajrSalahSequence();
    if (els.homeView) els.homeView.classList.remove("hidden");
    if (els.prayerView) {
      els.prayerView.classList.add("hidden");
      els.prayerView.setAttribute("aria-hidden", "true");
    }
  }

  /**
   * @param {string} prayerName
   */
  function showPrayerView(prayerName) {
    abortFajrSalahSequence();
    currentPrayerName = prayerName;
    syncFajrSalahPanel(prayerName);
    if (els.btnLearningModeToggle) {
      const showTraditionalToggle =
        prayerName === "Dhuhr" ||
        prayerName === "Asr" ||
        prayerName === "Maghrib" ||
        prayerName === "Isha";
      els.btnLearningModeToggle.style.display = showTraditionalToggle ? "flex" : "none";
      if (!showTraditionalToggle) {
        isLearningMode = true;
      }
      syncLearningModeUi();
    }

    if (els.prayerViewTitleAr) {
      els.prayerViewTitleAr.textContent = arabicPrayerName(prayerName) || "—";
    }
    if (els.prayerViewTitleEn) {
      els.prayerViewTitleEn.textContent = prayerName;
    }
    if (els.homeView) els.homeView.classList.add("hidden");
    if (els.prayerView) {
      els.prayerView.classList.remove("hidden");
      els.prayerView.setAttribute("aria-hidden", "false");
    }
    if (els.btnPrayerBack && typeof els.btnPrayerBack.focus === "function") {
      try {
        els.btnPrayerBack.focus({ preventScroll: true });
      } catch {
        els.btnPrayerBack.focus();
      }
    }
  }

  function showState(which) {
    if (which === "loading" || which === "permission" || which === "error") {
      showHomeView();
    }
    els.loading.classList.toggle("hidden", which !== "loading");
    els.permission.classList.toggle("hidden", which !== "permission");
    els.error.classList.toggle("hidden", which !== "error");
    els.results.classList.toggle("hidden", which !== "results");
  }

  function geolocationOptions() {
    return {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    };
  }

  function formatCoords(lat, lng) {
    const ns = lat >= 0 ? "N" : "S";
    const ew = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`;
  }

  /**
   * Aladhan returns times like "05:12" or "05:12 (GMT+1)" — strip suffix for display.
   */
  function cleanTime(raw) {
    if (!raw || typeof raw !== "string") return "—";
    const trimmed = raw.trim();
    const paren = trimmed.indexOf(" (");
    return paren === -1 ? trimmed : trimmed.slice(0, paren);
  }

  /** Normalize to HH:MM for comparison with local clock. */
  function toHmKey(raw) {
    const s = cleanTime(raw);
    if (s === "—") return null;
    const parts = s.split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (
      String(Math.min(23, Math.max(0, h))).padStart(2, "0") +
      ":" +
      String(Math.min(59, Math.max(0, m))).padStart(2, "0")
    );
  }

  tahajjudCustomAlarmHm = loadTahajjudCustomAlarmHm();
  prayerTimeOverrides = loadPrayerTimeOverrides();
  if (tahajjudCustomAlarmHm) {
    prayerTimeOverrides.Tahajjud = tahajjudCustomAlarmHm;
  }

  function localDateKey(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function nowHmKey() {
    const n = new Date();
    return (
      String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0")
    );
  }

  /**
   * Maps UI label → Aladhan `data.timings` key (see api.aladhan.com timings object).
   * @param {string} displayName
   * @returns {string}
   */
  function timingApiKeyForPrayer(displayName) {
    if (displayName === "Tahajjud") return "Lastthird";
    return displayName;
  }

  /**
   * Raw timing string for a prayer row (Tahajjud → API key `Lastthird`).
   * @param {Record<string, string>} timings
   * @param {string} displayName
   * @returns {string|undefined}
   */
  function timingRawForPrayer(timings, displayName) {
    return timings[timingApiKeyForPrayer(displayName)];
  }

  /**
   * Next occurrence of this clock time (rolls to tomorrow if already passed today).
   * @param {number} h
   * @param {number} m
   * @param {Date} now
   * @returns {Date}
   */
  function nextOccurrenceTodayOrTomorrow(h, m, now) {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  function fetchPrayerTimes(latitude, longitude) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      method: "2",
    });
    const url = `https://api.aladhan.com/v1/timings/today?${params.toString()}`;
    return fetch(url).then(function (res) {
      if (!res.ok) {
        throw new Error("Prayer times service returned an error.");
      }
      return res.json();
    });
  }

  /**
   * Approximate location from client IP (fallback when GPS is denied/unavailable).
   * @returns {Promise<{ latitude: number, longitude: number, label: string }>}
   */
  function fetchIpApproxLocation() {
    return fetch("https://ipapi.co/json/")
      .then(function (res) {
        if (!res.ok) throw new Error("IP location service returned an error.");
        return res.json();
      })
      .then(function (json) {
        const lat = Number(json.latitude);
        const lng = Number(json.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error("IP location response missing coordinates.");
        }
        const city = typeof json.city === "string" && json.city.trim() ? json.city.trim() : "";
        const tz = typeof json.timezone === "string" && json.timezone.trim() ? json.timezone.trim() : "";
        const label = city && tz ? city + " (" + tz + ")" : "Approximate location from IP";
        return { latitude: lat, longitude: lng, label: label };
      });
  }

  /**
   * Milliseconds until the next local midnight (minimum 1s to avoid tight loops).
   * @returns {number}
   */
  function msUntilNextLocalMidnight() {
    const now = Date.now();
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return Math.max(next.getTime() - now, 1000);
  }

  /**
   * If the calendar day changed since the last fetch, reload today’s timings using
   * cached coordinates (no extra geolocation prompt).
   */
  function refreshTimingsIfNewDay() {
    if (cachedLatitude == null || cachedLongitude == null) return;
    if (!currentTimings) return;

    const todayKey = localDateKey(new Date());
    if (todayKey === timingsFetchedForDateKey) return;

    fetchPrayerTimes(cachedLatitude, cachedLongitude)
      .then(function (json) {
        if (json.code !== 200) return;
        renderResults(json, cachedLatitude, cachedLongitude);
      })
      .catch(function () {
        /* keep showing previous day until the next check succeeds */
      });
  }

  /**
   * Schedules a single refresh at the next local midnight, then chains indefinitely.
   */
  function scheduleMidnightTimingsRefresh() {
    if (midnightRefreshTimerId != null) {
      clearTimeout(midnightRefreshTimerId);
      midnightRefreshTimerId = null;
    }
    midnightRefreshTimerId = window.setTimeout(function () {
      midnightRefreshTimerId = null;
      refreshTimingsIfNewDay();
      scheduleMidnightTimingsRefresh();
    }, msUntilNextLocalMidnight());
  }

  function nextPrayerIndex(timings) {
    const now = new Date();
    let bestIdx = 0;
    let bestTs = Infinity;
    for (let i = 0; i < PRAYERS.length; i++) {
      const raw = timingRawForPrayer(timings, PRAYERS[i]);
      const t = cleanTime(typeof raw === "string" ? raw : "");
      const parts = t.split(":");
      if (parts.length < 2) continue;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const instant = nextOccurrenceTodayOrTomorrow(h, m, now);
      const ts = instant.getTime();
      if (ts < bestTs) {
        bestTs = ts;
        bestIdx = i;
      }
    }
    return bestTs === Infinity ? 0 : bestIdx;
  }

  /**
   * Whether `target` is an interactive control whose first use should unlock audio.
   * @param {EventTarget | null} target
   * @returns {boolean}
   */
  function isInteractiveUnlockTarget(target) {
    if (!target || target.nodeType !== 1) return false;
    const el = /** @type {Element} */ (target);
    return Boolean(el.closest("button, a[href], input, select, textarea, label.toggle"));
  }

  /**
   * Short silent play → pause so autopolicy accepts later programmatic Adhan at prayer times.
   * Safe to call multiple times; only the first successful call sets the unlock flag.
   * @returns {Promise<void>}
   */
  function unlockAdhanAutoplaySilently() {
    if (adhanAutoplayUnlocked) {
      return Promise.resolve();
    }
    adhanAudio.pause();
    adhanAudio.currentTime = 0;
    return whenAdhanCanPlay().then(function () {
      const playPromise = adhanAudio.play();
      if (!playPromise) return;
      return playPromise.then(function () {
        adhanAudio.pause();
        adhanAudio.currentTime = 0;
        adhanAutoplayUnlocked = true;
      });
    });
  }

  /**
   * First tap/click on any interactive control triggers a silent unlock (capture phase).
   */
  function scheduleSilentAutoplayUnlock() {
    if (adhanAutoplayUnlocked || silentAutoplayUnlockInFlight) return;
    silentAutoplayUnlockInFlight = true;
    unlockAdhanAutoplaySilently()
      .catch(function () {
        /* Network or decode failure — next interaction can retry */
      })
      .finally(function () {
        silentAutoplayUnlockInFlight = false;
      });
  }

  document.addEventListener(
    "click",
    function (ev) {
      if (!isInteractiveUnlockTarget(ev.target)) return;
      scheduleSilentAutoplayUnlock();
    },
    true
  );

  function syncPreviewButtonUi() {
    if (!els.btnPreviewAdhan) return;
    const playing = !adhanAudio.paused;
    const icon = els.btnPreviewAdhan.querySelector(".btn-preview-adhan__icon");
    els.btnPreviewAdhan.classList.toggle("btn-preview-adhan--playing", playing);
    els.btnPreviewAdhan.setAttribute("aria-pressed", playing ? "true" : "false");
    if (icon) {
      icon.textContent = playing ? "⏸" : "▶";
    }
    els.btnPreviewAdhan.setAttribute(
      "aria-label",
      playing
        ? "Pause Adhan preview by Mishary Rashid Alafasy"
        : "Play Adhan preview by Mishary Rashid Alafasy"
    );
  }

  /**
   * @returns {Promise<void>}
   */
  function playAdhan() {
    adhanAudio.pause();
    adhanAudio.currentTime = 0;
    const p = adhanAudio.play();
    if (!p) return Promise.resolve();
    return p;
  }

  /**
   * Compares the device clock to the last fetched API prayer times. When the local
   * time matches a listed prayer (same hour and minute), plays the Adhan once for
   * that prayer on that calendar day (if autoplay was unlocked by any prior interaction).
   */
  function checkPrayerAlarms() {
    const now = new Date();
    const dk = localDateKey(now);
    if (dk !== lastCalendarDateKey) {
      firedPrayerKeys.clear();
      lastCalendarDateKey = dk;
    }

    if (!currentTimings) return;

    const hm = nowHmKey();

    for (let i = 0; i < PRAYERS.length; i++) {
      const name = PRAYERS[i];
      const effectiveTimings = timingsWithManualOverrides(currentTimings);
      const raw = timingRawForPrayer(effectiveTimings, name);
      const prayerHm = toHmKey(typeof raw === "string" ? raw : "");
      if (!prayerHm || prayerHm !== hm) continue;

      const key = dk + "|" + name;
      if (firedPrayerKeys.has(key)) continue;

      firedPrayerKeys.add(key);

      if (!isPrayerAlarmEnabled(name)) {
        break;
      }

      playAdhan().catch(function () {
        /* Scheduled play can fail if tab backgrounded or policy changes — ignore. */
      });
      break;
    }
  }

  /**
   * @param {string} prayerName
   * @param {boolean} checked
   * @returns {HTMLLabelElement}
   */
  function createAlarmToggle(prayerName, checked) {
    const label = document.createElement("label");
    label.className = "toggle";
    label.setAttribute("aria-label", "Adhan alarm for " + prayerName);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "toggle__input";
    input.checked = checked;
    input.setAttribute("data-prayer", prayerName);

    const track = document.createElement("span");
    track.className = "toggle__track";
    const thumb = document.createElement("span");
    thumb.className = "toggle__thumb";
    track.appendChild(thumb);

    input.addEventListener("change", function () {
      setPrayerAlarmEnabled(prayerName, input.checked);
    });

    function stopToggleBubble(ev) {
      ev.stopPropagation();
    }
    input.addEventListener("click", stopToggleBubble, true);
    input.addEventListener("pointerdown", stopToggleBubble, true);
    label.addEventListener("click", stopToggleBubble, true);
    label.addEventListener("pointerdown", stopToggleBubble, true);

    label.appendChild(input);
    label.appendChild(track);
    return label;
  }

  function renderResults(data, latitude, longitude) {
    const timings = data.data && data.data.timings;
    if (!timings) {
      throw new Error("Unexpected response from prayer times API.");
    }

    currentTimings = timings;
    hideAudioError();
    firedPrayerKeys.clear();
    lastCalendarDateKey = localDateKey(new Date());

    const dateReadable =
      data.data.date && data.data.date.readable
        ? data.data.date.readable
        : new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

    if (typeof latitude === "number" && typeof longitude === "number") {
      els.locationLine.textContent = formatCoords(latitude, longitude);
    } else if (els.locationLine && !els.locationLine.textContent) {
      els.locationLine.textContent = "Location unavailable - manual time mode";
    }
    els.dateLine.textContent = dateReadable;

    els.prayerList.innerHTML = "";
    const effectiveTimings = timingsWithManualOverrides(timings);
    const nextIdx = nextPrayerIndex(effectiveTimings);

    PRAYERS.forEach(function (name, index) {
      const li = document.createElement("li");
      li.className = "prayer-row" + (index === nextIdx ? " prayer-row--next" : "");

      const nameCol = document.createElement("div");
      nameCol.className = "prayer-row__name";

      const nameSpan = document.createElement("span");
      nameSpan.className = "prayer-name";
      nameSpan.textContent = name;
      if (index === nextIdx) {
        const badge = document.createElement("span");
        badge.className = "badge-next";
        badge.textContent = "Next";
        nameSpan.appendChild(badge);
      }
      nameCol.appendChild(nameSpan);

      const timeCol = document.createElement("div");
      timeCol.className = "prayer-row__time";
      const timeRaw = timingRawForPrayer(effectiveTimings, name);
      const displayHm = cleanTime(typeof timeRaw === "string" ? timeRaw : "");

      /** @type {HTMLElement} */
      let rowHit;

      const hitWrap = document.createElement("div");
      hitWrap.className = "prayer-row__hit prayer-row__hit--split";

      const mainHit = document.createElement("button");
      mainHit.type = "button";
      mainHit.className = "prayer-row__main-hit";
      mainHit.setAttribute("aria-label", "Open " + name + " — Virtual Imam");
      mainHit.appendChild(nameCol);
      mainHit.addEventListener("click", function () {
        showPrayerView(name);
      });

      const timeBtn = document.createElement("button");
      timeBtn.type = "button";
      timeBtn.className = "prayer-time prayer-time--editable";
      timeBtn.setAttribute("data-prayer-time-button", name);
      timeBtn.setAttribute("aria-label", "Set " + name + " alarm time, currently " + displayHm);
      const timeInner = document.createElement("span");
      timeInner.className = "prayer-time__inner";
      timeInner.textContent = displayHm;
      timeBtn.appendChild(timeInner);
      timeCol.appendChild(timeBtn);

      hitWrap.appendChild(mainHit);
      hitWrap.appendChild(timeCol);
      rowHit = hitWrap;

      const toggleWrap = document.createElement("div");
      toggleWrap.className = "prayer-row__toggle";
      toggleWrap.addEventListener("click", function (ev) {
        ev.stopPropagation();
      }, true);
      toggleWrap.addEventListener("pointerdown", function (ev) {
        ev.stopPropagation();
      }, true);
      toggleWrap.appendChild(createAlarmToggle(name, alarmToggleState[name] !== false));

      li.appendChild(rowHit);
      li.appendChild(toggleWrap);
      els.prayerList.appendChild(li);
    });

    if (typeof latitude === "number" && typeof longitude === "number") {
      cachedLatitude = latitude;
      cachedLongitude = longitude;
    }
    timingsFetchedForDateKey = localDateKey(new Date());
    scheduleMidnightTimingsRefresh();

    showState("results");
  }

  function setError(message) {
    if (els.locationLine) {
      els.locationLine.textContent = message || "Location unavailable - manual time mode";
    }
    if (!currentTimings) {
      const fallbackTimings = {
        Fajr: "00:00",
        Dhuhr: "00:00",
        Asr: "00:00",
        Maghrib: "00:00",
        Isha: "00:00",
        Lastthird: "00:00",
      };
      renderResults(
        {
          data: {
            timings: fallbackTimings,
            date: {
              readable: new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            },
          },
        },
        null,
        null
      );
      return;
    }
    showState("results");
  }

  function loadTimes(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    fetchPrayerTimes(lat, lng)
      .then(function (json) {
        if (json.code !== 200) {
          throw new Error(json.status || "Could not load prayer times.");
        }
        renderResults(json, lat, lng);
      })
      .catch(function (err) {
        setError(err && err.message ? err.message : "Failed to load prayer times.");
      });
  }

  function requestLocation() {
    showState("loading");
    function loadFromIpFallback(gpsMessage) {
      fetchIpApproxLocation()
        .then(function (geo) {
          if (els.locationLine) {
            els.locationLine.textContent = "Approximate location: " + geo.label;
          }
          return fetchPrayerTimes(geo.latitude, geo.longitude).then(function (json) {
            if (json.code !== 200) {
              throw new Error(json.status || "Could not load prayer times.");
            }
            renderResults(json, geo.latitude, geo.longitude);
          });
        })
        .catch(function () {
          setError(
            gpsMessage ||
              "Location unavailable. Using editable placeholders - set each prayer time manually."
          );
        });
    }

    if (!navigator.geolocation) {
      loadFromIpFallback("Browser geolocation unavailable. Trying approximate location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (position) {
        loadTimes(position);
      },
      function (err) {
        let msg = "Could not read your location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS permission denied. Falling back to approximate IP location.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS position unavailable. Falling back to approximate IP location.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS request timed out. Falling back to approximate IP location.";
        }
        loadFromIpFallback(msg);
      },
      geolocationOptions()
    );
  }

  function onPreviewAdhanClick() {
    hideAudioError();
    whenAdhanCanPlay()
      .then(function () {
        if (adhanAudio.paused) {
          return adhanAudio.play();
        }
        adhanAudio.pause();
      })
      .catch(function (err) {
        let msg = "Audio failed to load or play.";
        if (err && err.name === "NotAllowedError") {
          msg = "Tap any button or prayer switch once to allow sound, then try again.";
        } else if (err && err.message) {
          msg = err.message;
        }
        showAudioError(msg);
      });
  }

  adhanAudio.addEventListener("play", syncPreviewButtonUi);
  adhanAudio.addEventListener("pause", syncPreviewButtonUi);
  adhanAudio.addEventListener("ended", syncPreviewButtonUi);

  if (els.prayerList) {
    els.prayerList.addEventListener("click", function (ev) {
      const t = ev.target && ev.target.closest
        ? ev.target.closest("[data-prayer-time-button]")
        : null;
      if (!t) return;
      ev.preventDefault();
      ev.stopPropagation();
      const prayerName = t.getAttribute("data-prayer-time-button");
      if (!prayerName) return;
      openPrayerTimePicker(prayerName);
    });
  }

  els.btnRequest.addEventListener("click", requestLocation);
  els.btnRetry.addEventListener("click", requestLocation);
  if (els.btnPreviewAdhan) {
    els.btnPreviewAdhan.addEventListener("click", onPreviewAdhanClick);
  }
  if (els.btnPrayerBack) {
    els.btnPrayerBack.addEventListener("click", showHomeView);
  }
  if (els.btnLearningModeToggle) {
    els.btnLearningModeToggle.addEventListener("click", function () {
      isLearningMode = !isLearningMode;
      syncLearningModeUi();
    });
  }
  if (els.btnStartFajrSalah) {
    els.btnStartFajrSalah.addEventListener("click", function () {
      primeMainPlayerFromUserGesture();
      if (!fajrSalahSequence.isActive()) {
        startSelectedPrayerSequence();
      } else if (fajrSalahSequence.isPaused()) {
        fajrSalahSequence.resume();
      } else {
        fajrSalahSequence.pause();
      }
    });
  }
  if (els.btnFajrPrayerRestart) {
    els.btnFajrPrayerRestart.addEventListener("click", function () {
      if (!fajrSalahSequence.isActive()) startSelectedPrayerSequence();
    });
  }
  if (els.btnFajrPrayerFinish) {
    els.btnFajrPrayerFinish.addEventListener("click", function () {
      showHomeView();
    });
  }

  syncPreviewButtonUi();
  syncFajrTransportUi();
  syncLearningModeUi();

  requestLocation();
  window.setInterval(checkPrayerAlarms, 1000);
  window.setInterval(refreshTimingsIfNewDay, 60 * 1000);
})();
