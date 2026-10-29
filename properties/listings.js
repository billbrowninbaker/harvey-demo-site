/* Sample listings for the Properties demo.
   EVERY listing here is made up: names, sizes, rents, terms and pin spots are
   placeholders to show how the page works. Replace them with real listings
   (or let the admin panel do it) before this goes live.

   Photo "src" values:
     "../img/xxx.jpg"  a photo from the main demo site (AI-generated sample)
     "ph:<kind>"       a drawn placeholder made by RCD_PH below (no file needed)
     "data:image/..."  a photo uploaded through the admin panel                */

window.RCD_SAMPLE_LISTINGS = [
  {
    id: "sample-office-a",
    name: "Sample Office Suite A",
    type: "Office",
    suite: "Suite A",
    area: "Downtown Baker City",
    status: "available", availableDate: "",
    sqft: 1200, rent: 1100,
    leaseType: "Modified gross", camPsf: 0, camNote: "Common area costs are included in the rent",
    deposit: "One month's rent", minTerm: "2 years",
    utilities: "Water, sewer and garbage included; tenant pays electric and internet",
    description: "A bright ground-floor office suite a short walk from downtown shops and restaurants. A reception area opens to three private offices and a small break room. A good fit for a professional office, insurance agent, or small nonprofit.",
    highlights: ["Reception area plus 3 private offices", "Break room with sink", "Ground floor, step-free entry", "Own thermostat"],
    zoning: "Commercial (sample; verify with the city)",
    parking: "6 shared spaces plus street parking",
    ada: "Yes: step-free entry and an accessible restroom",
    restrooms: "1 private, accessible",
    hvac: "Gas forced-air heat, central A/C",
    power: "Single-phase, 200 A",
    internet: "Fiber available to the building (sample)",
    ceiling: "9 ft",
    loading: "",
    signage: "Suite door sign and a spot on the building directory",
    i84: "About 1 mile to I-84",
    nearby: "Downtown shops, restaurants, banks and government offices",
    beds: "", baths: "", pets: "", appliances: "", laundry: "",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "../img/work1.jpg", caption: "Building exterior", sample: true },
      { src: "ph:office", caption: "Reception area", sample: true },
      { src: "ph:interior", caption: "Private office", sample: true }
    ],
    lat: 44.7771, lng: -117.8329
  },
  {
    id: "sample-office-b",
    name: "Sample Office Suite B",
    type: "Office",
    suite: "Suite B",
    area: "Central Baker City",
    status: "coming", availableDate: "2026-12-01",
    sqft: 2400, rent: 2100,
    leaseType: "NNN", camPsf: 0.15, camNote: "Covers taxes, insurance, snow removal and grounds",
    deposit: "One month's rent plus first month", minTerm: "3 years",
    utilities: "Tenant pays all utilities",
    description: "A larger second-floor suite with an open work area, four private offices and a conference room. The current tenant moves out at the end of November, and the suite can be refreshed (paint and carpet) before move-in.",
    highlights: ["Open work area plus 4 offices", "Conference room for 10", "Elevator access", "Tenant improvements negotiable"],
    zoning: "Commercial (sample; verify with the city)",
    parking: "10 shared spaces in the lot",
    ada: "Yes: elevator and accessible restrooms on each floor",
    restrooms: "2 shared on the floor, accessible",
    hvac: "Rooftop heat pump units, zoned",
    power: "Single-phase, 200 A",
    internet: "Fiber and cable both available (sample)",
    ceiling: "9 ft (drop ceiling)",
    loading: "",
    signage: "Monument sign panel and suite door sign",
    i84: "About 1.5 miles to I-84",
    nearby: "Grocery, restaurants, post office, medical offices",
    beds: "", baths: "", pets: "", appliances: "", laundry: "",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "ph:office", caption: "Open work area", sample: true },
      { src: "ph:interior", caption: "Conference room", sample: true },
      { src: "../img/work1.jpg", caption: "Building exterior", sample: true }
    ],
    lat: 44.7798, lng: -117.8290
  },
  {
    id: "sample-office-c",
    name: "Sample Office Suite C",
    type: "Office",
    suite: "Suite C",
    area: "Central Baker City",
    status: "leased", availableDate: "",
    sqft: 850, rent: 800,
    leaseType: "Gross", camPsf: 0, camNote: "",
    deposit: "One month's rent", minTerm: "1 year",
    utilities: "All utilities included except internet",
    description: "A compact two-office suite with its own entrance. Currently leased. Ask to be told when it, or a suite like it, opens up.",
    highlights: ["2 private offices", "Private entrance", "All utilities included"],
    zoning: "Commercial (sample; verify with the city)",
    parking: "3 shared spaces",
    ada: "Yes: step-free entry",
    restrooms: "1 private",
    hvac: "Ductless heat pump",
    power: "Single-phase, 100 A",
    internet: "Cable available (sample)",
    ceiling: "8 ft",
    loading: "",
    signage: "Door sign",
    i84: "About 1.5 miles to I-84",
    nearby: "Restaurants, banks, a pharmacy",
    beds: "", baths: "", pets: "", appliances: "", laundry: "",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "ph:interior", caption: "Front office", sample: true },
      { src: "../img/work1.jpg", caption: "Building exterior", sample: true }
    ],
    lat: 44.7786, lng: -117.8268
  },
  {
    id: "sample-retail",
    name: "Sample Retail Storefront",
    type: "Retail",
    suite: "Ground-floor storefront",
    area: "Historic downtown Baker City",
    status: "available", availableDate: "",
    sqft: 1800, rent: 1650,
    leaseType: "NNN", camPsf: 0.12, camNote: "Covers taxes, insurance and shared maintenance",
    deposit: "Two months' rent", minTerm: "3 years",
    utilities: "Tenant pays all utilities",
    description: "A street-level storefront with big display windows on a walkable downtown block. An open sales floor with a back stockroom and a rear door for deliveries. Suits a shop, gallery, cafe (with buildout) or showroom.",
    highlights: ["Large display windows", "Open sales floor plus back stockroom", "Rear delivery door", "High ceilings"],
    zoning: "Central commercial (sample; verify with the city)",
    parking: "Street parking and a public lot nearby",
    ada: "Yes: level entry from the sidewalk",
    restrooms: "1 accessible",
    hvac: "Gas forced-air heat, evaporative cooling",
    power: "Single-phase, 200 A",
    internet: "Fiber available (sample)",
    ceiling: "14 ft",
    loading: "Rear door for deliveries; no dock",
    signage: "Window lettering and a blade sign (city sign rules apply)",
    i84: "About 1 mile to I-84",
    nearby: "Restaurants, galleries, coffee shops, the downtown historic district",
    beds: "", baths: "", pets: "", appliances: "", laundry: "",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "ph:storefront", caption: "Storefront", sample: true },
      { src: "ph:interior", caption: "Sales floor", sample: true }
    ],
    lat: 44.7757, lng: -117.8343
  },
  {
    id: "sample-flex",
    name: "Sample Warehouse / Flex Space",
    type: "Warehouse/Industrial",
    suite: "Bay 2",
    area: "Near I-84 exit 304",
    status: "coming", availableDate: "2027-01-15",
    sqft: 4800, rent: 3200,
    leaseType: "NNN", camPsf: 0.08, camNote: "Covers taxes, insurance, lot plowing",
    deposit: "One month's rent", minTerm: "3 years",
    utilities: "Tenant pays all utilities",
    description: "A clear-span warehouse bay with a small front office, a short drive from the freeway. Two roll-up doors and a dock-height door make it a fit for distribution, contractor storage, light manufacturing or a service shop.",
    highlights: ["18 ft clear height", "2 roll-up doors plus 1 dock-height door", "3-phase power", "Front office and restroom", "Fenced yard"],
    zoning: "Light industrial (sample; verify with the city)",
    parking: "8 spaces plus truck turnaround",
    ada: "Office area: yes. Warehouse floor: ask",
    restrooms: "1 in the office",
    hvac: "Office: heat pump. Warehouse: gas unit heaters",
    power: "3-phase, 400 A",
    internet: "Cable available; fiber nearby (sample)",
    ceiling: "18 ft clear",
    loading: "Two 12 x 14 ft roll-up doors and one dock-height door",
    signage: "Building sign above the office door",
    i84: "Under half a mile to I-84 exit 304",
    nearby: "Truck stops, fuel, equipment rental, hotels",
    beds: "", baths: "", pets: "", appliances: "", laundry: "",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "ph:warehouse", caption: "Building and roll-up doors", sample: true },
      { src: "ph:warehouse-int", caption: "Warehouse floor", sample: true }
    ],
    lat: 44.7858, lng: -117.8178
  },
  {
    id: "sample-pro-building",
    name: "Sample Professional Building",
    type: "Office",
    suite: "Whole building",
    area: "West Baker City",
    status: "available", availableDate: "",
    sqft: 3600, rent: 3300,
    leaseType: "Modified gross", camPsf: 0, camNote: "Landlord covers taxes and insurance; tenant covers janitorial",
    deposit: "One month's rent", minTerm: "5 years",
    utilities: "Tenant pays electric, gas and internet; water and sewer included",
    description: "A small single-tenant professional building with its own parking lot. Eight offices, a conference room, a waiting room and two restrooms. Laid out today for a clinic or a professional practice.",
    highlights: ["Single tenant, whole building", "8 offices plus conference room", "Waiting room with reception window", "Private parking lot"],
    zoning: "Commercial (sample; verify with the city)",
    parking: "14 private spaces",
    ada: "Yes: ramp entry and 2 accessible restrooms",
    restrooms: "2, both accessible",
    hvac: "Gas forced-air heat, central A/C, 2 zones",
    power: "Single-phase, 400 A",
    internet: "Fiber available (sample)",
    ceiling: "9 ft",
    loading: "",
    signage: "Monument sign at the street and building sign",
    i84: "About 2 miles to I-84",
    nearby: "Medical offices, schools, a park",
    beds: "", baths: "", pets: "", appliances: "", laundry: "",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "../img/work1.jpg", caption: "Building and lot", sample: true },
      { src: "ph:office", caption: "Waiting room", sample: true },
      { src: "ph:interior", caption: "Office", sample: true }
    ],
    lat: 44.7737, lng: -117.8436
  },
  {
    id: "sample-apartment",
    name: "Sample 2-Bedroom Apartment",
    type: "Residential",
    suite: "Unit 4",
    area: "South Baker City",
    status: "available", availableDate: "",
    sqft: 900, rent: 1050,
    leaseType: "Residential lease", camPsf: 0, camNote: "",
    deposit: "$1,050 (sample)", minTerm: "12 months",
    utilities: "Water, sewer and garbage included; tenant pays electric",
    description: "An upstairs two-bedroom apartment in a small, quiet building. Updated kitchen, a view of the Elkhorns from the living room, and a storage closet on the landing.",
    highlights: ["Mountain view from the living room", "Updated kitchen", "Storage closet", "Assigned parking"],
    zoning: "Residential",
    parking: "1 assigned space plus street parking",
    ada: "No: second floor, stairs only",
    restrooms: "",
    hvac: "Ductless heat pump (heat and A/C)",
    power: "",
    internet: "Cable and fiber available (sample)",
    ceiling: "",
    loading: "",
    signage: "",
    i84: "About 2 miles to I-84",
    nearby: "Grocery, a park, schools",
    beds: "2", baths: "1", pets: "Cats OK with a pet deposit; no dogs (sample policy)",
    appliances: "Range, refrigerator, dishwasher, microwave", laundry: "Shared laundry room in the building",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "ph:apartment", caption: "Building", sample: true },
      { src: "ph:kitchen", caption: "Kitchen", sample: true },
      { src: "../img/hero.jpg", caption: "The view of the Elkhorns", sample: true }
    ],
    lat: 44.7681, lng: -117.8301
  },
  {
    id: "sample-house",
    name: "Sample 3-Bedroom House",
    type: "Residential",
    suite: "",
    area: "North Baker City",
    status: "leased", availableDate: "",
    sqft: 1450, rent: 1550,
    leaseType: "Residential lease", camPsf: 0, camNote: "",
    deposit: "$1,550 (sample)", minTerm: "12 months",
    utilities: "Tenant pays all utilities",
    description: "A three-bedroom, two-bath house with a covered porch and a fenced yard. Currently leased.",
    highlights: ["Covered porch", "Fenced yard", "Attached garage"],
    zoning: "Residential",
    parking: "Attached 1-car garage plus driveway",
    ada: "Single level, one step at the entry",
    restrooms: "",
    hvac: "Gas furnace, central A/C",
    power: "",
    internet: "Cable available (sample)",
    ceiling: "",
    loading: "",
    signage: "",
    i84: "About 1.5 miles to I-84",
    nearby: "Schools, a park, the golf course",
    beds: "3", baths: "2", pets: "Ask (sample policy)",
    appliances: "Range, refrigerator, dishwasher", laundry: "Washer and dryer hookups in the garage",
    videoUrl: "", tourUrl: "", floorplan: "",
    photos: [
      { src: "../img/work2.jpg", caption: "Front of the house", sample: true },
      { src: "../img/work3.jpg", caption: "Covered porch", sample: true },
      { src: "ph:kitchen", caption: "Kitchen", sample: true }
    ],
    lat: 44.7845, lng: -117.8402
  }
];

