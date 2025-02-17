"use client";
import { HeadlessAISStorage, LoginError, UserJWT } from "@/types/headless_ais";
import { toast } from "@/components/ui/use-toast";
import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import useDictionary from "@/dictionaries/useDictionary";
import { refreshUserSession, signInToCCXP } from "@/lib/headless_ais";
import dynamic from "next/dynamic";
import {
  signInWithCustomToken,
  signOut as signOutFirebase,
} from "firebase/auth";
import { auth } from "@/config/firebase";
import { useAuthState, useIdToken } from "react-firebase-hooks/auth";
import {
  signOut as serverSignOut,
  signIn as serverSignIn,
} from "@/lib/firebase/auth";
import { signInEeclassOauth } from "@/lib/headless_ais/elearning";

const headlessAISContext = createContext<
  ReturnType<typeof useHeadlessAISProvider>
>({
  user: undefined,
  ais: {
    enabled: false,
    ACIXSTORE: undefined,
  },
  loading: true,
  initializing: true,
  signIn: async () => false,
  signOut: async () => {},
  getACIXSTORE: async () => undefined,
  isACIXSTOREValid: false,
  openChangePassword: false,
  setOpenChangePassword: () => {},
  getEEClassUrl: async () => "",
});

const RenewPasswordDialogDynamic = dynamic(
  () => import("@/components/Forms/RenewPasswordDialog"),
  { ssr: false },
);

