const userService = require('../services/user.service');

async function list(req, res, next) {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await userService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await userService.remove(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const user = await userService.getById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, get };
