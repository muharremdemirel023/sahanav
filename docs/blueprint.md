# **App Name**: SahaNav

## Core Features:

- Local TXT Ingest: Immediate client-side reading of TXT files using Drag & Drop and FileReader with zero server dependency.
- Smart Address Parser Tool: An AI-enhanced processing tool that uses logic and reasoning to clean messy TXT inputs into structured District, Neighborhood, and Street objects.
- Regex Normalization Engine: Deterministic pattern matching to unify variations of neighborhood names like 'MAH.' or 'MAHALLESİ' into a standard format.
- Dynamic Cascading Filters: Dual-tier dropdown system that live-filters address lists based on user-selected districts and neighborhoods.
- One-Tap Map Router: Smart link generator that constructs precision Google Maps queries focusing on Street Name and Door Numbers for field accuracy.
- Data Deduplication: In-memory processing that identifies and removes duplicate business and address records upon file load.
- Field-Ready Visual HUD: High-contrast card interface showing match counts and full address details optimized for mobile sunlight visibility.

## Style Guidelines:

- Primary Color: Deep Cobalt (#1E40AF), chosen for its authoritative utility and excellent contrast in outdoor/daylight environments.
- Background Color: Cool Greyish White (#F3F5F9), providing a crisp, low-glare canvas for field workers.
- Accent Color: Vibrant Cyan (#0891B2), used for navigation buttons and interactive filtering elements to ensure quick action.
- Font Recommendation: 'Inter' (sans-serif) for its extreme legibility at small sizes and high clarity on mobile device screens.
- Sharp, 24px line icons to indicate 'Upload', 'Location', and 'Navigation' for intuitive operation without reading.
- Mobile-first, stacked-card layout with large tap targets and fixed header for constant filter access.
- Zero-latency UI transitions; gentle list-item entries to prevent disorientation when filters change.