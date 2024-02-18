import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: 'nthumods',
        name: 'NTHUMods',
        short_name: 'NTHUMods',
        description: '🏫 國立清華大學課表、校車時間表、資料整合平臺，學生主導、學生自主開發。',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: 'https://nthumods.com',
        lang: 'zh',
        dir: 'auto',
        theme_color: '#7e1083'
    }
}