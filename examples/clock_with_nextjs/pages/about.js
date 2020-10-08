import Link from "next/link";

import Clock from "../components/Clock";

export default function AboutPage() {
  return (
    <div>
      <Link href="/">
        <a>Index</a>
      </Link>
      <h1>About Page</h1>
      <Clock />
    </div>
  );
}
