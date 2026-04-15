import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Shield, Lock, Cookie, Sparkles } from 'lucide-react'
import SEO from '../components/common/SEO'

// Touchline logo mark component
function TouchlineMark({ className = "w-10 h-8" }) {
  const id = useId()
  const gradId = `tl-arc-${id}`
  return (
    <svg viewBox="0 10 64 38" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2ED573"/>
          <stop offset="100%" stopColor="#F5A623"/>
        </linearGradient>
      </defs>
      <g fill="none">
        <path d="M12 44 C18 12, 46 12, 52 44"
              stroke={`url(#${gradId})`}
              strokeWidth="4.5"
              strokeLinecap="round"/>
        <line x1="8" y1="44" x2="56" y2="44"
              stroke="#2ED573"
              strokeWidth="3.5"
              strokeLinecap="round"/>
        <circle cx="32" cy="44" r="5" fill="#2ED573"/>
      </g>
    </svg>
  )
}

const tabs = [
  { id: 'terms', label: 'Terms of Service', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', icon: Lock },
  { id: 'safeguarding', label: 'Safeguarding', icon: Shield },
  { id: 'cookies', label: 'Cookie Policy', icon: Cookie },
  { id: 'ai', label: 'AI Policy', icon: Sparkles },
]

function TermsOfService() {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-white mb-2">Terms of Service</h2>
      <p className="text-navy-400 text-sm mb-8">Last updated: 17 February 2026</p>

      <p className="text-navy-300 mb-4">
        These Terms of Service ("Terms") govern your access to and use of Touchline (touchline.xyz), operated by MoonBoots Consultancy UK Ltd ("we", "us", "our"), a company registered in England and Wales.
      </p>
      <p className="text-navy-300 mb-8">
        By accessing or using Touchline, you agree to be bound by these Terms. If you are accepting these Terms on behalf of a school, sports department, or organisation, you represent that you have the authority to bind that organisation.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">1. About Touchline</h3>
      <p className="text-navy-300 mb-4">
        Touchline is an AI-powered platform designed for school PE departments and sports coaches. It provides lesson and session planning, pupil development insights, video analysis, assessment, and communication tools for teachers, schools, and parents.
      </p>
      <p className="text-navy-300 mb-4">
        Touchline is a coaching support tool. It does not replace qualified coaching, medical advice, or safeguarding procedures. All coaching decisions remain the responsibility of the coach and club.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">2. Account Types</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">Individual Coach Accounts</p>
      <p className="text-navy-300 mb-4">
        Individual coaches may create a personal account to access Touchline features for their own coaching activities. Coaches are responsible for ensuring they hold appropriate coaching qualifications and DBS checks as required by their club and governing body.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Club Accounts</p>
      <p className="text-navy-300 mb-2">
        Clubs may register for a club account, which enables multiple coaches and administrators to use Touchline under a single organisation. Before a club account is activated:
      </p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>The club must designate a Club Administrator with authority to accept these Terms</li>
        <li>The club must review and accept our Privacy Policy and Safeguarding Policy</li>
        <li>The club must confirm they hold a current safeguarding policy of their own</li>
        <li>The club must confirm they have an appointed Club Welfare Officer</li>
        <li>The club must confirm all coaches using the platform hold appropriate DBS clearance</li>
      </ul>
      <p className="text-navy-300 mb-4">Club accounts are not activated until these requirements are satisfied.</p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Parent/Guardian Access</p>
      <p className="text-navy-300 mb-4">
        Where a club enables parent communication features, parents and guardians may be granted limited access to view session plans, development updates, and club communications relating to their child. Parent access is managed by the club and subject to these Terms.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">3. Acceptable Use</h3>
      <p className="text-navy-300 mb-2">
        You agree to use Touchline only for lawful purposes related to school sport, PE teaching, and school administration. You must not:
      </p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Use the platform in any way that could harm, endanger, or negatively impact any child or young person</li>
        <li>Upload, share, or transmit any content that is abusive, offensive, discriminatory, or inappropriate</li>
        <li>Share login credentials or allow unauthorised individuals to access the platform</li>
        <li>Attempt to access data belonging to other users, clubs, or organisations</li>
        <li>Use the platform to contact children or young people directly (all communications must go through appropriate club channels)</li>
        <li>Use automated tools, scrapers, or bots to access the platform</li>
        <li>Reverse-engineer, decompile, or attempt to extract the source code</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">4. Content and Data</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">Your Content</p>
      <p className="text-navy-300 mb-4">
        You retain ownership of any content you upload to Touchline (session plans, notes, video). By uploading content, you grant us a limited licence to store, process, and display it within the platform for the purpose of providing the service.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">AI-Generated Content</p>
      <p className="text-navy-300 mb-4">
        Touchline uses artificial intelligence to generate coaching suggestions, session plans, and development insights. AI-generated content is provided as guidance only. You are responsible for reviewing all AI output before use and ensuring it is appropriate for your players' age, ability, and needs.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Data Processing</p>
      <p className="text-navy-300 mb-4">
        We process personal data in accordance with our Privacy Policy and UK GDPR. Where you upload or input data relating to children or young people, you confirm that you have the appropriate consent or lawful basis to do so.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">5. Subscriptions and Payment</h3>
      <p className="text-navy-300 mb-4">
        Touchline operates on a subscription basis. Current pricing tiers are published on the website. We reserve the right to change pricing with 30 days' notice.
      </p>
      <p className="text-navy-300 mb-4">
        Subscriptions renew automatically unless cancelled before the renewal date. You may cancel at any time through your account settings. Cancellation takes effect at the end of the current billing period.
      </p>
      <p className="text-navy-300 mb-4">
        Refunds are handled on a case-by-case basis. If you are unsatisfied with the service, contact us within 14 days of your initial subscription for a full refund.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">6. Club Responsibilities</h3>
      <p className="text-navy-300 mb-2">Clubs using Touchline are responsible for:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Ensuring all coaches and staff using the platform are appropriately vetted (DBS checked) and qualified</li>
        <li>Maintaining their own safeguarding policy in accordance with FA and local authority guidelines</li>
        <li>Obtaining appropriate consent from parents/guardians before any child's data is entered into the platform</li>
        <li>Appointing a Club Administrator responsible for managing user access</li>
        <li>Removing access promptly for any individual who leaves the club or whose DBS clearance is revoked</li>
        <li>Reporting any safeguarding concerns through their own procedures and to the relevant authorities (not solely through Touchline)</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">7. Our Responsibilities</h3>
      <p className="text-navy-300 mb-2">We are responsible for:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Maintaining the security and availability of the platform</li>
        <li>Processing data in accordance with UK GDPR and our Privacy Policy</li>
        <li>Responding promptly to data access requests, deletion requests, and safeguarding concerns</li>
        <li>Providing a platform that supports (but does not replace) good coaching and safeguarding practice</li>
        <li>Conducting regular security reviews and maintaining appropriate technical safeguards</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">8. Safeguarding</h3>
      <p className="text-navy-300 mb-4">
        Safeguarding children and young people is central to everything we do. Our full Safeguarding Policy is available on this page and forms part of these Terms.
      </p>
      <p className="text-navy-300 mb-4">
        We will cooperate fully with any safeguarding investigation by a club, county FA, local authority, or law enforcement agency, including providing access to relevant data where lawfully required.
      </p>
      <p className="text-navy-300 mb-4">
        If you become aware of any safeguarding concern related to the use of Touchline, contact us immediately at safeguarding@touchline.xyz.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">9. Availability and Support</h3>
      <p className="text-navy-300 mb-4">
        We aim to maintain high availability but do not guarantee uninterrupted access. We may carry out maintenance with reasonable notice where possible.
      </p>
      <p className="text-navy-300 mb-4">Support is available by email. Response times depend on your subscription tier.</p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">10. Limitation of Liability</h3>
      <p className="text-navy-300 mb-2">To the maximum extent permitted by law:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Touchline is provided "as is" without warranties of any kind</li>
        <li>We are not liable for any decisions made based on AI-generated content</li>
        <li>We are not liable for any coaching outcomes, injuries, or incidents arising from the use of session plans or guidance provided by the platform</li>
        <li>Our total liability for any claim shall not exceed the fees paid by you in the 12 months preceding the claim</li>
      </ul>
      <p className="text-navy-300 mb-4">
        Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded by law.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">11. Termination</h3>
      <p className="text-navy-300 mb-4">
        We may suspend or terminate your account if you breach these Terms, particularly any provision relating to safeguarding or acceptable use. Where possible, we will give notice before termination.
      </p>
      <p className="text-navy-300 mb-4">
        You may close your account at any time. On closure, we will delete your data in accordance with our Privacy Policy and data retention schedule.
      </p>
      <p className="text-navy-300 mb-4">
        If a club account is terminated, all associated coach and parent access will also be revoked.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">12. Changes to These Terms</h3>
      <p className="text-navy-300 mb-4">
        We may update these Terms from time to time. Material changes will be notified by email and/or a notice on the platform at least 14 days before taking effect. Continued use after changes take effect constitutes acceptance.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">13. Governing Law</h3>
      <p className="text-navy-300 mb-4">
        These Terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the English courts.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">14. Contact</h3>
      <p className="text-navy-300 mb-1">MoonBoots Consultancy UK Ltd</p>
      <p className="text-navy-300 mb-1">Email: hello@touchline.xyz</p>
      <p className="text-navy-300">Safeguarding concerns: safeguarding@touchline.xyz</p>
    </section>
  )
}

