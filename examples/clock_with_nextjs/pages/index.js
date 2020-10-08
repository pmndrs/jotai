import Link from "next/link";

import Clock from "../components/Clock";

export default function IndexPage() {
  return (
    <div>
      <Link href="/about">
        <a>About</a>
      </Link>
      <h1>Index Page</h1>
      <Clock />
    </div>
  );
}
