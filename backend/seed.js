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

const seedData = async () => {
  try {
    await connectDB();
    console.log('[P_Dot Seeder] Connected to database. Seeding data...');

    // 1. Seed SuperAdmin if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pdot.ph';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPdot2026!';

    let admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      admin = await User.create({
        firstName: 'Tuguegarao',
        lastName: 'Administrator',
        username: 'pdotadmin',
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        phone: '09171234567',
        role: 'superadmin',
        accountStatus: 'active'
      });
      console.log(`[P_Dot Seeder] Created initial SuperAdmin: ${adminEmail} / ${adminPassword}`);
    } else {
      admin.password = adminPassword;
      admin.role = 'superadmin';
      admin.accountStatus = 'active';
      await admin.save();
      console.log(`[P_Dot Seeder] SuperAdmin ${adminEmail} updated and password synchronized to: ${adminPassword}`);
    }

    // 2. Seed Fare Rules for Tuguegarao
    const existingRules = await FareRule.countDocuments();
    if (existingRules === 0) {
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
          name: 'Motorcycle Express Express',
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
          baseFare: 50,
          baseDistanceKm: 2.0,
          perKmRate: 15,
          perMinuteRate: 2.5,
          minimumFare: 50,
          bookingFee: 15,
          peakMultiplier: 1.3,
          peakStartTime: '17:00',
          peakEndTime: '19:30',
          createdBy: admin._id,
          isActive: true
        },
        {
          name: 'Van / MPV Group Transport',
          serviceType: 'van_mpv',
          baseFare: 80,
          baseDistanceKm: 2.0,
          perKmRate: 22,
          perMinuteRate: 3.5,
          minimumFare: 80,
          bookingFee: 25,
          peakMultiplier: 1.2,
          peakStartTime: '17:00',
          peakEndTime: '19:00',
          createdBy: admin._id,
          isActive: true
        }
      ];
      await FareRule.insertMany(defaultRules);
      console.log('[P_Dot Seeder] Seeded Tuguegarao fare rules (Tricycle, Moto, Sedan, Van).');
    }

    // 3. Seed Tuguegarao Locations, Barangays & Key Landmarks
    const existingLocations = await Location.countDocuments();
    if (existingLocations === 0) {
      const locations = [
        // Landmarks & Malls
        {
          name: 'SM Center Tuguegarao Downtown',
          type: 'mall',
          address: 'Luna St cor Mabini St, Tuguegarao City',
          barangay: 'Centro 01',
          latitude: 17.6145,
          longitude: 121.7285,
          aliases: ['SM Downtown', 'SM Luna', 'SM Center'],
          isServiceArea: true
        },
        {
          name: 'Robinsons Place Tuguegarao',
          type: 'mall',
          address: 'Maharlika Highway, Tanza, Tuguegarao City',
          barangay: 'Tanza',
          latitude: 17.6253,
          longitude: 121.7380,
          aliases: ['Robinsons Mall', 'Rob Tanza'],
          isServiceArea: true
        },
        {
          name: 'SM City Tuguegarao (Carig)',
          type: 'mall',
          address: 'Bagay Road, Carig Sur, Tuguegarao City',
          barangay: 'Carig Sur',
          latitude: 17.6492,
          longitude: 121.7583,
          aliases: ['SM Carig', 'SM City'],
          isServiceArea: true
        },
        {
          name: 'St. Paul University Philippines (SPUP)',
          type: 'school',
          address: 'Mabini St, Tuguegarao City',
          barangay: 'Ugac Norte',
          latitude: 17.6080,
          longitude: 121.7225,
          aliases: ['SPUP', 'Paulinians', 'Saint Paul'],
          isServiceArea: true
        },
        {
          name: 'University of Saint Louis Tuguegarao (USLT)',
          type: 'school',
          address: 'Mabini St, Tuguegarao City',
          barangay: 'Ugac Sur',
          latitude: 17.6045,
          longitude: 121.7208,
          aliases: ['USLT', 'Louisian', 'Saint Louis'],
          isServiceArea: true
        },
        {
          name: 'Cagayan State University (CSU Carig Campus)',
          type: 'school',
          address: 'Carig Sur, Tuguegarao City',
          barangay: 'Carig Sur',
          latitude: 17.6534,
          longitude: 121.7521,
          aliases: ['CSU Carig', 'CSU Engineering', 'Red Eagles'],
          isServiceArea: true
        },
        {
          name: 'Cagayan Valley Medical Center (CVMC)',
          type: 'hospital',
          address: 'Dalan na Pagayaya, Carig Sur, Tuguegarao City',
          barangay: 'Carig Sur',
          latitude: 17.6558,
          longitude: 121.7562,
          aliases: ['CVMC', 'Regional Hospital', 'Carig Hospital'],
          isServiceArea: true
        },
        {
          name: 'St. Paul Hospital Tuguegarao',
          type: 'hospital',
          address: 'Mabini St, Tuguegarao City',
          barangay: 'Ugac Norte',
          latitude: 17.6072,
          longitude: 121.7230,
          aliases: ['SPUP Hospital', 'Saint Paul Hospital'],
          isServiceArea: true
        },
        {
          name: 'St. Peter Metropolitan Cathedral',
          type: 'landmark',
          address: 'Rizal St, Tuguegarao City',
          barangay: 'Centro 02',
          latitude: 17.6136,
          longitude: 121.7268,
          aliases: ['Cathedral', 'Tuguegarao Church', 'Centro Cathedral'],
          isServiceArea: true
        },
        {
          name: 'Tuguegarao City Hall / People\'s Gym',
          type: 'government_office',
          address: 'Carig Sur, Regional Government Center, Tuguegarao City',
          barangay: 'Carig Sur',
          latitude: 17.6515,
          longitude: 121.7540,
          aliases: ['City Hall', 'RGC', 'Government Center'],
          isServiceArea: true
        },
        {
          name: 'Buntun Bridge Viewpoint',
          type: 'landmark',
          address: 'Cagayan Valley Rd, Buntun, Tuguegarao City',
          barangay: 'Buntun',
          latitude: 17.6088,
          longitude: 121.6885,
          aliases: ['Buntun Bridge', 'Cagayan River Bridge'],
          isServiceArea: true
        },
        {
          name: 'Tuguegarao Central Commercial Terminal (Balzain)',
          type: 'terminal',
          address: 'Balzain East, Tuguegarao City',
          barangay: 'Balzain East',
          latitude: 17.6200,
          longitude: 121.7335,
          aliases: ['Balzain Terminal', 'Bus Terminal', 'Van Terminal'],
          isServiceArea: true
        },
        {
          name: 'Tuguegarao Domestic Airport (TUG)',
          type: 'terminal',
          address: 'Airport Rd, Pengue-Ruyu, Tuguegarao City',
          barangay: 'Pengue-Ruyu',
          latitude: 17.6432,
          longitude: 121.7314,
          aliases: ['Tuguegarao Airport', 'TUG', 'CAAP Tuguegarao'],
          isServiceArea: true
        }
      ];

      await Location.insertMany(locations);
      console.log(`[P_Dot Seeder] Seeded ${locations.length} Tuguegarao landmarks and service areas.`);
    }

    // 4. Seed Demo Passenger & Demo Driver accounts for instant testing
    const demoPassengerEmail = 'passenger@demo.pdot';
    let demoPassenger = await User.findOne({ email: demoPassengerEmail });
    if (!demoPassenger) {
      demoPassenger = await User.create({
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        username: 'juandc',
        email: demoPassengerEmail,
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
      console.log(`[P_Dot Seeder] Demo Passenger created: ${demoPassengerEmail} / Password123!`);
    }

    // Demo Verified Driver (Tricycle)
    const demoDriverEmail = 'driver@demo.pdot';
    let demoDriverUser = await User.findOne({ email: demoDriverEmail });
    if (!demoDriverUser) {
      demoDriverUser = await User.create({
        firstName: 'Kanor',
        lastName: 'Mendoza',
        username: 'driverkanor',
        email: demoDriverEmail,
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

      console.log(`[P_Dot Seeder] Demo Driver created: ${demoDriverEmail} / Password123! (Approved & Online Tricycle TUG-4091)`);
    }

    console.log('[P_Dot Seeder] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[P_Dot Seeder Error]:', error);
    process.exit(1);
  }
};

seedData();