function PrivacyPolicy() {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-white mb-2">Privacy Policy</h2>
      <p className="text-navy-400 text-sm mb-8">Last updated: 17 February 2026</p>

      <p className="text-navy-300 mb-4">
        This Privacy Policy explains how MoonBoots Consultancy UK Ltd ("we", "us", "our") collects, uses, stores, and protects personal data through Touchline (touchline.xyz).
      </p>
      <p className="text-navy-300 mb-4">
        We are committed to protecting the privacy of all our users, with particular care given to data relating to children and young people in school settings.
      </p>
      <p className="text-navy-300 mb-8">
        We are the data controller for personal data processed through Touchline. We are registered in England and Wales and comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">1. Data We Collect</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">Account Data (all users)</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Name and email address</li>
        <li>Password (encrypted, we cannot see it)</li>
        <li>Subscription and payment details (processed by our payment provider)</li>
        <li>Account preferences and settings</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">Coach Data</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Coaching qualifications and level</li>
        <li>Club affiliation</li>
        <li>Session plans and coaching notes created on the platform</li>
        <li>Video uploads for analysis</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">Club Data</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Club name, address, and contact details</li>
        <li>Club Welfare Officer details</li>
        <li>Club Administrator details</li>
        <li>Confirmation of safeguarding policy and DBS compliance</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">Player Data (entered by coaches or clubs)</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>First name (surname is optional and discouraged for younger age groups)</li>
        <li>Age group and date of birth (year only for players under 13)</li>
        <li>Position and playing preferences</li>
        <li>Development notes and session feedback</li>
        <li>Attendance records</li>
        <li>Performance observations</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">Parent/Guardian Data (where enabled by club)</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Name and email address</li>
        <li>Relationship to player</li>
        <li>Communication preferences</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">Technical Data (collected automatically)</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>IP address and approximate location</li>
        <li>Browser type and device information</li>
        <li>Pages visited and features used</li>
        <li>Session duration and interaction data</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">2. How We Use Your Data</h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm text-navy-300 border border-navy-700">
          <thead>
            <tr className="bg-navy-800">
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Purpose</th>
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Lawful Basis</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-navy-800"><td className="p-3">Providing the Touchline service</td><td className="p-3">Performance of contract</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Account creation and authentication</td><td className="p-3">Performance of contract</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Processing payments</td><td className="p-3">Performance of contract</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">AI-powered coaching suggestions</td><td className="p-3">Performance of contract (with legitimate interest)</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Video analysis</td><td className="p-3">Performance of contract</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Club administration and user management</td><td className="p-3">Legitimate interest</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Communication about your account</td><td className="p-3">Performance of contract</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Platform security and fraud prevention</td><td className="p-3">Legitimate interest</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Improving the platform</td><td className="p-3">Legitimate interest</td></tr>
            <tr><td className="p-3">Legal compliance</td><td className="p-3">Legal obligation</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-navy-300 mb-4">
        We do not sell, rent, or trade personal data to any third party. We do not use personal data for advertising or marketing by third parties.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">3. Children's Data</h3>
      <p className="text-navy-300 mb-4">We take extra care with data relating to children and young people (anyone under 18).</p>

      <p className="text-navy-200 font-medium mt-4 mb-2">What we require</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Player data for children is only entered by coaches or club administrators, never by children themselves</li>
        <li>Children do not create accounts or access the platform directly</li>
        <li>Clubs must obtain parental/guardian consent before entering any child's data into the platform</li>
        <li>We process children's data solely for the purpose of supporting coaching and player development</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">What we minimise</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>We collect the minimum data necessary. Full dates of birth are not required for players under 13; year of birth is sufficient</li>
        <li>Surnames are optional and discouraged for younger age groups</li>
        <li>We do not collect sensitive category data (health, ethnicity, religion) unless explicitly provided by the club with appropriate consent</li>
        <li>Photos and videos of players are stored securely and accessible only to authorised coaches and club administrators</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">What we don't do</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>We do not create profiles of children for any purpose other than supporting their football development</li>
        <li>We do not use children's data for marketing</li>
        <li>We do not share children's data with third parties except where required by law or a safeguarding concern</li>
        <li>We do not use children's data to train AI models</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">Parental rights</p>
      <p className="text-navy-300 mb-2">Parents and guardians may, at any time:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Request to see what data is held about their child</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of their child's data</li>
        <li>Withdraw consent for their child's data to be processed</li>
      </ul>
      <p className="text-navy-300 mb-4">
        Requests should be made to the Club Administrator in the first instance, or directly to us at privacy@touchline.xyz.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">4. Data Sharing</h3>
      <p className="text-navy-300 mb-2">We share personal data only in the following circumstances:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-2">
        <li><strong className="text-navy-200">Service providers</strong> — We use trusted third-party services to operate the platform (hosting, payment processing, email delivery). These providers process data on our behalf under data processing agreements and are not permitted to use your data for their own purposes.</li>
        <li><strong className="text-navy-200">Within a club</strong> — Where a club account is active, coaches and administrators within that club can see data relevant to their role. A coach can see player data for their team. A Club Administrator can see all data within the club account.</li>
        <li><strong className="text-navy-200">Legal requirements</strong> — We will share data where required by law, regulation, or court order, or where necessary to protect the safety of a child or young person.</li>
        <li><strong className="text-navy-200">Safeguarding</strong> — We will share data with relevant authorities (police, local authority, FA) where we have a safeguarding concern or are requested to do so as part of a safeguarding investigation.</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">5. Data Storage and Security</h3>
      <p className="text-navy-300 mb-2">
        Personal data is stored on secure servers within the United Kingdom or European Economic Area. We implement appropriate technical and organisational measures including:
      </p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Encryption of data in transit (TLS) and at rest</li>
        <li>Access controls limiting data access to authorised personnel</li>
        <li>Regular security reviews and vulnerability testing</li>
        <li>Secure password hashing (we cannot see your password)</li>
        <li>Automated backups with encryption</li>
        <li>Logging and monitoring of access to personal data</li>
      </ul>
      <p className="text-navy-300 mb-4">
        No system is perfectly secure. If we become aware of a data breach that poses a risk to your rights and freedoms, we will notify you and the Information Commissioner's Office (ICO) within 72 hours as required by UK GDPR.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">6. Data Retention</h3>
      <p className="text-navy-300 mb-2">We retain personal data only as long as necessary:</p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm text-navy-300 border border-navy-700">
          <thead>
            <tr className="bg-navy-800">
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Data Type</th>
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Retention Period</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-navy-800"><td className="p-3">Active account data</td><td className="p-3">Duration of account plus 30 days</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Player data</td><td className="p-3">Duration of club membership plus 12 months, or until deletion requested</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Session plans and coaching notes</td><td className="p-3">Duration of account plus 12 months</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Video uploads</td><td className="p-3">Duration of account plus 30 days</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">Payment records</td><td className="p-3">7 years (legal requirement)</td></tr>
            <tr><td className="p-3">Technical/usage logs</td><td className="p-3">12 months</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-navy-300 mb-4">
        When a coach leaves a club, their access to player data is revoked immediately. When a player leaves a club, their data is retained for 12 months (for continuity) then deleted unless the club requests earlier deletion.
      </p>
      <p className="text-navy-300 mb-4">
        When an account is closed, personal data is deleted within 30 days except where retention is required by law.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">7. Your Rights</h3>
      <p className="text-navy-300 mb-2">Under UK GDPR, you have the right to:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li><strong className="text-navy-200">Access</strong> — Request a copy of the personal data we hold about you</li>
        <li><strong className="text-navy-200">Rectification</strong> — Request correction of inaccurate data</li>
        <li><strong className="text-navy-200">Erasure</strong> — Request deletion of your data ("right to be forgotten")</li>
        <li><strong className="text-navy-200">Restriction</strong> — Request we limit how we process your data</li>
        <li><strong className="text-navy-200">Portability</strong> — Receive your data in a portable format</li>
        <li><strong className="text-navy-200">Object</strong> — Object to processing based on legitimate interest</li>
        <li><strong className="text-navy-200">Withdraw consent</strong> — Where processing is based on consent, withdraw it at any time</li>
      </ul>
      <p className="text-navy-300 mb-4">
        To exercise any of these rights, contact us at privacy@touchline.xyz. We will respond within 30 days.
      </p>
      <p className="text-navy-300 mb-4">
        If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">8. AI and Automated Processing</h3>
      <p className="text-navy-300 mb-4">
        Touchline uses AI to generate coaching suggestions, session plans, and development insights. This processing is based on data you provide (age group, player abilities, session objectives) and does not involve automated decision-making that produces legal or similarly significant effects.
      </p>
      <p className="text-navy-300 mb-4">
        AI-generated content is always presented as suggestions for the coach to review. No decisions about a player's development, selection, or welfare are made solely by AI.
      </p>
      <p className="text-navy-300 mb-4">
        We do not use personal data about individual players to train or improve our AI models. AI improvements are based on anonymised, aggregated usage patterns only.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">9. Cookies and Analytics</h3>
      <p className="text-navy-300 mb-4">
        We use essential cookies required for the platform to function (authentication, session management). We use analytics to understand how the platform is used, based on anonymised data.
      </p>
      <p className="text-navy-300 mb-4">
        We do not use advertising cookies or tracking cookies from third parties.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">10. Changes to This Policy</h3>
      <p className="text-navy-300 mb-4">
        We may update this Privacy Policy from time to time. Material changes will be notified by email and/or a notice on the platform at least 14 days before taking effect.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">11. Contact</h3>
      <p className="text-navy-300 mb-1">Data Controller: MoonBoots Consultancy UK Ltd</p>
      <p className="text-navy-300 mb-1">Privacy enquiries: privacy@touchline.xyz</p>
      <p className="text-navy-300 mb-1">Safeguarding concerns: safeguarding@touchline.xyz</p>
      <p className="text-navy-300">General: hello@touchline.xyz</p>
    </section>
  )
}

