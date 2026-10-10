import { GAME_TITLE } from "@/config";
import { loginUrl } from "@/lib/auth";
import { useUser } from "@/lib/auth-context";
import { SignOutButton } from "@/components/SignOutButton";

// `requireUser` has sent anyone without a session to sign in before this renders.
export function AuthHome() {
  const user = useUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">{GAME_TITLE}</h1>

      {user.is_anon && (
        <div className="rounded-lg border border-foreground/20 bg-foreground/5 px-4 py-3 text-sm w-full max-w-md text-center">
          You&apos;re using a guest account.{" "}
          <a
            href={loginUrl()}
            className="underline font-medium hover:opacity-80"
          >
            Sign in
          </a>{" "}
          to save your progress.
        </div>
      )}

      <div className="rounded-xl border border-foreground/10 p-6 w-full max-w-md space-y-3">
        <p>
          <span className="font-medium">Name:</span> {user.name}
        </p>
        <p>
          <span className="font-medium">ID:</span> {user.id}
        </p>
      </div>

      <SignOutButton />
    </main>
  );
}
