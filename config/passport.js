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

module.exports = function (passport) {

  console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
  console.log("Google Callback URL:", getGoogleCallbackUrl());

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(),
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {

          const googleId = profile.id;
          const displayName = profile.displayName;
          const email = profile.emails?.[0]?.value;
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          let user = await User.findOne({ googleId });

          if (user) {
            console.log("Existing Google User:", email);
            return done(null, user);
          }

          user = await User.findOne({ email });

          if (user) {
            console.log("Linking Google account:", email);

            user.googleId = googleId;

            if (!user.name) {
              user.name = displayName;
            }

            if (!user.avatar && avatar) {
              user.avatar = avatar;
            }

            await user.save();

            return done(null, user);
          }

          console.log("Creating Google User:", email);

          user = await User.create({
            name: displayName,
            email,
            googleId,
            avatar,
            isActive: true
          });

          return done(null, user);

        } catch (err) {
          console.error("Google OAuth Error:", err);
          return done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

};