function SafeguardingPolicy() {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-white mb-2">Safeguarding Policy</h2>
      <p className="text-navy-400 text-sm mb-8">Last updated: 17 February 2026</p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">Our Commitment</h3>
      <p className="text-navy-300 mb-4">
        The safety and wellbeing of children and young people is the highest priority at Touchline. Every feature, process, and decision is guided by this principle.
      </p>
      <p className="text-navy-300 mb-4">
        Touchline is a coaching support platform. It does not replace a club's own safeguarding procedures, the role of the Club Welfare Officer, or the responsibilities of coaches and parents. It is designed to support and strengthen good safeguarding practice, never to undermine it.
      </p>
      <p className="text-navy-300 mb-4">
        This policy applies to everyone who uses Touchline: coaches, club administrators, parents, and our own staff.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">1. Our Principles</h3>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>The welfare of children is paramount in everything we do</li>
        <li>All children, regardless of age, disability, gender, racial heritage, religious belief, sexual orientation, or identity, have the right to protection from abuse</li>
        <li>All concerns and allegations of abuse will be taken seriously and responded to promptly</li>
        <li>We work in partnership with clubs, parents, and governing bodies to safeguard children</li>
        <li>We are guided by The FA's Safeguarding Policy, the Children Act 1989 and 2004, and Working Together to Safeguard Children</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">2. How Touchline is Designed to Protect Children</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">Children never access the platform directly</p>
      <p className="text-navy-300 mb-4">
        Touchline accounts are for adult coaches, club administrators, and parents/guardians only. Children and young people do not create accounts, log in, or interact with the platform in any way.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Data minimisation</p>
      <p className="text-navy-300 mb-4">
        We collect the minimum data necessary about young players. Full dates of birth are not required for under-13s. Surnames are optional and discouraged for younger age groups. We do not collect sensitive category data unless the club provides it with appropriate consent.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Access controls</p>
      <p className="text-navy-300 mb-4">
        Player data is only visible to coaches and administrators within the same club who have a legitimate need to see it. A coach can see data for their team only. When a coach leaves a club, their access is revoked immediately.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">No direct messaging to children</p>
      <p className="text-navy-300 mb-4">
        Touchline does not facilitate any direct communication with children. All communication features are between adults: coach-to-coach, coach-to-parent, or club-to-parent. There is no functionality that allows any user to message a child.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Video and image safeguards</p>
      <p className="text-navy-300 mb-4">
        Where video analysis features are used, footage is stored securely, accessible only to authorised coaches and club administrators, and cannot be shared externally through the platform. Clubs are responsible for obtaining appropriate consent for filming in accordance with their own policies and FA guidelines.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">AI content review</p>
      <p className="text-navy-300 mb-4">
        All AI-generated coaching content is reviewed by the coach before use. AI suggestions are designed for age-appropriate football development. The AI does not generate content relating to individual player welfare, behaviour management, or any matter that could constitute a safeguarding concern.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">3. Club Requirements</h3>
      <p className="text-navy-300 mb-2">Before a club account is activated on Touchline, the club must confirm:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>They have a current, written safeguarding policy in accordance with FA guidelines</li>
        <li>They have an appointed Club Welfare Officer whose details are registered with their County FA</li>
        <li>All coaches using the platform hold an in-date DBS Enhanced Disclosure</li>
        <li>All coaches using the platform have completed FA Safeguarding Children training (or equivalent)</li>
        <li>They will obtain parental/guardian consent before entering any child's data into the platform</li>
        <li>They understand that Touchline supports but does not replace their own safeguarding procedures</li>
      </ul>
      <p className="text-navy-300 mb-4">
        These confirmations are recorded and form part of the club's agreement with Touchline. Clubs must notify us immediately if any of these conditions change.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">4. Coach Requirements</h3>
      <p className="text-navy-300 mb-2">Coaches using Touchline, whether through a club account or an individual account, are responsible for:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Holding appropriate coaching qualifications for the age group they coach</li>
        <li>Holding an in-date DBS Enhanced Disclosure</li>
        <li>Having completed FA Safeguarding Children training (or equivalent)</li>
        <li>Following their club's safeguarding policy and code of conduct</li>
        <li>Using player data only for legitimate coaching and development purposes</li>
        <li>Not sharing login credentials or allowing others to access their account</li>
        <li>Reporting any safeguarding concern through their club's procedures and to the relevant authorities</li>
      </ul>
      <p className="text-navy-300 mb-4">
        Touchline does not verify coaching qualifications or DBS status directly. This responsibility sits with the club and the individual coach.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">5. Reporting Concerns</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">If you have a safeguarding concern about a child</p>
      <p className="text-navy-300 mb-4">
        Your first action should always be to follow your club's safeguarding procedures and contact your Club Welfare Officer. If a child is in immediate danger, contact the police (999) or local authority children's services.
      </p>
      <p className="text-navy-300 mb-2">You can also contact:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>The FA Safeguarding Team: 0800 169 1863</li>
        <li>NSPCC Helpline: 0808 800 5000</li>
        <li>Childline: 0800 1111</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">If you have a concern about Touchline</p>
      <p className="text-navy-300 mb-4">
        If you believe any aspect of the Touchline platform poses a safeguarding risk, or if you become aware of the platform being misused in a way that could harm a child, contact us immediately:
      </p>
      <p className="text-navy-300 mb-4">Email: safeguarding@touchline.xyz</p>
      <p className="text-navy-300 mb-4">
        We will acknowledge your concern within 24 hours and take appropriate action. Where necessary, we will cooperate with clubs, County FAs, local authorities, and law enforcement.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">If we identify a concern</p>
      <p className="text-navy-300 mb-2">
        If through our operations we become aware of any potential safeguarding issue (for example, inappropriate use of the platform, unusual access patterns, or content that raises concern), we will:
      </p>
      <ol className="list-decimal list-inside text-navy-300 mb-4 space-y-1">
        <li>Act immediately to protect the child or children involved</li>
        <li>Notify the relevant Club Welfare Officer</li>
        <li>Report to the appropriate authorities where required by law</li>
        <li>Cooperate fully with any investigation</li>
        <li>Preserve relevant data as evidence</li>
      </ol>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">6. Data and Safeguarding Investigations</h3>
      <p className="text-navy-300 mb-2">Where a safeguarding investigation is underway, we will:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Provide access to relevant data held on the platform when requested by an authorised body (police, local authority, FA)</li>
        <li>Preserve data that may be relevant to the investigation, overriding normal retention periods</li>
        <li>Not alert the subject of an investigation where doing so could compromise the safety of a child or the investigation itself</li>
        <li>Maintain confidentiality as far as possible while complying with legal obligations</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">7. Our Staff</h3>
      <p className="text-navy-300 mb-2">All Touchline staff and contractors who have access to user data are:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Subject to appropriate background checks</li>
        <li>Trained in safeguarding awareness and data protection</li>
        <li>Bound by confidentiality agreements</li>
        <li>Required to report any safeguarding concern immediately</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">8. Review</h3>
      <p className="text-navy-300 mb-4">
        This Safeguarding Policy is reviewed at least annually and updated to reflect changes in legislation, best practice, or platform features. Material changes are communicated to all club accounts.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">9. Contact</h3>
      <p className="text-navy-300 mb-1">Safeguarding concerns: safeguarding@touchline.xyz</p>
      <p className="text-navy-300 mb-4">General enquiries: hello@touchline.xyz</p>
      <p className="text-navy-300 mb-2">External contacts:</p>
      <ul className="list-disc list-inside text-navy-300 space-y-1">
        <li>The FA Safeguarding Team: 0800 169 1863</li>
        <li>NSPCC Helpline: 0808 800 5000</li>
        <li>Childline: 0800 1111</li>
        <li>Local authority children's services (via your local council)</li>
      </ul>
    </section>
  )
}

