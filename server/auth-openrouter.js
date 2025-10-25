// server/auth-openrouter.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/login", (req, res) => {
  const clientId   = process.env.OPENROUTER_CLIENT_ID;
  const redirectUri= process.env.OPENROUTER_REDIRECT; // مثلا: http://localhost:5175/api/auth/openrouter/callback
  const state = Math.random().toString(36).slice(2);

  res.cookie("or_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",     // برای dev خوبه؛ روی https می‌تونی "none" + secure بدی
    secure: false,       // در production پشت HTTPS → true
  });

  const url = new URL("https://openrouter.ai/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const saved = req.cookies?.or_oauth_state;
    if (!code || !state || !saved || state !== saved) {
      return res.status(400).send("Invalid OAuth state");
    }
    res.clearCookie("or_oauth_state");

    const r = await fetch("https://openrouter.ai/api/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.OPENROUTER_CLIENT_ID,
        client_secret: process.env.OPENROUTER_CLIENT_SECRET,
        redirect_uri: process.env.OPENROUTER_REDIRECT,
        grant_type: "authorization_code"
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(400).send(`Token exchange failed: ${JSON.stringify(data)}`);
    }

    // ذخیره‌ی توکن در کوکی امن
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("or_token", data.access_token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax", // اگر روی HTTPS هستی → none
      secure: isProd,                    // اگر HTTPS → true
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // برگشت به فرانت
    res.redirect(process.env.CORS_ORIGIN || "http://localhost:5173/");
  } catch (e) {
    res.status(500).send("OAuth error");
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("or_token");
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.or_token;
  return res.json({ connected: !!token });
});

export default router;
