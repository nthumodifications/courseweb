"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { App, URLOpenListenerEvent } from "@capacitor/app";

const AppUrlListener: React.FC<any> = () => {
  const router = useRouter();
  useEffect(() => {
    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      // Example url: https://beerswift.app/tabs/tab2
      // slug = /tabs/tab2
      const slug = event.url.split(".app").pop();
      if (slug) {
        router.push(slug);
      }
    });
  }, [router]);

  return <></>;
};

export default AppUrlListener;
