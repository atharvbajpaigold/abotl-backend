const express= require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const multer = require('multer');
const upload = multer(
    {storage: multer.memoryStorage()}
);
router.post('/student/login', authController.StudentLogin);
router.post('/student/register', upload.single("profilePicture"), authController.StudentRegister);
router.post('/student/logout', authController.StudentLogout);
router.post('/teacher/register', upload.single("profilePicture"), authController.TeacherRegister);
router.post('/teacher/login', authController.TeacherLogin);
router.post('/teacher/logout', authController.TeacherLogout);
// Student profile routes
router.post('/student/profile', authController.getStudentProfile);
router.get('/student/profile', authController.getStudentProfile);
router.put('/student/profile', upload.single('profileImage'), authController.updateStudentProfile);
router.delete('/student/profile', authController.deleteStudentAccount);

// Teacher profile routes
router.post('/teacher/profile', authController.getTeacherProfile);
router.get('/teacher/profile', authController.getTeacherProfile);
router.put('/teacher/profile', upload.single('profileImage'), authController.updateTeacherProfile);
router.delete('/teacher/profile', authController.deleteTeacherAccount);

module.exports = router;