/* Drawn placeholder photos. Returns an SVG data URI with the label baked in. */
window.RCD_PH = (function () {
  var C = { navy: "#1c2f45", navy2: "#243c57", timber: "#7d4524", timber2: "#9a5a30", gold: "#d9a441", paper: "#f5f0e6", line: "#ddd3c2", sky: "#a9c8e4", sky2: "#d3e1ec" };
  var NAMES = { office: "Office interior", interior: "Room interior", storefront: "Storefront", warehouse: "Warehouse exterior", "warehouse-int": "Warehouse interior", apartment: "Apartment building", kitchen: "Kitchen", plan: "Floor plan" };
  function art(kind) {
    switch (kind) {
      case "office":
        return '<rect width="800" height="500" fill="#e9e2d4"/><rect y="360" width="800" height="140" fill="#b9a68a"/>' +
          '<rect x="70" y="70" width="190" height="210" fill="' + C.sky + '" stroke="#fff" stroke-width="10"/><line x1="165" y1="70" x2="165" y2="280" stroke="#fff" stroke-width="8"/>' +
          '<rect x="540" y="70" width="190" height="210" fill="' + C.sky + '" stroke="#fff" stroke-width="10"/><line x1="635" y1="70" x2="635" y2="280" stroke="#fff" stroke-width="8"/>' +
          '<rect x="300" y="250" width="260" height="22" fill="' + C.timber + '"/><rect x="315" y="272" width="14" height="110" fill="' + C.timber2 + '"/><rect x="531" y="272" width="14" height="110" fill="' + C.timber2 + '"/>' +
          '<rect x="390" y="190" width="80" height="58" rx="4" fill="' + C.navy + '"/><rect x="420" y="248" width="20" height="6" fill="' + C.navy + '"/>' +
          '<rect x="600" y="300" width="70" height="80" rx="8" fill="' + C.navy2 + '"/><rect x="100" y="300" width="70" height="80" rx="8" fill="' + C.navy2 + '"/>' +
          '<circle cx="740" cy="330" r="26" fill="#6f8f5a"/><rect x="730" y="350" width="20" height="30" fill="' + C.timber + '"/>';
      case "interior":
        return '<rect width="800" height="500" fill="#efe8da"/><polygon points="0,500 160,360 640,360 800,500" fill="#c4b08f"/>' +
          '<polygon points="0,0 160,60 160,360 0,500" fill="#e2d8c5"/><polygon points="800,0 640,60 640,360 800,500" fill="#e2d8c5"/>' +
          '<rect x="160" y="60" width="480" height="300" fill="#f3ede1"/><rect x="250" y="110" width="300" height="160" fill="' + C.sky + '" stroke="#fff" stroke-width="10"/>' +
          '<line x1="400" y1="110" x2="400" y2="270" stroke="#fff" stroke-width="8"/><rect x="40" y="170" width="70" height="230" fill="' + C.timber2 + '" transform="skewY(14)"/>' +
          '<rect x="300" y="300" width="200" height="16" fill="' + C.timber + '"/><rect x="310" y="316" width="10" height="50" fill="' + C.timber + '"/><rect x="480" y="316" width="10" height="50" fill="' + C.timber + '"/>';
      case "storefront":
        return '<rect width="800" height="500" fill="' + C.sky2 + '"/><rect x="60" y="60" width="680" height="380" fill="#9a5a30"/>' +
          '<rect x="60" y="60" width="680" height="40" fill="#7d4524"/><rect x="90" y="120" width="620" height="54" fill="' + C.navy + '"/>' +
          '<text x="400" y="157" font-family="Georgia,serif" font-size="28" fill="#fff" text-anchor="middle" letter-spacing="6">YOUR SIGN HERE</text>' +
          '<rect x="90" y="200" width="250" height="220" fill="' + C.sky + '" stroke="#efe8da" stroke-width="10"/><rect x="460" y="200" width="250" height="220" fill="' + C.sky + '" stroke="#efe8da" stroke-width="10"/>' +
          '<rect x="355" y="200" width="90" height="220" fill="' + C.navy2 + '" stroke="#efe8da" stroke-width="8"/><circle cx="430" cy="315" r="5" fill="' + C.gold + '"/>' +
          '<polygon points="80,190 360,190 340,170 100,170" fill="' + C.gold + '"/><polygon points="440,190 720,190 700,170 460,170" fill="' + C.gold + '"/>' +
          '<rect y="440" width="800" height="60" fill="#b8b2a6"/>';
      case "warehouse":
        return '<rect width="800" height="500" fill="' + C.sky2 + '"/><polygon points="40,170 400,90 760,170" fill="#7f8a94"/><rect x="40" y="170" width="720" height="250" fill="#a4adb5"/>' +
          '<g fill="#d7dbde" stroke="#8a949c" stroke-width="3"><rect x="90" y="230" width="150" height="190"/><rect x="290" y="230" width="150" height="190"/></g>' +
          '<g stroke="#8a949c" stroke-width="2">' + [250, 270, 290, 310, 330, 350, 370, 390, 410].map(function (y) { return '<line x1="90" y1="' + y + '" x2="240" y2="' + y + '"/><line x1="290" y1="' + y + '" x2="440" y2="' + y + '"/>'; }).join("") + '</g>' +
          '<rect x="500" y="300" width="100" height="120" fill="' + C.navy2 + '"/><rect x="630" y="250" width="100" height="70" fill="' + C.sky + '" stroke="#fff" stroke-width="6"/>' +
          '<rect x="490" y="290" width="120" height="10" fill="' + C.gold + '"/><rect y="420" width="800" height="80" fill="#8c8a84"/>';
      case "warehouse-int":
        return '<rect width="800" height="500" fill="#cfd3d6"/><polygon points="0,500 120,340 680,340 800,500" fill="#a9a59c"/>' +
          '<g stroke="#8f979e" stroke-width="6" fill="none"><polyline points="0,60 400,0 800,60"/><line x1="120" y1="40" x2="120" y2="340"/><line x1="680" y1="40" x2="680" y2="340"/></g>' +
          '<rect x="300" y="180" width="200" height="160" fill="#e6e8ea" stroke="#8f979e" stroke-width="4"/>' +
          '<g fill="' + C.timber2 + '"><rect x="160" y="290" width="90" height="50"/><rect x="170" y="250" width="70" height="40"/><rect x="560" y="290" width="90" height="50"/></g>' +
          '<g fill="#f6e7a6" opacity=".9"><circle cx="250" cy="90" r="14"/><circle cx="550" cy="90" r="14"/></g>';
      case "apartment":
        return '<rect width="800" height="500" fill="' + C.sky2 + '"/><polygon points="120,140 400,60 680,140" fill="' + C.navy + '"/><rect x="140" y="140" width="520" height="290" fill="#c9b79a"/>' +
          '<g fill="' + C.sky + '" stroke="#fff" stroke-width="6">' + [190, 300, 410, 520].map(function (x) { return '<rect x="' + x + '" y="170" width="80" height="80"/><rect x="' + x + '" y="290" width="80" height="80"/>'; }).join("") + '</g>' +
          '<rect x="370" y="370" width="60" height="60" fill="' + C.timber + '"/><rect y="430" width="800" height="70" fill="#7d9a5f"/>' +
          '<circle cx="70" cy="380" r="45" fill="#5f7d4a"/><circle cx="730" cy="380" r="45" fill="#5f7d4a"/>';
      case "kitchen":
        return '<rect width="800" height="500" fill="#efe8da"/><rect y="300" width="800" height="200" fill="#c9b9a0"/>' +
          '<rect x="60" y="60" width="680" height="110" fill="' + C.timber2 + '"/><g stroke="#7d4524" stroke-width="4">' + [230, 400, 570].map(function (x) { return '<line x1="' + x + '" y1="60" x2="' + x + '" y2="170"/>'; }).join("") + '</g>' +
          '<rect x="300" y="180" width="200" height="90" fill="' + C.sky + '" stroke="#fff" stroke-width="8"/>' +
          '<rect x="40" y="270" width="720" height="22" fill="#e9e4da"/><rect x="60" y="292" width="680" height="140" fill="' + C.timber + '"/>' +
          '<rect x="520" y="300" width="120" height="120" fill="#d7dbde" stroke="#8f979e" stroke-width="3"/><g stroke="#5a3218" stroke-width="4">' + [130, 230, 330, 430].map(function (x) { return '<line x1="' + x + '" y1="310" x2="' + x + '" y2="420"/>'; }).join("") + '</g>';
      case "plan":
        return '<rect width="800" height="500" fill="#fbf8f2"/><g stroke="' + C.navy + '" stroke-width="8" fill="none"><rect x="80" y="60" width="640" height="380"/><line x1="380" y1="60" x2="380" y2="250"/><line x1="80" y1="250" x2="300" y2="250"/><line x1="380" y1="250" x2="720" y2="250"/><line x1="560" y1="60" x2="560" y2="250"/></g>' +
          '<g font-family="Segoe UI,Arial" font-size="20" fill="' + C.navy + '" text-anchor="middle"><text x="230" y="160">Room</text><text x="470" y="160">Room</text><text x="640" y="160">Room</text><text x="400" y="350">Open area</text></g>';
      default:
        return '<rect width="800" height="500" fill="#e9e2d4"/>';
    }
  }
  return function (kind, label) {
    var name = label || NAMES[kind] || "Photo";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">' + art(kind) +
      '<title>Sample photo (drawing): ' + String(name).replace(/[<>&"]/g, "") + '</title></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
})();
