# Greecode AI Copilot: Real-Time Interview Assistant

## Overview

Greecode AI Copilot is a powerful real-time interview assistant that helps users excel in job interviews by providing instant, tailored responses through a browser extension. The platform consists of two main components:

1. **Web Application**: For generating and managing interview-specific passkeys
2. **Browser Extension**: For accessing real-time answers during actual interviews

## Key Features

### Passkey Generation
- Create unique 6-digit passkeys linked to specific interview details
- Enter job role, company, job description, and interview date/time
- Upload resume for context-aware answers
- Flexible payment options with coupon support

### Coupon System
- "CRACKNOW": 84% discount (₹299 → ₹49)
- "BUNNY": 100% discount (₹299 → ₹0)
- Real-time discount calculation

### User Profile
- View and manage personal information
- Access all active passkeys
- Copy passkeys with one click

### Browser Extension Integration
- Simple login with email and passkey
- Access interview-specific answers in real-time
- Tailored responses based on job role and company

## Getting Started

Follow these steps to set up the project locally:

```sh
# Step 1: Clone the repository
git clone https://github.com/sridurgavik/greecode-ai-copilot.git

# Step 2: Navigate to the project directory
cd greecode-ai-copilot

# Step 3: Install dependencies
npm install

# Step 4: Start the development server
npm run dev
```

## Technologies Used

This project is built with:

- React
- TypeScript
- Firebase Authentication
- Supabase Database
- Framer Motion
- Tailwind CSS
- shadcn/ui Components

## How It Works

1. **User Registration**: Create an account with email verification
2. **Passkey Generation**: Enter interview details and generate a unique passkey
3. **Browser Extension**: Use the passkey in our extension during your interview
4. **Real-Time Answers**: Receive tailored responses based on your interview context

## Project Structure

- `/src/components`: UI components including the main CopilotSection
- `/src/pages`: Main application pages (Auth, Main)
- `/src/integrations`: Firebase and Supabase integrations
- `/src/hooks`: Custom React hooks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
