const FareRule = require('../models/FareRule');

/**
 * Calculates distance in kilometers between two lat/lon points using Haversine formula
 */
const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.5; // Reasonable Tuguegarao downtown default if coordinates missing
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(0.5, Math.round(d * 10) / 10); // Minimum 0.5 km, rounded to 1 decimal place
};

/**
 * Checks if current time in Tuguegarao falls within peak hours
 */
const isPeakHour = (startTimeStr, endTimeStr) => {
  try {
    const now = new Date();
    // Get current time formatted as HH:mm
    const currentHourMin = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila'
    });

    return currentHourMin >= startTimeStr && currentHourMin <= endTimeStr;
  } catch (e) {
    return false;
  }
};

/**
 * Calculates fare using active FareRule for the given service type
 */
const calculateFare = async ({ serviceType = 'tricycle', distanceKm, durationMinutes }) => {
  let rule = await FareRule.findOne({ serviceType, isActive: true });

  // Default fallback if no custom rule seeded yet
  if (!rule) {
    const defaultDefaults = {
      tricycle: { baseFare: 15, baseDistanceKm: 1, perKmRate: 5, perMinuteRate: 1, minimumFare: 15, bookingFee: 5 },
      motorcycle: { baseFare: 25, baseDistanceKm: 1.5, perKmRate: 8, perMinuteRate: 1.5, minimumFare: 25, bookingFee: 10 },
      sedan: { baseFare: 50, baseDistanceKm: 2, perKmRate: 15, perMinuteRate: 2.5, minimumFare: 50, bookingFee: 15 },
      van_mpv: { baseFare: 80, baseDistanceKm: 2, perKmRate: 22, perMinuteRate: 3.5, minimumFare: 80, bookingFee: 25 }
    };
    const def = defaultDefaults[serviceType] || defaultDefaults.tricycle;
    rule = {
      serviceType,
      baseFare: def.baseFare,
      baseDistanceKm: def.baseDistanceKm,
      perKmRate: def.perKmRate,
      perMinuteRate: def.perMinuteRate,
      minimumFare: def.minimumFare,
      bookingFee: def.bookingFee,
      peakMultiplier: 1.2,
      peakStartTime: '07:00',
      peakEndTime: '09:00'
    };
  }

  const effectiveDistance = Math.max(0.5, Number(distanceKm) || 1.0);
  const effectiveDuration = Math.max(2, Number(durationMinutes) || Math.round(effectiveDistance * 3.5)); // Approx 3.5 min/km in Tuguegarao city traffic

  // Succeeding distance charge
  const extraDistance = Math.max(0, effectiveDistance - rule.baseDistanceKm);
  const distanceCharge = Math.round(extraDistance * rule.perKmRate);

  // Time charge
  const timeCharge = Math.round(effectiveDuration * rule.perMinuteRate);

  // Peak multiplier
  const peakActive = isPeakHour(rule.peakStartTime, rule.peakEndTime);
  const multiplier = peakActive ? (rule.peakMultiplier || 1.0) : 1.0;

  const subtotalBeforePeak = rule.baseFare + distanceCharge + timeCharge + rule.bookingFee;
  let totalWithPeak = Math.round(subtotalBeforePeak * multiplier);
  const peakAdjustment = totalWithPeak - subtotalBeforePeak;

  let minimumFareApplied = false;
  if (totalWithPeak < rule.minimumFare) {
    totalWithPeak = rule.minimumFare;
    minimumFareApplied = true;
  }

  return {
    estimatedDistanceKm: effectiveDistance,
    estimatedDurationMin: effectiveDuration,
    estimatedFare: totalWithPeak,
    fareBreakdown: {
      baseFare: rule.baseFare,
      distanceCharge,
      timeCharge,
      bookingFee: rule.bookingFee,
      peakAdjustment,
      peakMultiplier: multiplier,
      isPeakActive: peakActive,
      minimumFareApplied
    }
  };
};

module.exports = {
  calculateHaversineDistanceKm,
  calculateFare
};
