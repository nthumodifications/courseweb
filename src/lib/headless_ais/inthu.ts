"use server";
import { uuid4 } from "@sentry/utils";
import { parseHTML } from "linkedom";

export const getOSACode = async (ACIXSTORE: string) => {
  const entryLink =
    "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/SSO_LINK/oauth_stuleave.php?ACIXSTORE=" +
    ACIXSTORE;

  // Get The 302  Redirect Link
  const response = await fetch(entryLink, {
    method: "GET",
    redirect: "manual",
  });

  // Get the redirected link, which will redirect to the real link, which contains the OSACode
  const realLink = response.headers.get("location");
  if (!realLink) {
    throw new Error("Failed to get the real link");
  }
  // Get the OSACode
  const realResponse = await fetch(realLink, {
    method: "GET",
    redirect: "manual",
  });

  // https://osa.nthu.edu.tw/api/callback.aspx?code=<longtermcode>&state=web%2Ccht
  const osaCallbackURL = realResponse.headers.get("location");

  // Extract the OSACode
  const osaCode = new URL(osaCallbackURL ?? "").searchParams.get("code");

  if (!osaCode) {
    throw new Error("Failed to get the OSACode");
  }

  // Fetch the final link
  const finalResponse = await fetch(
    `https://osa.nthu.edu.tw/api/callback.aspx?code=${osaCode}&state=mobile%2Cen` ??
      "",
    {
      method: "GET",
    },
  );

  const html = await finalResponse.text();
  const dom = parseHTML(html);
  const doc = dom.document;

  const HF_UserID = doc
    .querySelector("input[name='HF_UserID']")
    ?.getAttribute("value")!;
  const HF_AccessToken = doc
    .querySelector("input[name='HF_AccessToken']")
    ?.getAttribute("value")!;

  return {
    user_id: HF_UserID,
    refreshToken: HF_AccessToken,
  };
};

export const getOSAAccessToken = async (
  user_id: string,
  refreshToken: string,
) => {
  const endpoint = "https://osa.nthu.edu.tw/api/GetToken.ashx";
  const uuid = uuid4();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      Platform: "Android",
      UserID: user_id,
      DeviceID: uuid,
      AccessToken: refreshToken,
      Lang: "zh",
      PushToken: "",
    }),
    keepalive: true,
  });
  const json = await response.json();
  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${json.Data.AccessToken}`);
  myHeaders.append("DeviceID", uuid);

  const cookieRes = await fetch(
    "https://osa.nthu.edu.tw/App/SSO.aspx?lang=en",
    {
      method: "GET",
      headers: myHeaders,
      redirect: "manual",
    },
  );

  // get set-cookie header
  //    'set-cookie': 'ASP.NET_SessionId=qdac1y5whiqhvbdrxx341tno; path=/; HttpOnly; SameSite=Lax, Authorization=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJUeXBlIjoxLCJVc2VySUQiOiIxMTEwNjAwNjIiLCJEZXZpY2VJRCI6IjY5NzQwZWJjZDhlNjQ4MzA4NjVhNTVmNTAzOTQwZGRkIiwiRXhwIjoiMjAyNC0wOS0yMyAwMzowODo1NyJ9.r_zXGdasBNJd2ZryhBtN-QUkGZEztdnmgDcCefq1i9XV51B3CM6A88N3tsZdn-M-os8kAZnFCbyO72_cY5PBKw; expires=Sun, 22-Sep-2024 19:08:57 GMT; path=/, DeviceID=69740ebcd8e64830865a55f503940ddd; expires=Sun, 22-Sep-2024 19:08:57 GMT; path=/, lang=cht; expires=Sun, 22-Sep-2024 19:08:57 GMT; path=/',
  const setCookie = cookieRes.headers.get("set-cookie");

  // get setcookie session_id, Authorization, DeviceID, lang
  const cookies = setCookie?.split(", ");
  const session_id = cookies
    ?.find((cookie) => cookie.startsWith("ASP.NET_SessionId="))
    ?.split(";")[0]
    .split("=")[1];
  const Authorization = cookies
    ?.find((cookie) => cookie.startsWith("Authorization="))
    ?.split(";")[0]
    .split("=")[1];
  const DeviceID = cookies
    ?.find((cookie) => cookie.startsWith("DeviceID="))
    ?.split(";")[0]
    .split("=")[1];
  const lang = cookies
    ?.find((cookie) => cookie.startsWith("lang="))
    ?.split(";")[0]
    .split("=")[1];

  if (!session_id || !Authorization || !DeviceID || !lang) {
    throw new Error("Failed to get the cookies");
  }

  return {
    accessToken: json.Data.AccessToken,
    deviceId: DeviceID,
    session_id: session_id,
    authToken: Authorization,
    lang: lang,
  };
};

export const getDoorAccessQR = async (
  authToken: string,
  deviceId: string,
  session_id: string,
) => {
  const endpoint = "https://osa.nthu.edu.tw/app/acsystem.aspx";
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      // ASP.NET_SessionId, Authorization, DeviceID, lang are required cookies
      Cookie: `ASP.NET_SessionId=${session_id}; Authorization=${authToken}; DeviceID=${deviceId}; lang=cht;`,
    },
  });

  const html = await response.text();
  const dom = parseHTML(html);

  const img =
    dom.document
      .querySelector("#ctl00_ContentPlaceHolder1_IMG_QRCode")
      ?.getAttribute("src") ?? "";

  return img;
};

export const getParcelInformation = async (
  authToken: string,
  deviceId: string,
  session_id: string,
) => {
  const endpoint = "https://osa.nthu.edu.tw/app/pkmrec.aspx";
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      // ASP.NET_SessionId, Authorization, DeviceID, lang are required cookies
      Cookie: `ASP.NET_SessionId=${session_id}; Authorization=${authToken}; DeviceID=${deviceId}; lang=cht;`,
    },
  });

  const html = await response.text();
  const dom = parseHTML(html);
  const document = dom.document;

  const parcelCards = document.querySelectorAll(".parcel-card");

  // Initialize an array to store parcel information
  const parcelInfoList: {
    takeTime: string;
    studentNumber: string;
    statusText: string;
    name: string;
    logistic: string;
    barcode: string;
  }[] = [];

  // Iterate through each parcel card to extract information
  parcelCards.forEach((card) => {
    // Extract individual data points
    const takeTime =
      card
        .querySelector(".parcel-take-time")
        ?.childNodes[0]?.nodeValue?.trim() ?? "";
    const statusText =
      card.querySelector(".parcel-take-time span")?.textContent?.trim() ?? "";
    const studentNumber =
      card.querySelector(".parcel-stdno")?.textContent?.trim() ?? "";
    const name = card.querySelector(".parcel-name")?.textContent?.trim() ?? "";
    const logistic =
      card.querySelector(".parcel-logistic")?.textContent?.trim() ?? "";
    const barcode =
      card.querySelector(".parcel-barcode")?.textContent?.trim() ?? "";

    // Store the extracted information in an object
    const parcelInfo = {
      takeTime: takeTime,
      statusText: statusText,
      studentNumber: studentNumber.replace("學號：", "").trim(),
      name: name.replace("姓名：", "").trim(),
      logistic: logistic.replace("物流業者：", "").trim(),
      barcode: barcode.replace("條碼編號：", "").trim(),
    };

    // Add the object to the array
    parcelInfoList.push(parcelInfo);
  });

  return parcelInfoList;
};
