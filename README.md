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

## Chrome Web Store

You can install this extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/lfgjlkfemoaaindkcgdncghkomgmmemi).

## Manual Installation

1. Run `bun run build` to create the production build
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

## Browser Compatibility

While this extension is primarily tested on Chrome, it uses [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) which should make it compatible with other modern browsers that support Web Extensions (though this hasn't been extensively tested).

## Development

### Prerequisites

* Node.js 20 or higher
* Bun package manager

### Development Setup

1. Clone the repository and install dependencies:
    ```bash
    git clone https://github.com/minagishl/google-calendar-tonton.git
    cd google-calendar-tonton
    bun install
    ```

2. Start development mode:
    ```bash
    bun run dev
    ```

3. Build for production:
    ```bash
    bun run build
    ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
