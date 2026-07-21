/* Tatry 2026 — datová vrstva (poi.json + days.json + source_data.json + config.json)
   Verze dat 1.2 / source_data 1.0. Vše statické, verzovatelné, bez backendu. */

window.APP_DATA = {

meta: {
  version: "1.2",
  trip: { start: "2026-07-25", end: "2026-08-01", base: "Hotel Zawrat*** Ski Resort & SPA, Białka Tatrzańska" }
},

/* §8 — prahy rozhodovacího enginu, konfigurovatelné */
config: {
  window: { from: 11, to: 18 },          // hodnocené časové okno (h)
  thresholds: {
    thunder_pct:  { green: 20, red: 40 },
    precip_mmh:   { green: 1,  red: 4  },
    gust_kmh:     { green: 45, red: 65 },
    cloud_pct:    { green: 40, red: 75 },
    temp_c:       { green: [8, 26], red: [3, 30] }
  },
  strict_factor: 0.6,                    // hard_strict → přísnější prahy
  cache_ttl_min: 180,
  max_cache_age_warn_min: 720
},

/* §5.1 — POI mimo databázi tratí/aktivit (základna, doprava, jídlo) */
poi: [
  { id:"base_zawrat", name:"Hotel Zawrat *** Ski Resort & SPA", category:"base",
    lat:49.3872, lng:20.1050, elevation_m:680, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Základna. Půjčovna e-kol Specialized, SPA, wellness." },
  { id:"p_palenica", name:"Parking TPN Palenica Białczańska", category:"transport",
    lat:49.2558, lng:20.1031, elevation_m:980, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Plní se cca do 7:00. Alternativa: bus z Zakopaného." },
  { id:"p_kuznice", name:"Kuźnice — lanovka Kasprowy Wierch", category:"transport",
    lat:49.2669, lng:19.9825, elevation_m:1010, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Jízdenky na časové sloty, rezervovat online předem." },
  { id:"p_kiry", name:"Parking Kiry (Dolina Kościeliska)", category:"transport",
    lat:49.2782, lng:19.8759, elevation_m:930, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Vstup do Doliny Kościeliskiej." },
  { id:"f_litworowy", name:"Karczma Litworowy Staw", category:"food",
    lat:49.3910, lng:20.1090, elevation_m:690, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Góralská kuchyně, blízko hotelu." },
  { id:"f_zwyk", name:"Góralski Zwyk (Bukowina Tatrzańska)", category:"food",
    lat:49.3520, lng:20.1330, elevation_m:880, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Živá góralská hudba, doporučená rezervace." },
  { id:"f_morskie", name:"Schronisko PTTK Morskie Oko", category:"food",
    lat:49.2010, lng:20.0700, elevation_m:1410, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Legendární šarlotka na trase t2_05." },
  { id:"f_murowaniec", name:"Schronisko Murowaniec (Hala Gąsienicowa)", category:"food",
    lat:49.2400, lng:20.0060, elevation_m:1500, difficulty:"none", weather_sensitive:false,
    country:"PL", note:"Zastávka na trasách t2_02 / t2_06." }
],

/* §5.4 — seed dataset denního programu */
days: [
  {day_index:1, date:"2026-07-25", weekday:"sobota", type:"RELAX", title:"Příjezd + wellness",
   poi_ids:["base_zawrat","r_01"], weather_gate:"none",
   logistics:"Příjezd odpoledne, ubytování, lehká večeře v hotelu. Zamluvit masáž na Den 4 a e-kola na Den 6."},
  {day_index:2, date:"2026-07-26", weekday:"neděle", type:"ACTIVE", title:"Rusinowa Polana / Gęsia Szyja",
   poi_ids:["t2_01","p_palenica","r_19"], swappable_with:[6], weather_gate:"hard",
   logistics:"Vyrazit 6:30 — parking Palenica se plní do 7:00. S sebou 2 l vody, pláštěnky, hotovost na oscypek."},
  {day_index:3, date:"2026-07-27", weekday:"pondělí", type:"ACTIVE", title:"Voda: Dunajec + Czorsztyńskie",
   poi_ids:["r_11","r_14","r_10"], swappable_with:[6], weather_gate:"soft",
   logistics:"Splav 9:30 z Kąty (bez fronty), po obědě hrad Niedzica, k večeru SUP na klidné hladině."},
  {day_index:4, date:"2026-07-28", weekday:"úterý", type:"RELAX", title:"SPA + Terma Bania",
   poi_ids:["r_01","r_05","r_04"], weather_gate:"none",
   logistics:"Terma 9:00 nebo po 19:00 — mimo špičku. Mezi tím masáž v hotelu."},
  {day_index:5, date:"2026-07-29", weekday:"středa", type:"ACTIVE", title:"Kasprowy Wierch – Dolina Gąsienicowa",
   poi_ids:["t2_02","p_kuznice","f_murowaniec"], swappable_with:[3], weather_gate:"hard",
   logistics:"Lanovka rezervovat online na 7:30–8:30. Nahoře o 10–12 °C méně než v údolí — vzít vrstvu navíc."},
  {day_index:6, date:"2026-07-30", weekday:"čtvrtek", type:"ACTIVE", title:"E-bike Głodówka / Jurgów",
   poi_ids:["r_13","r_18"], swappable_with:[3], weather_gate:"soft",
   logistics:"E-kola z hotelu, start 9:00. Baterie na 100 %, helmy, svačina. Panorama Tater z Głodówky."},
  {day_index:7, date:"2026-07-31", weekday:"pátek", type:"RELAX", title:"Finální wellness + rozlučka",
   poi_ids:["r_05","r_02","r_20"], weather_gate:"none",
   logistics:"Dopoledne sauna, večer karczma s živou muzikou — rezervovat na 19:00."},
  {day_index:8, date:"2026-08-01", weekday:"sobota", type:"RELAX", title:"Odjezd",
   poi_ids:["base_zawrat","r_18"], weather_gate:"none",
   logistics:"Check-out do 11:00. Cestou nákup oscypků a domácích produktů."}
],

/* §14 — source_data.json */
source_data: {
  difficulty_classification: [
    {code:"T1", label:"Lehká (rodinná)", elevation_gain_m:"< 350", typical_distance_km:"4–12", typical_duration_h:"1.5–3.5", terrain:"zpevněné a údolní cesty, polany; bez expozice", chains:false, weather_gate:"soft", suitable_for:"každý, i s dětmi"},
    {code:"T2", label:"Střední", elevation_gain_m:"350–800", typical_distance_km:"6–16", typical_duration_h:"3–5", terrain:"horské chodníky, schody, kořeny, krátké strmé úseky", chains:false, weather_gate:"hard", suitable_for:"běžná kondice"},
    {code:"T3", label:"Náročná", elevation_gain_m:"800–1300", typical_distance_km:"12–24", typical_duration_h:"5–8", terrain:"vysokohorský kamenitý terén, dlouhé výstupy, místy řetězy a expozice", chains:true, weather_gate:"hard", suitable_for:"dobrá kondice, jistý krok"},
    {code:"T4", label:"Vysokohorská / expertní", elevation_gain_m:"> 1200 nebo silná expozice", typical_distance_km:"14–26", typical_duration_h:"7–11", terrain:"exponované hřebeny, řetězy, drápkování; nutná zkušenost a výbava", chains:true, weather_gate:"hard_strict", suitable_for:"zkušení turisté, jen za jistého počasí"}
  ],

  trails: [
    {id:"t1_01", name:"Dolina Kościeliska → Schronisko Ornak", area:"Tatry", difficulty:"T1", trailhead:"Kiry", trailhead_lat:49.2782, trailhead_lng:19.8759, trailhead_elev:930, distance_km:11, duration_min:180, elevation_gain_m:250, chains:false, weather_gate:"soft", country:"PL", highlights:"nejkrásnější polské údolí, jeskyně, Smreczyński Staw poblíž"},
    {id:"t1_02", name:"Dolina Strążyska → wodospad Siklawica", area:"Tatry", difficulty:"T1", trailhead:"Zakopane-Strążyska", trailhead_lat:49.2769, trailhead_lng:19.9436, trailhead_elev:900, distance_km:5, duration_min:120, elevation_gain_m:200, chains:false, weather_gate:"soft", country:"PL", highlights:"vodopád pod Giewontem, snadné a stinné"},
    {id:"t1_03", name:"Dolina Białego (pętla)", area:"Tatry", difficulty:"T1", trailhead:"Zakopane-Biały Potok", trailhead_lat:49.2803, trailhead_lng:19.9540, trailhead_elev:900, distance_km:6, duration_min:150, elevation_gain_m:250, chains:false, weather_gate:"soft", country:"PL", highlights:"potok, lávky, okruh blízko centra"},
    {id:"t1_04", name:"Dolina za Bramką", area:"Tatry", difficulty:"T1", trailhead:"Zakopane-Za Bramką", trailhead_lat:49.2760, trailhead_lng:19.9330, trailhead_elev:900, distance_km:4, duration_min:90, elevation_gain_m:150, chains:false, weather_gate:"soft", country:"PL", highlights:"krátká zalesněná roklina, klid"},
    {id:"t1_05", name:"Dolina Lejowa", area:"Tatry", difficulty:"T1", trailhead:"Kiry", trailhead_lat:49.2782, trailhead_lng:19.8759, trailhead_elev:930, distance_km:8, duration_min:150, elevation_gain_m:150, chains:false, weather_gate:"soft", country:"PL", highlights:"tiché údolí, minimum lidí, ideál pro e-kolo"},
    {id:"t1_06", name:"Toporowy Staw Niżni (od Jaszczurówki)", area:"Tatry", difficulty:"T1", trailhead:"Jaszczurówka", trailhead_lat:49.2846, trailhead_lng:20.0140, trailhead_elev:940, distance_km:7, duration_min:150, elevation_gain_m:150, chains:false, weather_gate:"soft", country:"PL", highlights:"lesní plesa, ticho"},
    {id:"t1_07", name:"Smreczyński Staw (z Doliny Kościeliskiej)", area:"Tatry", difficulty:"T1", trailhead:"Kiry", trailhead_lat:49.2782, trailhead_lng:19.8759, trailhead_elev:930, distance_km:13, duration_min:210, elevation_gain_m:260, chains:false, weather_gate:"soft", country:"PL", highlights:"klidné pleso, delší ale rovinaté údolí"},
    {id:"t1_08", name:"Wąwóz Homole", area:"Pieniny", difficulty:"T1", trailhead:"Jaworki", trailhead_lat:49.4103, trailhead_lng:20.5560, trailhead_elev:560, distance_km:4, duration_min:120, elevation_gain_m:200, chains:false, weather_gate:"soft", country:"PL", highlights:"efektní skalní roklina, jeden z nejhezčích snadných výletů"},
    {id:"t1_09", name:"Ruiny zamku Czorsztyn + promenada nad jezerem", area:"Pieniny", difficulty:"T1", trailhead:"Czorsztyn", trailhead_lat:49.4380, trailhead_lng:20.3060, trailhead_elev:540, distance_km:3, duration_min:90, elevation_gain_m:100, chains:false, weather_gate:"soft", country:"PL", highlights:"hradní ruina, výhled na jezero a Niedzicu"},
    {id:"t1_10", name:"Droga Pienińska – promenada Szczawnica ↔ Przełom", area:"Pieniny", difficulty:"T1", trailhead:"Szczawnica", trailhead_lat:49.4300, trailhead_lng:20.4880, trailhead_elev:470, distance_km:8, duration_min:150, elevation_gain_m:100, chains:false, weather_gate:"soft", country:"PL", highlights:"rovinatá cesta podél Dunajce, lze i na kole"},

    {id:"t2_01", name:"Rusinowa Polana → Gęsia Szyja", area:"Tatry", difficulty:"T2", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, distance_km:12, duration_min:240, elevation_gain_m:520, chains:false, weather_gate:"hard", country:"PL", highlights:"panorama Vysokých Tater, méně davů než Morskie Oko"},
    {id:"t2_02", name:"Kasprowy Wierch → Dolina Gąsienicowa → Czarny Staw → Kuźnice", area:"Tatry", difficulty:"T2", trailhead:"Kuźnice (lanovka)", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_lat:49.2314, summit_lng:19.9817, summit_elev:1987, distance_km:10, duration_min:240, elevation_gain_m:300, chains:false, weather_gate:"hard", country:"PL", highlights:"vysokohorský výhled s pomocí lanovky, převážně sestup"},
    {id:"t2_03", name:"Sarnia Skała (z Doliny Białego)", area:"Tatry", difficulty:"T2", trailhead:"Zakopane-Biały Potok", trailhead_lat:49.2803, trailhead_lng:19.9540, trailhead_elev:900, distance_km:9, duration_min:210, elevation_gain_m:500, chains:false, weather_gate:"hard", country:"PL", highlights:"výhledová skála nad Zakopaným"},
    {id:"t2_04", name:"Nosal", area:"Tatry", difficulty:"T2", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, distance_km:4, duration_min:150, elevation_gain_m:350, chains:false, weather_gate:"hard", country:"PL", highlights:"krátký strmý výstup, velký výhled za málo km"},
    {id:"t2_05", name:"Morskie Oko (z Palenicy)", area:"Tatry", difficulty:"T2", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, summit_lat:49.2010, summit_lng:20.0700, summit_elev:1410, distance_km:18, duration_min:300, elevation_gain_m:500, chains:false, weather_gate:"hard", country:"PL", highlights:"nejslavnější ples; dlouhá, ale po asfaltce – jen výrazně dřív kvůli davům"},
    {id:"t2_06", name:"Hala Gąsienicowa – Murowaniec (z Kuźnic pěšky)", area:"Tatry", difficulty:"T2", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:1500, distance_km:11, duration_min:240, elevation_gain_m:600, chains:false, weather_gate:"hard", country:"PL", highlights:"klasika k útulně Murowaniec bez lanovky"},
    {id:"t2_07", name:"Wielki Kopieniec", area:"Tatry", difficulty:"T2", trailhead:"Toporowa Cyrhla", trailhead_lat:49.2860, trailhead_lng:20.0170, trailhead_elev:1000, distance_km:8, duration_min:210, elevation_gain_m:400, chains:false, weather_gate:"hard", country:"PL", highlights:"travnatý vrchol, kruhový výhled na Tatry"},
    {id:"t2_08", name:"Hala Kondratowa + Kalatówki", area:"Tatry", difficulty:"T2", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, distance_km:9, duration_min:210, elevation_gain_m:450, chains:false, weather_gate:"hard", country:"PL", highlights:"louky pod Giewontem, útulna Kondratowa"},
    {id:"t2_09", name:"Trzy Korony (Okrąglica)", area:"Pieniny", difficulty:"T2", trailhead:"Sromowce Niżne / Krościenko", trailhead_lat:49.3986, trailhead_lng:20.4139, trailhead_elev:450, summit_elev:982, distance_km:10, duration_min:240, elevation_gain_m:500, chains:true, weather_gate:"hard", country:"PL", highlights:"ikonický vrchol s vyhlídkovou plošinou nad Przełomem (rezervace vstupu)"},
    {id:"t2_10", name:"Sokolica (widok na Przełom Dunajca)", area:"Pieniny", difficulty:"T2", trailhead:"Krościenko", trailhead_lat:49.4380, trailhead_lng:20.4230, trailhead_elev:430, summit_elev:747, distance_km:9, duration_min:210, elevation_gain_m:400, chains:false, weather_gate:"hard", country:"PL", highlights:"nejfotografovanější zákrut Dunajce, borovice na skále"},

    {id:"t3_01", name:"Dolina Pięciu Stawów Polskich + wodospad Siklawa", area:"Tatry", difficulty:"T3", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, summit_elev:1700, distance_km:23, duration_min:450, elevation_gain_m:900, chains:false, weather_gate:"hard", country:"PL", highlights:"údolí pěti ples + největší polský vodopád; jedna z nejkrásnějších túr"},
    {id:"t3_02", name:"Giewont (z Kuźnic přes Halę Kondratową)", area:"Tatry", difficulty:"T3", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:1895, distance_km:13, duration_min:360, elevation_gain_m:900, chains:true, weather_gate:"hard", country:"PL", highlights:"symbol Zakopaného, řetězy u vrcholu; za bouřky NEchodit (kříž = blesky)"},
    {id:"t3_03", name:"Szpiglasowy Wierch (z Morskiego Oka)", area:"Tatry", difficulty:"T3", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, summit_elev:2172, distance_km:20, duration_min:420, elevation_gain_m:900, chains:true, weather_gate:"hard", country:"PL", highlights:"výhled na Morskie Oko i Pięć Stawów najednou"},
    {id:"t3_04", name:"Kościelec (z Hali Gąsienicowej)", area:"Tatry", difficulty:"T3", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2155, distance_km:12, duration_min:360, elevation_gain_m:700, chains:true, weather_gate:"hard", country:"PL", highlights:"efektní pyramida nad Czarnym Stawem, expozice u vrcholu"},
    {id:"t3_05", name:"Małołączniak (Czerwone Wierchy)", area:"Tatry", difficulty:"T3", trailhead:"Dolina Małej Łąki", trailhead_lat:49.2731, trailhead_lng:19.8940, trailhead_elev:950, summit_elev:2096, distance_km:14, duration_min:420, elevation_gain_m:1100, chains:false, weather_gate:"hard", country:"PL", highlights:"travnaté hřebeny Czerwonych Wierchów, daleké výhledy"},
    {id:"t3_06", name:"Wołowiec (z Doliny Chochołowskiej)", area:"Tatry", difficulty:"T3", trailhead:"Siwa Polana", trailhead_lat:49.2589, trailhead_lng:19.7906, trailhead_elev:930, summit_elev:2064, distance_km:20, duration_min:420, elevation_gain_m:1000, chains:false, weather_gate:"hard", country:"PL", highlights:"hraniční vrchol Západních Tater"},
    {id:"t3_07", name:"Skrajny Granat (z Hali Gąsienicowej)", area:"Tatry", difficulty:"T3", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2225, distance_km:14, duration_min:420, elevation_gain_m:900, chains:true, weather_gate:"hard", country:"PL", highlights:"nejsnáze dostupný vrchol Orlej Perci, řetězy"},
    {id:"t3_08", name:"Ciemniak / Krzesanica (z Doliny Kościeliskiej)", area:"Tatry", difficulty:"T3", trailhead:"Kiry", trailhead_lat:49.2782, trailhead_lng:19.8759, trailhead_elev:930, summit_elev:2122, distance_km:18, duration_min:450, elevation_gain_m:1100, chains:false, weather_gate:"hard", country:"PL", highlights:"vápencové hřebeny, jeskyně Smocza Jama poblíž"},
    {id:"t3_09", name:"Starorobociański Wierch (z Chochołowskiej)", area:"Tatry", difficulty:"T3", trailhead:"Siwa Polana", trailhead_lat:49.2589, trailhead_lng:19.7906, trailhead_elev:930, summit_elev:2176, distance_km:24, duration_min:480, elevation_gain_m:1150, chains:false, weather_gate:"hard", country:"PL", highlights:"nejvyšší vrchol polských Západních Tater"},
    {id:"t3_10", name:"Szpiglasowa Przełęcz + Wrota Chałubińskiego (pętla)", area:"Tatry", difficulty:"T3", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, summit_elev:2110, distance_km:22, duration_min:480, elevation_gain_m:900, chains:true, weather_gate:"hard", country:"PL", highlights:"průchod mezi kotly, řetězy, velký okruh"},

    {id:"t4_01", name:"Rysy (2499 m, z Morskiego Oka)", area:"Tatry", difficulty:"T4", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, summit_elev:2499, distance_km:24, duration_min:570, elevation_gain_m:1200, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"nejvyšší dostupný bod Polska, řetězy, celodenní; jen za jistého počasí"},
    {id:"t4_02", name:"Orla Perć: Zawrat → Kozi Wierch", area:"Tatry", difficulty:"T4", trailhead:"Kuźnice / Dolina Gąsienicowa", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2291, distance_km:16, duration_min:540, elevation_gain_m:1000, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"nejexponovanější značená cesta v Polsku; jednosměrná, jen zkušení"},
    {id:"t4_03", name:"Orla Perć: Kozi Wierch → Krzyżne", area:"Tatry", difficulty:"T4", trailhead:"Dolina Pięciu Stawów", trailhead_lat:49.2200, trailhead_lng:20.0450, trailhead_elev:1670, summit_elev:2291, distance_km:18, duration_min:540, elevation_gain_m:1000, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"druhá polovina hřebene, dlouhé řetězové úseky"},
    {id:"t4_04", name:"Świnica granią z Kasprowego Wierchu", area:"Tatry", difficulty:"T4", trailhead:"Kuźnice (lanovka)", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2301, distance_km:12, duration_min:420, elevation_gain_m:600, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"exponovaný hřeben přes Liliowe, řetězy"},
    {id:"t4_05", name:"Zawrat (z Doliny Gąsienicowej)", area:"Tatry", difficulty:"T4", trailhead:"Kuźnice", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2159, distance_km:14, duration_min:450, elevation_gain_m:900, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"slavné sedlo, strmý řetězový výstup"},
    {id:"t4_06", name:"Granaty (Skrajny–Pośredni–Zadni)", area:"Tatry", difficulty:"T4", trailhead:"Kuźnice / Dolina Gąsienicowa", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2240, distance_km:16, duration_min:480, elevation_gain_m:950, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"tři vrcholy Orlej Perci v řadě"},
    {id:"t4_07", name:"Kozia Przełęcz + Kozie Czuby (Orla Perć)", area:"Tatry", difficulty:"T4", trailhead:"Dolina Pięciu Stawów", trailhead_lat:49.2200, trailhead_lng:20.0450, trailhead_elev:1670, summit_elev:2263, distance_km:17, duration_min:510, elevation_gain_m:1000, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"nejtěžší partie hřebene, drápkování"},
    {id:"t4_08", name:"Buczynowe Turnie (Orla Perć wschodnia)", area:"Tatry", difficulty:"T4", trailhead:"Dolina Pięciu Stawów", trailhead_lat:49.2200, trailhead_lng:20.0450, trailhead_elev:1670, summit_elev:2184, distance_km:19, duration_min:540, elevation_gain_m:1000, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"klidnější, ale technicky náročný konec Orlej Perci"},
    {id:"t4_09", name:"Przełęcz pod Chłopkiem (z Morskiego Oka)", area:"Tatry", difficulty:"T4", trailhead:"Palenica Białczańska", trailhead_lat:49.2558, trailhead_lng:20.1031, trailhead_elev:980, summit_elev:2307, distance_km:22, duration_min:540, elevation_gain_m:1150, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"strmý řetězový výstup nad Czarny Staw pod Mięguszowieckie"},
    {id:"t4_10", name:"Grań Czerwonych Wierchów: Kasprowy → Małołączniak → Giewont", area:"Tatry", difficulty:"T4", trailhead:"Kuźnice (lanovka)", trailhead_lat:49.2669, trailhead_lng:19.9825, trailhead_elev:1010, summit_elev:2122, distance_km:20, duration_min:600, elevation_gain_m:1000, chains:true, weather_gate:"hard_strict", country:"PL", highlights:"dlouhý celodenní přechod hřebene s finálním Giewontem"}
  ],

  relax_activities: [
    {id:"r_01", name:"Hotelové SPA Zawrat – bazén s masážními tryskami", category:"wellness", location:"Hotel Zawrat", country:"PL", lat:49.3872, lng:20.1050, elevation_m:680, duration_min:90, indoor:true, weather_dependent:false, note:"ideální relax po túře"},
    {id:"r_02", name:"Hotelové SPA Zawrat – saunový svět", category:"wellness", location:"Hotel Zawrat", country:"PL", lat:49.3872, lng:20.1050, elevation_m:680, duration_min:90, indoor:true, weather_dependent:false, note:"suchá i parní sauna"},
    {id:"r_03", name:"Hotelové SPA Zawrat – vířivka", category:"wellness", location:"Hotel Zawrat", country:"PL", lat:49.3872, lng:20.1050, elevation_m:680, duration_min:45, indoor:true, weather_dependent:false, note:"krátká regenerace"},
    {id:"r_04", name:"Masáž pro dva (hotel)", category:"wellness", location:"Hotel Zawrat", country:"PL", lat:49.3872, lng:20.1050, elevation_m:680, duration_min:60, indoor:true, weather_dependent:false, note:"rezervovat předem"},
    {id:"r_05", name:"Terma Bania – termální bazény, strefa relaksu", category:"thermal", location:"Białka Tatrzańska", country:"PL", lat:49.3930, lng:20.1090, elevation_m:670, duration_min:180, indoor:false, weather_dependent:false, opening_hours:"9:00–22:00", note:"venkovní bazény s výhledem na Tatry; jít 9:00 nebo po 19:00"},
    {id:"r_06", name:"Terma Bania – saunarium (Ruska Bania, góralská sauna)", category:"thermal", location:"Białka Tatrzańska", country:"PL", lat:49.3930, lng:20.1090, elevation_m:670, duration_min:120, indoor:true, weather_dependent:false, note:"komornější než rodinná zóna"},
    {id:"r_07", name:"Terma Chochołowska – termály", category:"thermal", location:"Chochołów", country:"PL", lat:49.3620, lng:19.7810, elevation_m:660, duration_min:180, indoor:false, weather_dependent:false, note:"větší komplex, alternativa k Bani"},
    {id:"r_08", name:"Termy Gorący Potok (Szaflary)", category:"thermal", location:"Szaflary", country:"PL", lat:49.4270, lng:20.0180, elevation_m:600, duration_min:180, indoor:false, weather_dependent:false, note:"geotermální bazény, alternativa"},
    {id:"r_09", name:"Bukowiańskie Termy", category:"thermal", location:"Bukowina Tatrzańska", country:"PL", lat:49.3610, lng:20.1080, elevation_m:850, duration_min:150, indoor:false, weather_dependent:false, note:"nejblíž hotelu"},
    {id:"r_10", name:"SUP / paddleboard na Jeziorze Czorsztyńskim", category:"water", location:"Jezioro Czorsztyńskie", country:"PL", lat:49.4400, lng:20.3200, elevation_m:530, duration_min:120, indoor:false, weather_dependent:true, note:"klidná hladina, nejlépe pozdní odpoledne"},
    {id:"r_11", name:"Splav Dunajce na pltích", category:"water", location:"Sromowce Wyżne-Kąty", country:"PL", lat:49.4085, lng:20.3440, elevation_m:460, duration_min:150, indoor:false, weather_dependent:true, note:"pasivní zážitek s flisaky; ~99–140 zł/os."},
    {id:"r_12", name:"Rejs statkiem po Jeziorze Czorsztyńskim", category:"water", location:"Niedzica / Czorsztyn", country:"PL", lat:49.4290, lng:20.3080, elevation_m:530, duration_min:60, indoor:false, weather_dependent:true, note:"vyhlídková plavba"},
    {id:"r_13", name:"Vyjížďka na e-kole – vyhlídka Głodówka", category:"scenic", location:"Głodówka", country:"PL", lat:49.3050, lng:20.1180, elevation_m:1000, duration_min:150, indoor:false, weather_dependent:true, note:"Specialized Levo z hotelu; panorama Tater"},
    {id:"r_14", name:"Prohlídka hradu Dunajec v Niedzici", category:"culture", location:"Niedzica", country:"PL", lat:49.4185, lng:20.3120, elevation_m:530, duration_min:90, indoor:true, weather_dependent:false, note:"hrad nad jezerem, i za deště"},
    {id:"r_15", name:"Procházka po Krupówkách + kavárna (Zakopane)", category:"culture", location:"Zakopane", country:"PL", lat:49.2960, lng:19.9500, elevation_m:840, duration_min:120, indoor:false, weather_dependent:false, note:"hlavní třída, obchody, kavárny"},
    {id:"r_16", name:"Muzeum Tatrzańskie / Willa Koliba", category:"culture", location:"Zakopane", country:"PL", lat:49.2980, lng:19.9560, elevation_m:840, duration_min:90, indoor:true, weather_dependent:false, note:"program na deštivý den"},
    {id:"r_17", name:"Piknik na polaně (Rusinowa / Głodówka)", category:"scenic", location:"Tatry PL", country:"PL", lat:49.2610, lng:20.0930, elevation_m:1180, duration_min:120, indoor:false, weather_dependent:true, note:"oštěpek a žinčica u bacy"},
    {id:"r_18", name:"Degustace regionálních sýrů u bacy (oscypek/oštěpek)", category:"culinary", location:"Podhale", country:"PL", lat:49.3800, lng:20.1200, elevation_m:700, duration_min:45, indoor:false, weather_dependent:false, note:"grilovaný oscypek s brusinkami"},
    {id:"r_19", name:"Kaple Wiktorówki – klidné poutní místo", category:"scenic", location:"Rusinowa Polana", country:"PL", lat:49.2620, lng:20.0870, elevation_m:1150, duration_min:60, indoor:false, weather_dependent:false, note:"spojitelné s lehkou procházkou"},
    {id:"r_20", name:"Večer v karczmě s živou góralskou hudbou", category:"culinary", location:"Białka / Bukowina", country:"PL", lat:49.3910, lng:20.1090, elevation_m:690, duration_min:150, indoor:true, weather_dependent:false, note:"Litworowy Staw / Góralski Zwyk / WIDOK"}
  ]
}
};
