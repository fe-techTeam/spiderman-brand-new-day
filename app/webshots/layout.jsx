export const metadata = {
  title: "Webshots",
  description: "Fresh drops from Spidey HQ and the fans — the Web never sleeps.",
  // Members-only page with no public entry points — keep it out of search.
  robots: { index: false, follow: false },
};

export default function WebshotsLayout({ children }) {
  return children;
}