function CookiePolicy() {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-white mb-2">Cookie Policy</h2>
      <p className="text-navy-400 text-sm mb-8">Last updated: 17 February 2026</p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">What Are Cookies</h3>
      <p className="text-navy-300 mb-4">
        Cookies are small text files stored on your device when you visit a website. We use the minimum cookies necessary to make Touchline work properly.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">Cookies We Use</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">Essential Cookies (always active)</p>
      <p className="text-navy-300 mb-2">These are required for the platform to function. You cannot opt out of these.</p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm text-navy-300 border border-navy-700">
          <thead>
            <tr className="bg-navy-800">
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Cookie</th>
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Purpose</th>
              <th className="text-left p-3 text-navy-200 font-medium border-b border-navy-700">Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-navy-800"><td className="p-3">Session token</td><td className="p-3">Keeps you logged in</td><td className="p-3">Until you log out or session expires</td></tr>
            <tr className="border-b border-navy-800"><td className="p-3">CSRF token</td><td className="p-3">Protects against cross-site attacks</td><td className="p-3">Session</td></tr>
            <tr><td className="p-3">Preferences</td><td className="p-3">Remembers your display settings</td><td className="p-3">12 months</td></tr>
          </tbody>
        </table>
      </div>

      <p className="text-navy-200 font-medium mt-4 mb-2">Analytics (anonymised)</p>
      <p className="text-navy-300 mb-4">
        We collect anonymised usage data to understand how the platform is used and where we can improve it. This data cannot identify you personally.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">Cookies We Don't Use</h3>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>No advertising or marketing cookies</li>
        <li>No third-party tracking cookies</li>
        <li>No social media cookies</li>
        <li>No cookies that track you across other websites</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">Managing Cookies</h3>
      <p className="text-navy-300 mb-4">
        You can control cookies through your browser settings. Blocking essential cookies will prevent Touchline from working properly.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">Contact</h3>
      <p className="text-navy-300">Questions about cookies: oliver@touchline.xyz</p>
    </section>
  )
}

