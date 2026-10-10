import { createBrowserRouter } from "react-router";
import { Home } from "@/pages/Home";
import { NotFound } from "@/pages/NotFound";
import { RouteError } from "@/pages/RouteError";
import { Spinner } from "@/components/Spinner";
// Auth-aware routing needs the backend (uncomment `backend` in gbandit.jsonc),
// then swap in the commented routes below:
// import { requireUser } from "@/api/session";
// import { AuthHome } from "@/pages/AuthHome";
// import { AuthLayout } from "@/pages/AuthLayout";

export const router = createBrowserRouter([
  {
    ErrorBoundary: RouteError,
    HydrateFallback: Spinner,
    children: [
      {
        path: "/",
        Component: Home,
      },
      // Routes that know the player go under AuthLayout:
      // {
      //   loader: requireUser,
      //   Component: AuthLayout,
      //   children: [{ path: "/", Component: AuthHome }],
      // },
      {
        path: "*",
        Component: NotFound,
      },
    ],
  },
]);
