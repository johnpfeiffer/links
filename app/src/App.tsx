import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import ChatPage from "./components/ChatPage";
import HomePage from "./components/HomePage";
import SourcesPage from "./components/SourcesPage";
import { SiteFooter } from "johnutilsjs/ui";
import { Link } from "./models/link";
import type { LinkRecord } from "./types";

let linksPromise: Promise<LinkRecord[]> | undefined;

function loadLinksOnce(): Promise<LinkRecord[]> {
  if (!linksPromise) {
    linksPromise = Link.loadAll();
  }
  return linksPromise;
}

function linksRootLoader() {
  return {
    links: loadLinksOnce(),
  };
}

const router = createBrowserRouter([
  {
    path: "/",
    id: "root",
    loader: linksRootLoader,
    element: <Outlet />,
    children: [
      {
        path: "sources/*",
        element: <SourcesPage />,
      },
      {
        path: ":app/sources/*",
        element: <SourcesPage />,
      },
      {
        path: "_chat",
        element: <ChatPage />,
      },
      {
        path: ":app/_chat",
        element: <ChatPage />,
      },
      {
        path: "tags/*",
        element: <HomePage />,
      },
      {
        path: ":app/tags/*",
        element: <HomePage />,
      },
      {
        path: ":app",
        element: <HomePage />,
      },
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
]);

const theme = createTheme({
  typography: {
    fontSize: 16,
  },
  palette: {
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
      <SiteFooter repo="links" />
    </ThemeProvider>
  );
}
