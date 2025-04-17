# Google Calendar Tonton

A Chrome extension that automatically sends [Tonton](https://tonton.amaneku.com/)'s schedule from Google Calendar.

## Features

- Automatically extracts schedule information from Google Calendar
- Converts calendar events to a structured format
- Uses ical.js for reliable calendar data parsing
- Built as a Chrome extension for seamless integration

## Technology Stack

- React 19
- TypeScript
- Vite

## Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Start development server:

```bash
pnpm dev
```

3. Build for production:

```bash
pnpm build
```

## Installation

1. Run `pnpm build` to create the production build
2. Open `chrome://extensions` in Chrome browser
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `dist` folder

## Usage

1. Open Google Calendar
2. The extension will automatically process the calendar data
3. Schedule information will be extracted and processed according to the configuration

## Technical Details

- Built with React and TypeScript for robust type safety
- Vite for fast development and optimized builds
- Chrome Extension Manifest V3 compliant
- Uses ical.js for reliable calendar data parsing
- Biome for consistent code formatting and linting

## Requirements

- Node.js 20 or higher
- pnpm package manager

## License

Please see the [LICENSE](LICENSE) file for details.
