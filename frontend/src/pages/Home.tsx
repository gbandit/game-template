import { GAME_TITLE } from "@/config";

export function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">{GAME_TITLE}</h1>
      <p className="text-lg text-foreground/60">
        Your game starts here — edit{" "}
        <code className="rounded bg-foreground/10 px-1.5 py-0.5 text-base">
          frontend/src/pages/Home.tsx
        </code>
        .
      </p>
    </main>
  );
}
