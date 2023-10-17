'use client';
import FadeIn from 'react-fade-in';
import { PropsWithChildren } from 'react'; 

const Fade = ({ children}: PropsWithChildren<{}>) => {
    return <FadeIn>
        {children}
    </FadeIn>
}

export default Fade;