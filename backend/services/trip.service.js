const tripModel = require('../models/trip.model');
const busModel = require('../models/bus.model');
const logger = require('../config/logger');

async function createTrip(data) {
  logger.info('createTrip', data);
  // basic validation: check route and bus exist
  const route = require('../models/route.model');
  const bus = require('../models/bus.model');
  const r = await route.findById(data.route_id);
  if (!r) throw new Error('Route not found');
  const b = await bus.findById(data.bus_id);
  if (!b) throw new Error('Bus not found');
  return tripModel.createTrip(data);
}

async function listTrips() {
  return tripModel.listTrips();
}

async function getTrip(id) {
  return tripModel.findById(id);
}

async function updateTrip(id, data) {
  return tripModel.updateTrip(id, data);
}

async function deleteTrip(id) {
  return tripModel.deleteTrip(id);
}

// Generate trips for N days starting from a date
async function generateTrips({ route_id, bus_id, start_date, days = 7, time = '08:00', price = 0 }) {
  const bus = await busModel.findById(bus_id);
  if (!bus) throw new Error('Bus not found');
  const created = [];
  const start = new Date(start_date);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const res = await tripModel.createTrip({ route_id, bus_id, date: dateStr, time, price });
    created.push(res);
  }
  return created;
}

module.exports = { createTrip, listTrips, getTrip, updateTrip, deleteTrip, generateTrips };
