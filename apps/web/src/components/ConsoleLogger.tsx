"use client";

import { useEffect } from "react";

const ConsoleLogger = () => {
  useEffect(() => {
    console.log(
      `Hi! Nice to see you here, if you're interested in the source code, please visit https://github.com/nthumodifications/coursweb for more information.`,
    );
    console.log(
      `We're also looking for contributors, if you're capable of contributing to the project,  do not hesitate to contact us too :)`,
    );
  }, []);
  return <></>;
};

export default ConsoleLogger;
