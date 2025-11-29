const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('./config/db');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const routeRoutes = require('./routes/routes.routes');
const busRoutes = require('./routes/buses.routes');
const tripRoutes = require('./routes/trips.routes');
const bookingRoutes = require('./routes/bookings.routes');
const broadcastRoutes = require('./routes/broadcast.routes');
const telegramBot = require('./bots/telegram.bot');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/routes', routeRoutes);
app.use('/buses', busRoutes);
app.use('/trips', tripRoutes);
app.use('/bookings', bookingRoutes);
app.use('/broadcasts', broadcastRoutes);

app.use('/admin', express.static(path.join(__dirname, '..', 'frontend', 'admin')));
app.use('/public', express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.get('/', (req, res) => res.redirect('/admin/login.html'));

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(400).json({ message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));

telegramBot.launch(app);
