export const metadata = {
  title: "Terms of Service - Socialflow Publisher",
  description: "Terms of Service for Socialflow Publisher"
};

export default function TermsPage() {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h1>Terms of Service</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString("en-US")}</p>

      <section style={{ marginBottom: 24 }}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Socialflow Publisher ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, do not use the Service.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>2. Description of Service</h2>
        <p>
          Socialflow Publisher is a content management platform that enables users to upload videos and publish them to
          multiple social media platforms—including YouTube, Instagram, TikTok, and Facebook—from a single dashboard.
          The Service streamlines the process of cross-posting video content to connected accounts.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>3. Account Connections and Permissions</h2>
        <p>
          To use the Service, you must connect your social media accounts via OAuth. By connecting an account, you
          grant Socialflow Publisher permission to publish content on your behalf. You may disconnect accounts at any
          time through the dashboard. You are responsible for maintaining the security of your account credentials and for
          all activity that occurs under your connected accounts.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>4. User Obligations</h2>
        <p>
          You agree to: (a) comply with the terms of service and community guidelines of each platform (YouTube,
          Instagram, TikTok, Facebook) whose accounts you connect; (b) ensure that content you publish does not infringe
          intellectual property rights or violate any laws; (c) not use the Service for spam, harassment, or other
          abusive purposes; and (d) provide accurate information when connecting accounts. You are solely responsible
          for the content you publish through the Service.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>5. Third-Party Services</h2>
        <p>
          The Service relies on third-party platforms (Google/YouTube, Meta/Instagram/Facebook, TikTok) for account
          authentication and content publishing. Your use of the Service is subject to those platforms' respective terms
          and policies. We are not responsible for the availability, policies, or actions of third-party services.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>6. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access,
          error-free operation, or that the Service will meet your specific requirements. Publishing to third-party
          platforms is subject to their availability and policies.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Socialflow Publisher and its developers shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages arising from your use of the Service,
          including but not limited to issues related to third-party platforms, content removal, or account
          restrictions.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>8. Changes to the Service and Terms</h2>
        <p>
          We reserve the right to modify or discontinue the Service and to update these Terms at any time. Continued
          use of the Service after changes constitutes acceptance of the modified terms.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>9. Contact</h2>
        <p>
          For questions about these Terms of Service, please contact us through the project repository or developer
          contact information provided in the application.
        </p>
      </section>

      <p style={{ marginTop: 32 }}>
        <a href="/" style={{ color: "#0066cc" }}>
          ← Back to Home
        </a>
      </p>
    </main>
  );
}
