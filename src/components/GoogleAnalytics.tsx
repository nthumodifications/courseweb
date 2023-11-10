'use client';
import Script from 'next/script';


const GoogleAnalytics = () => {

    if(process.env.NODE_ENV !== 'production') return <></>;
    return (
        <>
            <Script src="https://www.googletagmanager.com/gtag/js?id=G-WX2Y030ZGR" />
            <Script id="google-analytics">
            {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
    
                gtag('config', 'G-WX2Y030ZGR');
            `}
            </Script>
        </>
    )
}

export default GoogleAnalytics;