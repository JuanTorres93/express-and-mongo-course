module.exports = fn => {
  return (req, res, next) => {
    // fn(req, res, next).catch(err => next(err));
    // Same as above, but simpler
    fn(req, res, next).catch(next);
  };
};