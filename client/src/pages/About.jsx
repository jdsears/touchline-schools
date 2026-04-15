import { Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import { ArrowRight } from 'lucide-react'

export default function About() {
  return (
    <>
      <SEO
        title="About MoonBoots Sports"
        description="MoonBoots Sports is a UK-based school sport platform built by teachers, for teachers. We help PE departments run curriculum PE and extra-curricular sport from one place."
        path="/about"
      />

      <div className="min-h-screen bg-navy-950">
        {/* Nav */}
        <nav className="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--mb-gold)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--mb-navy)', fontFamily: 'Poppins, system-ui, sans-serif' }}>M</span>
              </div>
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                MoonBoots <span style={{ color: 'var(--mb-gold)' }}>Sports</span>
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm text-navy-300 hover:text-white transition-colors">Log in</Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--mb-gold)', color: 'var(--mb-navy)' }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 py-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
            About <span style={{ color: 'var(--mb-gold)' }}>MoonBoots Sports</span>
          </h1>

          <div className="space-y-6 text-navy-300 text-base leading-relaxed">
            <p>
              MoonBoots Sports is a school sport platform built in the UK, for UK schools.
              We help PE departments manage everything in one place — curriculum PE, extra-curricular teams,
              assessment, safeguarding, and AI-assisted coaching across football, rugby, cricket, hockey, and netball.
            </p>

            <p>
              We started MoonBoots because PE teachers and coaches spend too much time switching between
              spreadsheets, email threads, and disconnected apps. We believe the people responsible for sport
              in schools deserve proper tools — the same quality of software that professional clubs take for granted.
            </p>

            <p>
              The platform is designed around how schools actually work: one Head of PE overseeing multiple teachers,
              each running a mix of timetabled curriculum lessons and after-school fixtures. It supports the whole
              department, not just one team.
            </p>

            <p>
              MoonBoots Sports is built and operated by MoonBoots Consultancy UK Ltd, registered in England and Wales.
            </p>

            <div className="pt-4">
              <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
              <p>
                For sales and demos:{' '}
                <a href="mailto:hello@moonbootssports.com" className="underline hover:text-white transition-colors" style={{ color: 'var(--mb-gold)' }}>
                  hello@moonbootssports.com
                </a>
              </p>
              <p className="mt-2">
                For support:{' '}
                <a href="mailto:support@moonbootssports.com" className="underline hover:text-white transition-colors" style={{ color: 'var(--mb-gold)' }}>
                  support@moonbootssports.com
                </a>
              </p>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
              style={{ backgroundColor: 'var(--mb-gold)', color: 'var(--mb-navy)' }}
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/" className="text-sm text-navy-400 hover:text-white transition-colors">
              Back to home
            </Link>
          </div>
        </main>

        <footer className="border-t border-navy-800 py-8">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <span className="text-sm text-navy-500">MoonBoots Consultancy UK Ltd</span>
            <div className="flex items-center gap-6 text-xs text-navy-500">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
