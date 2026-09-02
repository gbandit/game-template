import { signOut } from "@/lib/auth";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="rounded-lg border border-foreground/20 px-4 py-2 text-sm hover:bg-foreground/5 transition-colors"
    >
      Sign out
    </button>
  );
}
