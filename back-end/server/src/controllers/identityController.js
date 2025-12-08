const ethers = require('ethers');
const jwt = require('jsonwebtoken');

exports.registerDID = async (req, res) => {
  // TODO: Integrasi smart contract untuk register DID
  res.json({ message: 'Register DID endpoint (mock)' });
};

exports.login = async (req, res) => {
  // TODO: Implementasi login berbasis DID
  const token = jwt.sign({ user: req.body.did }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
};
