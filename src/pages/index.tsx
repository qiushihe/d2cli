export default function Home() {
  return (
    <div>
      <h1>It Worked!</h1>
      <a
        href={`/api/bungie-oauth/start?returnUrl=${encodeURIComponent(
          "http://localhost:3000/api/bungie-oauth/return"
        )}`}
      >
        Start Oauth
      </a>
    </div>
  );
}
