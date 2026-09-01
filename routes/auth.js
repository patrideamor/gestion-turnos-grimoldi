const express = require('express');
const router = express.Router();
const { readDB } = require('../database');

router.post('/login', (req, res) => {
  const { pin } = req.body;
  const db = readDB();
  if (pin === db.config.adminPin) {
    req.session.isAdmin = true;
    return res.json({ success: true, message: "Acceso concedido" });
  }
  return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/status', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

module.exports = router;