function AIPolicy() {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-white mb-2">Artificial Intelligence Policy</h2>
      <p className="text-navy-400 text-sm mb-8">Last updated: 17 February 2026</p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">Overview</h3>
      <p className="text-navy-300 mb-4">
        Touchline uses artificial intelligence to support school PE teachers and sports coaches with lesson planning, pupil development insights, and video analysis. This policy explains how AI is used within the platform, what safeguards are in place, and the role of human oversight.
      </p>
      <p className="text-navy-300 mb-4">
        We believe AI should enhance coaching, not replace it. Every AI feature in Touchline is designed to support the coach's judgement, never to override it.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">1. How AI is Used in Touchline</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">Session Planning</p>
      <p className="text-navy-300 mb-4">
        AI generates training session suggestions based on inputs provided by the coach, including age group, session objectives, player ability level, and available equipment. Sessions are tailored to FA coaching frameworks and age-appropriate development principles.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Player Development Insights</p>
      <p className="text-navy-300 mb-4">
        Where coaches record development notes and session observations, AI can identify patterns and suggest focus areas. For example, it may highlight that a player's passing accuracy has improved over recent sessions, or suggest drills that target areas the coach has noted for development.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Video Analysis</p>
      <p className="text-navy-300 mb-4">
        Where coaches upload match or training footage, AI assists with tactical observations such as positioning, movement patterns, and set-piece analysis. AI does not identify or tag individual children by name in video; this is done by the coach.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">Content Generation</p>
      <p className="text-navy-300 mb-4">
        AI helps coaches create parent communications, session summaries, and development reports. All generated content is presented as a draft for the coach to review and edit before sharing.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">2. What AI Does Not Do</h3>
      <p className="text-navy-300 mb-2">To be clear about the boundaries of AI within Touchline:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-2">
        <li><strong className="text-navy-200">AI does not make decisions about children.</strong> It does not select, deselect, or rank players. It does not make welfare assessments. It does not determine playing time or team composition.</li>
        <li><strong className="text-navy-200">AI does not communicate with children.</strong> There is no AI chatbot, messaging feature, or interactive element that children can access.</li>
        <li><strong className="text-navy-200">AI does not communicate with parents directly.</strong> All parent communications are drafted by AI but reviewed and sent by the coach.</li>
        <li><strong className="text-navy-200">AI does not process sensitive personal data.</strong> It does not analyse health information, behavioural data, or any sensitive category data about children.</li>
        <li><strong className="text-navy-200">AI does not make safeguarding assessments.</strong> Any concern about a child's welfare must be handled by the coach and Club Welfare Officer through proper safeguarding procedures, not by the platform.</li>
        <li><strong className="text-navy-200">AI does not replace coaching qualifications.</strong> The platform supports coaches but does not substitute for proper training, experience, or the FA coaching pathway.</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">3. Human Oversight</h3>
      <p className="text-navy-300 mb-2">Human oversight is built into every AI feature:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-2">
        <li><strong className="text-navy-200">Review before use.</strong> All AI-generated session plans, development insights, and communications are presented as suggestions. Nothing is published, shared, or acted upon without the coach reviewing and approving it.</li>
        <li><strong className="text-navy-200">Edit and override.</strong> Coaches can modify, reject, or completely rewrite any AI suggestion. The coach always has the final say.</li>
        <li><strong className="text-navy-200">No automated actions.</strong> AI does not trigger any action on its own. It does not send messages, update records, or change settings without explicit human input.</li>
        <li><strong className="text-navy-200">Feedback loop.</strong> Coaches can flag AI suggestions as unhelpful or inappropriate, which helps us improve the system.</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">4. Data and AI Training</h3>

      <p className="text-navy-200 font-medium mt-4 mb-2">What data the AI uses</p>
      <p className="text-navy-300 mb-4">
        When generating suggestions for a coach, the AI uses only the information that coach has provided within their account: session objectives, age group, player notes, and any uploaded content. It draws on general football coaching knowledge to produce relevant suggestions.
      </p>

      <p className="text-navy-200 font-medium mt-4 mb-2">What data the AI does not use</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li><strong className="text-navy-200">Individual player data is never used to train or improve our AI models.</strong> We do not feed children's names, development notes, or any personal information into model training.</li>
        <li><strong className="text-navy-200">Club data is never shared between clubs.</strong> AI suggestions for one club are not influenced by data from another club.</li>
        <li><strong className="text-navy-200">Video footage is not used for AI training.</strong> Uploaded videos are analysed for the coach's benefit only and are not retained for model improvement.</li>
      </ul>

      <p className="text-navy-200 font-medium mt-4 mb-2">How AI models are improved</p>
      <p className="text-navy-300 mb-4">
        AI improvements are based on anonymised, aggregated usage patterns only. For example, we may analyse which types of session plans coaches find most useful across the platform, but this analysis contains no personal data about any individual player, coach, or club.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">5. Third-Party AI Services</h3>
      <p className="text-navy-300 mb-2">
        Touchline uses third-party AI services (large language models) to power some of its features. When data is sent to these services:
      </p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Only the minimum necessary information is transmitted</li>
        <li>No children's names or personally identifiable information is included in prompts sent to third-party AI services</li>
        <li>All data transmission is encrypted</li>
        <li>We have data processing agreements in place with all AI service providers</li>
        <li>Third-party providers are contractually prohibited from using our data to train their own models</li>
      </ul>
      <p className="text-navy-300 mb-4">
        We regularly review our AI service providers to ensure they meet our standards for data protection and security.
      </p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">6. Age-Appropriate Content</h3>
      <p className="text-navy-300 mb-2">All AI-generated coaching content is designed to be age-appropriate:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Session plans respect FA guidelines for each age group (pitch sizes, game formats, contact levels, session duration)</li>
        <li>Development language is positive and growth-focused, never critical or comparative between players</li>
        <li>AI does not generate content that pressures children to perform or that prioritises results over development</li>
        <li>Content follows the FA's Player Development Model principles, emphasising enjoyment, learning, and long-term development</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">7. Accuracy and Limitations</h3>
      <p className="text-navy-300 mb-2">AI is a powerful tool but it has limitations:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-2">
        <li><strong className="text-navy-200">AI can make mistakes.</strong> Session plans may occasionally include exercises that are not suitable for a specific age group or ability level. The coach must always review suggestions before use.</li>
        <li><strong className="text-navy-200">AI does not know your players.</strong> While it can use the notes and observations you provide, it does not have the personal knowledge of your players that you have as their coach. Your judgement takes priority.</li>
        <li><strong className="text-navy-200">AI cannot assess physical readiness.</strong> It does not know if a player is injured, unwell, or not ready for a particular activity. Safety assessments are always the coach's responsibility.</li>
        <li><strong className="text-navy-200">AI is not a medical professional.</strong> It does not provide medical advice, injury diagnosis, or rehabilitation programmes.</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">8. Transparency</h3>
      <p className="text-navy-300 mb-2">We are committed to being transparent about AI:</p>
      <ul className="list-disc list-inside text-navy-300 mb-4 space-y-1">
        <li>Where content has been generated or suggested by AI, it is clearly labelled as such within the platform</li>
        <li>Coaches are informed during onboarding about how AI is used and its limitations</li>
        <li>This policy is publicly available and linked from our Terms of Service</li>
        <li>We will communicate any significant changes to how AI is used within the platform</li>
      </ul>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">9. Accountability</h3>
      <p className="text-navy-300 mb-4">
        MoonBoots Consultancy UK Ltd is accountable for the AI used within Touchline. If you have questions, concerns, or feedback about how AI is used:
      </p>
      <p className="text-navy-300 mb-1">Email: hello@touchline.xyz</p>
      <p className="text-navy-300 mb-4">Safeguarding concerns involving AI: safeguarding@touchline.xyz</p>

      <h3 className="font-display text-lg font-semibold text-white mt-8 mb-3">10. Review</h3>
      <p className="text-navy-300">
        This AI Policy is reviewed at least annually and whenever we introduce new AI features or change AI service providers. Updates are communicated to all users.
      </p>
    </section>
  )
}

