const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { mapChoiceToValue } = require('../utils/adMap');
const { hashPin, isValidPin } = require('../utils/pin');
const { buildState } = require('../utils/state');
const { publicVoteUrl } = require('../utils/publicUrl');

const crypto = require('crypto');

const AUTH_COOKIE = 'admin_auth';
const AUTH_MAX_AGE = 12 * 60 * 60 * 1000;

function hashCredential(input) {
  return crypto.createHash('sha256').update(String(input)).digest();
}

function safeEqual(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isValidAdminLogin(username, password) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return safeEqual(hashCredential(username), hashCredential(expectedUser)) &&
         safeEqual(hashCredential(password), hashCredential(expectedPass));
}

function isAuthed(req) {
  return !!(req.signedCookies && req.signedCookies[AUTH_COOKIE] === '1');
}

function requireAdmin(req, res, next) {
  if (isAuthed(req)) return next();
  return res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
  if (isAuthed(req)) return res.redirect('/admin');
  return res.render('admin_login', { error: req.query.err === 'bad' ? 'Incorrect password.' : null });
});

router.post('/login', (req, res) => {
  const username = (req.body && req.body.username) || '';
  const pw = (req.body && req.body.password) || '';
  if (isValidAdminLogin(username, pw)) {
    res.cookie(AUTH_COOKIE, '1', { signed: true, httpOnly: true, sameSite: 'lax', maxAge: AUTH_MAX_AGE });
    return res.redirect('/admin');
  }
  return res.redirect('/admin/login?err=bad');
});

router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  return res.redirect('/admin/login');
});

router.use(requireAdmin);
router.get('/', async (req, res) => {
  try {
    const { contestants, judges, settings } = await buildState();
    res.render('admin_dashboard', { contestants, judges, settings, query: req.query, voteUrl: publicVoteUrl(req) });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading admin');
  }
});

router.post('/contestants/add', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.redirect('/admin');
    const [max] = await pool.query('SELECT COALESCE(MAX(display_order), 0)+1 AS m FROM contestants');
    const m = max[0].m;
    await pool.query('INSERT INTO contestants (name, display_order) VALUES (?, ?)', [name.trim(), m]);
    const io = req.app.get('io');
    if (io) io.emit('contestants_changed', await buildState());
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/contestants/rename', async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name || !name.trim()) return res.redirect('/admin');
    await pool.query('UPDATE contestants SET name=? WHERE id=?', [name.trim(), id]);
    // reset scores
    await pool.query('UPDATE scores SET choice=NULL, score_value=NULL WHERE contestant_id=?', [id]);
    const io = req.app.get('io');
    if (io) {
      io.emit('contestants_changed', await buildState());
      io.emit('score_updated', await buildState());
    }
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/contestants/remove', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.redirect('/admin');
    await pool.query('DELETE FROM contestants WHERE id=?', [id]);
    const io = req.app.get('io');
    if (io) {
      io.emit('contestants_changed', await buildState());
      io.emit('score_updated', await buildState());
    }
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/contestants/reorder', async (req, res) => {
  try {
    const { order } = req.body; // comma list
    if (!order) return res.redirect('/admin');
    const ids = order.split(',').map((x) => parseInt(x)).filter((x) => !isNaN(x));
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < ids.length; i++) {
        await conn.query('UPDATE contestants SET display_order=? WHERE id=?', [i + 1, ids[i]]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    const io = req.app.get('io');
    if (io) {
      io.emit('contestants_changed', await buildState());
      io.emit('score_updated', await buildState());
    }
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/lock', async (req, res) => {
  try {
    await pool.query("UPDATE event_settings SET setting_value='1' WHERE setting_key='scores_locked'");
    const io = req.app.get('io');
    if (io) io.emit('event_locked', { locked: true });
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/unlock', async (req, res) => {
  try {
    await pool.query("UPDATE event_settings SET setting_value='0' WHERE setting_key='scores_locked'");
    const io = req.app.get('io');
    if (io) io.emit('event_unlocked', { locked: false });
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/reset-scores', async (req, res) => {
  try {
    await pool.query('UPDATE scores SET choice=NULL, score_value=NULL');
    const io = req.app.get('io');
    if (io) io.emit('score_updated', await buildState());
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/reset-event', async (req, res) => {
  try {
    await pool.query('DELETE FROM scores');
    const io = req.app.get('io');
    if (io) io.emit('score_updated', await buildState());
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});


router.post('/judges/:judgeId/pin', async (req, res) => {
  try {
    const judgeId = parseInt(req.params.judgeId);
    if (isNaN(judgeId)) return res.redirect('/admin');
    const pin = (req.body && req.body.pin) || ''.trim();
    if (!isValidPin(pin)) return res.redirect('/admin?err=pinformat');
    const stored = hashPin(pin);
    const [result] = await pool.query('UPDATE judges SET code=? WHERE id=?', [stored, judgeId]);
    if (result.affectedRows === 0) return res.redirect('/admin?err=nojudge');
    res.redirect('/admin?ok=pin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/judges/:judgeId/clear-pin', async (req, res) => {
  try {
    const judgeId = parseInt(req.params.judgeId);
    if (isNaN(judgeId)) return res.redirect('/admin');
    await pool.query('UPDATE judges SET code=NULL WHERE id=?', [judgeId]);
    res.redirect('/admin?ok=cleared');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

router.post('/reset-votes', async (req, res) => {
  try {
    await pool.query('DELETE FROM audience_votes');
    const io = req.app.get('io');
    if (io) io.emit('score_updated', await buildState());
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

module.exports = router;



