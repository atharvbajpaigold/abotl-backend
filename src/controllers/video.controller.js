const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacher.model');
const Video = require('../models/video.model');
const { uploadImage } = require('../services/imagekit.service');

async function uploadVideo(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.teacher || !decoded.teacher._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const teacher = await Teacher.findById(decoded.teacher._id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const { title, description, category, visibility } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    if (!req.files || !req.files.thumbnail) {
      return res.status(400).json({ error: 'Thumbnail image is required' });
    }

    // Upload video and thumbnail
    let videoURL = '';
    let thumbnailURL = '';

    try {
      videoURL = await uploadImage(req.files.video[0]);
    } catch (uploadErr) {
      console.error('Video upload failed:', uploadErr.message || uploadErr);
      return res.status(500).json({ error: 'Video upload failed' });
    }

    try {
      thumbnailURL = await uploadImage(req.files.thumbnail[0]);
    } catch (uploadErr) {
      console.error('Thumbnail upload failed:', uploadErr.message || uploadErr);
      return res.status(500).json({ error: 'Thumbnail upload failed' });
    }

    // Create video document
    const video = await Video.create({
      title: title.trim(),
      description: description || '',
      videoURL: videoURL,
      thumbnailURL: thumbnailURL,
      teacher: teacher._id,
      category: category || 'General',
      likes: 0
    });

    // Add video to teacher's videos array
    teacher.videos.push(video._id);
    await teacher.save();

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: {
        id: video._id,
        title: video.title,
        videoURL: video.videoURL,
        thumbnailURL: video.thumbnailURL
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    console.error('Video upload error:', error);
    res.status(500).json({ error: error.message || 'Video upload failed' });
  }
}

// Get all videos
async function getAllVideos(req, res) {
  try {
    const videos = await Video.find()
      .populate('teacher', 'username imageURL')
      .sort({ createdAt: -1 });
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch videos' });
  }
}

// Get teacher's videos
async function getTeacherVideos(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.teacher || !decoded.teacher._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const teacher = await Teacher.findById(decoded.teacher._id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const videos = await Video.find({ teacher: teacher._id })
      .sort({ createdAt: -1 });
    
    res.json(videos);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    console.error('Error fetching teacher videos:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch videos' });
  }
}

// Toggle like a video (like/unlike)
async function likeVideo(req, res) {
  try {
    const { videoId } = req.params;
    const { action } = req.body; // 'like' or 'unlike'
    
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (action === 'unlike') {
      // Decrement likes (minimum 0)
      video.likes = Math.max(0, (video.likes || 0) - 1);
      await video.save();
      res.json({ 
        message: 'Video unliked successfully',
        likes: video.likes,
        isLiked: false
      });
    } else {
      // Increment likes
      video.likes = (video.likes || 0) + 1;
      await video.save();
      res.json({ 
        message: 'Video liked successfully',
        likes: video.likes,
        isLiked: true
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle like' });
  }
}

// Delete a video
async function deleteVideo(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.teacher || !decoded.teacher._id) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { videoId } = req.params;
    
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if the video belongs to the teacher
    if (video.teacher.toString() !== decoded.teacher._id.toString()) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own videos' });
    }

    // Remove video from teacher's videos array
    const teacher = await Teacher.findById(decoded.teacher._id);
    if (teacher) {
      teacher.videos = teacher.videos.filter(
        vid => vid.toString() !== videoId
      );
      await teacher.save();
    }

    // Delete the video
    await Video.findByIdAndDelete(videoId);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message || 'Failed to delete video' });
  }
}

module.exports = {
  uploadVideo,
  getAllVideos,
  getTeacherVideos,
  likeVideo,
  deleteVideo
};

