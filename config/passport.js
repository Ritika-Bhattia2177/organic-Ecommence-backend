const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

function getGoogleCallbackUrl() {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/google/callback`;
  }

  return 'http://localhost:5000/api/auth/google/callback';
}

module.exports = function(passport) {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'https://organic-ecommerce-backend-cxcu.vercel.app/api/auth/google/callback',
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user information from Google profile
          const { id: googleId, displayName, emails, photos } = profile;
          const email = emails && emails.length > 0 ? emails[0].value : null;
          const avatar = photos && photos.length > 0 ? photos[0].value : null;

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          // Check if user already exists with this Google ID
          let user = await User.findOne({ googleId });

          if (user) {
            // User exists, return user
            console.log(`✅ Existing user found with Google ID: ${googleId}`);
            return done(null, user);
          }

          // Check if user exists with this email
          user = await User.findOne({ email });

          if (user) {
            // Link Google account to existing user
            console.log(`🔗 Linking Google account to existing user: ${email}`);
            user.googleId = googleId;
            if (!user.name) user.name = displayName;
            await user.save();
            return done(null, user);
          }

          // Create new user
          console.log(`➕ Creating new user with Google account: ${email}`);
          user = await User.create({
            name: displayName,
            email,
            googleId,
            isActive: true
          });

          return done(null, user);

        } catch (error) {
          console.error('❌ Google OAuth Error:', error.message);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
