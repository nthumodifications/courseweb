import * as vision from '@google-cloud/vision';
import 'server-only';

export const decaptcha = async (image: ArrayBuffer) => {

    const credential = JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_KEY ?? "", "base64").toString()
    );
      
    const client = new vision.ImageAnnotatorClient({
        projectId: 'chews-playground',
        credentials: {
            client_email: credential.client_email,
            private_key: credential.private_key,
        },        
    });

    // Performs text detection on the local file
    const [result] = await client.textDetection(Buffer.from(image));
    const detected = result.textAnnotations?.[0];
    return detected?.description || "";

}
