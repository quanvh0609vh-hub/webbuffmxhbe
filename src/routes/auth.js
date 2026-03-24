import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

const getClientUrl = () => {
  if (isProduction) {
    const urls = (process.env.CLIENT_URL || 'https://webbuffmxh.vercel.app').split(',');
    const prod = urls.find(u => u.trim().startsWith('https://'));
    return prod ? prod.trim() : 'https://webbuffmxh.vercel.app';
  }
  return 'http://localhost:5173';
};
const clientUrl = getClientUrl();

const callbackURL = isProduction
  ? (process.env.GOOGLE_CALLBACK_URL || 'https://webbuffmxhbe.onrender.com/api/auth/google/callback')
  : 'http://localhost:3000/api/auth/google/callback';

const hasGoogleConfig = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const toUsernameBase = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '')
  .slice(0, 16);

const generateUniqueUsername = async (displayName, email) => {
  const base = toUsernameBase(displayName) || toUsernameBase(email?.split('@')[0]) || 'user';
  let username = base;
  let i = 0;

  while (await User.exists({ username })) {
    i += 1;
    username = `${base}${String(i).padStart(3, '0')}`;
  }

  return username;
};

if (hasGoogleConfig) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error('Google account has no email'));

          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (!user) {
            const username = await generateUniqueUsername(profile.displayName, email);
            const randomPassword = `google_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

            user = await User.create({
              username,
              email,
              password: randomPassword,
              googleId: profile.id,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email hoặc username đã tồn tại' });
    }
    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }
    const token = generateToken(user._id);
    res.json({ success: true, data: { user, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/google', (req, res, next) => {
  if (!hasGoogleConfig) {
    return res.status(503).json({ success: false, message: `Google OAuth chưa được cấu hình. Callback hiện tại: ${callbackURL}` });
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    callbackURL,
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  console.log('[Google CB] Env:', isProduction ? 'production' : 'development');
  console.log('[Google CB] Client URL:', clientUrl);
  console.log('[Google CB] Callback URL:', callbackURL);
  console.log('[Google CB] Auth code:', req.query?.code ? 'present' : 'missing');

  if (!hasGoogleConfig) {
    console.log('[Google CB] Not configured');
    return res.redirect(`${clientUrl}/login?error=google_not_configured`);
  }

  return passport.authenticate('google', { session: false, callbackURL }, (err, user) => {
    if (err) {
      console.log('[Google CB] Passport error:', err.message || JSON.stringify(err.response?.data || err));
    }
    console.log('[Google CB] User:', user ? `Found (${user.email})` : 'Missing');

    if (err || !user) {
      console.log('[Google CB] Auth failed');
      return res.redirect(`${clientUrl}/login?error=auth_failed`);
    }

    const token = generateToken(user._id);
    console.log('[Google CB] Token generated, redirecting');
    return res.redirect(`${clientUrl}/auth/success?token=${encodeURIComponent(token)}`);
  })(req, res, next);
});

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
