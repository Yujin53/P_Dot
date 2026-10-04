const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB and synchronize admin credentials
connectDB().then(async () => {
  try {
    const User = require('./models/User');
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pdot.ph').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPdot2026!';

    let admin = await User.findOne({ email: adminEmail }).select('+password');
    if (!admin) {
      admin = new User({
        firstName: 'Tuguegarao',
        lastName: 'Administrator',
        username: 'pdotadmin',
        email: adminEmail,
        password: adminPassword,
        phone: '09171234567',
        role: 'superadmin',
        accountStatus: 'active'
      });
      await admin.save();
      console.log(`[P_Dot] Initial SuperAdmin created: ${adminEmail}`);
    } else {
      admin.password = adminPassword;
      admin.role = 'superadmin';
      admin.accountStatus = 'active';
      await admin.save();
      console.log(`[P_Dot] SuperAdmin synchronized with password from .env: ${adminEmail}`);
    }

    // Sync demo accounts
    const passenger = await User.findOne({ email: 'passenger@demo.pdot' });
    if (passenger) {
      passenger.password = 'Password123!';
      passenger.accountStatus = 'active';
      await passenger.save();
    }
    const driver = await User.findOne({ email: 'driver@demo.pdot' });
    if (driver) {
      driver.password = 'Password123!';
      driver.accountStatus = 'active';
      await driver.save();
    }
  } catch (err) {
    console.warn('[P_Dot] Notice during account sync:', err.message);
  }
});

const app = express();

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for inline scripts and local browser development
  crossOriginEmbedderPolicy: false
}));

// CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory (Profiles & Vehicles public; driver docs protected logically)
const profilesDir = path.join(__dirname, 'uploads/profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}
const defaultAvatarPath = path.join(profilesDir, 'default-avatar.png');
if (!fs.existsSync(defaultAvatarPath)) {
  const defaultPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJ/SURBVHgB7ZtBSyNBEIbnW5f1UARFBA+C+FmCIB4E8eBBhOBeBPG/eNCDh+BRvYqCgiKIB4Mg4u8v83q7O9MhTndn0r0Dq5zqpJtp56O6qnqmW4V5P2yM0ZhzE/uN+Yj/k34B+5n6wL7m/0j4B783xpj7hP/bWdO5/921xpi3Y/4/4W8gW6O579N+mO1o689Y/3r1w+e8xKxJ/3a6e38Z/BvI1mju++N/z09/tY7B7xsz975o6oetf736yR/MavTv6DvvB/8GsjWa+/743/PTX61j8PvGzL0vmvph61+vfvIHsxr9O/rO+8G/gWyN5r4//vf89FfrGPy+MXPvi6Z+2PrXq5/8waxG/46+837wbyBbo7nvj/89P/3VOga/b8zc+6KpH7b+9eonfzCr0b+j77wf/BvI1mju++N/z09/tY7B7xsz975o6oetf736yR/MavTv6DvvB/8GsjWa+/743/PTX61j8PvGzL0vmvph61+vfvIHsxr9O/rO+8G/gWyN5r4//vf89FfrGPy+MXPvi6Z+2PrXq5/8waxG/46+837wbyBbo7nvj/89P/3VOga/b8zc+6KpH7b+9eonfzCr0b+j77wf/BvI1mju++N/z09/tY7B7xsz975o6oetf736yR/MavTv6DvvB/8GsjWa+/743/PTX61j8PvGzL0vmvph61+vfvIHsxr9O/rO+8G/gWyN5r4//vf89FfrGPy+MXPvi6Z+2PrXq5/8waxG/46+837wbyBbo7nvj/89P/3VOga/b8zc+6KpH7b+9eonfzCr0b+j77wf/BvI1mju+/8r3/u8k7kfs14uUvO/P4/4v+f29/u9/n1hXkG2RnPfH/835q/Wsb825u1/0dQ/z3z+/kU5XAAAAABJRU5ErkJggg==', 'base64');
  try {
    fs.writeFileSync(defaultAvatarPath, defaultPngBuffer);
  } catch (e) {
    // Ignore write error
  }
}

app.use('/uploads/profiles', express.static(profilesDir));
app.use('/uploads/vehicles', express.static(path.join(__dirname, 'uploads/vehicles')));
app.use('/uploads/support', express.static(path.join(__dirname, 'uploads/support')));
app.use('/uploads/driver-documents', express.static(path.join(__dirname, 'uploads/driver-documents')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));
app.use('/api/ratings', require('./routes/ratingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api', require('./routes/fareRoutes')); // /api/fare-rules, /api/fares/estimate, /api/locations, /api/service-areas

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback route for HTML pages in subfolders if directly requested
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  P_Dot - Tuguegarao-Native Ride-Hailing Platform   `);
  console.log(`  Server running on http://localhost:${PORT}        `);
  console.log(`  Default City: ${process.env.DEFAULT_CITY || 'Tuguegarao City'} `);
  console.log(`====================================================`);
});
