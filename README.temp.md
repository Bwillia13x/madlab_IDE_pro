# MAD Lab IDE Pro

A comprehensive financial analysis platform built with Next.js, TypeScript, and modern web technologies.

## Features

- **Advanced Financial Widgets**: Comprehensive suite of financial analysis tools
- **Real-time Data Integration**: Support for multiple financial data providers
- **VS Code-like Interface**: Familiar development environment for financial analysis
- **Enterprise Architecture**: Scalable and robust platform for professional use

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests

## Project Structure

```
├── app/                    # Next.js app directory
├── components/            # React components
│   ├── chrome/           # VS Code-like chrome components
│   ├── widgets/          # Financial analysis widgets
│   └── ui/               # UI components
├── lib/                  # Utilities and business logic
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## Technologies Used

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts
- **UI Components**: shadcn/ui

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
