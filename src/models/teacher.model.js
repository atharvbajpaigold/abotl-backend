const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
    subjects: [{ type: String }],   
    imageURL: {type: String},
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'student' }],
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'video' }],
}, { timestamps: true });

const Teacher = mongoose.model('teacher', teacherSchema);

module.exports = Teacher;