const useHeadlessAISProvider = () => {
  const [headlessAIS, setHeadlessAIS] = useLocalStorage<HeadlessAISStorage>(
    "headless_ais",
    { enabled: false },
  );
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const dict = useDictionary();
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [_user, authloading, autherror] = useAuthState(auth);

  useEffect(() => {
    setInitializing(false);
  }, []);

  useEffect(() => {
    // check if the cookie accessToken exists
    // if so, remove it and run getACIXSTORE(true)
    if (typeof window !== "undefined") {
      const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
      if (cookies.find((cookie) => cookie.startsWith("accessToken"))) {
        document.cookie =
          "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        getACIXSTORE(true);
      }
    }
  }, []);

  const signOut = async () => {
    setHeadlessAIS({
      enabled: false,
    });
    await signOutFirebase(auth);
    await serverSignOut();
  };

  //Headless AIS
  const signIn = async (username: string, password: string) => {
    if (!username || !password) {
      throw "empty username or password";
    }
    setLoading(true);
    return await signInToCCXP(username, password)
      .then(async (res) => {
        if (!res) throw new Error("太多人在使用代理登入，請稍後再試");
        if ("error" in res) throw new Error(res.error.message);
        setHeadlessAIS({
          enabled: true,
          studentid: username,
          password: res.encryptedPassword,
          encrypted: true,
          ACIXSTORE: res.ACIXSTORE,
          lastUpdated: Date.now(),
          expired: res.passwordExpired,
        });
        if (res.passwordExpired)
          toast({
            title: "提醒您校務系統密碼已經過期~ ",
            description: "但是NTHUMods 的功能都不會被影響 ヾ(≧▽≦*)o",
          });
        await signInWithCustomToken(auth, res.accessToken).then((user) =>
          user.user.getIdToken().then(serverSignIn),
        );
        setLoading(false);
        return true;
      })
      .catch((err) => {
        toast({
          title: "代理登入失敗",
          description:
            dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ??
            "目前認證服务降级，試看再按多一次？",
        });
        setLoading(false);
        return false;
      });
  };

  /**
   *
   * @param force force update ACIXSTORE
   * @returns ACIXSTORE or null if error, undefined if not enabled
   */
  const getACIXSTORE = async (force = false) => {
    if (!headlessAIS.enabled) return undefined;
    if (headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now() && !force) {
      setLoading(false);
      return headlessAIS.ACIXSTORE!;
    }
    setLoading(true);

    // legacy support, if encrypted password is not set, set it
    if (!headlessAIS.encrypted) {
      // use signInToCCXP to get encrypted password
      return await signInToCCXP(
        headlessAIS.studentid,
        headlessAIS.password,
      ).then(async (res) => {
        if ("error" in res) throw new Error(res.error.message);
        setHeadlessAIS({
          enabled: true,
          studentid: headlessAIS.studentid,
          password: res.encryptedPassword,
          encrypted: true,
          ACIXSTORE: res.ACIXSTORE,
          lastUpdated: Date.now(),
          expired: res.passwordExpired,
        });
        if (res.passwordExpired)
          toast({
            title: "提醒您校務系統密碼已經過期~ ",
            description: "但是NTHUMods 的功能都不會被影響 ヾ(≧▽≦*)o",
          });
        await signInWithCustomToken(auth, res.accessToken).then((user) =>
          user.user.getIdToken().then(serverSignIn),
        );
        setLoading(false);
        return res.ACIXSTORE;
      });
    }

    return await refreshUserSession(headlessAIS.studentid, headlessAIS.password)
      .then(async (res) => {
        if ("error" in res) throw new Error(res.error.message);
        setHeadlessAIS({
          enabled: true,
          studentid: headlessAIS.studentid,
          password: headlessAIS.password,
          encrypted: true,
          ACIXSTORE: res.ACIXSTORE,
          lastUpdated: Date.now(),
          expired: res.passwordExpired,
        });
        if (res.passwordExpired)
          toast({
            title: "提醒您校務系統密碼已經過期~ ",
            description: "但是NTHUMods 的功能都不會被影響 ヾ(≧▽≦*)o",
          });
        await signInWithCustomToken(auth, res.accessToken).then((user) =>
          user.user.getIdToken().then(serverSignIn),
        );
        setLoading(false);
        return res.ACIXSTORE;
      })
      .catch((err) => {
        if (err.message == LoginError.IncorrectCredentials) {
          setOpenChangePassword(true);
        }
        toast({
          title: "代理登入失敗",
          description:
            dict.ccxp.errors[err.message as keyof typeof dict.ccxp.errors] ??
            "目前認證服务降级，試看再按多一次？",
        });
        setLoading(false);
        throw err as LoginError;
      });
  };

  const [user, setUser] = useState<UserJWT | null | undefined>();
  useEffect(() => {
    if (!_user) setUser(_user);
    else
      _user.getIdTokenResult().then((token) => {
        setUser(token.claims as unknown as UserJWT);
      });
  }, [_user]);

  const ais = {
    ACIXSTORE: headlessAIS.enabled ? headlessAIS.ACIXSTORE : undefined,
    enabled: headlessAIS.enabled,
  };

  const [isACIXSTOREValid, setIsACIXSTOREValid] = useState(false);

  // check every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (headlessAIS.enabled) {
        setIsACIXSTOREValid(
          headlessAIS.lastUpdated + 15 * 60 * 1000 > Date.now(),
        );
      } else {
        setIsACIXSTOREValid(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [headlessAIS]);

  const getEEClassUrl = async () => {
    if (!headlessAIS.enabled) return "";
    const res = await signInEeclassOauth(
      headlessAIS.studentid,
      headlessAIS.password,
    );
    if ("error" in res) {
      toast({
        title: "登入失敗",
        description: res.error.message,
      });
      return "";
    }
    return res.url;
  };

  return {
    user,
    ais,
    loading,
    signIn,
    signOut,
    getACIXSTORE,
    isACIXSTOREValid,
    initializing,
    openChangePassword,
    setOpenChangePassword,
    getEEClassUrl,
  };
};

const useHeadlessAIS = () => useContext(headlessAISContext);

const HeadlessAISProvider: FC<PropsWithChildren> = ({ children }) => {
  const headlessAIS = useHeadlessAISProvider();

  return (
    <headlessAISContext.Provider value={headlessAIS}>
      {children}
      <RenewPasswordDialogDynamic
        open={headlessAIS.openChangePassword}
        setOpen={headlessAIS.setOpenChangePassword}
      />
    </headlessAISContext.Provider>
  );
};

export { useHeadlessAIS, HeadlessAISProvider };
