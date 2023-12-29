import { NextRequest } from "next/server";
import {decaptcha} from '@/app/api/ais_headless/login/decaptcha';
import sharp from "sharp";

export const runtime = "nodejs";

export const POST = async (req: NextRequest) => {
    const imgResponse = await req.arrayBuffer();
    
    const imgBuffer = await sharp(await imgResponse)
    .resize(320,120)
    .greyscale() // make it greyscale
    .linear(1.2, 0) // increase the contrast
    .toBuffer()
    
    //OCR
    const text = await decaptcha(imgBuffer);
    const answer = text.replace(/[^0-9]/g, "") || "";
    
    console.log("Answer: ",answer)
    return new Response(answer);
};