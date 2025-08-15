# CryptoLiquidations Dashboard

## Overview

CryptoLiquidations is a real-time cryptocurrency liquidation monitoring application that visualizes liquidation events from cryptocurrency exchanges through an interactive canvas-based interface. The application provides live streaming of liquidation data via WebSocket connections and displays market statistics with animated visual effects. Users can monitor long and short liquidation positions across various cryptocurrencies with real-time updates and market sentiment analysis.

## Recent Changes (August 2025)

### Performance and Animation Optimizations
- **Reduced animation speeds by 2-2.5x** for comfortable viewing experience (small liquidations: 2.0px/s, large: 0.6px/s)
- **Fixed chart opacity affecting animation speed bug** by implementing ref-based state management for chartOpacity and showGrid
- **Added page visibility API integration** to prevent animation buildup when tab is hidden - only real-time liquidations (max 10 seconds old) are displayed
- **Optimized chart rendering** with independent opacity controls that don't trigger animation function recreation

### User Interface Improvements  
- **Settings moved to modal window** instead of canvas overlay for cleaner interface
- **Chart transparency controls** working independently from animation system
- **Grid toggle functionality** accessible through Settings modal
- **Professional monochrome chart styling** with hollow/filled candlesticks for clear background appearance

### Money Bag Visual Design - STABLE VERSION (August 15, 2025)
- **Finalized money bag design** - simple rounded rectangle bags with classic gradient styling
- **Brown bags for long liquidations, green bags for short liquidations** with radial gradient shading
- **Text formatting optimized** - removed dollar sign for better readability, shows only coin symbol (BTC, ETH) and amount
- **Enhanced text size and positioning** - coin symbol at 22% of bag width, amount at 20% of bag width
- **Clean typography** - JetBrains Mono font with black outline and white/gold fill for maximum readability
- **Proper text positioning** - all text stays within bag boundaries, no overflow
- **Simple rope tie detail** with brown color and elliptical neck design

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom cyber-themed color palette and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Native WebSocket API for live liquidation feeds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Structure**: RESTful endpoints with WebSocket server integration
- **Real-time Services**: Custom LiquidationService class managing WebSocket connections
- **Data Processing**: In-memory storage for recent liquidations and market statistics

### Data Layer
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Centralized schema definitions in shared directory
- **Data Storage**: Hybrid approach using both database persistence and in-memory caching for real-time data

### Canvas Rendering System
- **Graphics**: HTML5 Canvas API for high-performance animations
- **Animation Engine**: Custom animation system with particle effects and physics simulation
- **Performance**: RAF-based rendering loop with optimized draw calls
- **Visual Effects**: Dynamic liquidation blocks with explosion animations and particle systems

### Component Architecture
- **Design System**: Modular component library with consistent theming
- **Layout**: Responsive design with fixed header and full-screen canvas
- **Data Visualization**: Custom charts and progress indicators for market sentiment
- **Real-time Updates**: Component-level WebSocket integration with automatic reconnection

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for persistent data storage
- **Connection Pooling**: Built-in connection management through Neon serverless driver

### Cryptocurrency Data Sources
- **Binance WebSocket**: Real-time liquidation feeds from Binance exchange
- **CoinGlass API**: Market data and liquidation statistics polling
- **Exchange Integration**: Configurable multi-exchange data aggregation

### Development Tools
- **Replit Integration**: Native Replit development environment support
- **Vite Plugins**: Hot module replacement and development server enhancements
- **Build System**: ESBuild for production server bundling

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Google Fonts**: Inter, Georgia, and JetBrains Mono font families
- **Lucide Icons**: Consistent iconography throughout the application

### Performance and Monitoring
- **Error Handling**: Runtime error overlays in development environment
- **WebSocket Management**: Automatic reconnection and connection state monitoring
- **Memory Management**: Circular buffer implementation for liquidation history