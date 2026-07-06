import { ForumProvider } from "@/components/forum/ForumProvider";
import ForumHeader from "@/components/ForumHeader";

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
