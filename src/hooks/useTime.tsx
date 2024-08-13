import { useEffect, useState } from "react";

const useTime = (refreshMillis = 1000) => {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setDate(new Date());
    }, refreshMillis);
    return () => clearInterval(interval);
  }, []);
  return date;
};

export default useTime;
