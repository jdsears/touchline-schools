import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import { ArrowLeft } from 'lucide-react'

export default function Terms() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [])
  return (
    <>
      <SEO
        title="Terms, Privacy & Policies"
        description="Terms of Service, Privacy Policy, Safeguarding Policy, Cookie Policy, and AI Policy for MoonBoots Sports."
        path="/terms"
        noIndex={true}
      />

      <div className="min-h-screen bg-page">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-secondary hover:text-white transition-colors text-sm mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
            Terms, Privacy &amp; Policies
          </h1>
          <p className="text-secondary text-sm mb-10">MoonBoots Sports - MoonBoots Consultancy UK Ltd</p>

          {/* Terms of Service */}
          <PolicySection title="Terms of Service" lastUpdated="12 June 2026">
            <p>
              These Terms of Service govern your access to and use of MoonBoots Sports (app.moonbootssports.com),
              operated by MoonBoots Consultancy UK Ltd ("we", "us", "our"), a company registered in England and Wales.
            </p>
            <p>
              By accessing or using MoonBoots Sports, you agree to be bound by these Terms.
              If you are accepting these Terms on behalf of a school or organisation, you represent that you have
              the authority to bind that organisation.
            </p>
            <p>
              MoonBoots Sports is a platform for school PE departments and sports coaches. It provides lesson and
              session planning, pupil development insights, video analysis, assessment, and safeguarding tools.
              It does not replace qualified coaching, medical advice, or safeguarding procedures. All coaching
              decisions remain the responsibility of the teacher or coach.
            </p>
            <p>
              Access is provided under an enterprise school licence. Accounts are created by school administrators.
              Users must be at least 13 years of age, or have appropriate parental consent.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that breach these Terms, misuse the platform,
              or engage in conduct harmful to other users.
            </p>
            <p>
              These Terms are governed by the laws of England and Wales.
              Contact: <a href="mailto:js@moonbootsconsultancy.com" className="text-pitch-400 hover:underline">js@moonbootsconsultancy.com</a>
            </p>
          </PolicySection>

          {/* Privacy Policy */}
          <PolicySection title="Privacy Policy" lastUpdated="12 June 2026">
            <p>
              MoonBoots Consultancy UK Ltd is the data controller for personal data collected through MoonBoots Sports.
              We are committed to protecting the privacy of all users, with particular care given to pupil data.
            </p>
            <p>
              We collect data necessary to operate the platform: account details, usage activity, uploaded content
              (video, documents), assessment data, and communication logs. We do not sell personal data to third parties.
            </p>
            <p>
              Pupil data is processed only to provide the educational and coaching services described in the platform.
              Schools act as data controllers for their pupils; MoonBoots Sports acts as a data processor.
            </p>
            <p>
              We use Anthropic's Claude API for AI features. Conversation data sent to Claude is subject to
              Anthropic's data processing terms. We do not permit Anthropic to use school or pupil data for model training.
            </p>
            <p>
              Data is stored on servers within the European Economic Area (EEA) or under appropriate data transfer
              safeguards. You have the right to access, rectify, or erase your data. Contact us at{' '}
              <a href="mailto:js@moonbootsconsultancy.com" className="text-pitch-400 hover:underline">js@moonbootsconsultancy.com</a>.
            </p>
            <p>
              Data is retained for the duration of the school's active subscription plus 90 days, after which it is
              deleted. School administrators may request immediate deletion.
            </p>
          </PolicySection>

          {/* Safeguarding */}
          <PolicySection title="Safeguarding Policy" lastUpdated="12 June 2026">
            <p>
              MoonBoots Sports is designed for use with children and young people in school settings.
              We take safeguarding seriously and have implemented platform features to support schools' statutory duties.
            </p>
            <p>
              The platform includes: DBS certificate tracking, safeguarding incident logging, audit trails, and
              visibility controls so teachers can review all pupil AI conversations. These are tools to assist
              safeguarding; they do not replace the school's own safeguarding procedures or the role of the
              Designated Safeguarding Lead (DSL).
            </p>
            <p>
              If you become aware of a safeguarding concern related to use of this platform, follow your school's
              safeguarding procedures immediately. You may also contact us at{' '}
              <a href="mailto:js@moonbootsconsultancy.com" className="text-pitch-400 hover:underline">js@moonbootsconsultancy.com</a>.
            </p>
          </PolicySection>

          {/* Cookie Policy */}
          <PolicySection title="Cookie Policy" lastUpdated="12 June 2026">
            <p>
              MoonBoots Sports uses cookies and similar technologies to operate the platform and, where you consent,
              to analyse usage.
            </p>
            <p>
              <strong className="text-white">Strictly necessary:</strong> Session authentication, security tokens,
              and load balancing. These cannot be disabled.
            </p>
            <p>
              <strong className="text-white">Analytics (optional):</strong> We use Google Analytics 4 to understand
              how the platform is used. This is only activated with your consent. You can withdraw consent at any time
              by clearing your cookie preferences.
            </p>
            <p>
              We do not use advertising or tracking cookies.
            </p>
          </PolicySection>

          {/* AI Policy */}
          <PolicySection title="AI Policy" lastUpdated="12 June 2026">
            <p>
              MoonBoots Sports uses Anthropic's Claude AI to power coaching assistance, session planning, assessment
              comment drafting, and video analysis features.
            </p>
            <p>
              AI-generated content is clearly labelled within the platform. Teachers and coaches are responsible for
              reviewing and approving any AI-generated output before using it with pupils.
            </p>
            <p>
              Pupil data is not used to train AI models. AI conversations with pupils are visible to their teachers.
              The AI assistant is configured to produce age-appropriate, sport-specific content based on governing
              body frameworks.
            </p>
            <p>
              Schools can add their own coaching documents to extend the AI's knowledge base. Uploaded documents
              remain the property of the school; we do not use them for any purpose other than generating responses
              within that school's account.
            </p>
            <p>
              Questions about AI use:{' '}
              <a href="mailto:js@moonbootsconsultancy.com" className="text-pitch-400 hover:underline">js@moonbootsconsultancy.com</a>
            </p>
          </PolicySection>

          <div className="mt-12 pt-8 border-t border-border-default text-xs text-tertiary">
            <p>MoonBoots Consultancy UK Ltd - Registered in England and Wales</p>
            <p className="mt-1">
              Questions?{' '}
              <a href="mailto:js@moonbootsconsultancy.com" className="text-secondary hover:text-white transition-colors">
                js@moonbootsconsultancy.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function PolicySection({ title, lastUpdated, children }) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      <p className="text-xs text-tertiary mb-5">Last updated: {lastUpdated}</p>
      <div className="space-y-4 text-sm text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  )
}
