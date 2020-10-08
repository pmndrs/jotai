import { useEffect } from "react";
import { useAtom } from "jotai";
import { clockAtom } from "../store";

const pad = (n) => (n < 10 ? `0${n}` : n);
const format = (t) =>
  `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;

const Clock = () => {
  const [{ lastUpdate, light }, setClock] = useAtom(clockAtom);
  const timeString = format(new Date(lastUpdate));
  useEffect(() => {
    const timer = setInterval(() => {
      setClock({ light: true, lastUpdate: Date.now() });
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [setClock]);
  return (
    <div className={light ? "light" : ""}>
      {timeString}
      <style jsx>{`
        div {
          padding: 15px;
          color: #82fa58;
          display: inline-block;
          font: 50px menlo, monaco, monospace;
          background-color: #000;
        }
        .light {
          background-color: #999;
        }
      `}</style>
    </div>
  );
};

export default Clock;
