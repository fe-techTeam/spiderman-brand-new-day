import LegalPage, { LegalSection, LegalText, LegalList } from "@/components/main/LegalPage";
import { s } from "@/lib/style";

export const metadata = {
  title: "Privacy Policy",
  description: "How Spidermania.in collects, uses, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="10 July 2026">
      <div style={s("margin: 0 0 clamp(26px, 4vh, 38px);")}>
        <LegalText>
          Welcome to Spidermania.in (“Website”), operated by or on behalf of Sony Pictures India in connection with the promotion of the motion picture <em>Spider-Man: Brand New Day</em>.
        </LegalText>
        <LegalText>This Privacy Policy explains how information may be collected, used, stored, and protected when you access or use the Website.</LegalText>
      </div>

      <LegalSection title="Information We Collect">
        <LegalList
          items={[
            "Account information such as your name, username, email address, and password.",
            "Profile information, including avatars and other optional profile details.",
            "User-generated content, including forum posts, comments, messages posted on the MJ Wall, and other community interactions.",
            "Technical information such as IP address, browser type, device information, operating system, cookies, and usage data.",
            "Analytics information to help improve the Website and user experience.",
          ]}
        />
      </LegalSection>

      <LegalSection title="How We Use Information">
        <LegalList
          items={[
            "Create and manage user accounts.",
            "Enable participation in community features.",
            "Personalize user experience.",
            "Moderate community content.",
            "Improve Website functionality and performance.",
            "Detect fraud, abuse, or security issues.",
            "Comply with legal obligations.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Cookies and Analytics">
        <LegalText>
          The Website may use cookies and similar technologies to remember user preferences, improve functionality, measure performance, and understand how visitors use the Website. Users may manage cookie preferences through their browser settings where applicable.
        </LegalText>
      </LegalSection>

      <LegalSection title="User Content">
        <LegalText>
          Content submitted through forums, community discussions, the MJ Wall, or similar features may be publicly visible. Please avoid posting personal or confidential information.
        </LegalText>
      </LegalSection>

      <LegalSection title="Data Security">
        <LegalText>Reasonable safeguards are maintained to help protect personal information. However, no online service can guarantee absolute security.</LegalText>
      </LegalSection>

      <LegalSection title="Children’s Privacy">
        <LegalText>The Website is not intended for children below the minimum age permitted under applicable law.</LegalText>
      </LegalSection>

      <LegalSection title="Third-Party Services">
        <LegalText>The Website may contain links to third-party websites or services. Sony Pictures India is not responsible for their privacy practices.</LegalText>
      </LegalSection>

      <LegalSection title="Changes to this Policy">
        <LegalText>This Privacy Policy may be updated from time to time. Continued use of the Website constitutes acceptance of the revised Policy.</LegalText>
      </LegalSection>

      <LegalSection title="Contact">
        <LegalText>Company: Sony Pictures India</LegalText>
      </LegalSection>
    </LegalPage>
  );
}
