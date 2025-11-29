const busModel = require('../models/bus.model');
const logger = require('../config/logger');

async function createBus(data) {
  logger.info('createBus', data);
  return busModel.createBus(data);
}

async function listBuses() {
  return busModel.listBuses();
}

async function getBus(id) {
  return busModel.findById(id);
}

async function updateBus(id, data) {
  return busModel.updateBus(id, data);
}

async function deleteBus(id) {
  return busModel.deleteBus(id);
}

module.exports = { createBus, listBuses, getBus, updateBus, deleteBus };
