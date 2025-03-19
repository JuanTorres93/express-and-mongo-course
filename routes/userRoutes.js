const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const router = express.Router();

const upload = multer({
  dest: 'public/img/users', // folder where the image will be stored
});

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotpassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateMe',
  // DOC: Upload one single file
  // photo is the name of the field IN THE FORM that will
  // hold the image to upload.
  // During the request-response cycle, the image will be
  // stored in req.file
  upload.single('photo'),
  userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);

// Restrict all routes after this middleware to admin only
router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
