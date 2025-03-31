# Social App Quick

A modern social media application built with React, Firebase, and Neo4j. Features include user authentication, posts, comments, a following system, and notifications.

## Features

- 🔐 User Authentication (Email/Password & Google Sign-in)
- 📝 Create and view posts
- 💬 Comment on posts
- 👥 Follow/unfollow users
- 👤 User profiles with bios
- 🔔 In-app notifications
- 📱 Push notifications (optional, requires Firebase Blaze plan)
- 🎨 Modern UI with Tailwind CSS
- ⚡ Real-time updates
- 🔄 Infinite scroll feed

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Graph Database**: Neo4j Aura
- **Notifications**: Firebase Cloud Messaging (optional)
- **Styling**: Tailwind CSS
- **UI Components**: Heroicons
- **Toast Notifications**: React Hot Toast

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Neo4j Aura account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/social-app-quick.git
cd social-app-quick
npm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Google sign-in methods

3. Create a Firestore database:
   - Go to Firestore Database
   - Create a database in production mode
   - Start in test mode for development

4. Get your Firebase configuration:
   - Go to Project Settings
   - Under "Your apps", click the web icon (</>)
   - Register your app and copy the configuration

5. Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key_for_push_notifications
```

### 3. Neo4j Aura Setup

1. Create a Neo4j Aura account at [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph-database/)
2. Create a new instance:
   - Choose "AuraDB Free" tier
   - Set a password (save it!)
   - Wait for the instance to be created

3. Get your Neo4j connection details:
   - Click on your instance
   - Copy the connection string (starts with `neo4j+s://`)
   - Note down the username (usually 'neo4j') and password

4. Add Neo4j credentials to your `.env` file:
```env
VITE_NEO4J_URI=your_neo4j_connection_string
VITE_NEO4J_USER=neo4j
VITE_NEO4J_PASSWORD=your_password
```

### 4. Push Notifications Setup (Optional)

The application includes a push notification system using Firebase Cloud Messaging (FCM), but it is **disabled by default** because it requires the Firebase Blaze (pay-as-you-go) plan.

#### Current State:
- Push notifications are disabled via a flag in `src/services/pushNotificationService.ts`
- In-app notifications still work normally
- The app gracefully handles the absence of push notifications

#### To Enable Push Notifications:

1. **Upgrade to Firebase Blaze Plan**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to your project > Usage and billing
   - Click "Modify plan" and select the Blaze (pay-as-you-go) plan
   - Follow the prompts to complete the upgrade

2. **Set up Firebase Functions**:
   ```bash
   # From the project root
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

3. **Enable push notifications in the code**:
   - Open `src/services/pushNotificationService.ts`
   - Change `const ENABLE_CLOUD_FUNCTIONS = false` to `true`
   - Rebuild and redeploy the application

4. **Get your VAPID Key**:
   - In Firebase Console, go to Project Settings > Cloud Messaging
   - Under "Web configuration", generate a new Web Push certificate
   - Copy the public key and add it to your `.env` file as `VITE_FIREBASE_VAPID_KEY`

Note: Even on the Blaze plan, Firebase offers a generous free tier with 2 million function invocations per month, so small to medium applications may not incur any charges.

### 5. Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init
# Select Hosting and follow the prompts
firebase deploy --only hosting
```

## Project Structure

```
src/
├── components/         # React components
├── contexts/          # React contexts (Auth, etc.)
├── services/          # External service integrations
├── types/            # TypeScript type definitions
├── config/           # Configuration files
└── App.tsx           # Main application component
functions/
├── src/              # Firebase Cloud Functions source code
└── package.json      # Functions dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Firebase](https://firebase.google.com/)
- [Neo4j](https://neo4j.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React](https://reactjs.org/)
