'use server';
import jwt from 'jsonwebtoken';

//decode env base64 private key
const privateKey = Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY!, 'base64').toString('utf-8');

const INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID;
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;

const getJwt = () => {
    const payload = {
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (10 * 60),
        iss: CLIENT_ID,
    };

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    return token;
};

const getInstallationAccessToken = async () => {
    const jwtToken = getJwt();
    

    const response = await fetch(
        `https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${jwtToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        }
    )
    const data = await response.json();

    return data.token;
};

export const createIssue = async (title: string, body: string) => {
    const accessToken = await getInstallationAccessToken();
    const repoOwner = 'nthumodifications';
    const repoName = 'courseweb';

    const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
        {
            method: 'POST',
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({ title, body }),
        }
    );
    const data = await response.json();

    return data;
};
