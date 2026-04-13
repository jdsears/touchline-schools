# Football Assistant Manager (FAM)

An AI-powered assistant manager for grassroots football coaches. Built with React, Node.js, PostgreSQL, and Claude AI.

## Features

- 🤖 **AI Assistant Manager** - Chat with Claude about tactics, training, and player development
- ⚽ **Tactical Engine** - Build formations and game models with visual tools
- 📋 **Training Generator** - AI-generated session plans tailored to your needs
- 👥 **Player Profiles** - Track development and generate Individual Development Plans
- 🏆 **Match Management** - Pre-match prep, result logging, and post-match analysis
- 📹 **Video Analysis** - Embed Veo footage and get AI tactical insights
- 👨‍👩‍👧‍👦 **Coach & Player Lounges** - Separate dashboards for staff and players

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **AI**: Anthropic Claude API
- **Deployment**: Railway

## Project Structure

```
football-assistant-manager/
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
cd football-assistant-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
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

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `FRONTEND_URL` | Frontend URL for CORS |

## Deployment to Railway

1. Create a new Railway project
2. Add a PostgreSQL database
3. Connect your GitHub repository
4. Set environment variables in Railway dashboard
5. Deploy!

Railway will automatically:
- Build the React frontend
- Start the Node.js server
- Set up the database connection

### Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add

# Deploy
railway up
```

## API Routes

### Authentication
- `POST /api/auth/register` - Register new user + team
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/magic-link` - Send magic link
- `POST /api/auth/invite/accept` - Accept team invite

### Teams
- `GET /api/teams/:id` - Get team
- `PUT /api/teams/:id` - Update team
- `GET /api/teams/:id/players` - Get players
- `POST /api/teams/:id/players` - Add player
- `GET /api/teams/:id/matches` - Get matches
- `POST /api/teams/:id/matches` - Add match

### Chat
- `POST /api/chat/:teamId/message` - Send message to AI
- `GET /api/chat/:teamId/history` - Get chat history

### Players
- `GET /api/players/:id` - Get player
- `PUT /api/players/:id` - Update player
- `GET /api/players/:id/observations` - Get observations
- `POST /api/players/:id/observations` - Add observation
- `POST /api/players/:id/idp/generate` - Generate IDP

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - MoonBoots Consultancy UK Ltd

## Support

For support, contact john@moonboots.io
