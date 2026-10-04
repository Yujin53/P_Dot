const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Models
const User = require('./models/User');
const DriverProfile = require('./models/DriverProfile');
const Vehicle = require('./models/Vehicle');
const FareRule = require('./models/FareRule');
const Location = require('./models/Location');
const Ride = require('./models/Ride');
const Notification = require('./models/Notification');
const Rating = require('./models/Rating');
const SupportTicket = require('./models/SupportTicket');
const AuditLog = require('./models/AuditLog');

dotenv.config();

const resetDatabase = async () => {
  try {
    console.log('====================================================');
    console.log('  P_Dot - Tuguegarao Transport Platform Database Reset');
    console.log('====================================================');

    await connectDB();
    console.log('[Reset] Connected to MongoDB. Purging existing collections...');

    // 1. Clean all collections
    await Promise.all([
      User.deleteMany({}),
      DriverProfile.deleteMany({}),
      Vehicle.deleteMany({}),
      FareRule.deleteMany({}),
      Location.deleteMany({}),
      Ride.deleteMany({}),
      Notification.deleteMany({}),
      Rating.deleteMany({}),
      SupportTicket.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('[Reset] All collections cleared cleanly.');

    // 2. Create SuperAdmin
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pdot.ph').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPdot2026!';

    const admin = await User.create({
      firstName: 'Tuguegarao',
      lastName: 'Administrator',
      username: 'pdotadmin',
      email: adminEmail,
      password: adminPassword,
      phone: '09171234567',
      role: 'superadmin',
      accountStatus: 'active'
    });
    console.log(`[Reset] Created SuperAdmin: ${adminEmail} / ${adminPassword}`);

    // 3. Create Fare Rules for Tuguegarao
    const defaultRules = [
      {
        name: 'Tricycle City Standard Fare',
        serviceType: 'tricycle',
        baseFare: 15,
        baseDistanceKm: 1.0,
        perKmRate: 5,
        perMinuteRate: 1,
        minimumFare: 15,
        bookingFee: 5,
        peakMultiplier: 1.25,
        peakStartTime: '07:00',
        peakEndTime: '09:00',
        createdBy: admin._id,
        isActive: true
      },
      {
        name: 'Motorcycle Express Service',
        serviceType: 'motorcycle',
        baseFare: 25,
        baseDistanceKm: 1.5,
        perKmRate: 8,
        perMinuteRate: 1.5,
        minimumFare: 25,
        bookingFee: 8,
        peakMultiplier: 1.2,
        peakStartTime: '07:30',
        peakEndTime: '09:00',
        createdBy: admin._id,
        isActive: true
      },
      {
        name: 'Sedan Comfort Ride',
        serviceType: 'sedan',
        baseFare: 40,
        baseDistanceKm: 2.0,
        perKmRate: 15,
        perMinuteRate: 2,
        minimumFare: 50,
        bookingFee: 15,
        peakMultiplier: 1.3,
        peakStartTime: '17:00',
        peakEndTime: '19:30',
        createdBy: admin._id,
        isActive: true
      },
      {
        name: 'Van / Group Carrier',
        serviceType: 'van',
        baseFare: 80,
        baseDistanceKm: 3.0,
        perKmRate: 25,
        perMinuteRate: 3,
        minimumFare: 100,
        bookingFee: 25,
        peakMultiplier: 1.2,
        peakStartTime: '17:00',
        peakEndTime: '19:30',
        createdBy: admin._id,
        isActive: true
      }
    ];
    await FareRule.insertMany(defaultRules);
    console.log(`[Reset] Seeded ${defaultRules.length} standard Tuguegarao fare rules.`);

    // 4. Create Tuguegarao Landmarks & Locations
    const locations = [
      {
        name: 'Robinsons Place Tuguegarao',
        type: 'mall',
        address: 'Maharlika Highway, Tanza, Tuguegarao City',
        barangay: 'Tanza',
        latitude: 17.6385,
        longitude: 121.7348,
        aliases: ['Robinsons', 'Rob', 'Robinsons Mall', 'Tanza Mall'],
        isServiceArea: true
      },
      {
        name: 'SM Center Tuguegarao Downtown',
        type: 'mall',
        address: 'Luna St. cor. Mabini St., Centro 02, Tuguegarao City',
        barangay: 'Centro 02',
        latitude: 17.6137,
        longitude: 121.7272,
        aliases: ['SM', 'SM Downtown', 'SM Center', 'SM Tuguegarao'],
        isServiceArea: true
      },
      {
        name: 'Cagayan Valley Medical Center (CVMC)',
        type: 'hospital',
        address: 'Dalan na Pagayaya, Regional Center, Carig Sur',
        barangay: 'Carig Sur',
        latitude: 17.6534,
        longitude: 121.7521,
        aliases: ['CVMC', 'Carig Hospital', 'Regional Hospital'],
        isServiceArea: true
      },
      {
        name: 'St. Paul University Philippines (SPUP)',
        type: 'school',
        address: 'Mabini Street, Ugac Norte, Tuguegarao City',
        barangay: 'Ugac Norte',
        latitude: 17.6080,
        longitude: 121.7225,
        aliases: ['SPUP', 'Saint Paul', 'St Paul'],
        isServiceArea: true
      },
      {
        name: 'University of Saint Louis Tuguegarao (USLT)',
        type: 'school',
        address: 'Mabini St., Ugac Sur, Tuguegarao City',
        barangay: 'Ugac Sur',
        latitude: 17.6045,
        longitude: 121.7180,
        aliases: ['USLT', 'Louis', 'Saint Louis'],
        isServiceArea: true
      },
      {
        name: 'Cagayan State University - Carig Campus',
        type: 'school',
        address: 'Carig Sur, Tuguegarao City',
        barangay: 'Carig Sur',
        latitude: 17.6580,
        longitude: 121.7485,
        aliases: ['CSU Carig', 'Carig CSU'],
        isServiceArea: true
      },
      {
        name: 'Tuguegarao City Airport',
        type: 'terminal',
        address: 'Pengue-Ruyu, Tuguegarao City',
        barangay: 'Pengue-Ruyu',
        latitude: 17.6432,
        longitude: 121.7320,
        aliases: ['Airport', 'TUG Airport', 'Pengue Airport'],
        isServiceArea: true
      },
      {
        name: 'Tuguegarao City Hall',
        type: 'government_office',
        address: 'Carig Sur, Regional Government Center',
        barangay: 'Carig Sur',
        latitude: 17.6515,
        longitude: 121.7505,
        aliases: ['City Hall', 'Tuguegarao Hall'],
        isServiceArea: true
      },
      {
        name: 'Buntun Bridge Viewpoint',
        type: 'landmark',
        address: 'Buntun, Tuguegarao City',
        barangay: 'Buntun',
        latitude: 17.6162,
        longitude: 121.6912,
        aliases: ['Buntun Bridge', 'Buntun', 'Cagayan River Bridge'],
        isServiceArea: true
      },
      {
        name: 'St. Peter Metropolitan Cathedral',
        type: 'landmark',
        address: 'Rizal St., Centro 02, Tuguegarao City',
        barangay: 'Centro 02',
        latitude: 17.6130,
        longitude: 121.7285,
        aliases: ['Cathedral', 'Tuguegarao Cathedral', 'Centro Church'],
        isServiceArea: true
      },
      {
        name: 'Tuguegarao People’s General Hospital',
        type: 'hospital',
        address: 'Caritan Centro, Tuguegarao City',
        barangay: 'Caritan Centro',
        latitude: 17.6250,
        longitude: 121.7200,
        aliases: ['TPGH', 'City Hospital', 'Caritan Hospital'],
        isServiceArea: true
      },
      {
        name: 'Don Domingo Public Market & Terminal',
        type: 'terminal',
        address: 'Balzain East / Don Domingo, Tuguegarao City',
        barangay: 'Balzain East',
        latitude: 17.6210,
        longitude: 121.7335,
        aliases: ['Don Domingo', 'Don Domingo Market', 'Van Terminal Balzain'],
        isServiceArea: true
      },
      {
        name: 'Brickstone Mall',
        type: 'mall',
        address: 'Pengue-Ruyu, Tuguegarao City',
        barangay: 'Pengue-Ruyu',
        latitude: 17.6320,
        longitude: 121.7310,
        aliases: ['Brickstone', 'Brickstone Tuguegarao'],
        isServiceArea: true
      }
    ];
    await Location.insertMany(locations);
    console.log(`[Reset] Seeded ${locations.length} Tuguegarao landmarks.`);

    // 5. Create Demo Passenger
    const demoPassenger = await User.create({
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      username: 'juandc',
      email: 'passenger@demo.pdot',
      password: 'Password123!',
      phone: '09179876543',
      role: 'passenger',
      accountStatus: 'active',
      savedPlaces: [
        {
          label: 'Home',
          address: 'Ugac Norte near SPUP Gate 2',
          barangay: 'Ugac Norte',
          landmark: 'SPUP Gate 2',
          latitude: 17.6080,
          longitude: 121.7225
        },
        {
          label: 'Office / Campus',
          address: 'Carig Sur Regional Center',
          barangay: 'Carig Sur',
          landmark: 'Near CVMC',
          latitude: 17.6534,
          longitude: 121.7521
        }
      ]
    });
    console.log('[Reset] Created Demo Passenger: passenger@demo.pdot / Password123!');

    // 6. Create Demo Verified Driver (Tricycle)
    const demoDriverUser = await User.create({
      firstName: 'Kanor',
      lastName: 'Mendoza',
      username: 'driverkanor',
      email: 'driver@demo.pdot',
      password: 'Password123!',
      phone: '09181234567',
      role: 'driver',
      accountStatus: 'active'
    });

    const demoDriverProfile = await DriverProfile.create({
      user: demoDriverUser._id,
      applicationStatus: 'approved',
      verificationStatus: 'approved',
      licenseReference: 'A02-14-098231',
      governmentIdReference: 'UMID-1029-4821',
      address: 'Centro 02, Tuguegarao City',
      emergencyContactName: 'Maria Mendoza',
      emergencyContactPhone: '09187654321',
      isOnline: true,
      lastKnownLocation: {
        latitude: 17.6132,
        longitude: 121.7270,
        barangay: 'Centro 02',
        updatedAt: new Date()
      },
      approvedBy: admin._id,
      approvedAt: new Date(),
      totalTripsCompleted: 14,
      averageRating: 4.9,
      totalRatingsCount: 14
    });

    await Vehicle.create({
      driver: demoDriverProfile._id,
      vehicleType: 'tricycle',
      make: 'Honda',
      model: 'TMX 125 Alpha',
      year: 2023,
      color: 'Blue & Silver',
      plateNumber: 'TUG-4091',
      registrationReference: 'ORCR-2023-TG889',
      capacity: 4,
      verificationStatus: 'approved',
      isActive: true
    });
    console.log('[Reset] Created Demo Driver: driver@demo.pdot / Password123! (Approved Tricycle TUG-4091)');

    console.log('====================================================');
    console.log('  Database Reset Complete! Pristine state restored.');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('[Reset Error]:', error);
    process.exit(1);
  }
};

resetDatabase();