export default function Terms() {
  const [activeTab, setActiveTab] = useState('terms')

  return (
    <div className="min-h-screen bg-navy-950">
      <SEO
        title="Policies"
        path="/terms"
        description="Touchline terms of service, privacy policy, safeguarding policy, and cookie policy for coaches, clubs, and parents."
      />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <TouchlineMark className="w-10 h-6" />
              <span className="font-display font-semibold text-navy-50 text-xl">Touchline</span>
            </Link>
            <Link to="/register" className="text-navy-300 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Register
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
            Touchline Policies
          </h1>
          <p className="text-navy-400">
            MoonBoots Consultancy UK Ltd
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-10 border-b border-navy-800 pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-pitch-600 text-white'
                    : 'bg-navy-800/50 text-navy-400 hover:text-white hover:bg-navy-800'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Policy Content */}
        <div className="prose prose-invert prose-navy max-w-none">
          {activeTab === 'terms' && <TermsOfService />}
          {activeTab === 'privacy' && <PrivacyPolicy />}
          {activeTab === 'safeguarding' && <SafeguardingPolicy />}
          {activeTab === 'cookies' && <CookiePolicy />}
          {activeTab === 'ai' && <AIPolicy />}
        </div>

        {/* Back to Register */}
        <div className="mt-12 pt-8 border-t border-navy-800">
          <Link to="/register" className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back to Registration
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-navy-900">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-navy-500 text-sm">
            &copy; {new Date().getFullYear()} Touchline. Built for school sport.
          </p>
          <p className="text-navy-600 text-xs mt-2">
            Built by <a href="https://moonbootsconsultancy.net" target="_blank" rel="noopener noreferrer" className="hover:text-navy-400 transition-colors underline">MoonBoots Consultancy</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
