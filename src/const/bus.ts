export const stops = [
    { name_zh: '北校門口', name_en: 'North Gate', code: 'A1' },
    { name_zh: '綜二館', name_en: 'Gen II Building', code: 'A2' },
    { name_zh: '楓林小徑', name_en: 'Maple Path', code: 'A3' },
    { name_zh: '人社院/生科館', name_en: 'CHSS/CLS Building', code: 'A4' },
    { name_zh: '南門停車場', name_en: 'South Gate Parking Lot', code: 'A5' },
    { name_zh: '奕園停車場', name_en: 'Yi Pav. Parking Lot', code: 'A6' },
    { name_zh: '台積館', name_en: 'TSMC Building', code: 'A7' },
    { name_zh: '南大校區', name_en: 'Nanda Campus', code: 'A8' },
];

export const nandaStops = [
    { name_zh: '北校門口', name_en: 'North Gate', code: 'A1' },
    { name_zh: '綜二館', name_en: 'Gen II Building', code: 'A2' },
    { name_zh: '人社院/生科館', name_en: 'CHSS/CLS Building', code: 'A4' },
    { name_zh: '台積館', name_en: 'TSMC Building', code: 'A7' },
];

export const routes = [
    { title_zh: '綠 - 台積館', title_en: 'Green - TSMC Build.', color: '#1CC34B', code: 'GU', path: ['A1U', 'A2U', 'A3U', 'A6U', 'A5U', 'A7D'] },
    { title_zh: '綠 - 台積館', title_en: 'Green - TSMC Build.', color: '#1CC34B', code: 'GUS', path: ['A2U', 'A3U', 'A6U', 'A5U', 'A7D'] },
    { title_zh: '綠 - 北校門口', title_en: 'Green - North Gate', color: '#1CC34B', code: 'GD', path: ['A7D', 'A4D', 'A3D', 'A2D', 'A1D'] },
    { title_zh: '綠 - 綜二館', title_en: 'Green - GEN II Build.', color: '#1CC34B', code: 'GDS', path: ['A7D', 'A4D', 'A3D', 'A2D'] },
    { title_zh: '紅 - 台積館', title_en: 'Red - TSMC Build.', color: '#E71212', code: 'RU', path: ['A1U', 'A2U', 'A3U', 'A4U', 'A7U'] },
    { title_zh: '紅 - 台積館', title_en: 'Red - TSMC Build.', color: '#E71212', code: 'RUS', path: ['A2U', 'A3U', 'A4U', 'A7U'] },
    { title_zh: '紅 - 北校門口', title_en: 'Red - North Gate', color: '#E71212', code: 'RD', path: ['A7U', 'A5D', 'A6D', 'A3D', 'A2D'] },
    { title_zh: '紅 - 綜二館', title_en: 'Red - GEN II Build.', color: '#E71212', code: 'RDS', path: ['A7U', 'A5D', 'A6D', 'A3D', 'A2D', 'A1D'] },
    { title_zh: '往南大校區', title_en: 'To Nanda Campus', color: '#1CC34B', code: 'NG', path: ['A1U', 'A2U', 'A4U', 'A7U', 'A8'] },
    { title_zh: '往校本部', title_en: 'To Main Campus', color: '#E71212', code: 'NB', path: ['A8', 'A7D', 'A4D', 'A2D', 'A1D'] },
]

export const nandaRoutes = [
    { title_zh: '往南大校區', title_en: 'To Nanda Campus', color: '#1CC34B', code: 'NG', path: ['A1U', 'A2U', 'A4U', 'A7U', 'A8'] },
    { title_zh: '往校本部', title_en: 'To Main Campus', color: '#E71212', code: 'NB', path: ['A8', 'A7D', 'A4D', 'A2D', 'A1D'] },
]
