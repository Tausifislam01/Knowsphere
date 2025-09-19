// backend/utils/isValidObjectId.js
const mongoose = require('mongoose');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Express middleware factory to guard any :id params
function guardObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isValidObjectId(value)) {
      const err = new Error(`Invalid identifier for "${paramName}"`);
      err.status = 400;
      return next(err);
    }
    return next();
  };
}

module.exports = { isValidObjectId, guardObjectId };
