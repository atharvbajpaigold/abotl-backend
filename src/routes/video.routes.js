const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage()
});

router.post('/upload-video', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), videoController.uploadVideo);

router.get('/videos', videoController.getAllVideos);
router.get('/my-videos', videoController.getTeacherVideos);
router.post('/videos/:videoId/like', videoController.likeVideo);
router.delete('/videos/:videoId', videoController.deleteVideo);

module.exports = router;

