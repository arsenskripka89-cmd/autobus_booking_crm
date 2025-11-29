const routeService = require('../services/route.service');

async function list(req, res, next) {
  try {
    res.json(await routeService.getAll(req.user?.id));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await routeService.getById(req.params.id, req.user?.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await routeService.create(req.body, req.user?.id));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await routeService.update(req.params.id, req.body, req.user?.id));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    res.json(await routeService.remove(req.params.id, req.user?.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
