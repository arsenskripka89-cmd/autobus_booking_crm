const busService = require('../services/bus.service');

async function list(req, res, next) {
  try { res.json(await busService.getAll()); } catch (err) { next(err); }
}

async function get(req, res, next) {
  try { res.json(await busService.getById(req.params.id)); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await busService.create(req.body)); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await busService.update(req.params.id, req.body)); } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { res.json(await busService.remove(req.params.id)); } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove };
