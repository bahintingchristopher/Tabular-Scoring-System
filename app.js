const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const adminRoutes = require('./routes/admin');
const judgeRoutes = require('./routes/judge');
const apiRoutes = require('./routes/api');

app.use('/admin', adminRoutes);
app.use('/judge', judgeRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.redirect('/admin');
});

io.on('connection', () => {
  // no-op
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Tabular Scorer running on http://localhost:' + PORT);
});
