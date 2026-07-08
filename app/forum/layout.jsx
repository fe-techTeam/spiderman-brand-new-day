import { ForumProvider } from "@/components/forum/ForumProvider";
import ForumHeader from "@/components/ForumHeader";

export const metadata = {
  title: "Spider-Verse Forum",
  description: "Real people, real identities, real stories — discuss theories, easter eggs, and all things Spider-Man.",
};

// Wraps every /forum route so the notifications store + sticky header persist
// across navigation between the list and post detail pages.
export default function ForumLayout({ children }) {
  return (
    <ForumProvider>
      <ForumHeader />
      {children}
    </ForumProvider>
  );
}
