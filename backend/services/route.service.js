const routeModel = require('../models/route.model');
const logger = require('../config/logger');

async function createRoute(data) {
  logger.info('createRoute', data);
  return routeModel.createRoute(data);
}

async function listRoutes() {
  return routeModel.listRoutes();
}

async function getRoute(id) {
  return routeModel.findById(id);
}

async function updateRoute(id, data) {
  return routeModel.updateRoute(id, data);
}

async function deleteRoute(id) {
  return routeModel.deleteRoute(id);
}

module.exports = { createRoute, listRoutes, getRoute, updateRoute, deleteRoute };
