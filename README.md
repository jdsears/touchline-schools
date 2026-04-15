# Touchline for Schools

A multi-sport platform for UK secondary school PE departments. Built with React, Node.js, PostgreSQL, and Claude AI.

Touchline for Schools gives PE departments and sports staff a single platform to run every team sport across the school. Teachers plan sessions, manage fixtures, track attendance, and report on pupil development. Pupils get a personal portal to track their own progress across every sport they play.

## Sports Supported

- Football
- Rugby
- Cricket
- Hockey
- Netball

Architecture supports adding further sports without core rewrites.

## Core Features

- **Multi-sport team management**: one platform for every sport, every year group
- **Teacher hub**: session planning, fixtures, attendance, reports, AI-assisted coaching
- **Pupil portal**: personal development tracking across all sports
- **AI coaching assistant**: sport-aware guidance for teachers and pupils
- **Tactics board**: sport-specific pitch and formation tools
- **Video analysis**: upload, tag, and review match and training footage
- **Live streaming**: broadcast school fixtures via Mux
- **Safeguarding**: audit trails, incident logging, role-based access
- **Enterprise-grade**: SSO-ready, GDPR-compliant data handling, Head of Department visibility

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Railway)
- **AI**: Anthropic Claude API
- **Video**: Mux
- **Email**: Amazon SES via Resend
- **Deployment**: Railway + Cloudflare

## Project Structure

```
touchline-schools/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── services/      # API services
│   │   └── hooks/         # Custom hooks
│   └── ...
├── server/                 # Node.js backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── db/                # Database migrations
│   └── config/            # Configuration
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Anthropic API key

### Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd touchline-schools
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your values
```

4. Run database migrations:
```bash
npm run db:migrate
```

5. Start development servers:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Environment Variables

See `server/.env.example` and `client/.env.example` for all required configuration.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `ANTHROPIC_API_KEY` | Claude API key |
| `FRONTEND_URL` | Frontend URL for CORS |
| `RESEND_API_KEY` | Email service API key |

## Deployment

Touchline for Schools runs on its own Railway project, separate from the main Touchline product.

- Separate Railway project and PostgreSQL database
- Domain: `schools.touchline.xyz` (placeholder)
- Cloudflare DNS and CDN
- Separate Anthropic API key, Mux project, and Resend domain

## Target Users

- **Head of PE / Head of Sport**: whole-school visibility across every sport, every team, every year group
- **PE Teachers / Sports coaches**: session planning, fixture management, pupil development tracking
- **Pupils (Years 7 to 13)**: personal sport portal with stats, goals, coach feedback, and training plans

## License

Proprietary - MoonBoots Consultancy UK Ltd
